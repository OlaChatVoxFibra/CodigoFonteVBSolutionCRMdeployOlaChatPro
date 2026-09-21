/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import OpenAI from "openai";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Prompt from "../../models/Prompt";
import PromptSmartAction from "../../models/PromptSmartAction";
import logger from "../../utils/logger";
import { buildConversationContextDigest } from "../../helpers/conversationContextDigest";
import { sanitizeAgentCustomerVisibleText } from "../../helpers/sanitizeAgentCustomerVisibleText";
import {
  looksLikeAgentOrchestratorJsonLeak,
  sanitizeOrchestratorCustomerReply,
  tryBuildDecisionFromLeakedOrchestratorContent
} from "../../helpers/agentOrchestratorReplyGuard";
import { stripAgentFlowScriptTrainingMarkers } from "../../helpers/stripAgentFlowScriptTrainingMarkers";
import { buildWhatsappPromptScopePreamble } from "../../helpers/whatsappPromptPreamble";
import {
  buildAttendanceFlowLlmAnchor,
  normalizeAttendanceFlowMemory
} from "../../helpers/agentAttendanceFlowMemory";
import {
  AGENT_CONSULTIVE_MODE_DIRECTIVE_PT,
  isAgentRoteiroRuntimeActive
} from "../../helpers/agentRoteiroRuntime";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";
import { normalizeAgentConversationalMemory } from "../../helpers/agentConversationalMemory";
import { buildWhereForConnectionAgentHistory } from "../../helpers/connectionAiMessageHistory";
import { createOpenAiAgentResponse } from "../OpenAI/OpenAiResponsesService";
import { createAnthropicAgentResponse } from "../../providers/anthropic/runtime/AnthropicAgentResponseService";
import { createGeminiAgentResponse } from "../../providers/gemini/runtime/GeminiAgentResponseService";
import { createGrokAgentResponse } from "../../providers/grok/runtime/GrokAgentResponseService";
import { loadGeminiInboundMediaParts } from "../../providers/gemini/agents/geminiTicketMediaParts";
import { resolveGeminiModelId } from "../../providers/gemini/utils/isGeminiModel";
import { isGeminiImageGenerationModel } from "../../providers/gemini/utils/geminiModelCapabilities";
import { resolveGrokModelId } from "../../providers/grok/utils/isGrokModel";
import { normalizeAgentModelId } from "../../providers/anthropic/utils/isClaudeModel";
import { resolveAnthropicModelId } from "../../providers/anthropic/utils/anthropicModelResolve";
import { buildAgentKnowledgeRuntime } from "./AgentKnowledgeRuntimeService";
import { listPromptSmartActionTools as listPromptSmartActionToolsShared } from "./PromptSmartActionExecutorService";
import { getAgentInventoryConfig } from "../../helpers/agentInventoryRuntime";
import { AGENT_OUTBOUND_BUBBLE_MAX_CHARS } from "../../config/openAiDefaults";
import {
  assistantTextImpliesTransferToHuman,
  userRequestsHumanTransfer
} from "../../helpers/assistantTransferIntent";
import {
  assistantTextImpliesSchedulingOffer,
  userProvidesScheduleDateTime,
  userRequestsScheduling
} from "../../helpers/assistantScheduleIntent";
import {
  activityExecutionAuthorized,
  isSilentCustomerSmartActionSlug,
  leadExecutionAuthorized
} from "../../helpers/assistantCrmActionIntent";

export type AgentOrchestratorDecisionType =
  | "reply_only"
  | "ask_missing_info"
  | "execute_action"
  | "reply_and_execute_action"
  | "handoff"
  | "ignore_duplicate";

export type AgentOrchestratorStructuredDecision = {
  understanding: {
    userIntent: string;
    currentObjective: string;
    currentStage: string;
    collectedData: Record<string, unknown>;
    missingData: string[];
  };
  decision: {
    type: AgentOrchestratorDecisionType;
    reason: string;
    nextQuestion: string | null;
    actionSlug: string | null;
    actionVariables: Record<string, unknown>;
  };
  reply: string;
};

export type AgentOrchestratorResult = {
  handled: boolean;
  reply: string;
  decision?: AgentOrchestratorStructuredDecision;
  actionResult?: { success: boolean; message: string; data?: unknown };
  fallbackReason?: string;
  /** Imagens geradas pelo Gemini (Nano Banana) para envio no WhatsApp. */
  geminiImages?: Array<{ mimeType: string; data: string }>;
};

type PromptSmartActionToolMetadata = {
  id: number;
  slug: string;
  type: string;
  name: string;
  description: string;
  requiredFields: string[];
  variables: Record<string, unknown>;
  triggerHints: {
    agent: string[];
    user: string[];
  };
};

export type AgentOrchestratorInput = {
  prompt: Prompt;
  ticket: Ticket;
  contact: Contact;
  userText: string;
  recentMessages?: Message[];
  systemPrompt?: string;
  openaiClient?: any;
  blockedOutboundContext?: {
    blockedReply: string;
    reasons: string[];
  };
};

export function isAgentLlmFirstRuntimeEnabled(): boolean {
  const raw = String(process.env.AGENT_LLM_FIRST_RUNTIME_ENABLED || "").trim().toLowerCase();
  return raw !== "false" && raw !== "0" && raw !== "off";
}

function getAgentOrchestratorStructuredModels(): string[] {
  const configured = String(process.env.AGENT_LLM_FIRST_STRUCTURED_MODEL || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  const bestAgentModels = [
    "gpt-5.5",
    "gpt-5.4",
    "gpt-5.4-mini",
    "gpt-4.1",
    "gpt-4o-2024-08-06",
    "gpt-4.1-mini",
    "gpt-4o-mini",
    "gpt-4o-mini-2024-07-18"
  ];
  return [...new Set([...configured, ...bestAgentModels])];
}

function getInvalidJsonReprocessAttempts(): number {
  const raw = Number(process.env.AGENT_LLM_FIRST_JSON_REPROCESS_ATTEMPTS || 3);
  return Math.max(1, Math.min(Number.isFinite(raw) ? raw : 3, 5));
}

function getAgentOrchestratorMaxTokens(prompt: Prompt): number {
  const configured = Number((prompt as any).maxTokens || 0);
  const safeDefault = 2200;
  const requested = Number.isFinite(configured) && configured > 0 ? configured : safeDefault;
  return Math.max(1800, Math.min(requested, 4096));
}

function truncate(value: unknown, max = 600): string {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length <= max ? text : `${text.slice(0, max - 1)}...`;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => truncate(item, 80)).filter(Boolean).slice(0, 12)
    : [];
}

function asKeyValueRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return asObject(value);
  }
  if (!Array.isArray(value)) return {};
  return value.slice(0, 30).reduce<Record<string, unknown>>((acc, item) => {
    const row = asObject(item);
    const key = truncate(row.key, 80);
    if (!key) return acc;
    acc[key] = row.value == null ? "" : row.value;
    return acc;
  }, {});
}

function normalizeForSemanticCompare(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const QUESTION_STOP_WORDS = new Set([
  "a",
  "o",
  "os",
  "as",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "e",
  "ou",
  "com",
  "para",
  "por",
  "que",
  "qual",
  "quais",
  "quanto",
  "quantos",
  "quantas",
  "voce",
  "você",
  "esta",
  "está",
  "seu",
  "sua",
  "agora"
]);

function semanticTokens(value: string): string[] {
  return normalizeForSemanticCompare(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !QUESTION_STOP_WORDS.has(token));
}

function semanticSimilarity(a: string, b: string): number {
  const at = new Set(semanticTokens(a));
  const bt = new Set(semanticTokens(b));
  if (!at.size || !bt.size) return 0;
  const inter = [...at].filter((token) => bt.has(token)).length;
  return inter / Math.min(at.size, bt.size);
}

function normalizePatternList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => truncate(item, 160)).filter(Boolean).slice(0, 40);
}

function configuredRequiredFields(action: PromptSmartAction): string[] {
  const vars = action.variables && typeof action.variables === "object" ? (action.variables as Record<string, any>) : {};
  const fromVars = Array.isArray(vars.requiredFields) ? vars.requiredFields : [];
  const fromSchema = Array.isArray((action as any).intentSlotSchema)
    ? (action as any).intentSlotSchema
    : Array.isArray((action as any).intentSlotSchema?.required)
      ? (action as any).intentSlotSchema.required
      : [];
  return [...new Set([...fromVars, ...fromSchema].map((field) => truncate(field, 80)).filter(Boolean))];
}

function normalizeDecisionType(value: unknown): AgentOrchestratorDecisionType {
  const raw = String(value || "").trim();
  const allowed: AgentOrchestratorDecisionType[] = [
    "reply_only",
    "ask_missing_info",
    "execute_action",
    "reply_and_execute_action",
    "handoff",
    "ignore_duplicate"
  ];
  return allowed.includes(raw as AgentOrchestratorDecisionType)
    ? (raw as AgentOrchestratorDecisionType)
    : "reply_only";
}

export function validateAgentOrchestratorJson(raw: unknown): AgentOrchestratorStructuredDecision | null {
  const obj = asObject(raw);
  if (!Object.keys(obj).length) return null;
  const understanding = asObject(obj.understanding);
  const decision = asObject(obj.decision);
  const decisionType = normalizeDecisionType(decision.type);
  const nextQuestion = decision.nextQuestion == null ? null : truncate(decision.nextQuestion, 300);
  let reply =
    sanitizeOrchestratorCustomerReply(truncate(obj.reply, 1800)) ||
    (nextQuestion ? sanitizeOrchestratorCustomerReply(truncate(nextQuestion, 1800)) : "");
  if (!reply && decisionType !== "execute_action") return null;
  if (looksLikeAgentOrchestratorJsonLeak(reply)) return null;

  return {
    understanding: {
      userIntent: truncate(understanding.userIntent, 240),
      currentObjective: truncate(understanding.currentObjective, 240),
      currentStage: truncate(understanding.currentStage, 160),
      collectedData: asKeyValueRecord(understanding.collectedData),
      missingData: asStringArray(understanding.missingData)
    },
    decision: {
      type: decisionType,
      reason: truncate(decision.reason, 400),
      nextQuestion,
      actionSlug: decision.actionSlug == null ? null : truncate(decision.actionSlug, 120),
      actionVariables: asKeyValueRecord(decision.actionVariables)
    },
    reply
  };
}

function parseJsonFromModel(content: string): unknown | null {
  const raw = String(content || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

const ORCHESTRATOR_JSON_SCHEMA = {
  name: "agent_orchestrator_decision",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["understanding", "decision", "reply"],
    properties: {
      understanding: {
        type: "object",
        additionalProperties: false,
        required: ["userIntent", "currentObjective", "currentStage", "collectedData", "missingData"],
        properties: {
          userIntent: { type: "string" },
          currentObjective: { type: "string" },
          currentStage: { type: "string" },
          collectedData: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["key", "value"],
              properties: {
                key: { type: "string" },
                value: { type: "string" }
              }
            }
          },
          missingData: {
            type: "array",
            items: { type: "string" }
          }
        }
      },
      decision: {
        type: "object",
        additionalProperties: false,
        required: ["type", "reason", "nextQuestion", "actionSlug", "actionVariables"],
        properties: {
          type: {
            type: "string",
            enum: [
              "reply_only",
              "ask_missing_info",
              "execute_action",
              "reply_and_execute_action",
              "handoff",
              "ignore_duplicate"
            ]
          },
          reason: { type: "string" },
          nextQuestion: { anyOf: [{ type: "string" }, { type: "null" }] },
          actionSlug: { anyOf: [{ type: "string" }, { type: "null" }] },
          actionVariables: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["key", "value"],
              properties: {
                key: { type: "string" },
                value: { type: "string" }
              }
            }
          }
        }
      },
      reply: {
        type: "string",
        description:
          "Texto ao cliente em PT-BR: espacos normais apos pontuacao; ideias distintas separadas por linha em branco (\\n\\n) para o app enviar uma bolha WhatsApp por paragrafo. Sem markdown de roteiro interno."
      }
    }
  }
};

