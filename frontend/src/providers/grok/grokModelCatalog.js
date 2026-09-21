/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export const GROK_DEFAULT_MODEL = "grok-4-1-fast";

export const GROK_MODEL_IDS = [
  "grok-4",
  "grok-4-latest",
  "grok-4-1-fast",
  "grok-4-1-fast-reasoning",
  "grok-3",
  "grok-3-mini",
  "grok-3-mini-fast",
  "grok-2-1212",
  "grok-2-vision-1212"
];

export const AGENT_GROK_PRIMARY_MODELS = [
  "grok-4-1-fast",
  "grok-4-1-fast-reasoning",
  "grok-4",
  "grok-3",
  "grok-3-mini",
  "grok-2-vision-1212"
];

export const GROK_MODEL_LABELS = {
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

export const GROK_BRAIN_MODELS = [
  { id: "grok-4-1-fast", name: "Grok 4.1 Fast", provider: "grok", active: true, description: "Rápido e recomendado" },
  { id: "grok-4-1-fast-reasoning", name: "Grok 4.1 Fast Reasoning", provider: "grok", active: true, description: "Raciocínio" },
  { id: "grok-4", name: "Grok 4", provider: "grok", active: true, description: "Qualidade máxima" },
  { id: "grok-4-latest", name: "Grok 4 Latest", provider: "grok", active: true, description: "Sempre o mais novo" },
  { id: "grok-3", name: "Grok 3", provider: "grok", active: true, description: "Estável" },
  { id: "grok-3-mini", name: "Grok 3 Mini", provider: "grok", active: true, description: "Econômico" },
  { id: "grok-2-vision-1212", name: "Grok 2 Vision", provider: "grok", active: true, description: "Visão" }
];

export function isGrokModelId(model) {
  const id = String(model || "").trim();
  if (!id) return false;
  if (id.startsWith("grok:") || id.startsWith("xai:")) return true;
  return /^grok/i.test(id) || GROK_MODEL_IDS.includes(id);
}

export function grokModelLabel(modelId) {
  const id = String(modelId || "").trim().replace(/^(grok:|xai:)/, "");
  return GROK_MODEL_LABELS[id] || id || "Grok";
}
