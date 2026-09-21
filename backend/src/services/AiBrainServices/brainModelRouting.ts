/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { isClaudeModelId } from "../../providers/anthropic/utils/isClaudeModel";
import { isGeminiModelId } from "../../providers/gemini/utils/isGeminiModel";
import { isGrokModelId } from "../../providers/grok/utils/isGrokModel";
import {
  assertBrainPlatformKey,
  listBrainPlatformKeyStatus
} from "./brainPlatformCredentials";
import { assertGeminiBrainModelAvailable } from "../../providers/gemini/utils/geminiBrainRouting";
import { assertGrokBrainModelAvailable } from "../../providers/grok/utils/grokBrainRouting";
import {
  isBrainSmartModeId,
  normalizeBrainSmartModeId,
  resolveBrainSmartModeModel
} from "./brainSmartModelResolve";

export type BrainLlmProvider = "openai" | "anthropic" | "gemini" | "grok";

export type BrainModelRouteContext = {
  message?: string | null;
  hasAttachments?: boolean;
  voiceMode?: boolean;
  mcpCount?: number;
};

export function brainProviderFromModel(model?: string | null): BrainLlmProvider {
  if (isBrainSmartModeId(model)) return "openai";
  if (isGrokModelId(model)) return "grok";
  if (isGeminiModelId(model)) return "gemini";
  return isClaudeModelId(model) ? "anthropic" : "openai";
}

export function normalizeBrainModelId(model?: string | null): string {
  const raw = String(model || "").trim();
  if (!raw) return "gpt-5.5";
  if (isBrainSmartModeId(raw)) return raw.toLowerCase();
  if (raw.startsWith("anthropic:")) {
    return raw.slice("anthropic:".length) || "claude-sonnet-4-5-20250929";
  }
  if (raw.startsWith("grok:")) {
    return raw.slice("grok:".length) || "grok-4-1-fast";
  }
  if (raw.startsWith("xai:")) {
    return raw.slice("xai:".length) || "grok-4-1-fast";
  }
  return raw;
}

/** Valida se o modelo pedido pode ser usado nesta mensagem (chaves da plataforma VB). */
export async function assertBrainModelAvailable(
  companyId: number,
  model?: string | null,
  context?: BrainModelRouteContext
): Promise<{
  provider: BrainLlmProvider;
  modelId: string;
  /** Modo inteligente selecionado na UI (auto/flash); null se modelo fixo. */
  persistModel: string | null;
}> {
  const modelId = normalizeBrainModelId(model);
  const smartMode = normalizeBrainSmartModeId(modelId);

  if (smartMode) {
    const resolved = resolveBrainSmartModeModel({
      mode: smartMode,
      message: context?.message,
      hasAttachments: context?.hasAttachments,
      voiceMode: context?.voiceMode,
      mcpCount: context?.mcpCount
    });
    // Revalida o modelo concreto escolhido (chave do provedor).
    const concrete = await assertBrainModelAvailable(companyId, resolved.modelId);
    return {
      provider: concrete.provider,
      modelId: concrete.modelId,
      persistModel: smartMode
    };
  }

  if (isGrokModelId(modelId)) {
    const routed = await assertGrokBrainModelAvailable(companyId, modelId);
    return { provider: routed.provider, modelId: routed.modelId, persistModel: null };
  }

  if (isGeminiModelId(modelId)) {
    const routed = await assertGeminiBrainModelAvailable(companyId, modelId);
    return { provider: routed.provider, modelId: routed.modelId, persistModel: null };
  }

  if (isClaudeModelId(modelId)) {
    assertBrainPlatformKey("anthropic");
    return { provider: "anthropic", modelId, persistModel: null };
  }

  assertBrainPlatformKey("openai");
  return { provider: "openai", modelId, persistModel: null };
}

export function listBrainPlatformKeysConfigured(): ReturnType<typeof listBrainPlatformKeyStatus> {
  return listBrainPlatformKeyStatus();
}
