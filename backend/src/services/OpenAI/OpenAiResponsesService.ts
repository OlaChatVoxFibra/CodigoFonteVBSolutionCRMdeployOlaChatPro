/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import logger from "../../utils/logger";

export type OpenAiStructuredFormat = {
  type: "json_schema";
  json_schema: Record<string, unknown>;
};

export type OpenAiAgentRequest = {
  client: any;
  models: string[];
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  timeoutMs: number;
  temperature?: number;
  responseFormat?: OpenAiStructuredFormat;
  tools?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  preferResponses?: boolean;
};

export type OpenAiAgentResponse = {
  model: string;
  content: string;
  raw: any;
  api: "responses" | "chat_completions";
};

function isEnabledByEnv(key: string, defaultValue: boolean): boolean {
  const raw = String(process.env[key] || "").trim().toLowerCase();
  if (!raw) return defaultValue;
  return !["0", "false", "off", "no"].includes(raw);
}

function responseFormatToResponsesTextFormat(format?: OpenAiStructuredFormat): Record<string, unknown> | undefined {
  if (!format?.json_schema) return undefined;
  return {
    format: {
      type: "json_schema",
      ...format.json_schema
    }
  };
}

function extractResponsesText(response: any): string {
  if (!response) return "";
  if (typeof response.output_text === "string") return response.output_text.trim();
  const output = Array.isArray(response.output) ? response.output : [];
  const parts: string[] = [];
  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string") parts.push(c.text);
      else if (typeof c?.output_text === "string") parts.push(c.output_text);
    }
  }
  return parts.join("\n").trim();
}

function extractChatText(response: any): string {
  return String(response?.choices?.[0]?.message?.content || "").trim();
}

function shouldTryNextModel(error: any): boolean {
  const msg = String(error?.message || error?.response?.data?.error?.message || error || "").toLowerCase();
  return (
    msg.includes("model") ||
    msg.includes("does not exist") ||
    msg.includes("not found") ||
    msg.includes("unsupported") ||
    msg.includes("not support") ||
    msg.includes("response_format") ||
    msg.includes("json_schema") ||
    msg.includes("invalid_request")
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs))
  ]);
}

async function createWithResponses(params: OpenAiAgentRequest, model: string): Promise<OpenAiAgentResponse> {
  const payload: Record<string, unknown> = {
    model,
    input: params.messages,
    max_output_tokens: params.maxTokens,
    store: false,
    ...(params.metadata ? { metadata: params.metadata } : {})
  };
  if (params.tools?.length) payload.tools = params.tools;
  const text = responseFormatToResponsesTextFormat(params.responseFormat);
  if (text) payload.text = text;
  if (typeof params.temperature === "number") payload.temperature = params.temperature;
  const raw = await withTimeout(
    params.client.responses.create(payload),
    params.timeoutMs,
    "openai_responses"
  );
  return { model, raw, api: "responses", content: extractResponsesText(raw) };
}

async function createWithChatCompletions(params: OpenAiAgentRequest, model: string): Promise<OpenAiAgentResponse> {
  const payload: Record<string, unknown> = {
    model,
    messages: params.messages,
    temperature: typeof params.temperature === "number" ? params.temperature : 0.2,
    max_tokens: params.maxTokens
  };
  if (params.responseFormat) payload.response_format = params.responseFormat;
  const raw = await withTimeout(
    params.client.chat.completions.create(payload),
    params.timeoutMs,
    "openai_chat_completions"
  );
  return { model, raw, api: "chat_completions", content: extractChatText(raw) };
}

export async function createOpenAiAgentResponse(params: OpenAiAgentRequest): Promise<OpenAiAgentResponse> {
  const models = [...new Set((params.models || []).map((m) => String(m || "").trim()).filter(Boolean))];
  if (!models.length) throw new Error("openai_no_model_configured");

  const responsesEnabled =
    params.preferResponses !== false && isEnabledByEnv("OPENAI_RESPONSES_RUNTIME_ENABLED", true);
  const canUseResponses = responsesEnabled && typeof params.client?.responses?.create === "function";
  let lastError: any = null;

  for (const model of models) {
    if (canUseResponses) {
      try {
        return await createWithResponses(params, model);
      } catch (error: any) {
        lastError = error;
        logger.warn(
          `[OPENAI-RESPONSES] falhou model=${model}; ${
            shouldTryNextModel(error) ? "tentando proximo/fallback" : "caindo para chat se disponivel"
          }: ${error?.message || error}`
        );
        if (shouldTryNextModel(error)) continue;
      }
    }

    if (typeof params.client?.chat?.completions?.create === "function") {
      try {
        const out = await createWithChatCompletions(params, model);
        if (canUseResponses === false && responsesEnabled) {
          logger.warn(`[OPENAI-RESPONSES] SDK/client sem responses.create; usando Chat Completions model=${model}`);
        }
        return out;
      } catch (error: any) {
        lastError = error;
        if (!shouldTryNextModel(error)) throw error;
        logger.warn(`[OPENAI-FALLBACK] model=${model} indisponivel; tentando proximo: ${error?.message || error}`);
      }
    }
  }

  throw lastError || new Error("openai_all_models_failed");
}

