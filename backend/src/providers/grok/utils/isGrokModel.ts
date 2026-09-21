/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  GROK_ALLOWED_MODEL_IDS,
  GROK_DEFAULT_MODEL,
  GrokAllowedModelId
} from "./grokModelCatalog";

export {
  GROK_ALLOWED_MODEL_IDS,
  GROK_DEFAULT_MODEL,
  GROK_MODEL_LABELS,
  GROK_API_BASE_URL
} from "./grokModelCatalog";
export type { GrokAllowedModelId } from "./grokModelCatalog";

const GROK_PREFIX = /^grok/i;

export function isGrokModelId(model?: string | null): boolean {
  const id = String(model || "").trim();
  if (!id) return false;
  if (id.startsWith("grok:") || id.startsWith("xai:")) return true;
  if (GROK_PREFIX.test(id)) return true;
  return GROK_ALLOWED_MODEL_IDS.includes(id as GrokAllowedModelId);
}

export function normalizeGrokModelId(model?: string | null): string {
  const raw = String(model || "").trim();
  if (!raw) return GROK_DEFAULT_MODEL;
  if (raw.startsWith("grok:")) {
    return raw.slice("grok:".length) || GROK_DEFAULT_MODEL;
  }
  if (raw.startsWith("xai:")) {
    return raw.slice("xai:".length) || GROK_DEFAULT_MODEL;
  }
  return raw;
}

export function resolveGrokModelId(model?: string | null): string {
  const id = normalizeGrokModelId(model);
  if (GROK_ALLOWED_MODEL_IDS.includes(id as GrokAllowedModelId)) {
    return id;
  }
  if (GROK_PREFIX.test(id)) {
    return id;
  }
  return GROK_DEFAULT_MODEL;
}