function shouldTryNextStructuredModel(error: any): boolean {
  const msg = String(error?.message || error?.response?.data?.error?.message || error || "").toLowerCase();
  if (msg.includes("invalid schema")) return false;
  return (
    msg.includes("response_format") ||
    msg.includes("json_schema") ||
    msg.includes("unsupported") ||
    msg.includes("not support") ||
    msg.includes("invalid_request") ||
    msg.includes("model") ||
    msg.includes("does not exist")
  );
}

function recentTurnsFromMessages(messages: Message[]): Array<{ fromMe: boolean; body: string }> {
  return (messages || [])
    .slice(-16)
    .map((m: any) => ({ fromMe: !!m.fromMe, body: String(m.body || "") }))
    .filter((m) => m.body.trim());
}

function lastAssistantText(messages: Message[]): string {
  const found = [...(messages || [])].reverse().find((m: any) => !!m.fromMe && String(m.body || "").trim());
  return String((found as any)?.body || "").trim();
}

function extractQuestionSentences(text: string): string[] {
  return splitParagraphIntoSentences(String(text || "").replace(/\n+/g, " "))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.includes("?"));
}

function latestAssistantQuestionFromMessages(messages: Message[]): string {
  for (const msg of [...(messages || [])].reverse() as any[]) {
    if (!msg?.fromMe) continue;
    const questions = extractQuestionSentences(String(msg.body || ""));
    if (questions.length) return questions[questions.length - 1];
  }
  return "";
}

function getPromptStateKey(prompt: Prompt | null | undefined, promptId: number): string | null {
  const updatedAt = String((prompt as any)?.updatedAt || "").trim();
  return updatedAt ? `${promptId}:${updatedAt}` : null;
}

function llmFirstStateMatchesPrompt(state: Record<string, any>, promptId: number, prompt?: Prompt): boolean {
  if (!state || typeof state !== "object") return false;
  if (Number(state.promptId) !== Number(promptId)) return false;
  const currentKey = getPromptStateKey(prompt, promptId);
  if (currentKey && state.promptStateKey !== currentKey) return false;
  return true;
}

function getLlmFirstState(ticket: Ticket, promptId?: number, prompt?: Prompt): Record<string, any> {
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {};
  const state = agentState.llmFirstState && typeof agentState.llmFirstState === "object"
    ? (agentState.llmFirstState as Record<string, any>)
    : {};
  if (promptId == null) return state;
  return llmFirstStateMatchesPrompt(state, promptId, prompt) ? state : {};
}

function latestKnownAssistantQuestion(ticket: Ticket, messages: Message[], promptId: number, prompt?: Prompt): string {
  const state = getLlmFirstState(ticket, promptId, prompt);
  return (
    latestAssistantQuestionFromMessages(messages) ||
    truncate(state.lastAssistantQuestion, 300) ||
    lastAssistantText(messages)
  );
}

function isTrivialFollowUpNoise(text: string): boolean {
  const norm = normalizeForSemanticCompare(text);
  return /^(ta ai|ta aí|alguem|alguem ai|alguem aí|oi|ola|cad[eê]|e ai|e aí|responde|me responde|\?)$/.test(norm);
}

function userTextLikelyAnswersQuestion(userText: string, question: string): boolean {
  const answer = String(userText || "").trim();
  if (!answer || !question || answer.includes("?")) return false;
  if (isTrivialFollowUpNoise(answer) || /^(bom dia|boa tarde|boa noite)$/i.test(answer)) {
    return false;
  }
  return answer.length > 0 && answer.length <= 300;
}

function getLastQuestionAnswerContext(
  messages: Message[],
  currentUserText: string
): { question: string; usefulAnswer: string; answered: boolean; currentIsFollowUpNoise: boolean } {
  const turns = (messages || [])
    .map((m: any) => ({ fromMe: !!m.fromMe, body: String(m.body || "").trim() }))
    .filter((m) => m.body);
  const current = String(currentUserText || "").trim();
  const currentNorm = normalizeForSemanticCompare(current);
  const allTurns =
    current && !turns.some((turn) => !turn.fromMe && normalizeForSemanticCompare(turn.body) === currentNorm)
      ? [...turns, { fromMe: false, body: current }]
      : turns;

  let questionIndex = -1;
  let question = "";
  for (let i = allTurns.length - 1; i >= 0; i--) {
    if (!allTurns[i].fromMe) continue;
    const questions = extractQuestionSentences(allTurns[i].body);
    if (questions.length) {
      questionIndex = i;
      question = questions[questions.length - 1];
      break;
    }
  }
  if (questionIndex < 0 || !question) {
    return { question: "", usefulAnswer: "", answered: false, currentIsFollowUpNoise: isTrivialFollowUpNoise(current) };
  }

  const usefulAnswer = allTurns
    .slice(questionIndex + 1)
    .filter((turn) => !turn.fromMe)
    .map((turn) => turn.body)
    .filter((body) => !isTrivialFollowUpNoise(body))
    .reverse()
    .find((body) => userTextLikelyAnswersQuestion(body, question));

  return {
    question,
    usefulAnswer: usefulAnswer || "",
    answered: !!usefulAnswer,
    currentIsFollowUpNoise: isTrivialFollowUpNoise(current)
  };
}

function findRepeatedQuestion(reply: string, knownQuestion: string): string | null {
  if (!knownQuestion) return null;
  const knownQuestions = extractQuestionSentences(knownQuestion);
  const baseline = knownQuestions.length ? knownQuestions[knownQuestions.length - 1] : knownQuestion;
  for (const q of extractQuestionSentences(reply)) {
    if (semanticSimilarity(q, baseline) >= 0.72) return q;
  }
  return null;
}

function buildActionCatalogText(actions: PromptSmartActionToolMetadata[]): string {
  if (!actions.length) return "Nenhuma action habilitada para este agente.";
  return JSON.stringify(
    actions.map((action) => {
      const vars =
        action.variables && typeof action.variables === "object"
          ? (action.variables as Record<string, unknown>)
          : {};
      const speech = String(
        vars.agentSpeechPrompt || vars.openingPrompt || ""
      ).trim();
      return {
        slug: action.slug,
        type: action.type,
        name: action.name,
        description: action.description,
        requiredFields: action.requiredFields,
        triggerHints: action.triggerHints,
        ...(speech ? { agentSpeechPrompt: speech.slice(0, 500) } : {})
      };
    }),
    null,
    2
  ).slice(0, 12000);
}

function buildInventoryForceToolsHint(
  prompt: Prompt,
  actions: PromptSmartActionToolMetadata[]
): string {
  const cfg = getAgentInventoryConfig(prompt);
  if (cfg.enabled === false) return "";
  const inventoryTypes = new Set([
    "consultar_produtos",
    "preco",
    "consultar_estoque",
    "enviar_link_produto",
    "registrar_intencao_compra"
  ]);
  const invActions = actions.filter((a) => {
    const t = String(a.type || "").toLowerCase();
    const s = String(a.slug || "").toLowerCase();
    return (
      inventoryTypes.has(t) ||
      /consultarproduto|passarpreco|consultarestoque|enviarlinkproduto|registrarintencao/.test(s)
    );
  });
  if (!invActions.length) return "";
  const idsHint = cfg.productIds.length
    ? `Produtos elegíveis (IDs): ${cfg.productIds.join(", ")}.`
    : "productIds vazio = todos os produtos da empresa são elegíveis.";
  return [
    "INVENTÁRIO (ferramentas reais): se o cliente perguntar preço, estoque, catálogo, link de compra ou intenção de compra,",
    "USE as actions/tools de inventário habilitadas — não invente preços nem estoque.",
    "Depois de responder com dados reais, retome o roteiro com naturalidade.",
    `Ações: ${invActions.map((a) => a.slug).join(", ")}.`,
    idsHint
  ].join(" ");
}

function buildMemoryText(ticket: Ticket, promptId: number, prompt?: Prompt): string {
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {};
  const memory = normalizeAgentConversationalMemory(agentState.conversationalMemory, promptId);
  const llmFirstState = getLlmFirstState(ticket, promptId, prompt);
  return JSON.stringify(
    {
      knownFacts: memory.knownFacts || {},
      currentObjective: memory.currentObjective || null,
      pendingFields: memory.pendingFields || [],
      lastAssistantQuestion: memory.lastAssistantQuestion || null,
      lastUserAnswer: memory.lastUserAnswer || null,
      loopRisk: memory.loopRisk || null,
      llmFirstState: {
        userIntent: llmFirstState.userIntent || null,
        currentObjective: llmFirstState.currentObjective || null,
        currentStage: llmFirstState.currentStage || null,
        lastAssistantQuestion: llmFirstState.lastAssistantQuestion || null,
        lastUserAnswer: llmFirstState.lastUserAnswer || null,
        completedStages: Array.isArray(llmFirstState.completedStages) ? llmFirstState.completedStages.slice(-8) : [],
        askedQuestions: Array.isArray(llmFirstState.askedQuestions) ? llmFirstState.askedQuestions.slice(-8) : [],
        sentReplySignatures: Array.isArray(llmFirstState.sentReplySignatures)
          ? llmFirstState.sentReplySignatures.slice(-8)
          : []
      }
    },
    null,
    2
  );
}

function countAssistantBodiesInMessages(messages: Message[]): number {
  let n = 0;
  for (const m of messages || []) {
    if ((m as any).fromMe && String((m as any).body || "").trim().length > 1) n += 1;
  }
  return n;
}

function buildRoteiroCursorHint(ticket: Ticket, prompt: Prompt, flowSteps: any[]): string {
  const pid = Number(prompt.id);
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, unknown>;
  const af = normalizeAttendanceFlowMemory(dw.attendanceFlow, pid);
  if (Number(af.promptId) !== pid) {
    return [
      "CURSOR DO ROTEIRO: a memória attendanceFlow deste ticket pertence a outro promptId — **ignore** esse estado.",
      "Use apenas as ETAPAS listadas abaixo para este agente, começando pela etapa de **menor stepNumber** ainda não satisfeita pelo histórico."
    ].join("\n");
  }
  const sorted = [...(flowSteps || [])]
    .filter((s: any) => s && Number(s.stepNumber) > 0)
    .sort((a: any, b: any) => Number(a.stepNumber) - Number(b.stepNumber));
  if (!sorted.length) {
    return "CURSOR DO ROTEIRO: não há etapas numeradas no JSON — siga o script em attendanceScript e as Regras Gerais.";
  }
  const presented = Number(af.lastPresentedStep) || 0;
  const completed = new Set((af.completedSteps || []).map((x: number) => Number(x)));
  let focus = sorted[0];
  if (presented > 0) {
    const match = sorted.find((s: any) => Number(s.stepNumber) === presented);
    if (match) focus = match;
  }
  const focusNum = Number(focus?.stepNumber || 1);
  const next = sorted.find((s: any) => Number(s.stepNumber) > focusNum) || null;
  const vis = stripAgentFlowScriptTrainingMarkers(
    String(focus?.customerVisibleText || focus?.agentPrompt || "").trim()
  ).slice(0, 520);
  const lines = [
    `CURSOR DO ROTEIRO (este agente, promptId=${pid}): etapa salva no ticket = ${presented || "(ainda 0)"}; etapas concluídas no fluxo = ${
      completed.size ? [...completed].sort((a, b) => a - b).join(",") : "(nenhuma)"
    }.`,
    `Etapa lógica a priorizar agora: passo ${focusNum} — ${String(focus?.title || "Etapa").slice(0, 120)}.`,
    `Objetivo: ${String(focus?.objective || "").trim().slice(0, 240)}`,
    vis ? `Texto ao cliente (sentido; não copiar blocos de treino/EXEMPLO): ${vis}` : "",
    next ? `Próxima etapa na ordem (só depois de concluir a atual): passo ${Number(next.stepNumber)}.` : ""
  ].filter(Boolean);
  return lines.join("\n");
}

