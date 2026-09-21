/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Anthropic from "@anthropic-ai/sdk";
import logger from "../../../utils/logger";
import { resolveAnthropicModelId } from "../utils/anthropicModelResolve";
import { buildAnthropicSamplingParams } from "../utils/anthropicSamplingParams";
import {
  extractTextFromAnthropicContent,
  extractToolUsesFromAnthropicContent
} from "../brain/anthropicBrainToolAdapter";

export type AnthropicBrainMessage = Anthropic.Messages.MessageParam;

export type AnthropicBrainTurnResult = {
  stopReason: string | null;
  text: string;
  toolUses: Anthropic.Messages.ToolUseBlock[];
  rawContent: Anthropic.Messages.ContentBlock[];
  inputTokens: number;
  outputTokens: number;
  model: string;
};

const DEFAULT_TIMEOUT_MS = 120000;

export async function anthropicBrainMessagesTurn(params: {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  system?: string;
  tools?: Anthropic.Messages.Tool[];
  messages: AnthropicBrainMessage[];
}): Promise<AnthropicBrainTurnResult> {
  const client = new Anthropic({
    apiKey: params.apiKey,
    timeout: DEFAULT_TIMEOUT_MS,
    maxRetries: 1
  });

  const model = resolveAnthropicModelId(params.model);
  const sampling = buildAnthropicSamplingParams({
    model,
    temperature: params.temperature,
    topP: params.topP
  });

  const resp = await client.messages.create({
    model,
    max_tokens: params.maxTokens,
    ...sampling,
    system: params.system,
    tools: params.tools,
    messages: params.messages
  });

  const blocks = (resp.content || []) as Anthropic.Messages.ContentBlock[];
  return {
    stopReason: resp.stop_reason,
    text: extractTextFromAnthropicContent(blocks),
    toolUses: extractToolUsesFromAnthropicContent(blocks),
    rawContent: blocks,
    inputTokens: resp.usage?.input_tokens ?? 0,
    outputTokens: resp.usage?.output_tokens ?? 0,
    model: resp.model
  };
}

export function appendAssistantToolTurn(
  messages: AnthropicBrainMessage[],
  rawContent: Anthropic.Messages.ContentBlock[]
): void {
  messages.push({
    role: "assistant",
    content: rawContent
  });
}

export function appendToolResults(
  messages: AnthropicBrainMessage[],
  results: { toolUseId: string; content: string }[]
): void {
  messages.push({
    role: "user",
    content: results.map((r) => ({
      type: "tool_result" as const,
      tool_use_id: r.toolUseId,
      content: r.content
    }))
  });
}

export function logAnthropicBrainToolError(err: unknown): void {
  logger.warn({
    msg: "[ANTHROPIC-BRAIN-TOOLS] turn failed",
    err: String((err as Error)?.message || err).slice(0, 400)
  });
}
