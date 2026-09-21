/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { modelInfo } from "./openAiIntegrationConstants";
import { CLAUDE_MODEL_LABELS, claudeModelLabel, isClaudeModelId } from "../../providers/anthropic/models";
import {
  AGENT_GEMINI_PRIMARY_MODELS,
  GEMINI_MODEL_LABELS,
  geminiModelLabel,
  isGeminiModelId
} from "../../providers/gemini/models";
import {
  AGENT_GROK_PRIMARY_MODELS,
  GROK_MODEL_LABELS,
  grokModelLabel,
  isGrokModelId
} from "../../providers/grok/models";
import { geminiModelInfo } from "./geminiIntegrationConstants";

/** Principais modelos OpenAI no editor de agentes (sem repetir famílias/versões). */
export const AGENT_OPENAI_PRIMARY_MODELS = ["gpt-5.5", "gpt-4o", "gpt-4o-mini", "o4-mini"];

export const AGENT_OPENAI_MODEL_GROUPS = [
  { label: "OpenAI", models: AGENT_OPENAI_PRIMARY_MODELS }
];

export const AGENT_OPENAI_MODEL_IDS = [...AGENT_OPENAI_PRIMARY_MODELS];

/**
 * Principais modelos Claude — listados no agente somente com integração Claude ativa em Conexões.
 */
export const AGENT_CLAUDE_PRIMARY_MODELS = [
  "claude-sonnet-4-6",
  "claude-haiku-4-5-20251001",
  "claude-opus-4-6",
  "claude-fable-5"
];

export const AGENT_CLAUDE_MODEL_GROUPS = [
  { label: "Claude", models: AGENT_CLAUDE_PRIMARY_MODELS }
];

export const AGENT_CLAUDE_MODEL_IDS = [...AGENT_CLAUDE_PRIMARY_MODELS];

/** Principais modelos Gemini — integração isolada em Conexões. */
export { AGENT_GEMINI_PRIMARY_MODELS };
export const AGENT_GEMINI_MODEL_IDS = [...AGENT_GEMINI_PRIMARY_MODELS];

/** Principais modelos Grok (xAI). */
export { AGENT_GROK_PRIMARY_MODELS };
export const AGENT_GROK_MODEL_IDS = [...AGENT_GROK_PRIMARY_MODELS];

/**
 * Monta grupos do select de modelo do agente (sem IDs duplicados).
 * Itens ficam desabilitados (cinza) se a integração correspondente não estiver pronta.
 */
