/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export const DEFAULT_BRAIN_PERSONALIZATION = {
  toneStyle: "balanced",
  verbosity: "balanced",
  proactivity: "balanced",
  conversationStyle: "collaborative",
  emojiUsage: "sparingly",
  askClarifyingQuestions: true,
  useBulletPoints: true,
  customInstructions: "",
};

export const BRAIN_TONE_OPTIONS = [
  { id: "formal", label: "Formal", hint: "Profissional, objetivo e respeitoso." },
  { id: "balanced", label: "Equilibrado", hint: "Amigável sem perder clareza." },
  { id: "casual", label: "Descontraído", hint: "Leve, próximo e conversacional." },
  { id: "direct", label: "Direto", hint: "Vai ao ponto, sem rodeios." },
];

export const BRAIN_VERBOSITY_OPTIONS = [
  { id: "concise", label: "Conciso", hint: "Respostas curtas; só o essencial." },
  { id: "balanced", label: "Equilibrado", hint: "Detalhe moderado com boa legibilidade." },
  { id: "detailed", label: "Detalhado", hint: "Explicações completas e contexto extra." },
];

export const BRAIN_PROACTIVITY_OPTIONS = [
  { id: "reactive", label: "Reativo", hint: "Responde só o que foi pedido." },
  { id: "balanced", label: "Equilibrado", hint: "Sugere próximos passos quando fizer sentido." },
  { id: "proactive", label: "Proativo", hint: "Antecipa necessidades e propõe ações." },
];

export const BRAIN_CONVERSATION_STYLE_OPTIONS = [
  { id: "collaborative", label: "Colaborativo", hint: "Trabalha com você como parceiro." },
  { id: "instructional", label: "Didático", hint: "Ensina passo a passo quando necessário." },
  { id: "executive", label: "Executivo", hint: "Foco em decisões, impacto e prioridades." },
  { id: "analytical", label: "Analítico", hint: "Dados, comparações e raciocínio estruturado." },
];

export const BRAIN_EMOJI_OPTIONS = [
  { id: "never", label: "Nunca", hint: "Sem emojis nas respostas." },
  { id: "sparingly", label: "Com moderação", hint: "Emojis só quando reforçam o tom." },
  { id: "often", label: "Frequente", hint: "Tom mais expressivo com emojis." },
];

export function normalizeBrainPersonalization(raw) {
  const base = { ...DEFAULT_BRAIN_PERSONALIZATION };
  if (!raw || typeof raw !== "object") return base;

  const pick = (key, allowed) => {
    const v = String(raw[key] || "").trim();
    return allowed.includes(v) ? v : base[key];
  };

  return {
    toneStyle: pick("toneStyle", BRAIN_TONE_OPTIONS.map((o) => o.id)),
    verbosity: pick("verbosity", BRAIN_VERBOSITY_OPTIONS.map((o) => o.id)),
    proactivity: pick("proactivity", BRAIN_PROACTIVITY_OPTIONS.map((o) => o.id)),
    conversationStyle: pick("conversationStyle", BRAIN_CONVERSATION_STYLE_OPTIONS.map((o) => o.id)),
    emojiUsage: pick("emojiUsage", BRAIN_EMOJI_OPTIONS.map((o) => o.id)),
    askClarifyingQuestions: raw.askClarifyingQuestions !== false,
    useBulletPoints: raw.useBulletPoints !== false,
    customInstructions: String(raw.customInstructions || "").trim().slice(0, 2000),
  };
}
