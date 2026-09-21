/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { geminiGenerateContent } from "../runtime/GeminiRuntime";
import { GEMINI_DEFAULT_MODEL } from "./isGeminiModel";

export type GeminiProbeResult =
  | null
  | {
      kind: "invalid_key" | "quota" | "model" | "network" | "unknown";
      userMessage: string;
      raw: string;
    };

export async function probeGeminiApiKey(
  apiKey: string,
  model = GEMINI_DEFAULT_MODEL
): Promise<GeminiProbeResult> {
  try {
    await geminiGenerateContent({
      apiKey,
      model,
      messages: [{ role: "user", content: "Responda apenas: ok" }],
      maxOutputTokens: 16,
      temperature: 0
    });
    return null;
  } catch (e: any) {
    const raw = String(e?.message || e || "");
    const lower = raw.toLowerCase();
    if (lower.includes("api key") || lower.includes("api_key") || lower.includes("401")) {
      return {
        kind: "invalid_key",
        userMessage: "API Key Gemini inválida ou sem permissão.",
        raw
      };
    }
    if (lower.includes("quota") || lower.includes("429")) {
      return {
        kind: "quota",
        userMessage: "Cota ou limite da API Gemini excedido. Verifique o Google AI Studio.",
        raw
      };
    }
    if (lower.includes("not found") || lower.includes("404")) {
      return {
        kind: "model",
        userMessage: "Modelo Gemini não disponível para esta chave.",
        raw
      };
    }
    if (lower.includes("timeout") || lower.includes("network")) {
      return {
        kind: "network",
        userMessage: "Não foi possível conectar à API Gemini. Tente novamente.",
        raw
      };
    }
    return {
      kind: "unknown",
      userMessage: `Falha ao validar API Key: ${raw.slice(0, 200)}`,
      raw
    };
  }
}
