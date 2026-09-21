/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * IDs aposentados pela Anthropic (ex.: Haiku 3 em 20/04/2026) → substitutos ativos.
 * Usado em todas as chamadas à API para não quebrar integrações antigas no banco.
 */
export const ANTHROPIC_RETIRED_MODEL_MAP: Record<string, string> = {
  "claude-3-haiku-20240307": "claude-haiku-4-5-20251001",
  "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
  "claude-3-7-sonnet-latest": "claude-sonnet-4-5-20250929",
  "claude-3-7-sonnet-20250219": "claude-sonnet-4-5-20250929"
};

export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export function resolveAnthropicModelId(model?: string | null): string {
  const raw = String(model || "").trim();
  if (!raw) return ANTHROPIC_DEFAULT_MODEL;
  return ANTHROPIC_RETIRED_MODEL_MAP[raw] || raw;
}
