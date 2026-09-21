/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Anthropic from "@anthropic-ai/sdk";
import logger from "../../../utils/logger";
import { resolveAnthropicModelId } from "../utils/anthropicModelResolve";
import { buildAnthropicSamplingParams } from "../utils/anthropicSamplingParams";

export type AnthropicMessageTurn = { role: "user" | "assistant"; content: string };

export type AnthropicRuntimeResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  durationMs: number;
  stopReason?: string | null;
};

const DEFAULT_TIMEOUT_MS = 120000;

function extractText(blocks: Array<{ type: string; text?: string }>): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "text") {
      parts.push(String(b.text || ""));
    }
  }
  return parts.join("\n").trim();
}

export async function anthropicMessagesCreate(params: {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  system?: string;
  messages: AnthropicMessageTurn[];
}): Promise<AnthropicRuntimeResult> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    timeout: DEFAULT_TIMEOUT_MS,
    maxRetries: 1
  });
  const started = Date.now();
  const model = resolveAnthropicModelId(params.model);
  const sampling = buildAnthropicSamplingParams({
    model,
    temperature: params.temperature,
    topP: params.topP
  });
  try {
    const resp = await client.messages.create({
      model,
      max_tokens: params.maxTokens,
      ...sampling,
      system: params.system,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content
      }))
    });
    const text = extractText((resp.content || []) as Array<{ type: string; text?: string }>);
    const durationMs = Date.now() - started;
    return {
      text,
      inputTokens: resp.usage?.input_tokens ?? 0,
      outputTokens: resp.usage?.output_tokens ?? 0,
      model: resp.model,
      durationMs,
      stopReason: resp.stop_reason
    };
  } catch (e: any) {
    logger.warn({
      msg: "[ANTHROPIC-RUNTIME] messages.create falhou",
      err: String(e?.message || e)
    });
    throw e;
  }
}
