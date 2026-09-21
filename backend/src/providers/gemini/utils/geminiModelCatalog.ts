/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** IDs Gemini aceitos — alinhado ao catálogo do frontend. */
export const GEMINI_ALLOWED_MODEL_IDS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-thinking-exp",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-2.0-flash-live-preview-04-09",
  "gemini-live",
  "gemini-video",
  "gemini-vision"
] as const;

export type GeminiAllowedModelId = (typeof GEMINI_ALLOWED_MODEL_IDS)[number];

export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