export function buildAgentModelSelectGroups({
  provider = "auto",
  openAiReady = false,
  claudeReady = false,
  geminiReady = false,
  grokReady = false,
  currentModelId = ""
}) {
  const groups = [];
  const seen = new Set();
  const cur = String(currentModelId || "").trim();
  const curIsClaude = isClaudeModelId(cur);
  const curIsGemini = isGeminiModelId(cur);
  const curIsGrok = isGrokModelId(cur);

  const pushGroup = (label, models, prov, disabled = false) => {
    const uniq = models.filter((id) => {
      const key = String(id).trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (uniq.length) groups.push({ label, models: uniq, provider: prov, disabled });
  };

  const showOpenAi = provider === "openai" || provider === "auto";
  const showClaude = provider === "anthropic" || provider === "auto";
  const showGemini = provider === "gemini" || provider === "auto";
  const showGrok = provider === "grok" || provider === "auto";

  if (showOpenAi) {
    pushGroup("OpenAI", AGENT_OPENAI_PRIMARY_MODELS, "openai", !openAiReady);
  }
  if (showClaude) {
    pushGroup("Claude", AGENT_CLAUDE_PRIMARY_MODELS, "anthropic", !claudeReady);
  }
  if (showGemini) {
    pushGroup("Gemini", AGENT_GEMINI_PRIMARY_MODELS, "gemini", !geminiReady);
  }
  if (showGrok) {
    pushGroup("Grok", AGENT_GROK_PRIMARY_MODELS, "grok", !grokReady);
  }

  if (cur && !seen.has(cur)) {
    const curProvider = curIsGrok
      ? "grok"
      : curIsGemini
        ? "gemini"
        : curIsClaude
          ? "anthropic"
          : "openai";
    const curLabel = curIsGrok
      ? "Modelo atual (Grok)"
      : curIsGemini
        ? "Modelo atual (Gemini)"
        : curIsClaude
          ? "Modelo atual (Claude)"
          : "Modelo atual";
    groups.unshift({
      label: curLabel,
      models: [cur],
      provider: curProvider
    });
  }

  return groups;
}

export const claudeModelInfo = {
  "claude-fable-5": {
    title: "Claude Fable 5",
    desc: "Frontier Mythos-class — raciocínio longo, código autônomo e documentos de 1M tokens.",
    context: "1M",
    speed: "Moderado",
    quality: "Frontier",
    cost: "Premium",
    iconColor: "#B45309"
  },
  "claude-sonnet-4-6": {
    title: "Claude Sonnet 4.6",
    desc: "Equilíbrio entre inteligência, velocidade e custo.",
    context: "200K",
    speed: "Rápido",
    quality: "Muito alta",
    cost: "Médio",
    iconColor: "#D97757"
  },
  "claude-sonnet-4-5-20250929": {
    title: "Claude Sonnet 4.5",
    desc: "Sonnet estável — excelência geral.",
    context: "200K",
    speed: "Rápido",
    quality: "Muito alta",
    cost: "Médio",
    iconColor: "#D97757"
  },
  "claude-haiku-4-5-20251001": {
    title: "Claude Haiku 4.5",
    desc: "Rápido e econômico para alto volume.",
    context: "200K",
    speed: "Muito rápido",
    quality: "Alta",
    cost: "Baixo",
    iconColor: "#D97757"
  },
  "claude-opus-4-6": {
    title: "Claude Opus 4.6",
    desc: "Máxima qualidade Anthropic.",
    context: "200K",
    speed: "Moderado",
    quality: "Máxima",
    cost: "Alto",
    iconColor: "#D97757"
  }
};

export const grokModelInfo = {
  "grok-4-1-fast": {
    title: "Grok 4.1 Fast",
    desc: "Rápido e recomendado para atendimento.",
    context: "128K+",
    speed: "Muito rápido",
    quality: "Alta",
    cost: "Médio",
    iconColor: "#1C1C1C"
  },
  "grok-4-1-fast-reasoning": {
    title: "Grok 4.1 Fast Reasoning",
    desc: "Fast com raciocínio reforçado.",
    context: "128K+",
    speed: "Rápido",
    quality: "Muito alta",
    cost: "Médio",
    iconColor: "#1C1C1C"
  },
  "grok-4": {
    title: "Grok 4",
    desc: "Modelo principal xAI.",
    context: "256K+",
    speed: "Moderado",
    quality: "Máxima",
    cost: "Alto",
    iconColor: "#1C1C1C"
  },
  "grok-3": {
    title: "Grok 3",
    desc: "Geração anterior estável.",
    context: "128K",
    speed: "Rápido",
    quality: "Alta",
    cost: "Médio",
    iconColor: "#1C1C1C"
  },
  "grok-3-mini": {
    title: "Grok 3 Mini",
    desc: "Econômico para alto volume.",
    context: "128K",
    speed: "Muito rápido",
    quality: "Boa",
    cost: "Baixo",
    iconColor: "#1C1C1C"
  },
  "grok-2-vision-1212": {
    title: "Grok 2 Vision",
    desc: "Compreensão de imagens.",
    context: "32K",
    speed: "Rápido",
    quality: "Alta",
    cost: "Médio",
    iconColor: "#1C1C1C"
  }
};

export function resolveModelMeta(modelId) {
  const id = String(modelId || "").trim();
  if (!id) return null;
  if (isGrokModelId(id)) {
    return (
      grokModelInfo[id] || {
        title: grokModelLabel(id),
        desc: "Modelo Grok (xAI).",
        context: "—",
        speed: "—",
        quality: "—",
        cost: "—",
        iconColor: "#1C1C1C"
      }
    );
  }
  if (isGeminiModelId(id)) {
    return (
      geminiModelInfo[id] || {
        title: geminiModelLabel(id),
        desc: "Modelo Google Gemini.",
        context: "1M",
        speed: "—",
        quality: "—",
        cost: "—",
        iconColor: "#4285F4"
      }
    );
  }
  if (isClaudeModelId(id)) {
    return (
      claudeModelInfo[id] || {
        title: claudeModelLabel(id),
        desc: "Modelo Claude (Anthropic).",
        context: "200K",
        speed: "—",
        quality: "—",
        cost: "—",
        iconColor: "#D97757"
      }
    );
  }
  return (
    modelInfo[id] || {
      title: id,
      desc: "Modelo OpenAI.",
      context: "—",
      speed: "—",
      quality: "—",
      cost: "—",
      iconColor: "#10a37f"
    }
  );
}

export function labelForAgentModel(modelId) {
  const id = String(modelId || "").trim();
  if (isGrokModelId(id)) return GROK_MODEL_LABELS[id] || grokModelLabel(id);
  if (isGeminiModelId(id)) return GEMINI_MODEL_LABELS[id] || geminiModelLabel(id);
  if (isClaudeModelId(id)) return CLAUDE_MODEL_LABELS[id] || id;
  return modelInfo[id]?.title || id;
}
