/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { anthropicMessagesCreate } from "./AnthropicRuntime";
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

export type AnthropicAgentResponse = {
  model: string;
  content: string;
  api: "anthropic_messages";
};

export async function createAnthropicAgentResponse(params: {
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  temperature?: number;
  structuredJson?: boolean;
}): Promise<AnthropicAgentResponse> {
  const models = [params.model].filter(Boolean);
  let lastErr: unknown;
  for (const model of models) {
    try {
      const systemParts: string[] = [];
      const nonSystem = params.messages.filter((m) => m.role !== "system");
      const systemMsgs = params.messages.filter((m) => m.role === "system");
      for (const s of systemMsgs) {
        if (s.content?.trim()) systemParts.push(s.content.trim());
      }
      if (params.structuredJson) {
        systemParts.push(ORCHESTRATOR_JSON_INSTRUCTION);
      }
      const turns: { role: "user" | "assistant"; content: string }[] = [];
      for (const m of nonSystem) {
        const role = m.role === "assistant" ? "assistant" : "user";
        if (!String(m.content || "").trim()) continue;
        turns.push({ role, content: String(m.content) });
      }
      if (!turns.length) {
        turns.push({ role: "user", content: "ok" });
      }
      const result = await anthropicMessagesCreate({
        apiKey: params.apiKey,
        model,
        maxTokens: params.maxTokens,
        temperature: params.temperature ?? 0.2,
        system: systemParts.join("\n\n"),
        messages: turns
      });
      return {
        model: result.model,
        content: result.text,
        api: "anthropic_messages"
      };
    } catch (e) {
      lastErr = e;
      logger.warn({
        msg: "[ANTHROPIC-AGENT-RESPONSE] falha no modelo",
        model,
        err: String((e as Error)?.message || e)
      });
    }
  }
  throw lastErr || new Error("Anthropic agent response failed");
}