function buildFirstTurnOrchestratorHint(ticket: Ticket, prompt: Prompt, recentMessages: Message[], flowSteps: any[]): string {
  if (countAssistantBodiesInMessages(recentMessages) > 0) return "";
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, unknown>;
  const af = normalizeAttendanceFlowMemory(dw.attendanceFlow, prompt.id);
  if (Number(af.promptId) !== Number(prompt.id)) {
    return [
      "--- PRIMEIRA RESPOSTA SUA NESTE RECORTE DO HISTÓRICO ---",
      "Não há mensagem sua visível nas últimas mensagens carregadas; trate como abertura ou retomada.",
      "Se o estado de fluxo no ticket for de outro agente, ignore-o e siga só as Regras + roteiro deste agente.",
      "---"
    ].join("\n");
  }
  if (Number(af.lastPresentedStep || 0) > 0 || af.flowPhase === "completed") {
    return "";
  }
  const sorted = [...(flowSteps || [])]
    .filter((s: any) => s && Number(s.stepNumber) > 0)
    .sort((a: any, b: any) => Number(a.stepNumber) - Number(b.stepNumber));
  const first = sorted[0];
  const hint = stripAgentFlowScriptTrainingMarkers(
    String(first?.customerVisibleText || first?.agentPrompt || "").trim()
  ).slice(0, 480);
  return [
    "--- PRIMEIRA MENSAGEM DO CLIENTE (abertura) ---",
    "O histórico recente ainda não mostra uma resposta sua com corpo de texto. Seja breve, humano e **comece pelo primeiro passo do roteiro** (menor stepNumber).",
    "Use como guia o texto da etapa 1 (customerVisibleText/agentPrompt), convertendo para fala natural — sem menu numerado robótico e sem dados que não existam nas Regras/Roteiro.",
    hint ? `Âncora da etapa 1 (sentido): ${hint}` : "Sem etapa visual: abra com cordialidade e siga as Regras Gerais.",
    "---"
  ].join("\n");
}

async function persistSemanticState(
  ticket: Ticket,
  promptRef: number | Prompt,
  decision: AgentOrchestratorStructuredDecision,
  options?: {
    userText?: string;
    usefulUserAnswer?: string;
    reply?: string;
    action?: { slug?: string | null; success?: boolean; message?: string };
    repeatedQuestionBlocked?: string | null;
  }
): Promise<void> {
  try {
    const promptId = typeof promptRef === "number" ? promptRef : Number((promptRef as Prompt).id);
    const prompt = typeof promptRef === "number" ? undefined : (promptRef as Prompt);
    const promptStateKey = getPromptStateKey(prompt, promptId);
    const base = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
    const agentState = base.agentState && typeof base.agentState === "object" ? base.agentState : {};
    const prevMemory = normalizeAgentConversationalMemory(agentState.conversationalMemory, promptId);
    const collected = asObject(decision.understanding.collectedData);
    const reply = truncate(options?.reply || "", 1800);
    const rawPrevLlmState =
      agentState.llmFirstState && typeof agentState.llmFirstState === "object"
        ? (agentState.llmFirstState as Record<string, any>)
        : {};
    const prevLlmState = llmFirstStateMatchesPrompt(rawPrevLlmState, promptId, prompt) ? rawPrevLlmState : {};
    const askedQuestions = (Array.isArray(prevLlmState.askedQuestions) ? prevLlmState.askedQuestions : []).slice(-20);
    const previousStage = truncate(prevLlmState.currentStage, 160);
    const currentStage = decision.understanding.currentStage;
    const stageChanged = !!previousStage && !!currentStage && normalizeForSemanticCompare(previousStage) !== normalizeForSemanticCompare(currentStage);
    const completedStages = [
      ...(Array.isArray(prevLlmState.completedStages) ? prevLlmState.completedStages : []),
      ...(stageChanged && (options?.usefulUserAnswer || options?.userText) ? [previousStage] : [])
    ].filter(Boolean).slice(-20);
    const stageHistory = [
      ...(Array.isArray(prevLlmState.stageHistory) ? prevLlmState.stageHistory : []),
      ...(currentStage
        ? [
            {
              stage: currentStage,
              objective: decision.understanding.currentObjective,
              userAnswer: truncate(options?.usefulUserAnswer || options?.userText || "", 220) || null,
              at: new Date().toISOString()
            }
          ]
        : [])
    ].slice(-20);
    const sentReplySignatures = [
      ...(Array.isArray(prevLlmState.sentReplySignatures) ? prevLlmState.sentReplySignatures : []),
      ...(reply ? [normalizeForSemanticCompare(reply).slice(0, 220)] : [])
    ].filter(Boolean).slice(-20);
    const knownFacts = {
      ...(prevMemory.knownFacts || {}),
      ...Object.fromEntries(
        Object.entries(collected)
          .map(([k, v]) => [k, truncate(v, 160)])
          .filter(([, v]) => !!v)
      )
    };
    const nextMemory = {
      ...prevMemory,
      knownFacts,
      currentObjective: decision.understanding.currentObjective || prevMemory.currentObjective,
      lastUserIntent: decision.understanding.userIntent || prevMemory.lastUserIntent,
      lastAssistantQuestion: prevMemory.lastAssistantQuestion,
      lastUserAnswer: truncate(options?.usefulUserAnswer || options?.userText || prevMemory.lastUserAnswer || "", 220) || undefined,
      pendingFields: decision.understanding.missingData || [],
      lastUpdatedAt: new Date().toISOString()
    };
    const nextAgentState = {
      ...agentState,
      conversationalMemory: nextMemory,
      llmFirstState: {
        promptId,
        promptStateKey,
        userIntent: decision.understanding.userIntent,
        currentObjective: decision.understanding.currentObjective,
        currentStage: decision.understanding.currentStage,
        collectedData: collected,
        missingData: decision.understanding.missingData,
        decisionType: decision.decision.type,
        decisionReason: decision.decision.reason,
        lastAssistantQuestion: prevLlmState.lastAssistantQuestion || null,
        lastUserAnswer: truncate(options?.usefulUserAnswer || options?.userText || prevLlmState.lastUserAnswer || "", 220) || null,
        lastInboundText: truncate(options?.userText || prevLlmState.lastInboundText || "", 220) || null,
        lastReply: reply || prevLlmState.lastReply || null,
        askedQuestions,
        completedStages,
        stageHistory,
        sentReplySignatures,
        repeatedQuestionBlocked: options?.repeatedQuestionBlocked || null,
        lastAction: options?.action || null,
        updatedAt: new Date().toISOString()
      }
    };
    const nextDw = { ...base, agentState: nextAgentState };
    await ticket.update({ dataWebhook: nextDw as any });
    ticket.setDataValue("dataWebhook", nextDw as any);
  } catch (e) {
    logger.warn(`[AGENT-ORCH] falha ao persistir estado semantico ticket=${ticket.id}`, e as any);
  }
}

