/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Catálogo de modelos Grok (xAI) suportados no CRM. */
export const GROK_DEFAULT_MODEL = "grok-4-1-fast";

export const GROK_ALLOWED_MODEL_IDS = [
  "grok-4",
  "grok-4-latest",
  "grok-4-1-fast",
  "grok-4-1-fast-reasoning",
  "grok-3",
  "grok-3-mini",
  "grok-3-mini-fast",
  "grok-2-1212",
  "grok-2-vision-1212"
] as const;

export type GrokAllowedModelId = (typeof GROK_ALLOWED_MODEL_IDS)[number];

export const GROK_MODEL_LABELS: Record<string, string> = {
  "grok-4": "Grok 4",
  "grok-4-latest": "Grok 4 (latest)",
  "grok-4-1-fast": "Grok 4.1 Fast",
  "grok-4-1-fast-reasoning": "Grok 4.1 Fast (reasoning)",
  "grok-3": "Grok 3",
  "grok-3-mini": "Grok 3 Mini",
  "grok-3-mini-fast": "Grok 3 Mini Fast",
  "grok-2-1212": "Grok 2",
  "grok-2-vision-1212": "Grok 2 Vision"
};

export const GROK_API_BASE_URL = "https://api.x.ai/v1";
