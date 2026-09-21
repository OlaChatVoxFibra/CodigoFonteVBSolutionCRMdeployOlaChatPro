/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import OpenAI from "openai";
import { GROK_API_BASE_URL } from "../utils/grokModelCatalog";
import { resolveGrokModelId } from "../utils/isGrokModel";
import logger from "../../../utils/logger";

export type GrokChatMessage = { role: string; content: string };

export type GrokGenerateParams = {
  apiKey: string;
  model: string;
  messages: GrokChatMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
};

export type GrokGenerateResult = {
  text: string;
  model: string;
  latencyMs: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export function createGrokClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey: String(apiKey || "").trim(),
    baseURL: GROK_API_BASE_URL,
    timeout: 90000
  });
}

export async function grokChatCompletions(
  params: GrokGenerateParams
): Promise<GrokGenerateResult> {
  const started = Date.now();
  const model = resolveGrokModelId(params.model);
  const client = createGrokClient(params.apiKey);

  const messages = (params.messages || [])
    .filter((m) => m && String(m.content || "").length >= 0)
    .map((m) => ({
      role: (m.role === "assistant" || m.role === "system" ? m.role : "user") as
        | "system"
        | "user"
        | "assistant",
      content: String(m.content || "")
    }));

  try {
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature:
        typeof params.temperature === "number" ? params.temperature : 1,
      top_p: typeof params.topP === "number" ? params.topP : undefined,
      max_tokens: params.maxOutputTokens ?? 4096
    });

    const text = String(response.choices?.[0]?.message?.content || "").trim();
    return {
      text,
      model: response.model || model,
      latencyMs: Date.now() - started,
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens
      }
    };
  } catch (e: any) {
    const status = e?.status || e?.response?.status;
    const msg =
      e?.error?.message ||
      e?.message ||
      (typeof e === "string" ? e : "Falha na API Grok (xAI)");
    logger.warn({
      msg: "[GROK-RUNTIME] chat.completions falhou",
      model,
      status,
      err: String(msg).slice(0, 300)
    });
    throw new Error(String(msg));
  }
}