function buildOrchestratorSystemPrompt(params: {
  prompt: Prompt;
  ticket: Ticket;
  contact: Contact;
  recentMessages: Message[];
  actions: PromptSmartActionToolMetadata[];
  systemPrompt?: string;
}): string {
  const recentTurns = recentTurnsFromMessages(params.recentMessages);
  const digest = buildConversationContextDigest({
    ticket: params.ticket,
    promptId: params.prompt.id,
    promptStateKey: getPromptStateKey(params.prompt, params.prompt.id) || undefined,
    recentTurns,
    maxTurns: 10
  });
  const promptText = String((params.prompt as any).prompt || "").trim().slice(0, 50000);
  const attendanceScript = String((params.prompt as any).attendanceScript || "").trim().slice(0, 16000);
  const flowSteps = Array.isArray((params.prompt as any).attendanceFlowSteps)
    ? (params.prompt as any).attendanceFlowSteps
    : [];
  const scope = buildWhatsappPromptScopePreamble(params.prompt);
  const roteiroActive = isAgentRoteiroRuntimeActive(params.prompt);
  const flowAnchor = roteiroActive
    ? buildAttendanceFlowLlmAnchor(params.ticket, params.prompt.id)
    : "";
  const roteiroCursor = roteiroActive
    ? buildRoteiroCursorHint(params.ticket, params.prompt, flowSteps)
    : "";
  const firstHint = roteiroActive
    ? buildFirstTurnOrchestratorHint(params.ticket, params.prompt, params.recentMessages, flowSteps)
    : "";

  return [
    scope.trimEnd(),
    roteiroActive ? "" : `\n${AGENT_CONSULTIVE_MODE_DIRECTIVE_PT}\n`,
    flowAnchor ? `\n${flowAnchor.trim()}\n` : "",
    roteiroCursor ? `${roteiroCursor}\n` : "",
    firstHint ? `${firstHint}\n` : "",
    "Voce e o ORQUESTRADOR LLM-FIRST do agente de WhatsApp.",
    roteiroActive
      ? "Leia na ordem: escopo acima, estado do roteiro no ticket, cursor do roteiro, Regras Gerais, script longo, etapas JSON, memoria e historico. Depois decida a proxima resposta."
      : "Modo consultivo (sem roteiro visual ativo): priorize Regras Gerais, FAQ, Base de conhecimento, Acoes e historico. Nao force sequencia de etapas.",
    roteiroActive
      ? "As ETAPAS (JSON) e o attendanceScript definem o roteiro: ordem semantica, textos ao cliente e objetivos. Nao e menu de chatbot; siga o conteudo e a ordem sem empilhar varias etapas na mesma mensagem."
      : "",
    "Use o historico recente e a memoria como fonte principal de continuidade. A mensagem atual nunca pode ser interpretada isoladamente.",
    "Antes de responder, consolide mentalmente: o que ja foi perguntado, o que ja foi respondido, qual objetivo esta pendente e qual unica pergunta ajuda a avancar.",
    "Respostas curtas do cliente (ex.: '5', '5 semanas', 'sim', 'não', nome, telefone) devem ser vinculadas à última pergunta feita no ticket antes de qualquer nova pergunta.",
    "Se o cliente mandar uma cobrança curta como 'Tá aí?', olhe a última resposta útil anterior no ticket e avance a partir dela; não trate a cobrança como resposta de roteiro.",
    "Interprete o roteiro completo como mapa semântico com começo, objetivos, perguntas, condições e fim. A LLM decide o avanço lógico por ticket; o runtime legado só existe como fallback.",
    "",
    "Regras obrigatorias:",
    "- Nunca responda como menu fixo ou robo.",
    "- Nunca dependa de uma resposta padrao/literal do usuario para avancar.",
    "- Nunca repita etapa, pergunta ou bloco ja enviado/respondido.",
    "- Se o cliente respondeu a pergunta anterior, registre o dado em collectedData e avance; nao confirme e pergunte a mesma coisa novamente.",
    "- Se a pergunta do roteiro já foi respondida em qualquer mensagem posterior, considere a etapa concluída mesmo que a mensagem atual seja apenas uma cobrança.",
    "- Nunca envie duas perguntas principais de coleta na mesma resposta. A resposta final pode ter no maximo um ponto de interrogacao.",
    "- Se houver varios dados faltantes, escolha o mais importante agora e deixe os outros para turnos futuros.",
    "- Se a ultima mensagem tinha duas perguntas e o cliente respondeu uma, use a parte respondida e pergunte somente a pendente.",
    "- Se uma action for necessaria, escolha actionSlug e actionVariables; nao simule execucao no texto.",
    "- Linhas do roteiro com /comando (ex /agendamento, /transferirchamado) correspondem ao slug no catalogo de ACTIONS: quando o historico cumprir os pre-requisitos (data/hora para agendamento, confirmacao para transferencia), use execute_action ou reply_and_execute_action com actionSlug exatamente como no catalogo (ex agendamento).",
    "- Nao envie marcadores internos como # ETAPA, RESPOSTA, Mensagem, EXEMPLO ou /slug.",
    "- A resposta final ao cliente deve ser natural, curta e em portugues do Brasil.",
    "- Na reply, separe blocos distintos (saudacao, contexto, pergunta) com linha em branco (duplo newline). Cada bloco separado vira uma bolha no WhatsApp; evite um unico paragrafo gigante quando houver varias ideias.",
    "- Na reply use espacos apos pontuacao (. ! ? , ;) e entre palavras como no WhatsApp; nao cole frases (ex.: 'Ola.Tudo' -> 'Ola. Tudo').",
    "- CRITICO: somente o campo JSON reply e enviado ao cliente. understanding e decision sao estado interno — nunca repita esse JSON na reply nem envie markdown ```json.",
    "",
    "INTERRUPCOES (com roteiro ativo): se o cliente fez pergunta paralela (preco, FAQ, horario), responda com Regras Gerais + FAQ + Base de conhecimento antes de retomar a etapa pendente com uma pergunta curta.",
    "",
    "Formato obrigatorio: responda somente JSON valido neste shape:",
    JSON.stringify(
      {
        understanding: {
          userIntent: "string",
          currentObjective: "string",
          currentStage: "string",
          collectedData: [{ key: "nome_do_dado", value: "valor coletado" }],
          missingData: []
        },
        decision: {
          type: "reply_only | ask_missing_info | execute_action | reply_and_execute_action | handoff | ignore_duplicate",
          reason: "string",
          nextQuestion: "string | null",
          actionSlug: "string | null",
          actionVariables: [{ key: "nome_da_variavel", value: "valor" }]
        },
        reply: "Primeiro paragrafo curto.\n\nSegundo bloco ou pergunta unica."
      },
      null,
      2
    ),
    "",
    "CONTEXTO AUTORITATIVO:",
    digest,
    "",
    "HISTORICO RECENTE COMPLETO PARA CONTINUIDADE:",
    JSON.stringify(
      recentTurns.slice(-16).map((turn) => ({
        role: turn.fromMe ? "assistant" : "user",
        text: truncate(turn.body, 1200)
      })),
      null,
      2
    ),
    "",
    "MEMORIA CONSOLIDADA:",
    buildMemoryText(params.ticket, params.prompt.id, params.prompt),
    "",
    "ACTIONS DISPONIVEIS COMO FERRAMENTAS:",
    buildActionCatalogText(params.actions),
    buildInventoryForceToolsHint(params.prompt, params.actions),
    "",
    "REGRAS GERAIS (campo Regras do painel — vinculante; nao contradizer nem ignorar; nada fora daqui + roteiro + cerebro):",
    promptText || "(vazio — use só roteiro/script e blocos JSON.)",
    "",
    attendanceScript
      ? `SCRIPT / ROTEIRO LONGO (attendanceScript — seguir sentido; na fala ao cliente omita blocos de treino/EXEMPLO):\n${attendanceScript}`
      : "",
    "",
    roteiroActive
      ? "ETAPAS DO ROTEIRO VISUAL (JSON; ordem por stepNumber; alinhar com CURSOR DO ROTEIRO e estado do ticket):"
      : "",
    roteiroActive
      ? JSON.stringify(
          flowSteps.slice(0, 30).map((step: any) => ({
            stepNumber: step.stepNumber,
            title: step.title,
            objective: step.objective,
            expectedReply: step.expectedReply,
            slotName: step.slotName,
            customerVisibleText: step.customerVisibleText || step.agentPrompt,
            branchesIR: step.branchesIR
          })),
          null,
          2
        ).slice(0, 18000)
      : "",
    "",
    params.systemPrompt
      ? ["PROMPT SISTEMA ADICIONAL (runtime):", String(params.systemPrompt).slice(0, 50000)].join("\n")
      : [
          "IDENTIDADE RESUMIDA (complementar às Regras):",
          JSON.stringify(
            {
              name: (params.prompt as any).name || "",
              description: String((params.prompt as any).description || "").slice(0, 1200),
              role: String((params.prompt as any).role || "").slice(0, 800)
            },
            null,
            2
          )
        ].join("\n"),
    "",
    "BLOCOS BRUTOS DO AGENTE (cerebro/cargo/produtividade — nunca misturar com outro promptId):",
    JSON.stringify(
      {
        cargo: (params.prompt as any).cargo || null,
        cerebro: (params.prompt as any).cerebro || null,
        produtividade: (params.prompt as any).produtividade || null,
        midias: (params.prompt as any).midias || null
      },
      null,
      2
    ).slice(0, 30000)
  ].join("\n");
}

function removeInternalMarkers(reply: string): string {
  return String(reply || "")
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (/^#\s*(etapa|passo)\b/i.test(t)) return false;
      if (/^(mensagem|resposta|exemplo\s+de\s+resposta)\s*:?$/i.test(t)) return false;
      if (/^\/[a-zA-Z][\w-]*$/.test(t)) return false;
      if (/^-{3,}$/.test(t)) return false;
      return true;
    })
    .join("\n")
    .trim();
}

function limitToOneMainQuestion(reply: string): string {
  const text = String(reply || "").trim();
  const sections = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const sentences = sections.flatMap((section) => splitParagraphIntoSentences(section));
  const questionIndexes = sentences
    .map((sentence, index) => (sentence.includes("?") ? index : -1))
    .filter((index) => index >= 0);
  if (questionIndexes.length <= 1) return text;

  const isPermissionQuestion = (sentence: string) =>
    /\b(posso|poderia|podemos|vou|deixa eu|deixe eu)\b/i.test(sentence) &&
    /\b(perguntas?|entender|te ajudar|ajudar melhor|rapid[ao]s?)\b/i.test(sentence);
  const firstQuestionIndex = questionIndexes[0];
  const keepQuestionIndex =
    isPermissionQuestion(sentences[firstQuestionIndex]) && questionIndexes.length > 1
      ? questionIndexes[1]
      : firstQuestionIndex;

  const kept: string[] = [];
  for (let i = 0; i <= keepQuestionIndex; i++) {
    if (i !== keepQuestionIndex && sentences[i].includes("?")) continue;
    kept.push(sentences[i]);
  }
  return kept.join("\n\n").trim();
}

function tooSimilar(a: string, b: string): boolean {
  const norm = (value: string) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length > 30 && y.length > 30 && (x.includes(y.slice(0, 80)) || y.includes(x.slice(0, 80)))) {
    return true;
  }
  return false;
}

function neutralizeUnconfirmedActionClaims(reply: string, actionConfirmed?: boolean): string {
  if (actionConfirmed) return reply;
  return String(reply || "")
    .replace(/\b(j[aá]\s+)?(salvei|cadastrei|registrei|criei|agendei|transferi|encaminhei)\b/gi, "vou encaminhar")
    .replace(/\b(est[aá]\s+)?(salvo|cadastrado|registrado|criado|agendado|transferido|encaminhado)\b/gi, "em andamento");
}

