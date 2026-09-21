/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import GrokIntegration from "../../../models/GrokIntegration";
import ShowPromptService from "../../../services/PromptServices/ShowPromptService";
import AppError from "../../../errors/AppError";
import { decryptGrokApiKeySecret } from "../utils/grokApiKeyCrypto";
import { isGrokModelId, resolveGrokModelId } from "../utils/isGrokModel";

export type ResolvedGrokPrompt = {
  prompt: Record<string, any>;
  llmProvider: "grok";
};

function promptToRuntimePlain(prompt: Record<string, any>): Record<string, any> {
  const row =
    prompt && typeof (prompt as any).get === "function"
      ? ((prompt as any).get({ plain: true }) as Record<string, any>)
      : ({ ...(prompt as any) } as Record<string, any>);
  const id = Number(row.id);
  if (!Number.isFinite(id)) {
    throw new AppError("Agente inválido: id do prompt ausente.", 422);
  }
  return { ...row, id };
}

async function loadGrokApiKey(companyId: number): Promise<string> {
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

/**
 * Resolve prompt quando o modelo é Grok.
 * Retorna null se o modelo não for Grok.
 */
export async function tryResolveGrokPrompt(
  companyId: number,
  promptId: number
): Promise<ResolvedGrokPrompt | null> {
  const prompt = await ShowPromptService({ promptId, companyId });
  const rawModel = String((prompt as any).model || "").trim();
  if (!isGrokModelId(rawModel)) {
    return null;
  }
  const integration = await GrokIntegration.findOne({ where: { companyId } });
  const apiKey = await loadGrokApiKey(companyId);
  const model = resolveGrokModelId(rawModel);
  const plain = promptToRuntimePlain(prompt as any);
  return {
    prompt: {
      ...plain,
      apiKey,
      model: model || integration?.defaultModel || "grok-4-1-fast",
      temperature: plain.temperature ?? integration?.temperature ?? 1,
      topP: plain.topP ?? integration?.topP ?? 1,
      maxTokens: plain.maxTokens ?? integration?.maxOutputTokens ?? 4096,
      __llmProvider: "grok"
    },
    llmProvider: "grok"
  };
}
