/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { grokChatCompletions } from "./GrokRuntime";
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

export type GrokAgentResponse = {
  model: string;
  content: string;
  api: "grok_chat";
};

export async function createGrokAgentResponse(params: {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  structuredJson?: boolean;
}): Promise<GrokAgentResponse> {
  const models = [params.model].filter(Boolean);
  let lastErr: unknown;
  for (const model of models) {
    try {
      const msgs = [...params.messages];
      if (params.structuredJson) {
        msgs.push({ role: "system", content: ORCHESTRATOR_JSON_INSTRUCTION });
      }
      const result = await grokChatCompletions({
        apiKey: params.apiKey,
        model,
        messages: msgs,
        maxOutputTokens: params.maxTokens,
        temperature: params.temperature ?? 0.2,
        topP: params.topP
      });
      return {
        model: result.model,
        content: result.text,
        api: "grok_chat"
      };
    } catch (e) {
      lastErr = e;
      logger.warn({
        msg: "[GROK-AGENT-RESPONSE] falha no modelo",
        model,
        err: String((e as Error)?.message || e)
      });
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Grok agent response failed");
}
