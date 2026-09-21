/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type { AnthropicAllowedModelId } from "./isClaudeModel";

export type AnthropicModelMeta = {
  label: string;
  contextTokens: number;
  inputPricePerMillionUsd: number;
  outputPricePerMillionUsd: number;
  latencyHint: string;
};

/** Metadados aproximados para sidebar UI — valores orientativos. */
export const ANTHROPIC_MODEL_META: Partial<Record<AnthropicAllowedModelId, AnthropicModelMeta>> = {
  "claude-fable-5": {
    label: "Claude Fable 5",
    contextTokens: 1000000,
    inputPricePerMillionUsd: 10,
    outputPricePerMillionUsd: 50,
    latencyHint: "Moderado (frontier)"
  },
  "claude-sonnet-4-5-20250929": {
    label: "Claude Sonnet 4.5",
    contextTokens: 200000,
    inputPricePerMillionUsd: 3,
    outputPricePerMillionUsd: 15,
    latencyHint: "Rápido"
  },
  "claude-sonnet-4-6": {
    label: "Claude Sonnet 4.6",
    contextTokens: 200000,
    inputPricePerMillionUsd: 3,
    outputPricePerMillionUsd: 15,
    latencyHint: "Rápido"
  },
  "claude-haiku-4-5-20251001": {
    label: "Claude Haiku 4.5",
    contextTokens: 200000,
    inputPricePerMillionUsd: 1,
    outputPricePerMillionUsd: 5,
    latencyHint: "Muito rápido"
  },
  "claude-opus-4-6": {
    label: "Claude Opus 4.6",
    contextTokens: 200000,
    inputPricePerMillionUsd: 15,
    outputPricePerMillionUsd: 75,
    latencyHint: "Moderado"
  },
  "claude-3-5-sonnet-20241022": {
    label: "Claude 3.5 Sonnet",
    contextTokens: 200000,
    inputPricePerMillionUsd: 3,
    outputPricePerMillionUsd: 15,
    latencyHint: "Rápido"
  },
  "claude-3-7-sonnet-latest": {
    label: "Claude 3.7 Sonnet (legado)",
    contextTokens: 200000,
    inputPricePerMillionUsd: 3,
    outputPricePerMillionUsd: 15,
    latencyHint: "Legado"
  },
  "claude-sonnet-4-20250514": {
    label: "Claude Sonnet 4",
    contextTokens: 200000,
    inputPricePerMillionUsd: 3,
    outputPricePerMillionUsd: 15,
    latencyHint: "Rápido"
  },
  "claude-opus-4-20250514": {
    label: "Claude Opus 4",
    contextTokens: 200000,
    inputPricePerMillionUsd: 15,
    outputPricePerMillionUsd: 75,
    latencyHint: "Moderado"
  },
  "claude-3-haiku-20240307": {
    label: "Claude 3 Haiku (aposentado)",
    contextTokens: 200000,
    inputPricePerMillionUsd: 0.25,
    outputPricePerMillionUsd: 1.25,
    latencyHint: "Substituir por Haiku 4.5"
  }
};
