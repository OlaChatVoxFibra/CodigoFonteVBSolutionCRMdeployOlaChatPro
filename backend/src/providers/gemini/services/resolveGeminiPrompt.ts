/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import GeminiIntegration from "../../../models/GeminiIntegration";
import ShowPromptService from "../../../services/PromptServices/ShowPromptService";
import AppError from "../../../errors/AppError";
import { decryptGeminiApiKeySecret } from "../utils/geminiApiKeyCrypto";
import { isGeminiModelId, resolveGeminiModelId } from "../utils/isGeminiModel";

export type ResolvedGeminiPrompt = {
  prompt: Record<string, any>;
  llmProvider: "gemini";
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

async function loadGeminiApiKey(companyId: number): Promise<string> {
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

/**
 * Resolve prompt OpenAI-table agent when model is Gemini.
 * Returns null if model is not Gemini — caller continues OpenAI/Anthropic path.
 */
export async function tryResolveGeminiPrompt(
  companyId: number,
  promptId: number
): Promise<ResolvedGeminiPrompt | null> {
  const prompt = await ShowPromptService({ promptId, companyId });
  const rawModel = String((prompt as any).model || "").trim();
  if (!isGeminiModelId(rawModel)) {
    return null;
  }
  const integration = await GeminiIntegration.findOne({ where: { companyId } });
  const apiKey = await loadGeminiApiKey(companyId);
  const model = resolveGeminiModelId(rawModel);
  const plain = promptToRuntimePlain(prompt as any);
  return {
    prompt: {
      ...plain,
      apiKey,
      model: model || integration?.defaultModel || "gemini-2.5-flash",
      temperature: plain.temperature ?? integration?.temperature ?? 1,
      topP: plain.topP ?? integration?.topP ?? 0.95,
      maxTokens: plain.maxTokens ?? integration?.maxOutputTokens ?? 4096,
      __llmProvider: "gemini"
    },
    llmProvider: "gemini"
  };
}
