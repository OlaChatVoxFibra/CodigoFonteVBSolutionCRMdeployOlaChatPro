/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import GeminiIntegration from "../../../models/GeminiIntegration";
import AppError from "../../../errors/AppError";
import logger from "../../../utils/logger";
import {
  encryptGeminiApiKeySecret,
  decryptGeminiApiKeySecret
} from "../utils/geminiApiKeyCrypto";
import {
  GEMINI_ALLOWED_MODEL_IDS,
  GeminiAllowedModelId,
  GEMINI_DEFAULT_MODEL
} from "../utils/isGeminiModel";
import { probeGeminiApiKey } from "../utils/probeGeminiApiKey";
import { geminiGenerateContent } from "../runtime/GeminiRuntime";
import {
  parseGeminiCapabilitiesJson,
  serializeGeminiCapabilities,
  GeminiCapabilities
} from "../utils/geminiCapabilities";

function maskKeyHint(plain: string): { hasKey: boolean; last4: string } {
  const t = String(plain || "").trim();
  if (!t) return { hasKey: false, last4: "" };
  return { hasKey: true, last4: t.length <= 4 ? "****" : t.slice(-4) };
}

async function findOrCreateRow(companyId: number): Promise<GeminiIntegration> {
  const existing = await GeminiIntegration.findOne({ where: { companyId } });
  if (existing) return existing;
  return GeminiIntegration.create({
    companyId,
    apiKeyEncrypted: "",
    enabled: false,
    defaultModel: GEMINI_DEFAULT_MODEL,
    scope: "Pessoal",
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    multimodalEnabled: true,
    toolsEnabled: true,
    groundingEnabled: false,
    capabilitiesJson: serializeGeminiCapabilities({})
  });
}

export async function getGeminiIntegrationPublic(companyId: number) {
  const row = await GeminiIntegration.findOne({ where: { companyId } });
  if (!row) {
    return {
      enabled: false,
      defaultModel: GEMINI_DEFAULT_MODEL,
      scope: "Pessoal",
      temperature: 1,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      multimodalEnabled: true,
      toolsEnabled: true,
      groundingEnabled: false,
      capabilities: parseGeminiCapabilitiesJson(null),
      apiKey: { hasKey: false, last4: "" },
      allowedModels: [...GEMINI_ALLOWED_MODEL_IDS],
      health: { status: "unknown", latencyMs: null }
    };
  }
  let plain = "";
  try {
    plain = decryptGeminiApiKeySecret(row.apiKeyEncrypted || "") || "";
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
    topK: row.topK,
    maxOutputTokens: row.maxOutputTokens,
    multimodalEnabled: row.multimodalEnabled,
    toolsEnabled: row.toolsEnabled,
    groundingEnabled: row.groundingEnabled,
    capabilities: parseGeminiCapabilitiesJson(row.capabilitiesJson),
    apiKey: hint,
    allowedModels: [...GEMINI_ALLOWED_MODEL_IDS],
    health: { status: row.enabled && hint.hasKey ? "ready" : "inactive", latencyMs: null }
  };
}

