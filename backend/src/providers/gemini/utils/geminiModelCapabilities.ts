/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { GEMINI_ALLOWED_MODEL_IDS } from "./geminiModelCatalog";

/** Modelos que geram imagem (Nano Banana). */
export function isGeminiImageGenerationModel(model?: string | null): boolean {
  const id = String(model || "").trim().toLowerCase();
  return (
    id.includes("flash-image") ||
    id.includes("pro-image") ||
    id.includes("image-preview")
  );
}

/** Modelos de chat multimodal (texto + visão). */
export function isGeminiChatMultimodalModel(model?: string | null): boolean {
  const id = String(model || "").trim().toLowerCase();
  if (isGeminiImageGenerationModel(id)) return true;
  if (id.includes("live")) return false;
  return (
    id.includes("flash") ||
    id.includes("pro") ||
    id.includes("thinking") ||
    id.includes("1.5")
  );
}

/** IDs de catálogo sem API estável — redireciona para modelo GA equivalente. */
const MODEL_RUNTIME_ALIASES: Record<string, string> = {
  "gemini-live": "gemini-2.0-flash",
  "gemini-video": "gemini-2.5-flash",
  "gemini-vision": "gemini-2.5-flash",
  /** Gemini 1.5 desligado na API (404) — mantém ID legado no CRM, roda no sucessor. */
  "gemini-1.5-flash": "gemini-2.5-flash",
  "gemini-1.5-flash-latest": "gemini-2.5-flash",
  "gemini-1.5-flash-001": "gemini-2.5-flash",
  "gemini-1.5-flash-002": "gemini-2.5-flash",
  "gemini-1.5-pro": "gemini-2.5-pro",
  "gemini-1.5-pro-latest": "gemini-2.5-pro",
  "gemini-1.5-pro-001": "gemini-2.5-pro",
  "gemini-1.5-pro-002": "gemini-2.5-pro"
};

export function resolveGeminiRuntimeModelId(model?: string | null): string {
  const raw = String(model || "").trim();
  if (!raw) return "gemini-2.5-flash";
  const normalized = raw.startsWith("gemini:") ? raw.slice(7) : raw;
  if (MODEL_RUNTIME_ALIASES[normalized]) {
    return MODEL_RUNTIME_ALIASES[normalized];
  }
  if ((GEMINI_ALLOWED_MODEL_IDS as readonly string[]).includes(normalized)) {
    return normalized;
  }
  if (/^gemini/i.test(normalized)) {
    return normalized;
  }
  return "gemini-2.5-flash";
}

export type GeminiModelUiCapability = {
  chat: boolean;
  vision: boolean;
  imageGen: boolean;
  live: boolean;
  preview: boolean;
};

export function getGeminiModelUiCapability(modelId: string): GeminiModelUiCapability {
  const id = String(modelId || "").trim();
  const imageGen = isGeminiImageGenerationModel(id);
  const live = id.includes("live");
  const preview = id.includes("preview") || imageGen;
  return {
    chat: !imageGen || imageGen,
    vision: isGeminiChatMultimodalModel(id) && !imageGen,
    imageGen,
    live,
    preview
  };
}