/** Espaçamento legível e preservação de quebras de parágrafo (bolhas) sem alterar o sentido. */
export function formatAgentReplyReadableSpacing(text: string): string {
  let s = String(text || "").trim();
  if (!s) return s;
  // ! ou ? colados à palavra seguinte (maiúscula ou minúscula).
  s = s.replace(/([!?])([A-Za-zÀ-ÿ])/g, "$1 $2");
  // Ponto final colado só quando a frase seguinte começa com maiúscula (evita 1.5, URLs comuns).
  s = s.replace(/([.])([A-ZÀ-Ü])/g, "$1 $2");
  // Vírgula ou ponto-e-vírgula colados à palavra seguinte.
  s = s.replace(/([,;])([^\s\d])/g, "$1 $2");
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

export function applyAgentOrchestratorGuardrails(
  reply: string,
  opts: { lastAssistantText?: string; missingData?: string[]; actionConfirmed?: boolean }
): string {
  let next = sanitizeAgentCustomerVisibleText(removeInternalMarkers(reply));
  next = neutralizeUnconfirmedActionClaims(next, opts.actionConfirmed);
  next = limitToOneMainQuestion(next);
  if (tooSimilar(next, opts.lastAssistantText || "")) {
    const missing = (opts.missingData || []).filter(Boolean)[0];
    next = missing
      ? `Perfeito, vou seguir por esse caminho. Me confirma só ${missing} para eu avançar?`
      : "Perfeito, entendi. Vou avançar por esse caminho; me diga só o próximo detalhe que ficou faltando.";
  }
  return formatAgentReplyReadableSpacing(next);
}

function splitLongSentence(sentence: string, maxChars: number): string[] {
  const parts: string[] = [];
  let rest = String(sentence || "").trim();
  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars + 1);
    const commaIdx = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "));
    const spaceIdx = window.lastIndexOf(" ");
    const cut = commaIdx > maxChars * 0.45 ? commaIdx + 1 : spaceIdx > maxChars * 0.55 ? spaceIdx : maxChars;
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

function splitParagraphIntoSentences(paragraph: string): string[] {
  const text = String(paragraph || "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  const out: string[] = [];
  const re = /[^.!?\n]+[.!?]+(?:["')\]]+)?|[^.!?\n]+$/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const sentence = match[0].trim();
    if (sentence) out.push(sentence);
  }
  return out.length ? out : [text];
}

export function splitAgentReplyIntoSmartBlocks(reply: string, opts?: { maxChars?: number; maxBlocks?: number }): string[] {
  const maxChars = Math.max(
    220,
    Math.min(Number(opts?.maxChars || AGENT_OUTBOUND_BUBBLE_MAX_CHARS), 900)
  );
  const maxBlocks = Math.max(1, Math.min(Number(opts?.maxBlocks || 20), 30));
  const clean = String(reply || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
  if (!clean) return [];

  const majorSegments = clean.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const segments = majorSegments.length ? majorSegments : [clean];
  const blocks: string[] = [];

  const pushSentenceBlocks = (flatText: string) => {
    const normalized = flatText.replace(/\n+/g, " ").trim();
    const sentences = splitParagraphIntoSentences(normalized).flatMap((sentence) =>
      sentence.length > maxChars ? splitLongSentence(sentence, maxChars) : [sentence]
    );
    for (const sentence of sentences) {
      const s = sentence.trim();
      if (!s) continue;
      blocks.push(s);
      if (blocks.length >= maxBlocks) return;
    }
  };

  for (const segment of segments) {
    if (blocks.length >= maxBlocks) break;
    if (!segment) continue;

    const lines = segment.split(/\n/).map((l) => l.trim()).filter(Boolean);

    if (segment.length <= maxChars) {
      if (lines.length > 1 && lines.every((l) => l.length > 0 && l.length <= maxChars)) {
        for (const line of lines) {
          blocks.push(line);
          if (blocks.length >= maxBlocks) {
            return blocks
              .map((b) => formatAgentReplyReadableSpacing(b))
              .filter(Boolean)
              .slice(0, maxBlocks);
          }
        }
      } else {
        blocks.push(segment);
      }
      continue;
    }

    if (lines.length > 1 && lines.every((l) => l.length <= maxChars)) {
      for (const line of lines) {
        if (!line) continue;
        blocks.push(line);
        if (blocks.length >= maxBlocks) {
          return blocks
            .map((b) => formatAgentReplyReadableSpacing(b))
            .filter(Boolean)
            .slice(0, maxBlocks);
        }
      }
      continue;
    }

    pushSentenceBlocks(segment);
  }

  return blocks
    .map((b) => formatAgentReplyReadableSpacing(b))
    .filter(Boolean)
    .slice(0, maxBlocks);
}

async function createOrchestratorCompletion(params: {
  client: any;
  models: string[];
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  timeoutMs: number;
  tools?: Array<Record<string, unknown>>;
  anthropicApiKey?: string;
  anthropicModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  geminiCompanyId?: number;
  geminiTicketId?: number;
  geminiUserText?: string;
  geminiTemperature?: number;
  geminiTopP?: number;
  grokApiKey?: string;
  grokModel?: string;
  grokTemperature?: number;
  grokTopP?: number;
}): Promise<any> {
  if (params.geminiApiKey && params.geminiModel) {
    const userParts =
      params.geminiCompanyId && params.geminiTicketId
        ? await loadGeminiInboundMediaParts({
            companyId: params.geminiCompanyId,
            ticketId: params.geminiTicketId,
            userText: params.geminiUserText || ""
          })
        : undefined;
    const result = await createGeminiAgentResponse({
      apiKey: params.geminiApiKey,
      model: params.geminiModel,
      messages: params.messages,
      maxTokens: params.maxTokens,
      temperature: params.geminiTemperature ?? 0.2,
      topP: params.geminiTopP,
      structuredJson: true,
      userParts
    });
    return {
      choices: [
        {
          finish_reason: "stop",
          message: { content: result.content }
        }
      ],
      _gemini: {
        api: result.api,
        model: result.model,
        images: result.images || []
      }
    };
  }
  if (params.anthropicApiKey && params.anthropicModel) {
    const result = await createAnthropicAgentResponse({
      apiKey: params.anthropicApiKey,
      model: params.anthropicModel,
      messages: params.messages,
      maxTokens: params.maxTokens,
      temperature: 0.2,
      structuredJson: true
    });
    return {
      choices: [
        {
          finish_reason: "stop",
          message: { content: result.content }
        }
      ],
      _anthropic: {
        api: result.api,
        model: result.model
      }
    };
  }
  if (params.grokApiKey && params.grokModel) {
    const result = await createGrokAgentResponse({
      apiKey: params.grokApiKey,
      model: params.grokModel,
      messages: params.messages,
      maxTokens: params.maxTokens,
      temperature: params.grokTemperature ?? 0.2,
      topP: params.grokTopP,
      structuredJson: true
    });
    return {
      choices: [
        {
          finish_reason: "stop",
          message: { content: result.content }
        }
      ],
      _grok: {
        api: result.api,
        model: result.model
      }
    };
  }

  const result = await createOpenAiAgentResponse({
    client: params.client,
    models: params.models.length ? params.models : getAgentOrchestratorStructuredModels(),
    messages: params.messages,
    temperature: 0.2,
    maxTokens: params.maxTokens,
    timeoutMs: params.timeoutMs,
    responseFormat: {
      type: "json_schema",
      json_schema: ORCHESTRATOR_JSON_SCHEMA
    },
    tools: params.tools,
    metadata: {
      runtime: "agent_orchestrator",
      schema: "agent_orchestrator_decision"
    }
  });

  return {
    choices: [
      {
        finish_reason: "stop",
        message: { content: result.content }
      }
    ],
    _openai: {
      api: result.api,
      model: result.model,
      raw: result.raw
    }
  };
}

async function repairInvalidJsonDecision(params: {
  client: any;
  models: string[];
  system: string;
  recentMessages: Message[];
  userText: string;
  invalidContent: string;
  maxTokens: number;
  timeoutMs: number;
  tools?: Array<Record<string, unknown>>;
  anthropicApiKey?: string;
  anthropicModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}): Promise<AgentOrchestratorStructuredDecision | null> {
  const repairPrompt = [
    "A resposta anterior NAO era JSON valido e nao pode ser enviada ao cliente.",
    "Reescreva a decisao agora como JSON valido no schema do orquestrador.",
    "Regras tecnicas obrigatorias:",
    "- Nao use null em understanding.userIntent, currentObjective ou currentStage; use string vazia se nao souber.",
    "- Nao quebre strings em multiplas linhas.",
    "- Escape aspas internas quando necessario.",
    "- A reply deve ser curta, natural e avancar o roteiro pelo historico.",
    "- Use linha em branco entre blocos na reply quando houver mais de uma ideia (formato bolhas WhatsApp).",
    "- Use espacos apos pontuacao; nao cole frases.",
    "- Retorne somente o objeto JSON, sem markdown.",
    "",
    "Mensagem atual do cliente:",
    JSON.stringify(params.userText),
    "",
    "Conteudo invalido anterior:",
    params.invalidContent.slice(0, 2500)
  ].join("\n");
  try {
    const completion = await createOrchestratorCompletion({
      client: params.client,
      models: params.models,
      messages: [
        { role: "system", content: params.system },
        ...params.recentMessages.slice(-16).map((m: any) => ({
          role: m.fromMe ? "assistant" : "user",
          content: String(m.body || "")
        })),
        { role: "user", content: repairPrompt }
      ],
      maxTokens: params.maxTokens,
      timeoutMs: params.timeoutMs,
      tools: params.tools,
      anthropicApiKey: params.anthropicApiKey,
      anthropicModel: params.anthropicModel,
      geminiApiKey: params.geminiApiKey,
      geminiModel: params.geminiModel
    });
    return validateAgentOrchestratorJson(parseJsonFromModel(String(completion?.choices?.[0]?.message?.content || "")));
  } catch (e: any) {
    logger.warn(`[AGENT-ORCH] reparo de JSON invalido falhou: ${e?.message || e}`);
    return null;
  }
}

async function reprocessInvalidJsonDecision(params: {
  client: any;
  models: string[];
  system: string;
  recentMessages: Message[];
  userText: string;
  invalidContent: string;
  maxTokens: number;
  timeoutMs: number;
  tools?: Array<Record<string, unknown>>;
  anthropicApiKey?: string;
  anthropicModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}): Promise<AgentOrchestratorStructuredDecision | null> {
  let lastInvalid = params.invalidContent;
  for (let attempt = 1; attempt <= getInvalidJsonReprocessAttempts(); attempt++) {
    const repaired = await repairInvalidJsonDecision({
      ...params,
      invalidContent: lastInvalid
    });
    if (repaired) {
      logger.info(`[AGENT-ORCH] JSON invalido reparado na tentativa ${attempt}`);
      return repaired;
    }
    lastInvalid = `${lastInvalid}\n\nTentativa ${attempt} de reparo ainda falhou. Refaça com JSON estrito e completo.`;
  }
  return null;
}

function firstFlowQuestionFromPrompt(prompt: Prompt): string {
  const flowSteps = Array.isArray((prompt as any).attendanceFlowSteps)
    ? (prompt as any).attendanceFlowSteps
    : [];
  const first = flowSteps
    .slice()
    .sort((a: any, b: any) => Number(a?.stepNumber || 0) - Number(b?.stepNumber || 0))
    .find((step: any) => String(step?.customerVisibleText || step?.agentPrompt || "").trim());
  const text = sanitizeAgentCustomerVisibleText(
    String(first?.customerVisibleText || first?.agentPrompt || "").trim()
  );
  const question = extractQuestionSentences(text)[0];
  return truncate(question || text, 300);
}

function buildInvalidJsonRecoveryReply(userText: string, recentMessages: Message[], prompt: Prompt): string {
  const answer = truncate(userText, 100);
  const lastQuestion = latestAssistantQuestionFromMessages(recentMessages);
  const firstFlowQuestion = firstFlowQuestionFromPrompt(prompt);
  if (isTrivialFollowUpNoise(answer)) {
    return firstFlowQuestion || "Olá! Como posso te ajudar?";
  }
  if (answer && lastQuestion) {
    return `Entendi, ${answer}. Vou seguir com essa informação e continuar pelo próximo ponto.`;
  }
  if (answer) {
    return `Entendi, ${answer}. Vou seguir com essa informação.`;
  }
  return "Recebi sua mensagem. Vou seguir pelo contexto do atendimento.";
}

async function repairRepeatedQuestionDecision(params: {
  client: any;
  models: string[];
  system: string;
  recentMessages: Message[];
  userText: string;
  decision: AgentOrchestratorStructuredDecision;
  repeatedQuestion: string;
  lastQuestion: string;
  userAnsweredLastQuestion: boolean;
  maxTokens: number;
  timeoutMs: number;
  tools?: Array<Record<string, unknown>>;
  anthropicApiKey?: string;
  anthropicModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}): Promise<AgentOrchestratorStructuredDecision | null> {
  const repairPrompt = [
    "REVISE A DECISAO ANTES DE ENVIAR AO CLIENTE.",
    "A resposta proposta repetiu uma pergunta/etapa ja feita no ticket.",
    `Ultima pergunta do agente: ${JSON.stringify(params.lastQuestion)}`,
    `Pergunta repetida na resposta proposta: ${JSON.stringify(params.repeatedQuestion)}`,
    `Mensagem atual do cliente: ${JSON.stringify(params.userText)}`,
    params.userAnsweredLastQuestion
      ? "A mensagem atual do cliente provavelmente RESPONDEU a ultima pergunta. Use essa resposta como dado coletado e avance para o proximo objetivo sem perguntar a mesma coisa."
      : "Mesmo se a resposta do cliente estiver incompleta, NAO repita a mesma pergunta com outras palavras. Reancore naturalmente e pergunte somente o proximo dado realmente pendente.",
    "Retorne somente JSON valido no schema do orquestrador. A nova reply nao pode conter a pergunta repetida."
  ].join("\n");
  try {
    const completion = await createOrchestratorCompletion({
      client: params.client,
      models: params.models,
      messages: [
        { role: "system", content: params.system },
        ...params.recentMessages.slice(-16).map((m: any) => ({
          role: m.fromMe ? "assistant" : "user",
          content: String(m.body || "")
        })),
        {
          role: "assistant",
          content: JSON.stringify(params.decision)
        },
        { role: "user", content: repairPrompt }
      ],
      maxTokens: params.maxTokens,
      timeoutMs: params.timeoutMs,
      tools: params.tools,
      anthropicApiKey: params.anthropicApiKey,
      anthropicModel: params.anthropicModel,
      geminiApiKey: params.geminiApiKey,
      geminiModel: params.geminiModel
    });
    return validateAgentOrchestratorJson(parseJsonFromModel(String(completion?.choices?.[0]?.message?.content || "")));
  } catch (e: any) {
    logger.warn(`[AGENT-ORCH] reparo anti-repetição falhou: ${e?.message || e}`);
    return null;
  }
}

async function loadRecentMessages(params: AgentOrchestratorInput): Promise<Message[]> {
  if (params.recentMessages) return params.recentMessages;
  const limit = Math.max(16, Number((params.prompt as any).maxMessages || 20));
  const rows = await Message.findAll({
    where: buildWhereForConnectionAgentHistory(params.ticket, params.prompt.id),
    order: [["createdAt", "DESC"]],
    limit
  });
  return rows.reverse();
}

export async function runAgentOrchestrator(
  params: AgentOrchestratorInput
): Promise<AgentOrchestratorResult> {
  if (!isAgentLlmFirstRuntimeEnabled()) {
    return { handled: false, reply: "", fallbackReason: "feature_flag_off" };
  }
  const apiKey = String((params.prompt as any).apiKey || "").trim();
  if (!apiKey) {
    return { handled: false, reply: "", fallbackReason: "missing_api_key" };
  }

  const useGemini = (params.prompt as any).__llmProvider === "gemini";
  const useAnthropic = (params.prompt as any).__llmProvider === "anthropic";
  const useGrok = (params.prompt as any).__llmProvider === "grok";
  const geminiModel = resolveGeminiModelId(
    String((params.prompt as any).model || "").trim()
  );

  if (useGemini && isGeminiImageGenerationModel(geminiModel)) {
    return runGeminiWhatsappDirectReply(params);
  }

  const anthropicModel = resolveAnthropicModelId(
    normalizeAgentModelId(String((params.prompt as any).model || "").trim())
  );
  const grokModel = resolveGrokModelId(
    String((params.prompt as any).model || "").trim()
  );

  const recentMessages = await loadRecentMessages(params);
  const actions = await listPromptSmartActionToolsShared(
    params.prompt,
    params.ticket.companyId
  );
  const knowledgeRuntime = useAnthropic || useGemini || useGrok
    ? { enabled: false, vectorStoreIds: [] as string[], tools: undefined as undefined }
    : await buildAgentKnowledgeRuntime({
        companyId: params.ticket.companyId,
        promptId: params.prompt.id
      });
  const client = useAnthropic || useGemini || useGrok
    ? null
    : params.openaiClient || new OpenAI({ apiKey });
  const structuredModels = useAnthropic
    ? [anthropicModel || "claude-3-7-sonnet-latest"]
    : useGemini
      ? [geminiModel || "gemini-2.5-flash"]
      : useGrok
        ? [grokModel || "grok-4-1-fast"]
        : getAgentOrchestratorStructuredModels();
  const orchestratorLlm = useGemini
    ? {
        geminiApiKey: apiKey,
        geminiModel: geminiModel || "gemini-2.5-flash",
        geminiCompanyId: params.ticket.companyId,
        geminiTicketId: params.ticket.id,
        geminiUserText: params.userText,
        geminiTemperature:
          typeof (params.prompt as any).temperature === "number"
            ? (params.prompt as any).temperature
            : 0.2,
        geminiTopP:
          typeof (params.prompt as any).topP === "number"
            ? (params.prompt as any).topP
            : undefined
      }
    : useAnthropic
      ? {
          anthropicApiKey: apiKey,
          anthropicModel: anthropicModel || "claude-3-7-sonnet-latest"
        }
      : useGrok
        ? {
            grokApiKey: apiKey,
            grokModel: grokModel || "grok-4-1-fast",
            grokTemperature:
              typeof (params.prompt as any).temperature === "number"
                ? (params.prompt as any).temperature
                : 0.2,
            grokTopP:
              typeof (params.prompt as any).topP === "number"
                ? (params.prompt as any).topP
                : undefined
          }
        : {};
  const maxTokens = getAgentOrchestratorMaxTokens(params.prompt);
  const timeoutMs = Number(process.env.AGENT_LLM_FIRST_TIMEOUT_MS || 18000);
  let system = buildOrchestratorSystemPrompt({
    prompt: params.prompt,
    ticket: params.ticket,
    contact: params.contact,
    recentMessages,
    actions,
    systemPrompt: params.systemPrompt
  });
  if (knowledgeRuntime.enabled) {
    system = [
      system,
      "",
      "BASE DE CONHECIMENTO FILE_SEARCH:",
      `Há ${knowledgeRuntime.vectorStoreIds.length} vector store(s) OpenAI habilitado(s) para este agente.`,
      "Use file_search quando a resposta depender de documentos, PDFs, FAQ extensa, políticas, sites ou material interno. Não invente informação ausente."
    ].join("\n");
  }
  const lastQuestionContext = getLastQuestionAnswerContext(recentMessages, params.userText);
  const user = [
    "Mensagem atual do cliente:",
    JSON.stringify(params.userText),
    "",
    "CONTEXTO CRITICO DO ULTIMO PASSO DO TICKET:",
    JSON.stringify(
      {
        lastAssistantQuestion:
          lastQuestionContext.question ||
          latestKnownAssistantQuestion(params.ticket, recentMessages, params.prompt.id, params.prompt) ||
          null,
        usefulUserAnswerAfterThatQuestion: lastQuestionContext.usefulAnswer || null,
        questionAlreadyAnsweredInTicket: lastQuestionContext.answered,
        currentMessageLooksLikeFollowUpNoise: lastQuestionContext.currentIsFollowUpNoise
      },
      null,
      2
    ),
    "",
    lastQuestionContext.answered
      ? "Se a resposta proposta repetir essa lastAssistantQuestion, ela esta errada. Use usefulUserAnswerAfterThatQuestion como dado coletado e avance para o proximo objetivo do roteiro."
      : "Se a resposta proposta repetir uma pergunta ja feita, revise pelo historico antes de enviar.",
    params.blockedOutboundContext
      ? [
          "",
          "REPROCESSAMENTO OBRIGATORIO POR BLOQUEIO DE SAIDA:",
          "Uma resposta anterior foi bloqueada por repeticao/duplicidade antes de chegar ao cliente.",
          "Nao gere mensagem generica de recuperacao. Use a LLM para reler o roteiro, o historico, as condicoes e avance para a proxima etapa logica.",
          "Se o cliente respondeu a ultima pergunta, trate a resposta como dado coletado e entregue a proxima mensagem/pergunta do roteiro.",
          "A nova reply nao pode repetir a resposta bloqueada, nao pode repetir pergunta ja feita e nao pode usar frases como 'Recebi sua resposta' ou 'vou seguir com essa informacao'.",
          JSON.stringify(
            {
              blockedReply: truncate(params.blockedOutboundContext.blockedReply, 1200),
              blockReasons: params.blockedOutboundContext.reasons
            },
            null,
            2
          )
        ].join("\n")
      : "",
    "",
    "Formato da reply: se houver varias frases ou blocos (contexto + pergunta), separe com linha em branco entre eles para o cliente receber em bolhas distintas no WhatsApp. Use espacos normais apos . ! ? , ;",
    "",
    "Decida a proxima acao conversacional e retorne somente JSON.",
    "Lembrete: reply = texto natural para o cliente; understanding/decision nunca vao para o WhatsApp."
  ].join("\n");

  let content = "";
  let geminiImages: AgentOrchestratorResult["geminiImages"];
  try {
    const completion = await createOrchestratorCompletion({
      client,
      models: structuredModels,
      messages: [
        { role: "system", content: system },
        ...recentMessages.slice(-16).map((m: any) => ({
          role: m.fromMe ? "assistant" : "user",
          content: String(m.body || "")
        })),
        { role: "user", content: user }
      ],
      maxTokens,
      timeoutMs,
      tools: knowledgeRuntime.tools,
      ...orchestratorLlm
    });
    content = String(completion?.choices?.[0]?.message?.content || "").trim();
    if (completion?._gemini?.images?.length) {
      geminiImages = completion._gemini.images;
    }
    if (completion?.choices?.[0]?.finish_reason === "length") {
      logger.warn(
        `[AGENT-ORCH] resposta estruturada truncada por max_tokens ticket=${params.ticket.id}; tentando reparo com orçamento ampliado.`
      );
    }
  } catch (e: any) {
    logger.warn(
      `[AGENT-ORCH] LLM falhou ticket=${params.ticket.id} provider=${
        useGemini ? "gemini" : useAnthropic ? "anthropic" : useGrok ? "grok" : "openai"
      }: ${e?.message || e}`
    );
    return {
      handled: false,
      reply: "",
      fallbackReason: useGemini
        ? "gemini_failed"
        : useAnthropic
          ? "anthropic_failed"
          : useGrok
            ? "grok_failed"
            : "openai_failed"
    };
  }

  const parsed = parseJsonFromModel(content);
  let decision = validateAgentOrchestratorJson(parsed);
  if (!decision) {
    const leaked = tryBuildDecisionFromLeakedOrchestratorContent(content);
    if (leaked?.reply) {
      decision = validateAgentOrchestratorJson({
        understanding: {
          userIntent: "",
          currentObjective: "",
          currentStage: "",
          collectedData: [],
          missingData: []
        },
        decision: {
          type: "reply_only",
          reason: "reply recuperada de payload JSON vazado",
          nextQuestion: null,
          actionSlug: null,
          actionVariables: {}
        },
        reply: leaked.reply
      });
      if (decision) {
        logger.info(`[AGENT-ORCH] reply recuperada de JSON vazado ticket=${params.ticket.id}`);
      }
    }
  }
  if (!decision) {
    logger.warn(`[AGENT-ORCH] JSON invalido ticket=${params.ticket.id}: ${content.slice(0, 500)}`);
    decision = await reprocessInvalidJsonDecision({
      client,
      models: structuredModels,
      system,
      recentMessages,
      userText: params.userText,
      invalidContent: content,
      maxTokens,
      timeoutMs,
      tools: knowledgeRuntime.tools,
      ...orchestratorLlm
    });
    if (!decision) {
      const reply = buildInvalidJsonRecoveryReply(params.userText, recentMessages, params.prompt);
      logger.warn(`[AGENT-ORCH] JSON invalido persistente ticket=${params.ticket.id}; resposta de recuperação sem fallback legado.`);
      return { handled: true, reply };
    }
  }
  await persistSemanticState(params.ticket, params.prompt, decision, {
    userText: params.userText,
    usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText
  });

  let actionResult: AgentOrchestratorResult["actionResult"];
  const wantsAction =
    decision.decision.type === "execute_action" ||
    decision.decision.type === "reply_and_execute_action" ||
    decision.decision.type === "handoff";
  if (wantsAction && decision.decision.actionSlug) {
    const {
      validatePromptSmartActionToolCall,
      executeSmartAction
    } = await import("./PromptSmartActionExecutorService");
    const slugLower = String(decision.decision.actionSlug || "").toLowerCase();
    const isTransferAction =
      slugLower.includes("transferir") || slugLower.includes("transfer");
    let actionVariables = { ...(decision.decision.actionVariables || {}) };
    if (isTransferAction) {
      const userOk = userRequestsHumanTransfer(params.userText);
      const agentOk = assistantTextImpliesTransferToHuman(decision.reply || "");
      if (!userOk && !agentOk) {
        logger.info(
          `[AGENT-ORCH] transferência bloqueada ticket=${params.ticket.id} — sem declaração na resposta nem pedido do cliente`
        );
        const reply = applyAgentOrchestratorGuardrails(
          decision.reply ||
            "Posso encaminhar para um atendente humano quando você quiser. Deseja que eu faça a transferência agora?",
          {
            lastAssistantText: lastAssistantText(recentMessages),
            missingData: decision.understanding.missingData,
            actionConfirmed: false
          }
        );
        await persistSemanticState(params.ticket, params.prompt, decision, {
          userText: params.userText,
          usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText,
          reply
        });
        return { handled: true, reply, decision };
      }
      actionVariables = {
        ...actionVariables,
        userRequestedTransfer: userOk,
        assistantDeclaredTransfer: agentOk,
        transferAuthorized: true
      };
    }
    const isScheduleAction =
      slugLower === "agendamento" ||
      slugLower === "agendar" ||
      slugLower.includes("agend");
    if (isScheduleAction) {
      const userDate = userProvidesScheduleDateTime(params.userText);
      const agentOffer = assistantTextImpliesSchedulingOffer(decision.reply || "");
      const userAsked = userRequestsScheduling(params.userText);
      if (userDate.matched && userDate.date) {
        actionVariables = {
          ...actionVariables,
          date: userDate.date,
          customerReply: params.userText,
          lastUserMessage: params.userText,
          scheduleAuthorized: true
        };
      } else if (!agentOffer && !userAsked) {
        logger.info(
          `[AGENT-ORCH] agendamento bloqueado ticket=${params.ticket.id} — sem oferta do agente nem pedido do cliente`
        );
        const reply = applyAgentOrchestratorGuardrails(
          decision.reply ||
            "Posso agendar para você. Me envie o dia e o horário (ex.: amanhã às 14h).",
          {
            lastAssistantText: lastAssistantText(recentMessages),
            missingData: ["date"],
            actionConfirmed: false
          }
        );
        await persistSemanticState(params.ticket, params.prompt, decision, {
          userText: params.userText,
          usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText,
          reply
        });
        return { handled: true, reply, decision };
      } else if (
        (agentOffer || userAsked) &&
        decision.decision.type === "execute_action" &&
        !actionVariables.date
      ) {
        const reply = applyAgentOrchestratorGuardrails(
          decision.reply ||
            "Perfeito. Me envie o dia e o horário para confirmar o agendamento (ex.: 15/05 às 14h).",
          {
            lastAssistantText: lastAssistantText(recentMessages),
            missingData: ["date"],
            actionConfirmed: false
          }
        );
        await persistSemanticState(params.ticket, params.prompt, decision, {
          userText: params.userText,
          usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText,
          reply
        });
        return { handled: true, reply, decision };
      }
    }
    const validation = await validatePromptSmartActionToolCall({
      prompt: params.prompt,
      ticket: params.ticket,
      contact: params.contact,
      actionSlug: decision.decision.actionSlug,
      variables: actionVariables
    });
    const isLeadAction =
      slugLower.includes("criarlead") ||
      slugLower === "criar_lead" ||
      (slugLower.includes("lead") && slugLower.includes("criar"));
    const isActivityAction =
      slugLower.includes("criaratividade") ||
      slugLower === "criar_atividade" ||
      (slugLower.includes("atividade") && slugLower.includes("criar"));
    if (!validation.ok) {
      const invalid = validation as { ok: false; reason: string; missingFields?: string[] };
      const missing = invalid.missingFields || decision.understanding.missingData || [];
      const missingText = missing.length ? missing.join(", ") : "a informacao pendente";
      const reply = applyAgentOrchestratorGuardrails(
        decision.reply || `Consigo seguir, mas preciso confirmar ${missingText}.`,
        { lastAssistantText: lastAssistantText(recentMessages), missingData: missing, actionConfirmed: false }
      );
      await persistSemanticState(params.ticket, params.prompt, decision, {
        userText: params.userText,
        usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText,
        reply,
        action: { slug: decision.decision.actionSlug, success: false, message: invalid.reason }
      });
      return {
        handled: true,
        reply,
        decision,
        actionResult: { success: false, message: invalid.reason, data: { missingFields: missing } }
      };
    }
    const actionRow = validation.action;
    const userPatterns = Array.isArray((actionRow as any).userTriggerPatterns)
      ? ((actionRow as any).userTriggerPatterns as unknown[]).map((p) => String(p || ""))
      : [];
    const agentPatterns = Array.isArray((actionRow as any).agentTriggerPatterns)
      ? ((actionRow as any).agentTriggerPatterns as unknown[]).map((p) => String(p || ""))
      : [];
    const lastAsst = lastAssistantText(recentMessages);

    if (isLeadAction) {
      if (
        !leadExecutionAuthorized({
          userText: params.userText,
          lastAssistantText: lastAsst,
          agentReply: decision.reply || "",
          userTriggerPatterns: userPatterns,
          agentTriggerPatterns: agentPatterns
        })
      ) {
        logger.info(
          `[AGENT-ORCH] criar lead bloqueado ticket=${params.ticket.id} — sem interesse/dados conforme gatilhos da ação`
        );
        const reply = applyAgentOrchestratorGuardrails(decision.reply || "", {
          lastAssistantText: lastAsst,
          missingData: decision.understanding.missingData,
          actionConfirmed: false
        });
        await persistSemanticState(params.ticket, params.prompt, decision, {
          userText: params.userText,
          usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText,
          reply
        });
        return { handled: true, reply, decision };
      }
      actionVariables = { ...actionVariables, leadAuthorized: true };
    }

    if (isActivityAction) {
      if (
        !activityExecutionAuthorized({
          userText: params.userText,
          lastAssistantText: lastAsst,
          agentReply: decision.reply || "",
          userTriggerPatterns: userPatterns,
          agentTriggerPatterns: agentPatterns
        })
      ) {
        logger.info(
          `[AGENT-ORCH] criar atividade bloqueado ticket=${params.ticket.id} — sem gatilho configurado na conversa`
        );
        const reply = applyAgentOrchestratorGuardrails(decision.reply || "", {
          lastAssistantText: lastAsst,
          missingData: decision.understanding.missingData,
          actionConfirmed: false
        });
        await persistSemanticState(params.ticket, params.prompt, decision, {
          userText: params.userText,
          usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText,
          reply
        });
        return { handled: true, reply, decision };
      }
      actionVariables = { ...actionVariables, activityAuthorized: true };
    }

    const result = await executeSmartAction(
      decision.decision.actionSlug,
      params.prompt,
      params.ticket,
      params.contact,
      actionVariables,
      { smartActionId: validation.action.id, scriptSlug: decision.decision.actionSlug }
    );
    actionResult = result;
    if (!result.success) {
      const missing = Array.isArray((result.data as any)?.missingFields) ? (result.data as any).missingFields : [];
      const silentFail = isSilentCustomerSmartActionSlug(decision.decision.actionSlug);
      const fallbackReply = missing.length
        ? `Consigo seguir, mas preciso confirmar ${missing.join(", ")}.`
        : silentFail
          ? decision.reply || ""
          : result.message || decision.reply || "Consigo seguir, mas preciso confirmar uma informacao antes.";
      const guardedFallbackReply = applyAgentOrchestratorGuardrails(fallbackReply, {
        lastAssistantText: lastAssistantText(recentMessages),
        missingData: missing,
        actionConfirmed: false
      });
      await persistSemanticState(params.ticket, params.prompt, decision, {
        userText: params.userText,
        usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText,
        reply: guardedFallbackReply,
        action: { slug: decision.decision.actionSlug, success: false, message: result.message }
      });
      return {
        handled: true,
        reply: guardedFallbackReply,
        decision,
        actionResult: result
      };
    }
    await persistSemanticState(params.ticket, params.prompt, decision, {
      userText: params.userText,
      usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText,
      action: {
        slug: decision.decision.actionSlug,
        success: result.success,
        message: result.message
      }
    });
  }

  const silentAction =
    decision.decision.actionSlug &&
    isSilentCustomerSmartActionSlug(decision.decision.actionSlug);
  const replyBase =
    decision.reply ||
    (silentAction ? "" : actionResult?.message) ||
    decision.decision.nextQuestion ||
    (silentAction ? "" : "Entendi. Vou seguir por esse caminho.");
  let finalDecision = decision;
  const lastKnownQuestion = latestKnownAssistantQuestion(params.ticket, recentMessages, params.prompt.id, params.prompt);
  let repeatedQuestion = findRepeatedQuestion(replyBase, lastKnownQuestion);
  let replyCandidate = replyBase;
  if (repeatedQuestion) {
    const answeredLastQuestion =
      userTextLikelyAnswersQuestion(params.userText, lastKnownQuestion) || lastQuestionContext.answered;
    const repaired = await repairRepeatedQuestionDecision({
      client,
      models: structuredModels,
      system,
      recentMessages,
      userText: params.userText,
      decision,
      repeatedQuestion,
      lastQuestion: lastKnownQuestion,
      userAnsweredLastQuestion: answeredLastQuestion,
      maxTokens,
      timeoutMs,
      tools: knowledgeRuntime.tools,
      ...orchestratorLlm
    });
    if (repaired) {
      finalDecision = repaired;
      replyCandidate = repaired.reply || repaired.decision.nextQuestion || "";
    }
  }

  let reply = applyAgentOrchestratorGuardrails(replyCandidate, {
    lastAssistantText: lastAssistantText(recentMessages),
    missingData: finalDecision.understanding.missingData,
    actionConfirmed: actionResult?.success === true
  });

  repeatedQuestion = findRepeatedQuestion(reply, lastKnownQuestion);
  if (repeatedQuestion) {
    const answeredLastQuestion =
      userTextLikelyAnswersQuestion(params.userText, lastKnownQuestion) || lastQuestionContext.answered;
    const repaired = await repairRepeatedQuestionDecision({
      client,
      models: structuredModels,
      system,
      recentMessages,
      userText: params.userText,
      decision,
      repeatedQuestion,
      lastQuestion: lastKnownQuestion,
      userAnsweredLastQuestion: answeredLastQuestion,
      maxTokens,
      timeoutMs,
      tools: knowledgeRuntime.tools,
      ...orchestratorLlm
    });
    if (repaired) {
      const repairedReply = applyAgentOrchestratorGuardrails(
        repaired.reply || repaired.decision.nextQuestion || "",
        {
          lastAssistantText: lastKnownQuestion,
          missingData: repaired.understanding.missingData,
          actionConfirmed: actionResult?.success === true
        }
      );
      if (repairedReply && !findRepeatedQuestion(repairedReply, lastKnownQuestion)) {
        finalDecision = repaired;
        reply = repairedReply;
      }
    }
    if (findRepeatedQuestion(reply, lastKnownQuestion)) {
      await persistSemanticState(params.ticket, params.prompt, finalDecision, {
        userText: params.userText,
        usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText,
        reply,
        repeatedQuestionBlocked: repeatedQuestion,
        action: actionResult
          ? {
              slug: finalDecision.decision.actionSlug,
              success: actionResult.success,
              message: actionResult.message
            }
          : undefined
      });
    }
  }

  const actionTypesAllowingSyntheticReply =
    actionResult?.success === true &&
    (finalDecision.decision.type === "execute_action" ||
      finalDecision.decision.type === "reply_and_execute_action" ||
      finalDecision.decision.type === "handoff");
  if (!reply && actionTypesAllowingSyntheticReply) {
    reply = applyAgentOrchestratorGuardrails(
      String(actionResult?.message || "").trim() || "Concluído.",
      {
        lastAssistantText: lastAssistantText(recentMessages),
        missingData: finalDecision.understanding.missingData,
        actionConfirmed: true
      }
    );
  }
  if (!reply && finalDecision.decision.type !== "ignore_duplicate") {
    return { handled: false, reply: "", decision: finalDecision, actionResult, fallbackReason: "empty_reply_after_guardrails" };
  }

  reply = sanitizeOrchestratorCustomerReply(String(reply || ""));
  if (
    !reply &&
    finalDecision.decision.type !== "ignore_duplicate" &&
    looksLikeAgentOrchestratorJsonLeak(String(replyCandidate || content || ""))
  ) {
    reply = buildInvalidJsonRecoveryReply(params.userText, recentMessages, params.prompt);
    logger.warn(
      `[AGENT-ORCH] vazamento JSON bloqueado ticket=${params.ticket.id}; usando resposta de recuperacao.`
    );
  }

  if (reply) {
    await persistSemanticState(params.ticket, params.prompt, finalDecision, {
      userText: params.userText,
      usefulUserAnswer: lastQuestionContext.usefulAnswer || params.userText,
      reply,
      action: actionResult
        ? {
            slug: finalDecision.decision.actionSlug,
            success: actionResult.success,
            message: actionResult.message
          }
        : undefined
    });
  }

  return {
    handled: finalDecision.decision.type !== "ignore_duplicate",
    reply,
    decision: finalDecision,
    actionResult,
    geminiImages
  };
}

/**
 * Fallback direto (texto natural) quando o orquestrador JSON não produziu resposta.
 * Usa o mesmo roteiro/regras gerais do orquestrador — OpenAI, Claude e Gemini.
 */
export async function runProviderDirectReplyFallback(
  params: AgentOrchestratorInput
): Promise<AgentOrchestratorResult> {
  const provider = String((params.prompt as any).__llmProvider || "openai");
  if (provider === "gemini") {
    return runGeminiWhatsappDirectReply(params);
  }
  if (provider === "anthropic") {
    return runAnthropicWhatsappDirectReply(params);
  }
  if (provider === "grok") {
    return runGrokWhatsappDirectReply(params);
  }
  return { handled: false, reply: "", fallbackReason: "openai_uses_legacy_chat" };
}

/**
 * Fallback Claude em /tickets quando o orquestrador JSON não tratou o turno
 * (ex.: feature flag, falha de parse ou modelo inválido no banco).
 * Não usa o SDK OpenAI — mesma configuração de prompt/roteiro do agente.
 */
export async function runGeminiWhatsappDirectReply(
  params: AgentOrchestratorInput
): Promise<AgentOrchestratorResult> {
  const apiKey = String((params.prompt as any).apiKey || "").trim();
  if (!apiKey) {
    return { handled: false, reply: "", fallbackReason: "missing_api_key" };
  }
  const model = resolveGeminiModelId(String((params.prompt as any).model || "").trim());
  const recentMessages = await loadRecentMessages(params);
  const actions = await listPromptSmartActionToolsShared(
    params.prompt,
    params.ticket.companyId
  );
  const system = [
    buildOrchestratorSystemPrompt({
      prompt: params.prompt,
      ticket: params.ticket,
      contact: params.contact,
      recentMessages,
      actions,
      systemPrompt: params.systemPrompt
    }),
    "",
    "Responda ao cliente em português do Brasil com texto natural (sem JSON).",
    "Siga o roteiro, regras gerais, etapas e configuração salvas neste agente."
  ].join("\n");
  const user = [
    "Mensagem atual do cliente:",
    JSON.stringify(params.userText),
    "",
    isGeminiImageGenerationModel(model)
      ? "Gere a imagem solicitada e, se necessário, um texto curto para o cliente no WhatsApp."
      : "Gere somente o texto que o cliente deve receber no WhatsApp."
  ].join("\n");
  try {
    const userParts = await loadGeminiInboundMediaParts({
      companyId: params.ticket.companyId,
      ticketId: params.ticket.id,
      userText: params.userText
    });
    const result = await createGeminiAgentResponse({
      apiKey,
      model,
      messages: [
        { role: "system", content: system },
        ...recentMessages.slice(-16).map((m: any) => ({
          role: m.fromMe ? "assistant" : "user",
          content: String(m.body || "")
        })),
        { role: "user", content: user }
      ],
      maxTokens: getAgentOrchestratorMaxTokens(params.prompt),
      temperature:
        typeof (params.prompt as any).temperature === "number"
          ? (params.prompt as any).temperature
          : 0.7,
      structuredJson: false,
      userParts: userParts.length ? userParts : undefined
    });
    const raw = String(result.content || "").trim();
    const images = result.images || [];
    if (!raw && !images.length) {
      return { handled: false, reply: "", fallbackReason: "empty_gemini_reply" };
    }
    const naturalText = raw ? sanitizeOrchestratorCustomerReply(raw) : "";
    const reply = naturalText
      ? applyAgentOrchestratorGuardrails(naturalText, {
          lastAssistantText: lastAssistantText(recentMessages),
          actionConfirmed: false
        })
      : images.length
        ? "Segue a imagem solicitada."
        : "";
    if (!String(reply || "").trim() && !images.length) {
      return { handled: false, reply: "", fallbackReason: "empty_gemini_reply" };
    }
    return {
      handled: true,
      reply: String(reply || "").trim(),
      geminiImages: images.length ? images : undefined
    };
  } catch (e: any) {
    logger.warn(
      `[AGENT-ORCH] Gemini direct reply falhou ticket=${params.ticket.id}: ${e?.message || e}`
    );
    return { handled: false, reply: "", fallbackReason: "gemini_direct_failed" };
  }
}

export async function runAnthropicWhatsappDirectReply(
  params: AgentOrchestratorInput
): Promise<AgentOrchestratorResult> {
  const apiKey = String((params.prompt as any).apiKey || "").trim();
  if (!apiKey) {
    return { handled: false, reply: "", fallbackReason: "missing_api_key" };
  }
  const model = resolveAnthropicModelId(
    normalizeAgentModelId(String((params.prompt as any).model || "").trim())
  );
  const recentMessages = await loadRecentMessages(params);
  const actions = await listPromptSmartActionToolsShared(
    params.prompt,
    params.ticket.companyId
  );
  const system = [
    buildOrchestratorSystemPrompt({
      prompt: params.prompt,
      ticket: params.ticket,
      contact: params.contact,
      recentMessages,
      actions,
      systemPrompt: params.systemPrompt
    }),
    "",
    "Responda ao cliente em português do Brasil com texto natural (sem JSON).",
    "Siga o roteiro, regras gerais, etapas e configuração salvas neste agente.",
    "Uma pergunta principal por mensagem; não repita etapas já concluídas no histórico."
  ].join("\n");
  const user = [
    "Mensagem atual do cliente:",
    JSON.stringify(params.userText),
    "",
    "Gere somente o texto que o cliente deve receber no WhatsApp."
  ].join("\n");
  try {
    const result = await createAnthropicAgentResponse({
      apiKey,
      model,
      messages: [
        { role: "system", content: system },
        ...recentMessages.slice(-16).map((m: any) => ({
          role: m.fromMe ? "assistant" : "user",
          content: String(m.body || "")
        })),
        { role: "user", content: user }
      ],
      maxTokens: getAgentOrchestratorMaxTokens(params.prompt),
      temperature:
        typeof (params.prompt as any).temperature === "number"
          ? (params.prompt as any).temperature
          : 0.7,
      structuredJson: false
    });
    const raw = String(result.content || "").trim();
    if (!raw) {
      return { handled: false, reply: "", fallbackReason: "empty_anthropic_reply" };
    }
    const naturalText = sanitizeOrchestratorCustomerReply(raw);
    const reply = naturalText
      ? applyAgentOrchestratorGuardrails(naturalText, {
          lastAssistantText: lastAssistantText(recentMessages),
          actionConfirmed: false
        })
      : "";
    if (!String(reply || "").trim()) {
      return { handled: false, reply: "", fallbackReason: "empty_anthropic_reply" };
    }
    return { handled: true, reply: String(reply).trim() };
  } catch (e: any) {
    logger.warn(
      `[AGENT-ORCH] Claude direct reply falhou ticket=${params.ticket.id}: ${e?.message || e}`
    );
    return { handled: false, reply: "", fallbackReason: "anthropic_direct_failed" };
  }
}

export async function runGrokWhatsappDirectReply(
  params: AgentOrchestratorInput
): Promise<AgentOrchestratorResult> {
  const apiKey = String((params.prompt as any).apiKey || "").trim();
  if (!apiKey) {
    return { handled: false, reply: "", fallbackReason: "missing_api_key" };
  }
  const model = resolveGrokModelId(String((params.prompt as any).model || "").trim());
  const recentMessages = await loadRecentMessages(params);
  const actions = await listPromptSmartActionToolsShared(
    params.prompt,
    params.ticket.companyId
  );
  const system = [
    buildOrchestratorSystemPrompt({
      prompt: params.prompt,
      ticket: params.ticket,
      contact: params.contact,
      recentMessages,
      actions,
      systemPrompt: params.systemPrompt
    }),
    "",
    "Responda ao cliente em português do Brasil com texto natural (sem JSON).",
    "Siga o roteiro, regras gerais, etapas e configuração salvas neste agente.",
    "Uma pergunta principal por mensagem; não repita etapas já concluídas no histórico."
  ].join("\n");
  const user = [
    "Mensagem atual do cliente:",
    JSON.stringify(params.userText),
    "",
    "Gere somente o texto que o cliente deve receber no WhatsApp."
  ].join("\n");
  try {
    const result = await createGrokAgentResponse({
      apiKey,
      model,
      messages: [
        { role: "system", content: system },
        ...recentMessages.slice(-16).map((m: any) => ({
          role: m.fromMe ? "assistant" : "user",
          content: String(m.body || "")
        })),
        { role: "user", content: user }
      ],
      maxTokens: getAgentOrchestratorMaxTokens(params.prompt),
      temperature:
        typeof (params.prompt as any).temperature === "number"
          ? (params.prompt as any).temperature
          : 0.7,
      topP:
        typeof (params.prompt as any).topP === "number"
          ? (params.prompt as any).topP
          : undefined,
      structuredJson: false
    });
    const raw = String(result.content || "").trim();
    if (!raw) {
      return { handled: false, reply: "", fallbackReason: "empty_grok_reply" };
    }
    const naturalText = sanitizeOrchestratorCustomerReply(raw);
    const reply = naturalText
      ? applyAgentOrchestratorGuardrails(naturalText, {
          lastAssistantText: lastAssistantText(recentMessages),
          actionConfirmed: false
        })
      : "";
    if (!String(reply || "").trim()) {
      return { handled: false, reply: "", fallbackReason: "empty_grok_reply" };
    }
    return { handled: true, reply: String(reply).trim() };
  } catch (e: any) {
    logger.warn(
      `[AGENT-ORCH] Grok direct reply falhou ticket=${params.ticket.id}: ${e?.message || e}`
    );
    return { handled: false, reply: "", fallbackReason: "grok_direct_failed" };
  }
}
