/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Catálogo central Gemini — Brain.AI, agentes e integrações.
 * API Key é sempre por organização (GeminiIntegrations), nunca global.
 */

/** Modelos principais no editor de agentes */
export const AGENT_GEMINI_PRIMARY_MODELS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash"
];

/** Todos os IDs suportados no CRM */
export const GEMINI_MODEL_IDS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-thinking-exp",
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-2.0-flash-live-preview-04-09",
  "gemini-live",
  "gemini-video",
  "gemini-vision"
];

export const GEMINI_MODEL_LABELS = {
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-flash-lite": "Gemini 2.5 Flash Lite",
  "gemini-2.5-flash-preview-05-20": "Gemini 2.5 Flash (preview)",
  "gemini-2.0-flash": "Gemini 2.0 Flash",
  "gemini-2.0-flash-001": "Gemini 2.0 Flash GA",
  "gemini-2.0-flash-thinking-exp": "Gemini 2.0 Flash Thinking",
  "gemini-2.5-flash-image": "Nano Banana (imagem)",
  "gemini-3.1-flash-image-preview": "Nano Banana 2 (imagem)",
  "gemini-3-pro-image-preview": "Nano Banana Pro (imagem)",
  "gemini-2.0-flash-live-preview-04-09": "Gemini 2.0 Live",
  "gemini-live": "Gemini Live",
  "gemini-video": "Gemini Video",
  "gemini-vision": "Gemini Vision"
};

const GEMINI_MODEL_DESCRIPTIONS = {
  "gemini-2.5-pro": "Máxima inteligência — raciocínio, código e multimodal",
  "gemini-2.5-flash": "Equilíbrio ideal — rápido, multimodal, agentes",
  "gemini-2.5-flash-lite": "Custo baixo e alta velocidade",
  "gemini-2.5-flash-preview-05-20": "Preview com thinking budget",
  "gemini-2.0-flash": "GA — contexto 1M, ferramentas e visão",
  "gemini-2.0-flash-001": "Versão estável 2.0 Flash",
  "gemini-2.0-flash-thinking-exp": "Raciocínio expandido (thinking)",
  "gemini-2.5-flash-image": "Geração/edição de imagem (Nano Banana)",
  "gemini-3.1-flash-image-preview": "Imagem Nano Banana 2 — até 4K",
  "gemini-3-pro-image-preview": "Imagem Nano Banana Pro — máxima fidelidade",
  "gemini-2.0-flash-live-preview-04-09": "Áudio/vídeo em tempo real",
  "gemini-live": "APIs Live (voz/tempo real)",
  "gemini-video": "Compreensão de vídeo",
  "gemini-vision": "OCR e análise visual"
};

/** Suporte real no CRM (UI) */
export const GEMINI_MODEL_SUPPORT = {
  "gemini-2.5-pro": { tier: "full", tags: ["Chat", "Visão", "Agentes"] },
  "gemini-2.5-flash": { tier: "full", tags: ["Chat", "Visão", "Agentes"] },
  "gemini-2.5-flash-lite": { tier: "full", tags: ["Chat", "Agentes"] },
  "gemini-2.5-flash-preview-05-20": { tier: "full", tags: ["Chat", "Preview"] },
  "gemini-2.0-flash": { tier: "full", tags: ["Chat", "Visão", "Agentes"] },
  "gemini-2.0-flash-001": { tier: "full", tags: ["Chat", "Visão"] },
  "gemini-2.0-flash-thinking-exp": { tier: "full", tags: ["Chat", "Thinking"] },
  "gemini-2.5-flash-image": { tier: "image", tags: ["Gera imagem", "Brain", "Agente"] },
  "gemini-3.1-flash-image-preview": { tier: "image", tags: ["Gera imagem", "Preview"] },
  "gemini-3-pro-image-preview": { tier: "image", tags: ["Gera imagem", "Alta fidelidade"] },
  "gemini-2.0-flash-live-preview-04-09": { tier: "alias", tags: ["Live (preview)"] },
  "gemini-live": { tier: "alias", tags: ["Usa Flash 2.0"] },
  "gemini-video": { tier: "alias", tags: ["Usa Flash 2.5"] },
  "gemini-vision": { tier: "alias", tags: ["Usa Flash 2.5 + visão"] }
};

/** Entradas para o seletor do Brain.AI */
export const GEMINI_BRAIN_MODELS = GEMINI_MODEL_IDS.map((id) => {
  const support = GEMINI_MODEL_SUPPORT[id] || { tier: "full", tags: ["Gemini"] };
  return {
    id,
    name: GEMINI_MODEL_LABELS[id] || id,
    provider: "gemini",
    active: support.tier !== "disabled",
    description: GEMINI_MODEL_DESCRIPTIONS[id] || "Google Gemini",
    supportTier: support.tier,
    supportTags: support.tags
  };
});

export function geminiModelLabel(model) {
  const id = String(model || "").trim().replace(/^gemini:/, "");
  return GEMINI_MODEL_LABELS[id] || id;
}

export function isGeminiModelId(model) {
  const id = String(model || "").trim();
  if (!id) return false;
  if (id.startsWith("gemini:")) return true;
  if (/^gemini/i.test(id)) return true;
  return GEMINI_MODEL_IDS.includes(id);
}
