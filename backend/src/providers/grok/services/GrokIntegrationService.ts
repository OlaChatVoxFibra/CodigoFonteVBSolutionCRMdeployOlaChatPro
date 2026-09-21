/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import GrokIntegration from "../../../models/GrokIntegration";
import AppError from "../../../errors/AppError";
import logger from "../../../utils/logger";
import {
  encryptGrokApiKeySecret,
  decryptGrokApiKeySecret
} from "../utils/grokApiKeyCrypto";
import {
  GROK_ALLOWED_MODEL_IDS,
  GROK_DEFAULT_MODEL,
  GrokAllowedModelId
} from "../utils/isGrokModel";
import { probeGrokApiKey } from "../utils/probeGrokApiKey";
import { grokChatCompletions } from "../runtime/GrokRuntime";

function maskKeyHint(plain: string): { hasKey: boolean; last4: string } {
  const t = String(plain || "").trim();
  if (!t) return { hasKey: false, last4: "" };
  return { hasKey: true, last4: t.length <= 4 ? "****" : t.slice(-4) };
}

async function findOrCreateRow(companyId: number): Promise<GrokIntegration> {
  const existing = await GrokIntegration.findOne({ where: { companyId } });
  if (existing) return existing;
  return GrokIntegration.create({
    companyId,
    apiKeyEncrypted: "",
    enabled: false,
    defaultModel: GROK_DEFAULT_MODEL,
    scope: "Pessoal",
    temperature: 1,
    topP: 1,
    maxOutputTokens: 4096,
    capabilitiesJson: null
  });
}

export async function getGrokIntegrationPublic(companyId: number) {
  const row = await GrokIntegration.findOne({ where: { companyId } });
  if (!row) {
    return {
      enabled: false,
      defaultModel: GROK_DEFAULT_MODEL,
      scope: "Pessoal",
      temperature: 1,
      topP: 1,
      maxOutputTokens: 4096,
      apiKey: { hasKey: false, last4: "" },
      allowedModels: [...GROK_ALLOWED_MODEL_IDS],
      health: { status: "unknown", latencyMs: null }
    };
  }
  let plain = "";
  try {
    plain = decryptGrokApiKeySecret(row.apiKeyEncrypted || "") || "";
  } catch {
    plain = "";
  }
  const hint = maskKeyHint(plain);
  return {
    enabled: row.enabled,
    defaultModel: row.defaultModel,
    scope: row.scope,
    temperature: row.temperature,
    topP: row.topP,
    maxOutputTokens: row.maxOutputTokens,
    apiKey: hint,
    allowedModels: [...GROK_ALLOWED_MODEL_IDS],
    health: {
      status: row.enabled && hint.hasKey ? "ready" : "inactive",
      latencyMs: null
    }
  };
}

export async function saveGrokIntegration(params: {
  companyId: number;
  enabled: boolean;
  apiKey?: string;
  defaultModel: string;
  scope: string;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
}): Promise<
  Awaited<ReturnType<typeof getGrokIntegrationPublic>> & { saveWarning?: string }
> {
  const modelOk =
    GROK_ALLOWED_MODEL_IDS.includes(params.defaultModel as GrokAllowedModelId) ||
    /^grok/i.test(params.defaultModel);
  if (!modelOk) {
    throw new AppError("Modelo Grok inválido.", 422);
  }

  const row = await findOrCreateRow(params.companyId);

  let plainExisting = "";
  try {
    plainExisting = decryptGrokApiKeySecret(row.apiKeyEncrypted || "") || "";
  } catch {
    plainExisting = "";
  }

  const incomingKey = params.apiKey != null ? String(params.apiKey).trim() : "";
  const willHaveKey = incomingKey.length > 0 || plainExisting.length > 0;

  if (params.enabled && !willHaveKey) {
    throw new AppError(
      "Informe a API Key da xAI (Grok) para ativar a integração.",
      422
    );
  }

  let nextPlain = plainExisting;
  let saveWarning: string | undefined;
  if (incomingKey.length > 0) {
    const probe = await probeGrokApiKey(incomingKey, params.defaultModel);
    if (probe) {
      logger.warn({
        msg: "[GROK-INTEGRATION] validação de API key",
        kind: probe.kind,
        err: probe.raw.slice(0, 300)
      });
      if (probe.kind === "quota") {
        saveWarning = probe.userMessage;
      } else {
        throw new AppError(probe.userMessage, 422);
      }
    }
    nextPlain = incomingKey;
    row.apiKeyEncrypted = encryptGrokApiKeySecret(nextPlain);
  }

  row.enabled = params.enabled && nextPlain.length > 0;
  row.defaultModel = params.defaultModel;
  row.scope = params.scope;
  if (typeof params.temperature === "number") row.temperature = params.temperature;
  if (typeof params.topP === "number") row.topP = params.topP;
  if (typeof params.maxOutputTokens === "number") {
    row.maxOutputTokens = params.maxOutputTokens;
  }

  if (!params.enabled && incomingKey.length === 0 && params.apiKey === "") {
    row.apiKeyEncrypted = "";
    nextPlain = "";
    row.enabled = false;
  }

  await row.save();
  logger.info({
    msg: "[GROK-INTEGRATION] salva",
    companyId: params.companyId,
    enabled: row.enabled
  });
  const pub = await getGrokIntegrationPublic(params.companyId);
  if (saveWarning) {
    return { ...pub, saveWarning };
  }
  return pub;
}

export async function testGrokIntegration(params: {
  companyId: number;
  prompt: string;
  model: string;
  maxTokens: number;
  temperature: number;
  apiKeyOverride?: string;
}) {
  const row = await GrokIntegration.findOne({ where: { companyId: params.companyId } });
  let key = "";
  if (params.apiKeyOverride != null && String(params.apiKeyOverride).trim()) {
    key = String(params.apiKeyOverride).trim();
  } else if (row?.apiKeyEncrypted) {
    key = decryptGrokApiKeySecret(row.apiKeyEncrypted) || "";
  }
  if (!key) {
    throw new AppError("API Key Grok não configurada.", 422);
  }

  const started = Date.now();
  try {
    const result = await grokChatCompletions({
      apiKey: key,
      model: params.model,
      messages: [{ role: "user", content: params.prompt || "Olá" }],
      maxOutputTokens: Math.min(Math.max(params.maxTokens, 1), 8192),
      temperature: params.temperature,
      topP: row?.topP
    });
    return {
      ok: true,
      httpStatus: 200,
      latencyMs: result.latencyMs || Date.now() - started,
      model: result.model,
      response: result.text,
      tokens: result.usage || null
    };
  } catch (e: any) {
    return {
      ok: false,
      httpStatus: 502,
      latencyMs: Date.now() - started,
      model: params.model,
      response: "",
      error: String(e?.message || e).slice(0, 500),
      tokens: null
    };
  }
}

export async function loadGrokApiKeyForCompany(companyId: number): Promise<string> {
  const row = await GrokIntegration.findOne({ where: { companyId } });
  if (!row?.enabled) {
    throw new AppError("Integração Grok não está ativa.", 422);
  }
  const key = decryptGrokApiKeySecret(row.apiKeyEncrypted || "") || "";
  if (!key.trim()) {
    throw new AppError("API Key Grok não configurada.", 422);
  }
  return key.trim();
}

/** Chave da empresa se integração ativa; senão vazia (para Brain fallback). */
export async function tryLoadGrokApiKeyForCompany(
  companyId: number
): Promise<string> {
  try {
    return await loadGrokApiKeyForCompany(companyId);
  } catch {
    return "";
  }
}
