/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { claudeModelLabel } from "../../providers/anthropic/models";

/** Metadados do painel direito — aba Integração (Claude). */
export const claudeModelInfo = {
  "claude-fable-5": {
    title: "Claude Fable 5",
    desc:
      "Modelo frontier Mythos-class da Anthropic (jun/2026). Máxima capacidade para raciocínio longo, código autônomo, análise de documentos extensos, visão e agentes de longo horizonte no Brain.AI.",
    context: "1M",
    output: "128K",
    speed: "Moderado",
    quality: "Frontier",
    cost: "Premium",
    inputPrice: "$10.00",
    outputPrice: "$50.00"
  },
  "claude-sonnet-4-5-20250929": {
    title: "Claude Sonnet 4.5",
    desc: "Recomendado para atendimento, roteiro e Brain — bom equilíbrio qualidade/custo.",
    context: "200K",
    output: "64K",
    speed: "Rápido",
    quality: "Muito alta",
    cost: "Médio",
    inputPrice: "$3.00",
    outputPrice: "$15.00"
  },
  "claude-sonnet-4-6": {
    title: "Claude Sonnet 4.6",
    desc: "Geração mais recente da família Sonnet.",
    context: "200K",
    output: "64K",
    speed: "Rápido",
    quality: "Máxima",
    cost: "Médio-alto",
    inputPrice: "$3.00",
    outputPrice: "$15.00"
  },
  "claude-haiku-4-5-20251001": {
    title: "Claude Haiku 4.5",
    desc: "Respostas rápidas e econômicas para alto volume.",
    context: "200K",
    output: "64K",
    speed: "Muito rápido",
    quality: "Alta",
    cost: "Baixo",
    inputPrice: "$1.00",
    outputPrice: "$5.00"
  },
  "claude-opus-4-6": {
    title: "Claude Opus 4.6",
    desc: "Máxima capacidade de raciocínio e redação.",
    context: "200K",
    output: "64K",
    speed: "Moderado",
    quality: "Máxima",
    cost: "Alto",
    inputPrice: "$15.00",
    outputPrice: "$75.00"
  },
  "claude-3-5-sonnet-20241022": {
    title: "Claude 3.5 Sonnet",
    desc: "Modelo legado — prefira Sonnet 4.5 se disponível.",
    context: "200K",
    output: "8K",
    speed: "Rápido",
    quality: "Alta",
    cost: "Médio",
    inputPrice: "$3.00",
    outputPrice: "$15.00"
  },
  "claude-3-7-sonnet-latest": {
    title: "Claude 3.7 Sonnet",
    desc: "Alias legado (mapeado automaticamente para Sonnet 4.5 na API).",
    context: "200K",
    output: "64K",
    speed: "Rápido",
    quality: "Alta",
    cost: "Médio",
    inputPrice: "$3.00",
    outputPrice: "$15.00"
  },
  "claude-sonnet-4-20250514": {
    title: "Claude Sonnet 4",
    desc: "Sonnet 4 — substitua por 4.5/4.6 quando possível.",
    context: "200K",
    output: "64K",
    speed: "Rápido",
    quality: "Alta",
    cost: "Médio",
    inputPrice: "$3.00",
    outputPrice: "$15.00"
  },
  "claude-opus-4-20250514": {
    title: "Claude Opus 4",
    desc: "Opus 4 — máxima qualidade com custo elevado.",
    context: "200K",
    output: "64K",
    speed: "Moderado",
    quality: "Máxima",
    cost: "Alto",
    inputPrice: "$15.00",
    outputPrice: "$75.00"
  }
};

export function getClaudeModelMeta(modelId) {
  const id = String(modelId || "").trim();
  if (claudeModelInfo[id]) return claudeModelInfo[id];
  return {
    title: claudeModelLabel(id) || id || "Claude",
    desc: "Modelo Anthropic selecionado.",
    context: "200K",
    output: "—",
    speed: "—",
    quality: "—",
    cost: "—",
    inputPrice: "—",
    outputPrice: "—"
  };
}
