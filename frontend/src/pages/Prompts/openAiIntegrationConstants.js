/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Modelos e metadados da aba Integração (inalterado). */
export const openAiModels = [
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1",
  "gpt-4.1-mini",
  "o4-mini",
  "o3",
  "o3-mini",
  "gpt-4o-realtime-preview-2024-12-17",
  "gpt-4o-audio-preview-2024-12-17",
  "gpt-4o-mini-tts",
  "text-embedding-3-large",
  "text-embedding-3-small",
  "text-embedding-ada-002"
];

export const modelInfo = {
  "gpt-5.5": {
    title: "GPT‑5.5",
    desc: "Modelo de fronteira — raciocínio e código complexos.",
    context: "1M",
    output: "128K",
    speed: "Rápido",
    quality: "Máxima",
    cost: "Alto",
    iconColor: "#0d9488"
  },
  "gpt-5.4": {
    title: "GPT‑5.4",
    desc: "Equilíbrio entre qualidade e custo na família GPT‑5.",
    context: "1M",
    output: "128K",
    speed: "Rápido",
    quality: "Muito alta",
    cost: "Médio",
    iconColor: "#0f766e"
  },
  "gpt-5.4-mini": {
    title: "GPT‑5.4 Mini",
    desc: "Recomendado para chat e automações (custo/latência).",
    context: "400K",
    output: "128K",
    speed: "Muito rápido",
    quality: "Muito alta",
    cost: "Baixo",
    iconColor: "#10a37f"
  },
  "gpt-5.4-nano": {
    title: "GPT‑5.4 Nano",
    desc: "Tarefas curtas e alto volume.",
    context: "400K",
    output: "128K",
    speed: "Muito rápido",
    quality: "Alta",
    cost: "Muito baixo",
    iconColor: "#14b8a6"
  },
  "o4-mini": {
    title: "o4 Mini",
    desc: "Raciocínio compacto.",
    context: "128K",
    output: "??",
    speed: "Rápido",
    quality: "Alta",
    cost: "Baixo",
    iconColor: "#0369a1"
  },
  "gpt-4o-mini": {
    title: "GPT‑4o Mini",
    desc: "Rápido e econômico, ideal para chat e automações.",
    context: "128K",
    output: "16K",
    speed: "Muito rápido",
    quality: "Alta",
    cost: "Baixo",
    iconColor: "#10a37f"
  },
  "gpt-4o": {
    title: "GPT‑4o",
    desc: "Multimodal equilibrado para qualidade geral.",
    context: "128K",
    output: "16K",
    speed: "Rápido",
    quality: "Muito alta",
    cost: "Médio",
    iconColor: "#0a7f66"
  },
  "gpt-4.1": {
    title: "GPT‑4.1",
    desc: "Alta qualidade de raciocínio.",
    context: "200K",
    output: "??",
    speed: "Médio",
    quality: "Alta",
    cost: "Médio",
    iconColor: "#0f766e"
  },
  "gpt-4.1-mini": {
    title: "GPT‑4.1 Mini",
    desc: "Ótimo custo/benefício.",
    context: "128K",
    output: "16K",
    speed: "Muito rápido",
    quality: "Boa",
    cost: "Baixo",
    iconColor: "#0ea5a4"
  },
  o3: {
    title: "o3",
    desc: "Raciocínio avançado.",
    context: "200K",
    output: "??",
    speed: "Médio",
    quality: "Alta",
    cost: "Alto",
    iconColor: "#0284c7"
  },
  "o3-mini": {
    title: "o3-mini",
    desc: "Raciocínio econômico.",
    context: "128K",
    output: "??",
    speed: "Rápido",
    quality: "Boa",
    cost: "Baixo",
    iconColor: "#22c55e"
  },
  "gpt-4o-realtime-preview-2024-12-17": {
    title: "GPT‑4o Realtime Preview",
    desc: "Experimentos de voz/tempo real.",
    context: "-",
    output: "-",
    speed: "Muito rápido",
    quality: "Boa",
    cost: "Médio",
    iconColor: "#3b82f6"
  },
  "gpt-4o-audio-preview-2024-12-17": {
    title: "GPT‑4o Audio Preview",
    desc: "Geração/entendimento de áudio.",
    context: "-",
    output: "-",
    speed: "Rápido",
    quality: "Boa",
    cost: "Médio",
    iconColor: "#8b5cf6"
  },
  "gpt-4o-mini-tts": {
    title: "GPT‑4o Mini TTS",
    desc: "Texto para fala (TTS).",
    context: "-",
    output: "-",
    speed: "Rápido",
    quality: "Boa",
    cost: "Baixo",
    iconColor: "#0ea5a4"
  },
  "text-embedding-3-large": {
    title: "Embeddings 3 Large",
    desc: "Vetores de alta qualidade.",
    context: "-",
    output: "-",
    speed: "Rápido",
    quality: "Alta",
    cost: "Médio",
    iconColor: "#64748b"
  },
  "text-embedding-3-small": {
    title: "Embeddings 3 Small",
    desc: "Custo reduzido.",
    context: "-",
    output: "-",
    speed: "Rápido",
    quality: "Boa",
    cost: "Baixo",
    iconColor: "#94a3b8"
  },
  "text-embedding-ada-002": {
    title: "Embeddings Ada 002",
    desc: "Legado.",
    context: "-",
    output: "-",
    speed: "Rápido",
    quality: "Média",
    cost: "Baixo",
    iconColor: "#94a3b8"
  }
};

/** Limite exibido no contador (caracteres) — ajuste conforme plano comercial. */
export const PLAN_PROMPT_CHAR_LIMIT = 15000;
