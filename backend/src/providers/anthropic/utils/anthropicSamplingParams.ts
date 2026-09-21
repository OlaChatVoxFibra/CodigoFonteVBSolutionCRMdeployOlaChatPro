/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { resolveAnthropicModelId } from "./anthropicModelResolve";

/**
 * Modelos Claude 4+ rejeitam temperature e top_p no mesmo request.
 * @see https://docs.anthropic.com — erro: "temperature and top_p cannot both be specified"
 */
export function anthropicModelRequiresExclusiveSampling(model?: string | null): boolean {
  const m = resolveAnthropicModelId(model || "").toLowerCase();
  if (
    m.includes("claude-fable") ||
    m.includes("claude-mythos") ||
    m.includes("claude-opus-4") ||
    m.includes("claude-sonnet-4") ||
    m.includes("claude-haiku-4")
  ) {
    return true;
  }
  if (/\bclaude-[a-z]+-4-[56]/.test(m) || m.includes("-4-5-") || m.includes("-4-6")) {
    return true;
  }
  return false;
}

/** Monta payload de amostragem válido para a API (só um entre temperature e top_p quando exigido). */
export function buildAnthropicSamplingParams(params: {
  model: string;
  temperature: number;
  topP?: number;
  /** Se true, prefere top_p quando só um é permitido (padrão: temperature). */
  preferTopP?: boolean;
}): { temperature?: number; top_p?: number } {
  const model = resolveAnthropicModelId(params.model);
  const temperature = Number(params.temperature);
  const topP = params.topP != null ? Number(params.topP) : undefined;
  const hasTemp = Number.isFinite(temperature);
  const hasTopP = topP != null && Number.isFinite(topP);

  if (!anthropicModelRequiresExclusiveSampling(model)) {
    const out: { temperature?: number; top_p?: number } = {};
    if (hasTemp) out.temperature = temperature;
    if (hasTopP) out.top_p = topP;
    return out;
  }

  if (params.preferTopP && hasTopP) {
    return { top_p: topP };
  }
  if (hasTemp) {
    return { temperature };
  }
  if (hasTopP) {
    return { top_p: topP };
  }
  return { temperature: 1 };
}
