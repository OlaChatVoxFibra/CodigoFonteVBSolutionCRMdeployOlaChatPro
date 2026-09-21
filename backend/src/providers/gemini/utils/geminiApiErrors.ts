/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  isGeminiImageGenerationModel,
  resolveGeminiRuntimeModelId
} from "./geminiModelCapabilities";

/** Modelos Nano Banana tentados em ordem quando o usuário pede imagem no Brain. */
export const GEMINI_BRAIN_IMAGE_MODEL_FALLBACKS = [
  "gemini-2.5-flash-image",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview"
] as const;

/** Modelos de chat tentados em ordem quando há 429 / cota no modelo escolhido. */
export const GEMINI_BRAIN_CHAT_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001"
] as const;

export function listGeminiBrainChatModelsToTry(preferred?: string | null): string[] {
  const first = resolveGeminiRuntimeModelId(preferred);
  const ordered = [first, ...GEMINI_BRAIN_CHAT_MODEL_FALLBACKS];
  return [...new Set(ordered.filter((id) => !isGeminiImageGenerationModel(id)))];
}

function errorText(err: unknown): string {
  return String((err as Error)?.message || err || "");
}

export function isGeminiQuotaOrRateLimit(err: unknown): boolean {
  const lower = errorText(err).toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("resource_exhausted")
  );
}

export function isGeminiImageQuotaError(err: unknown): boolean {
  if (!isGeminiQuotaOrRateLimit(err)) return false;
  const lower = errorText(err).toLowerCase();
  return (
    lower.includes("image") ||
    lower.includes("preview-image") ||
    lower.includes("flash-image") ||
    lower.includes("free_tier") ||
    lower.includes("nano")
  );
}

export function formatGeminiErrorForUser(err: unknown): string {
  const raw = errorText(err);

  if (isGeminiImageQuotaError(err)) {
    return [
      "**Geração de imagem (Nano Banana) indisponível nesta API Key**",
      "",
      "O Google bloqueou modelos de imagem no seu plano atual — no free tier a cota costuma ser **0** para `gemini-2.5-flash-preview-image`.",
      "",
      "**O que fazer:**",
      "• Ative faturamento ou um plano com imagem em [Google AI Studio](https://aistudio.google.com/apikey)",
      "• Ou use o app Gemini no navegador (mesma conta Google)",
      "• No Brain, peça só texto/briefing sem pedir imagem, ou use OpenAI/Claude para visuais",
      "",
      "O chat com **Gemini 2.0/2.5 Flash** (sem pedir criativo/imagem) usa a cota de texto normalmente."
    ].join("\n");
  }

  if (isGeminiQuotaOrRateLimit(err)) {
    return [
      "**Limite da API Gemini atingido**",
      "",
      "Sua chave Google (AI Studio) está sem cota no momento — pode ser limite por minuto ou cota diária do plano gratuito.",
      "",
      "**O que fazer:**",
      "• Aguarde 1–2 minutos e tente de novo",
      "• Confira uso em https://ai.dev/rate-limit",
      "• No Brain, teste **Gemini 2.5 Flash** (costuma ter cota separada do 2.0)",
      "• Se persistir, ative faturamento ou crie outra API Key em https://aistudio.google.com/apikey"
    ].join("\n");
  }

  if (raw.includes("GoogleGenerativeAI Error")) {
    const head = raw
      .split("[{")[0]
      .replace(/\[GoogleGenerativeAI Error\]:\s*/i, "")
      .replace(/Error fetching from[^\n]+/i, "")
      .trim();
    return head.length > 420 ? `${head.slice(0, 420)}…` : head || "Erro na API Gemini.";
  }

  return raw.length > 500 ? `${raw.slice(0, 500)}…` : raw || "Erro ao conectar com a API Gemini.";
}
