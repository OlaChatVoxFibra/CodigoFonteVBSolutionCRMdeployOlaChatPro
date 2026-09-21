/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * AgentOutboundGuard (PR 15)
 *
 * Anti-repetição global de mensagens do agente. Antes de enviar qualquer texto outbound
 * (LLM ou roteiro), calcula um hash do texto normalizado e compara com os últimos N hashes
 * salvos em `ticket.dataWebhook.agentState.lastOutboundHashes`. Se houver match recente,
 * a mensagem é bloqueada silenciosamente.
 *
 * Também detecta similaridade aproximada (Levenshtein ≤ 5%) — útil para o caso em que o LLM
 * altera apenas pontuação/whitespace.
 *
 * Persiste o novo hash apenas após o envio bem-sucedido via `recordSentOutbound`.
 */

import { createHash } from "crypto";
import logger from "../../utils/logger";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";
import Ticket from "../../models/Ticket";

const HASH_HISTORY_CAP = 5;
const DEFAULT_WINDOW_MINUTES = 10;
const LEVENSHTEIN_THRESHOLD = 0.05; // 5% diff
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

export interface OutboundHashEntry {
  hash: string;
  text: string; // normalized text (capped to first 240 chars for memory)
  ts: string;
  promptId?: number;
}

export function normalizeOutboundText(input: string): string {
  return String(input || "")
    .replace(/\u200e/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeSemanticText(input: string): string {
  return normalizeOutboundText(input)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function semanticTokens(input: string): string[] {
  return normalizeSemanticText(input)
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

function extractQuestionSentences(text: string): string[] {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  return (clean.match(/[^.!?]+[?]+(?:["')\]]+)?/g) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function hashOutboundText(input: string): string {
  const norm = normalizeOutboundText(input);
  return createHash("sha1").update(norm).digest("hex");
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const dp = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) dp[j] = j;
  for (let i = 1; i <= al; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= bl; j++) {
      const tmp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = tmp;
    }
  }
  return dp[bl];
}

function approxSimilar(a: string, b: string): boolean {
  const al = a.length;
  const bl = b.length;
  const longer = Math.max(al, bl);
  if (longer < 12) return a === b; // textos muito curtos só batem se exatamente iguais
  const distLimit = Math.max(1, Math.floor(longer * LEVENSHTEIN_THRESHOLD));
  // Truncamos para 240 chars para limitar custo (~57k ops)
  const aT = a.slice(0, 240);
  const bT = b.slice(0, 240);
  return levenshtein(aT, bT) <= distLimit;
}

export interface ShouldSendOutboundResult {
  send: boolean;
  reason?: "duplicate-hash" | "approx-duplicate" | "repeated-question";
  matchedHash?: string;
}

export interface ShouldSendOutboundOpts {
  windowMinutes?: number;
  /** Se true, ignora o guard (escape hatch para mensagens críticas). */
  bypass?: boolean;
}

function getHistoryFromTicket(ticket: Ticket, promptId: number | null = null): OutboundHashEntry[] {
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = (dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {}) as Record<string, any>;
  const list = Array.isArray(agentState.lastOutboundHashes) ? agentState.lastOutboundHashes : [];
  return list.filter((x: any) => {
    if (!x || typeof x !== "object" || typeof x.hash !== "string") return false;
    if (promptId == null) return true;
    return x.promptId == null || Number(x.promptId) === Number(promptId);
  });
}

function isWithinWindow(entry: OutboundHashEntry, windowMinutes: number): boolean {
  try {
    const t = new Date(entry.ts).getTime();
    if (!Number.isFinite(t)) return false;
    const ageMin = (Date.now() - t) / 60000;
    return ageMin <= windowMinutes;
  } catch {
    return false;
  }
}

export function shouldSendOutbound(
  text: string,
  ticket: Ticket,
  promptId: number | null = null,
  opts: ShouldSendOutboundOpts = {}
): ShouldSendOutboundResult {
  if (opts.bypass) return { send: true };
  const norm = normalizeOutboundText(text);
  if (!norm) return { send: true };

  const window = opts.windowMinutes ?? DEFAULT_WINDOW_MINUTES;
  const history = getHistoryFromTicket(ticket, promptId);
  const inWindow = history.filter((e) => isWithinWindow(e, window));

  const h = hashOutboundText(text);
  const exact = inWindow.find((e) => e.hash === h);
  if (exact) return { send: false, reason: "duplicate-hash", matchedHash: exact.hash };

  const agentState = ((normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>).agentState || {}) as Record<string, any>;
  const llmFirstState =
    agentState.llmFirstState && typeof agentState.llmFirstState === "object"
      ? (agentState.llmFirstState as Record<string, any>)
      : {};
  const scopedLlmFirstState =
    promptId == null || Number(llmFirstState.promptId) === Number(promptId) ? llmFirstState : {};
  const questionCandidates = [
    ...(Array.isArray(scopedLlmFirstState.askedQuestions) ? scopedLlmFirstState.askedQuestions : []),
    scopedLlmFirstState.lastAssistantQuestion
  ]
    .map((q) => String(q || "").trim())
    .filter(Boolean)
    .slice(-10);
  const outgoingQuestions = extractQuestionSentences(text);
  if (outgoingQuestions.length && questionCandidates.length) {
    for (const outgoing of outgoingQuestions) {
      const repeated = questionCandidates.some((prev) => semanticSimilarity(outgoing, prev) >= 0.72);
      if (repeated) {
        return { send: false, reason: "repeated-question" };
      }
    }
  }

  for (const e of inWindow) {
    if (approxSimilar(norm, normalizeOutboundText(e.text))) {
      return { send: false, reason: "approx-duplicate", matchedHash: e.hash };
    }
  }
  return { send: true };
}

export async function recordSentOutbound(
  text: string,
  ticket: Ticket,
  promptId: number | null = null
): Promise<void> {
  if (!ticket || !text) return;
  const norm = normalizeOutboundText(text);
  if (!norm) return;
  try {
    const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
    const agentState = (dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {}) as Record<string, any>;
    const list: OutboundHashEntry[] = Array.isArray(agentState.lastOutboundHashes)
      ? agentState.lastOutboundHashes
      : [];
    const llmFirstState =
      agentState.llmFirstState && typeof agentState.llmFirstState === "object"
        ? (agentState.llmFirstState as Record<string, any>)
        : {};
    const scopedLlmFirstState =
      promptId == null || Number(llmFirstState.promptId) === Number(promptId) ? llmFirstState : {};
    const questions = extractQuestionSentences(text);
    const lastQuestion = questions.length ? questions[questions.length - 1] : "";
    const askedQuestions = [
      ...(Array.isArray(scopedLlmFirstState.askedQuestions) ? scopedLlmFirstState.askedQuestions : []),
      ...(lastQuestion ? [lastQuestion] : [])
    ].slice(-20);

    const entry: OutboundHashEntry = {
      hash: hashOutboundText(text),
      text: norm.slice(0, 240),
      ts: new Date().toISOString(),
      ...(promptId != null ? { promptId } : {})
    };
    const next = [...list, entry].slice(-HASH_HISTORY_CAP);

    const nextDw = {
      ...dw,
      agentState: {
        ...agentState,
        lastOutboundHashes: next,
        llmFirstState: {
          ...scopedLlmFirstState,
          ...(promptId != null ? { promptId } : {}),
          ...(lastQuestion ? { lastAssistantQuestion: lastQuestion, askedQuestions } : {}),
          lastReply: text,
          updatedAt: new Date().toISOString()
        }
      }
    };
    await (ticket as any).update({ dataWebhook: nextDw });
    (ticket as any).setDataValue && (ticket as any).setDataValue("dataWebhook", nextDw);
  } catch (e) {
    logger.warn("[AgentOutboundGuard] falha ao persistir lastOutboundHashes:", e as any);
  }
}

export function isAgentOutboundGuardEnabled(): boolean {
  const v = String(process.env.AGENT_OUTBOUND_GUARD_ENABLED || "").toLowerCase();
  // Default ON: anti-repetição é defensivo e seguro.
  if (!v) return true;
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