export async function saveGeminiIntegration(params: {
  companyId: number;
  enabled: boolean;
  apiKey?: string;
  defaultModel: string;
  scope: string;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  multimodalEnabled: boolean;
  toolsEnabled: boolean;
  groundingEnabled: boolean;
  capabilities?: Partial<GeminiCapabilities>;
}): Promise<Awaited<ReturnType<typeof getGeminiIntegrationPublic>> & { saveWarning?: string }> {
  if (!GEMINI_ALLOWED_MODEL_IDS.includes(params.defaultModel as GeminiAllowedModelId)) {
    const fallback = params.defaultModel.toLowerCase();
    if (!fallback.startsWith("gemini")) {
      throw new AppError("Modelo Gemini inválido.", 422);
    }
  }

  const row = await findOrCreateRow(params.companyId);

  let plainExisting = "";
  try {
    plainExisting = decryptGeminiApiKeySecret(row.apiKeyEncrypted || "") || "";
  } catch {
    plainExisting = "";
  }

  const incomingKey = params.apiKey != null ? String(params.apiKey).trim() : "";
  const willHaveKey = incomingKey.length > 0 || plainExisting.length > 0;

  if (params.enabled && !willHaveKey) {
    throw new AppError("Informe a API Key do Google Gemini para ativar a integração.", 422);
  }

  let nextPlain = plainExisting;
  let saveWarning: string | undefined;
  if (incomingKey.length > 0) {
    const probe = await probeGeminiApiKey(incomingKey, params.defaultModel);
    if (probe) {
      logger.warn({
        msg: "[GEMINI-INTEGRATION] validação de API key",
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
    row.apiKeyEncrypted = encryptGeminiApiKeySecret(nextPlain);
  }

  row.enabled = params.enabled && nextPlain.length > 0;
  row.defaultModel = params.defaultModel;
  row.scope = params.scope;
  row.temperature = params.temperature;
  row.topP = params.topP;
  row.topK = params.topK;
  row.maxOutputTokens = params.maxOutputTokens;
  row.multimodalEnabled = params.multimodalEnabled;
  row.toolsEnabled = params.toolsEnabled;
  row.groundingEnabled = params.groundingEnabled;
  if (params.capabilities) {
    row.capabilitiesJson = serializeGeminiCapabilities(params.capabilities);
  }

  if (!params.enabled && incomingKey.length === 0 && params.apiKey === "") {
    row.apiKeyEncrypted = "";
    nextPlain = "";
    row.enabled = false;
  }

  await row.save();
  logger.info({ msg: "[GEMINI-INTEGRATION] salva", companyId: params.companyId, enabled: row.enabled });
  const pub = await getGeminiIntegrationPublic(params.companyId);
  if (saveWarning) {
    return { ...pub, saveWarning };
  }
  return pub;
}

export async function testGeminiIntegration(params: {
  companyId: number;
  prompt: string;
  model: string;
  maxTokens: number;
  temperature: number;
  apiKeyOverride?: string;
  parts?: Array<{ mimeType: string; data: string }>;
}) {
  const row = await GeminiIntegration.findOne({ where: { companyId: params.companyId } });
  let key = "";
  if (params.apiKeyOverride != null && String(params.apiKeyOverride).trim()) {
    key = String(params.apiKeyOverride).trim();
  } else if (row?.apiKeyEncrypted) {
    key = decryptGeminiApiKeySecret(row.apiKeyEncrypted) || "";
  }
  if (!key) {
    throw new AppError("API Key Gemini não configurada.", 422);
  }

  const started = Date.now();
  let httpStatus = 200;
  try {
    const inlineParts =
      params.parts?.map((p) => ({
        inlineData: { mimeType: p.mimeType, data: p.data }
      })) || undefined;

    const result = await geminiGenerateContent({
      apiKey: key,
      model: params.model,
      messages: [{ role: "user", content: params.prompt || "Olá" }],
      maxOutputTokens: Math.min(Math.max(params.maxTokens, 1), 8192),
      temperature: params.temperature,
      topP: row?.topP,
      topK: row?.topK,
      parts: inlineParts as any
    });
    return {
      ok: true,
      httpStatus,
      latencyMs: result.latencyMs || Date.now() - started,
      model: result.model,
      response: result.text,
      images: result.images?.length || 0,
      tokens: result.usage || null,
      multimodal: Boolean(inlineParts?.length)
    };
  } catch (e: any) {
    httpStatus = 502;
    return {
      ok: false,
      httpStatus,
      latencyMs: Date.now() - started,
      model: params.model,
      response: "",
      error: String(e?.message || e).slice(0, 500),
      tokens: null,
      multimodal: false
    };
  }
}

export async function loadGeminiApiKeyForCompany(companyId: number): Promise<string> {
  const row = await GeminiIntegration.findOne({ where: { companyId } });
  if (!row?.enabled) {
    throw new AppError("Integração Gemini não está ativa.", 422);
  }
  const key = decryptGeminiApiKeySecret(row.apiKeyEncrypted || "") || "";
  if (!key.trim()) {
    throw new AppError("API Key Gemini não configurada.", 422);
  }
  return key.trim();
}
