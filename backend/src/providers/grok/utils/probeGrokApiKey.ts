/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { grokChatCompletions } from "../runtime/GrokRuntime";
import { GROK_DEFAULT_MODEL } from "./grokModelCatalog";

export type GrokProbeResult =
  | null
  | {
      kind: "invalid_key" | "quota" | "model" | "network" | "unknown";
      userMessage: string;
      raw: string;
    };

export async function probeGrokApiKey(
  apiKey: string,
  model = GROK_DEFAULT_MODEL
): Promise<GrokProbeResult> {
  try {
    await grokChatCompletions({
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
    if (
      lower.includes("api key") ||
      lower.includes("incorrect api key") ||
      lower.includes("invalid") ||
      lower.includes("unauthorized") ||
      lower.includes("401") ||
      lower.includes("403")
    ) {
      return {
        kind: "invalid_key",
        userMessage:
          "API Key Grok (xAI) inválida ou sem permissão. Gere em https://console.x.ai/",
        raw
      };
    }
    if (lower.includes("quota") || lower.includes("429") || lower.includes("rate")) {
      return {
        kind: "quota",
        userMessage: "Cota ou rate limit da API Grok excedido. Verifique o console xAI.",
        raw
      };
    }
    if (lower.includes("not found") || lower.includes("404") || lower.includes("model")) {
      return {
        kind: "model",
        userMessage: "Modelo Grok não disponível para esta chave.",
        raw
      };
    }
    if (lower.includes("timeout") || lower.includes("network") || lower.includes("econn")) {
      return {
        kind: "network",
        userMessage: "Não foi possível conectar à API Grok (xAI). Tente novamente.",
        raw
      };
    }
    return {
      kind: "unknown",
      userMessage: `Falha ao validar API Key Grok: ${raw.slice(0, 200)}`,
      raw
    };
  }
}
