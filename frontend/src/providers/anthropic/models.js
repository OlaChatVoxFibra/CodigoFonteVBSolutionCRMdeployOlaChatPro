/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Modelos exibidos no seletor (legados mantidos para registros antigos no banco). */
export const CLAUDE_MODEL_IDS = [
  "claude-sonnet-4-5-20250929",
  "claude-fable-5",
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-6",
  "claude-3-5-sonnet-20241022",
  "claude-3-7-sonnet-latest",
  "claude-sonnet-4-20250514",
  "claude-opus-4-20250514"
];

export const CLAUDE_DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

export const CLAUDE_MODEL_LABELS = {
  "claude-fable-5": "Claude Fable 5 (frontier)",
  "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5 (recomendado)",
  "claude-sonnet-4-6": "Claude Sonnet 4.6",
  "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
  "claude-opus-4-6": "Claude Opus 4.6",
  "claude-3-5-sonnet-20241022": "Claude 3.5 Sonnet",
  "claude-3-7-sonnet-latest": "Claude 3.7 Sonnet (legado)",
  "claude-sonnet-4-20250514": "Claude Sonnet 4",
  "claude-opus-4-20250514": "Claude Opus 4"
};

export function normalizeAgentModelId(model) {
  const raw = String(model || "").trim();
  if (!raw) return "";
  if (raw.toLowerCase().startsWith("anthropic:")) {
    return raw.slice("anthropic:".length).trim();
  }
  return raw;
}

export function isClaudeModelId(model) {
  return normalizeAgentModelId(model).toLowerCase().startsWith("claude");
}

export function claudeModelLabel(model) {
  return CLAUDE_MODEL_LABELS[model] || model;
}
