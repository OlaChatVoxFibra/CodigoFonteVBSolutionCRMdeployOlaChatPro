/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Part } from "@google/generative-ai";
import { geminiGenerateContent } from "./GeminiRuntime";
import { GeminiParsedImage } from "../utils/parseGeminiResponse";
import logger from "../../../utils/logger";

const ORCHESTRATOR_JSON_INSTRUCTION = `Responda APENAS com um objeto JSON válido (sem markdown, sem texto antes ou depois) no formato:
{
  "understanding": {
    "userIntent": "string",
    "currentObjective": "string",
    "currentStage": "string",
    "collectedData": [{"key":"string","value":"string"}],
    "missingData": ["string"]
  },
  "decision": {
    "type": "reply_only|ask_missing_info|execute_action|reply_and_execute_action|handoff|ignore_duplicate",
    "reason": "string",
    "nextQuestion": "string ou null",
    "actionSlug": "string ou null",
    "actionVariables": {}
  },
  "reply": "texto para o cliente em português do Brasil"
}

REGRAS CRÍTICAS:
- Somente o campo "reply" será enviado ao cliente no WhatsApp.
- Nunca envie understanding, decision, userIntent, currentStage ou qualquer JSON interno ao cliente.
- Não use markdown (sem \`\`\`json). Retorne apenas o objeto JSON puro.`;

export type GeminiAgentResponse = {
  model: string;
  content: string;
  images: GeminiParsedImage[];
  api: "gemini_generate";
};

export async function createGeminiAgentResponse(params: {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  structuredJson?: boolean;
  userParts?: Part[];
}): Promise<GeminiAgentResponse> {
  const models = [params.model].filter(Boolean);
  let lastErr: unknown;
  for (const model of models) {
    try {
      const msgs = [...params.messages];
      if (params.structuredJson) {
        msgs.push({ role: "system", content: ORCHESTRATOR_JSON_INSTRUCTION });
      }
      const result = await geminiGenerateContent({
        apiKey: params.apiKey,
        model,
        messages: msgs,
        maxOutputTokens: params.maxTokens,
        temperature: params.temperature ?? 0.2,
        topP: params.topP,
        topK: params.topK,
        parts: params.userParts
      });
      return {
        model: result.model,
        content: result.text,
        images: result.images || [],
        api: "gemini_generate"
      };
    } catch (e) {
      lastErr = e;
      logger.warn({
        msg: "[GEMINI-AGENT-RESPONSE] falha no modelo",
        model,
        err: String((e as Error)?.message || e)
      });
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gemini agent response failed");
}
