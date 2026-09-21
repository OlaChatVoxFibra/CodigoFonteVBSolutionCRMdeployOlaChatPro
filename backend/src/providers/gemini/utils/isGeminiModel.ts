/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  GEMINI_ALLOWED_MODEL_IDS,
  GeminiAllowedModelId,
  GEMINI_DEFAULT_MODEL
} from "./geminiModelCatalog";
import { resolveGeminiRuntimeModelId } from "./geminiModelCapabilities";

export {
  GEMINI_ALLOWED_MODEL_IDS,
  GEMINI_DEFAULT_MODEL
} from "./geminiModelCatalog";
export type { GeminiAllowedModelId } from "./geminiModelCatalog";

const GEMINI_PREFIX = /^gemini/i;

export function isGeminiModelId(model?: string | null): boolean {
  const id = String(model || "").trim();
  if (!id) return false;
  if (id.startsWith("gemini:")) return true;
  if (GEMINI_PREFIX.test(id)) return true;
  return GEMINI_ALLOWED_MODEL_IDS.includes(id as GeminiAllowedModelId);
}

export function normalizeGeminiModelId(model?: string | null): string {
  const raw = String(model || "").trim();
  if (!raw) return GEMINI_DEFAULT_MODEL;
  if (raw.startsWith("gemini:")) {
    return raw.slice("gemini:".length) || GEMINI_DEFAULT_MODEL;
  }
  return raw;
}

export function resolveGeminiModelId(model?: string | null): string {
  return resolveGeminiRuntimeModelId(model);
}
