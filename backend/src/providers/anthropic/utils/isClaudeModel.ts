/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Modelos Claude suportados (inclui legados no banco; a API usa resolveAnthropicModelId). */
export const ANTHROPIC_ALLOWED_MODEL_IDS = [
  "claude-fable-5",
  "claude-sonnet-4-5-20250929",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-6",
  "claude-3-5-sonnet-20241022",
  "claude-3-7-sonnet-latest",
  "claude-sonnet-4-20250514",
  "claude-opus-4-20250514",
  "claude-3-haiku-20240307"
] as const;

export type AnthropicAllowedModelId = typeof ANTHROPIC_ALLOWED_MODEL_IDS[number];

/** Remove prefixo `anthropic:` usado no seletor de /prompts (ex.: anthropic:claude-sonnet-4-6). */
export function normalizeAgentModelId(model?: string | null): string {
  const raw = String(model || "").trim();
  if (!raw) return "";
  if (raw.toLowerCase().startsWith("anthropic:")) {
    return raw.slice("anthropic:".length).trim();
  }
  return raw;
}

export function isClaudeModelId(model?: string | null): boolean {
  const m = normalizeAgentModelId(model).toLowerCase();
  if (!m) return false;
  if (m.startsWith("claude")) return true;
  return ANTHROPIC_ALLOWED_MODEL_IDS.some((id) => id.toLowerCase() === m);
}

export function assertAllowedClaudeModel(model: string): asserts model is AnthropicAllowedModelId {
  if (!ANTHROPIC_ALLOWED_MODEL_IDS.includes(model as AnthropicAllowedModelId)) {
    throw new Error(`Modelo Anthropic não suportado: ${model}`);
  }
}
