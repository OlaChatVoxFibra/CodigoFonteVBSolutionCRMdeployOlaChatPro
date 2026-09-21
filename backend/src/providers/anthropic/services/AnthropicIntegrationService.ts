/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AnthropicIntegration from "../../../models/AnthropicIntegration";
import AppError from "../../../errors/AppError";
import logger from "../../../utils/logger";
import {
  encryptAnthropicApiKeySecret,
  decryptAnthropicApiKeySecret
} from "../utils/anthropicApiKeyCrypto";
import {
  ANTHROPIC_ALLOWED_MODEL_IDS,
  AnthropicAllowedModelId
} from "../utils/isClaudeModel";
import { probeAnthropicApiKey } from "../utils/probeAnthropicApiKey";
import { ANTHROPIC_DEFAULT_MODEL } from "../utils/anthropicModelResolve";
import { parseAnthropicError } from "../utils/anthropicApiErrors";
import { anthropicMessagesCreate } from "../runtime/AnthropicRuntime";

function maskKeyHint(plain: string): { hasKey: boolean; last4: string } {
  const t = String(plain || "").trim();
  if (!t) return { hasKey: false, last4: "" };
  return { hasKey: true, last4: t.length <= 4 ? "****" : t.slice(-4) };
}

async function findOrCreateRow(companyId: number): Promise<AnthropicIntegration> {
  const existing = await AnthropicIntegration.findOne({ where: { companyId } });
  if (existing) return existing;
  return AnthropicIntegration.create({
    companyId,
    apiKeyEncrypted: "",
    enabled: false,
    defaultModel: ANTHROPIC_DEFAULT_MODEL,
    scope: "Pessoal",
    temperature: 1,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    stopSequences: ""
  });
}

export async function getAnthropicIntegrationPublic(companyId: number) {
  const row = await AnthropicIntegration.findOne({ where: { companyId } });
  if (!row) {
    return {
      enabled: false,
      defaultModel: ANTHROPIC_DEFAULT_MODEL,
      scope: "Pessoal",
      temperature: 1,
      topP: 1,
      presencePenalty: 0,
      frequencyPenalty: 0,
      stopSequences: "",
      apiKey: { hasKey: false, last4: "" },
      allowedModels: [...ANTHROPIC_ALLOWED_MODEL_IDS],
      openAiBlocking: false
    };
  }
  let plain = "";
  try {
    plain = decryptAnthropicApiKeySecret(row.apiKeyEncrypted || "") || "";
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
    presencePenalty: row.presencePenalty,
    frequencyPenalty: row.frequencyPenalty,
    stopSequences: row.stopSequences || "",
    apiKey: hint,
    allowedModels: [...ANTHROPIC_ALLOWED_MODEL_IDS],
    openAiBlocking: false
  };
}

export async function saveAnthropicIntegration(params: {
  companyId: number;
  enabled: boolean;
  apiKey?: string;
  defaultModel: string;
  scope: string;
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
  stopSequences: string;
}): Promise<
  Awaited<ReturnType<typeof getAnthropicIntegrationPublic>> & { saveWarning?: string }
> {
  const {
    companyId,
    enabled,
    apiKey,
    defaultModel,
    scope,
    temperature,
    topP,
    presencePenalty,
    frequencyPenalty,
    stopSequences
  } = params;

  if (!ANTHROPIC_ALLOWED_MODEL_IDS.includes(defaultModel as AnthropicAllowedModelId)) {
    throw new AppError("Modelo Anthropic inválido.", 422);
  }

  const row = await findOrCreateRow(companyId);

  let plainExisting = "";
  try {
    plainExisting = decryptAnthropicApiKeySecret(row.apiKeyEncrypted || "") || "";
  } catch {
    plainExisting = "";
  }

  const incomingKey = apiKey != null ? String(apiKey).trim() : "";
  const willHaveKey = incomingKey.length > 0 || plainExisting.length > 0;

  if (enabled && !willHaveKey) {
    throw new AppError("Informe a API Key da Anthropic para ativar a integração.", 422);
  }

  let nextPlain = plainExisting;
  let saveWarning: string | undefined;
  if (incomingKey.length > 0) {
    const probe = await probeAnthropicApiKey(incomingKey, defaultModel);
    if (probe) {
      logger.warn({
        msg: "[ANTHROPIC-INTEGRATION] validação de API key",
        kind: probe.kind,
        err: probe.raw.slice(0, 300)
      });
      if (probe.kind === "credit_balance") {
        saveWarning = probe.userMessage;
      } else {
        throw new AppError(probe.userMessage, 422);
      }
    }
    nextPlain = incomingKey;
    row.apiKeyEncrypted = encryptAnthropicApiKeySecret(nextPlain);
  }

  row.enabled = enabled && nextPlain.length > 0;
  row.defaultModel = defaultModel;
  row.scope = scope;
  row.temperature = temperature;
  row.topP = topP;
  row.presencePenalty = presencePenalty;
  row.frequencyPenalty = frequencyPenalty;
  row.stopSequences = stopSequences || "";

  if (!enabled && incomingKey.length === 0 && apiKey === "") {
    row.apiKeyEncrypted = "";
    nextPlain = "";
    row.enabled = false;
  }

  await row.save();
  logger.info({ msg: "[ANTHROPIC-INTEGRATION] salva", companyId, enabled: row.enabled });
  const pub = await getAnthropicIntegrationPublic(companyId);
  if (saveWarning) {
    return { ...pub, saveWarning };
  }
  return pub;
}

export async function testAnthropicIntegration(params: {
  companyId: number;
  prompt: string;
  model: string;
  maxTokens: number;
  temperature: number;
  apiKeyOverride?: string;
}) {
  const row = await AnthropicIntegration.findOne({ where: { companyId: params.companyId } });
  let key = "";
  if (params.apiKeyOverride != null && String(params.apiKeyOverride).trim()) {
    key = String(params.apiKeyOverride).trim();
  } else if (row?.apiKeyEncrypted) {
    key = decryptAnthropicApiKeySecret(row.apiKeyEncrypted) || "";
  }
  if (!key) {
    throw new AppError("API Key Anthropic não configurada.", 422);
  }
  if (!ANTHROPIC_ALLOWED_MODEL_IDS.includes(params.model as AnthropicAllowedModelId)) {
    throw new AppError("Modelo Anthropic inválido.", 422);
  }
  let httpStatus = 200;
  const started = Date.now();
  try {
    const result = await anthropicMessagesCreate({
      apiKey: key,
      model: params.model,
      maxTokens: Math.min(Math.max(params.maxTokens, 1), 8192),
      temperature: params.temperature,
      messages: [{ role: "user", content: params.prompt || "Olá" }]
    });
    return {
      ok: true,
      response: result.text,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: Date.now() - started,
      httpStatus,
      model: result.model
    };
  } catch (e: any) {
    httpStatus = typeof e?.status === "number" ? e.status : 502;
    const parsed = parseAnthropicError(e);
    return {
      ok: false,
      response: "",
      inputTokens: 0,
      outputTokens: 0,
      durationMs: Date.now() - started,
      httpStatus,
      error: parsed.userMessage
    };
  }
}
