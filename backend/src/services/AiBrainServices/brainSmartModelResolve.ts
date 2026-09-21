/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  getBrainPlatformApiKey,
  type BrainPlatformProvider
} from "./brainPlatformCredentials";
import type { BrainLlmProvider } from "./brainModelRouting";

export type BrainSmartMode = "auto" | "flash";
export type BrainRequestComplexity = "easy" | "standard" | "complex";

const SMART_MODE_IDS = new Set(["auto", "flash"]);

/** Modelos rápidos / econômicos (equivalente ao Flash do Cursor). */
const FLASH_MODELS: Record<BrainLlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5-20251001",
  gemini: "gemini-2.5-flash",
  grok: "grok-4-1-fast"
};

/** Modelos equilibrados para pedidos médios no modo Auto. */
const STANDARD_MODELS: Record<BrainLlmProvider, string> = {
  openai: "gpt-5.5-mini",
  anthropic: "claude-sonnet-4-5-20250929",
  gemini: "gemini-2.5-flash",
  grok: "grok-4-1-fast"
};

/** Modelos mais capazes para pedidos complexos no modo Auto. */
const COMPLEX_MODELS: Record<BrainLlmProvider, string> = {
  openai: "gpt-5.5",
  anthropic: "claude-sonnet-4-6",
  gemini: "gemini-2.5-pro",
  grok: "grok-4"
};

const PROVIDER_PRIORITY: BrainLlmProvider[] = [
  "openai",
  "anthropic",
  "gemini",
  "grok"
];

export function isBrainSmartModeId(model?: string | null): model is BrainSmartMode {
  const id = String(model || "")
    .trim()
    .toLowerCase();
  return SMART_MODE_IDS.has(id);
}

export function normalizeBrainSmartModeId(
  model?: string | null
): BrainSmartMode | null {
  const id = String(model || "")
    .trim()
    .toLowerCase();
  if (id === "auto" || id === "flash") return id;
  return null;
}

/**
 * Heurística leve (estilo Cursor): pedidos curtos/simples → easy;
 * análise/código/relatórios longos → complex; restante → standard.
 */
export function estimateBrainRequestComplexity(params: {
  message?: string | null;
  hasAttachments?: boolean;
  voiceMode?: boolean;
  mcpCount?: number;
}): BrainRequestComplexity {
  const text = String(params.message || "").trim();
  const len = text.length;
  const lower = text.toLowerCase();

  const heavyRe =
    /\b(c[oó]digo|arquitet|refator|analis[ea]|relat[oó]rio|estrat[eé]g|racioc[ií]n|debug|otimiz|migra|implement|planejament|compar[ae]|explique em detalhe|passo a passo|trade-?off|vantagens e desvantagens|crie um app|gere um projeto|figma|sql complexo)\b/i;
  const easyRe =
    /^(oi|ol[aá]|hey|hi|hello|obrigad|valeu|ok|sim|n[aã]o)\b/i;
  const lightTaskRe =
    /\b(liste|listar|mostre|mostrar|quantos|qual o status|resumo r[aá]pido|crie uma atividade|criar atividade|novo contato)\b/i;

  let score = 0;
  if (len > 900) score += 3;
  else if (len > 450) score += 2;
  else if (len > 180) score += 1;

  if (heavyRe.test(lower)) score += 3;
  if (params.hasAttachments) score += 2;
  if ((params.mcpCount || 0) > 0) score += 1;
  if (params.voiceMode && len > 120) score += 1;

  if (score <= 1 && (easyRe.test(lower) || (len < 100 && lightTaskRe.test(lower)))) {
    return "easy";
  }
  if (score <= 2 && len < 140 && !heavyRe.test(lower)) {
    return "easy";
  }
  if (score >= 4) return "complex";
  return "standard";
}

function providerConfigured(provider: BrainPlatformProvider): boolean {
  return Boolean(getBrainPlatformApiKey(provider));
}

/**
 * Escolhe o primeiro provedor com chave da plataforma.
 * Grok fica por último (pode falhar sem chave de org; assertGrok trata fallback).
 */
export function pickAvailableBrainProvider(): BrainLlmProvider {
  for (const provider of PROVIDER_PRIORITY) {
    if (provider === "grok") continue;
    if (providerConfigured(provider)) return provider;
  }
  // Último recurso: tentar Grok (assertGrok pode usar chave da empresa).
  return "grok";
}

export function resolveBrainSmartModeModel(params: {
  mode: BrainSmartMode;
  message?: string | null;
  hasAttachments?: boolean;
  voiceMode?: boolean;
  mcpCount?: number;
}): { provider: BrainLlmProvider; modelId: string; complexity: BrainRequestComplexity } {
  const complexity =
    params.mode === "flash"
      ? "easy"
      : estimateBrainRequestComplexity(params);

  const provider = pickAvailableBrainProvider();
  let modelId: string;
  if (params.mode === "flash" || complexity === "easy") {
    modelId = FLASH_MODELS[provider];
  } else if (complexity === "complex") {
    modelId = COMPLEX_MODELS[provider];
  } else {
    modelId = STANDARD_MODELS[provider];
  }

  return { provider, modelId, complexity };
}
