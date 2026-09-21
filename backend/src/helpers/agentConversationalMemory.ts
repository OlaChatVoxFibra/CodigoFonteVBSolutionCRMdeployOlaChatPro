/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../models/Ticket";
import { parseDateTimeFromText } from "./parseDateTimeFromText";
import { looksLikePeriodWithoutExactDate } from "./agentAttendanceFlowMemory";
import { normalizeTicketDataWebhook } from "../services/AgentProactiveServices/agentProactiveTicketState";
import logger from "../utils/logger";

export const AGENT_CONVERSATIONAL_MEMORY_SCHEMA = 1;

export type ConversationalKnownFacts = {
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  city?: string;
  preferredTime?: string;
  interest?: string;
  intent?: string;
  objective?: string;
};

export type AgentConversationalMemory = {
  schemaVersion: number;
  promptId: number;
  knownFacts: ConversationalKnownFacts;
  lastUserIntent?: string;
  currentObjective?: string;
  lastAssistantQuestion?: string;
  lastUserAnswer?: string;
  loopRisk?: "none" | "possible" | "high";
  pendingFields: string[];
  lastUpdatedAt?: string;
  evidence: Record<string, string>;
};

type ConversationTurnLike = {
  fromMe: boolean;
  body?: string | null;
};

const FIELD_LABELS: Record<keyof ConversationalKnownFacts, string> = {
  name: "nome",
  company: "empresa",
  phone: "telefone",
  email: "email",
  city: "cidade",
  preferredTime: "horario",
  interest: "interesse",
  intent: "intencao",
  objective: "objetivo"
};

function sanitizeValue(value: string, max = 120): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;:!?]+$/g, "")
    .slice(0, max);
}

function normalizeTextForIntent(text: string): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function preferExisting(existing: string | undefined, incoming: string | undefined): string | undefined {
  const next = sanitizeValue(String(incoming || ""));
  if (!next) return existing;
  const prev = sanitizeValue(String(existing || ""));
  if (!prev) return next;
  if (next.length > prev.length && !prev.toLowerCase().includes(next.toLowerCase())) return next;
  return prev;
}

function preferLatest(
  field: keyof ConversationalKnownFacts,
  existing: string | undefined,
  incoming: string | undefined
): string | undefined {
  const next = sanitizeValue(String(incoming || ""));
  if (!next) return existing;
  if (["email", "phone", "preferredTime", "intent", "objective"].includes(field)) {
    return next;
  }
  return preferExisting(existing, next);
}

function extractNamedValue(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = sanitizeValue(match[1], 100);
      if (value) return value;
    }
  }
  return undefined;
}

export function normalizeAgentConversationalMemory(
  raw: unknown,
  promptId: number
): AgentConversationalMemory {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, any>) : {};
  const pid = o.promptId != null ? Number(o.promptId) : promptId;
  const facts = o.knownFacts && typeof o.knownFacts === "object" && !Array.isArray(o.knownFacts)
    ? o.knownFacts
    : {};
  const evidence = o.evidence && typeof o.evidence === "object" && !Array.isArray(o.evidence)
    ? o.evidence
    : {};
  return {
    schemaVersion: AGENT_CONVERSATIONAL_MEMORY_SCHEMA,
    promptId: Number.isFinite(pid) ? pid : promptId,
    knownFacts: {
      name: sanitizeValue(facts.name || "") || undefined,
      company: sanitizeValue(facts.company || "") || undefined,
      phone: sanitizeValue(facts.phone || "") || undefined,
      email: sanitizeValue(facts.email || "") || undefined,
      city: sanitizeValue(facts.city || "") || undefined,
      preferredTime: sanitizeValue(facts.preferredTime || "") || undefined,
      interest: sanitizeValue(facts.interest || "") || undefined,
      intent: sanitizeValue(facts.intent || "") || undefined,
      objective: sanitizeValue(facts.objective || "") || undefined
    },
    lastUserIntent: sanitizeValue(o.lastUserIntent || "") || undefined,
    currentObjective: sanitizeValue(o.currentObjective || "") || undefined,
    lastAssistantQuestion: sanitizeValue(o.lastAssistantQuestion || "", 220) || undefined,
    lastUserAnswer: sanitizeValue(o.lastUserAnswer || "", 220) || undefined,
    loopRisk: o.loopRisk === "high" || o.loopRisk === "possible" ? o.loopRisk : "none",
    pendingFields: Array.isArray(o.pendingFields)
      ? [...new Set(o.pendingFields.map((v: unknown) => sanitizeValue(String(v || ""), 40)).filter(Boolean))]
      : [],
    lastUpdatedAt: o.lastUpdatedAt ? String(o.lastUpdatedAt) : undefined,
    evidence: Object.fromEntries(
      Object.entries(evidence).map(([k, v]) => [k, sanitizeValue(String(v || ""), 160)])
    )
  };
}

export function inferFactsFromUserText(text: string): Partial<ConversationalKnownFacts> {
  const raw = String(text || "").trim();
  const norm = normalizeTextForIntent(raw);
  const facts: Partial<ConversationalKnownFacts> = {};
  if (!raw) return facts;

  const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) facts.email = sanitizeValue(email, 120);

  const phone = raw.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/)?.[0];
  if (phone) facts.phone = sanitizeValue(phone.replace(/\s+/g, " "), 40);

  facts.name = extractNamedValue(raw, [
    /\b(?:meu nome (?:é|e)|me chamo|sou o|sou a|eu sou)\s+([A-Za-zÀ-ÖØ-öø-ÿ' ]{2,60})/i
  ]);

  facts.company = extractNamedValue(raw, [
    /\b(?:empresa|trabalho na|trabalho no|sou da|sou do)\s+([A-Za-zÀ-ÖØ-öø-ÿ0-9&.' -]{2,80})/i
  ]);

  facts.city = extractNamedValue(raw, [
    /\b(?:sou de|moro em|estou em|cidade é|cidade e)\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,80})/i
  ]);

  const parsedDate = parseDateTimeFromText(raw);
  if (parsedDate.matched) {
    facts.preferredTime = raw.slice(0, 160);
  } else if (looksLikePeriodWithoutExactDate(raw)) {
    facts.preferredTime = raw.slice(0, 160);
  }

  if (/\b(agendar|marcar|reservar|hor[aá]rio|amanha|amanhã|depois do almoco|depois do almoço)\b/.test(norm)) {
    facts.intent = "agendamento";
    facts.objective = "marcar horario";
  } else if (/\b(valor|preco|preço|quanto custa|orcamento|orçamento)\b/.test(norm)) {
    facts.intent = "preco";
    facts.objective = "entender valores";
  } else if (/\b(atendente|humano|pessoa|suporte)\b/.test(norm)) {
    facts.intent = "transferencia_humana";
    facts.objective = "falar com atendente";
  } else if (/\b(produto|servico|serviço|plano|catalogo|catálogo)\b/.test(norm)) {
    facts.intent = "consulta_produto";
    facts.objective = "conhecer opcoes";
  }

  facts.interest = extractNamedValue(raw, [
    /\b(?:tenho interesse em|quero|procuro|preciso de|estou buscando)\s+([^.!?\n]{3,120})/i
  ]);

  return Object.fromEntries(Object.entries(facts).filter(([, v]) => !!sanitizeValue(String(v || ""))));
}

function extractLastAssistantQuestion(turns: ConversationTurnLike[]): string | undefined {
  const assistant = [...turns]
    .reverse()
    .find((t) => t.fromMe && /\?\s*$/.test(String(t.body || "").trim()));
  if (!assistant) return undefined;
  const body = String(assistant.body || "").replace(/\u200e/g, "").trim();
  const questions = body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /\?\s*$/.test(line));
  return sanitizeValue(questions[questions.length - 1] || body, 220) || undefined;
}

function extractLastUserAnswer(turns: ConversationTurnLike[], fallback?: string): string | undefined {
  const user = [...turns].reverse().find((t) => !t.fromMe && String(t.body || "").trim());
  return sanitizeValue(String(user?.body || fallback || ""), 220) || undefined;
}

function looksLikeOnlyConfirmation(text: string): boolean {
  const norm = normalizeTextForIntent(text);
  return /^(sim|pode|ok|certo|isso|beleza|ta bom|tudo bem|confirmo|nao|não)$/.test(norm);
}

function stripContactArtifacts(text: string): string {
  return String(text || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/g, " ")
    .replace(/\b(nome|email|e-mail|telefone|whats|whatsapp|contato)\s*[:=-]\s*/gi, " ")
    .replace(/[|,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferNameFromContactLine(text: string): string | undefined {
  const candidate = sanitizeValue(stripContactArtifacts(text), 80);
  if (!candidate || /\d/.test(candidate) || candidate.length < 2) return undefined;
  if (looksLikeOnlyConfirmation(candidate)) return undefined;
  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length > 5) return undefined;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' ]+$/.test(candidate)) return undefined;
  return candidate;
}

function inferFactsFromQuestionContext(
  text: string,
  turns: ConversationTurnLike[]
): Partial<ConversationalKnownFacts> {
  const raw = String(text || "").trim();
  if (!raw || looksLikeOnlyConfirmation(raw)) return {};

  const question = extractLastAssistantQuestion(turns);
  if (!question) return {};

  const q = normalizeTextForIntent(question);
  const facts: Partial<ConversationalKnownFacts> = {};

  if (/\b(nome|como voce se chama|como você se chama|seus dados|seus contatos|cadastro)\b/.test(q)) {
    const name = inferNameFromContactLine(raw);
    if (name) facts.name = name;
  }
  if (/\b(email|e-mail)\b/.test(q)) {
    const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    if (email) facts.email = sanitizeValue(email, 120);
  }
  if (/\b(telefone|whats|whatsapp|numero|número|contato|celular)\b/.test(q)) {
    const phone = raw.match(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}/)?.[0];
    if (phone) facts.phone = sanitizeValue(phone.replace(/\s+/g, " "), 40);
  }
  if (/\b(empresa|negocio|negócio|trabalha|companhia)\b/.test(q)) {
    const value = sanitizeValue(raw, 80);
    if (value && !looksLikeOnlyConfirmation(value)) facts.company = value;
  }
  if (/\b(cidade|regiao|região|bairro|onde voce esta|onde você está|localizacao|localização)\b/.test(q)) {
    const value = sanitizeValue(raw, 80);
    if (value && !looksLikeOnlyConfirmation(value)) facts.city = value;
  }
  if (/\b(interesse|procura|precisa|produto|servico|serviço|plano|solucao|solução)\b/.test(q)) {
    const value = sanitizeValue(raw, 120);
    if (value && !looksLikeOnlyConfirmation(value)) facts.interest = value;
  }
  if (/\b(data|dia|horario|horário|agenda|agendar|marcar|quando|periodo|período)\b/.test(q)) {
    const parsedDate = parseDateTimeFromText(raw);
    if (parsedDate.matched || looksLikePeriodWithoutExactDate(raw)) {
      facts.preferredTime = sanitizeValue(raw, 160);
      facts.intent = "agendamento";
      facts.objective = "marcar horario";
    }
  }

  return Object.fromEntries(Object.entries(facts).filter(([, v]) => !!sanitizeValue(String(v || ""))));
}

function detectLoopRisk(turns: ConversationTurnLike[], pendingFields: string[]): AgentConversationalMemory["loopRisk"] {
  const assistantTexts = turns
    .filter((t) => t.fromMe)
    .map((t) => normalizeTextForIntent(String(t.body || "")))
    .filter(Boolean)
    .slice(-4);
  if (assistantTexts.length < 2) return pendingFields.length ? "possible" : "none";
  const last = assistantTexts[assistantTexts.length - 1];
  const repeated = assistantTexts.slice(0, -1).some((txt) => txt === last || (last.length > 30 && txt.includes(last.slice(0, 60))));
  if (repeated) return "high";
  return pendingFields.length ? "possible" : "none";
}

export function mergeAgentConversationalMemory(
  previous: AgentConversationalMemory,
  inferred: Partial<ConversationalKnownFacts>,
  opts: { promptId: number; recentTurns?: ConversationTurnLike[] } = { promptId: previous.promptId }
): AgentConversationalMemory {
  const knownFacts: ConversationalKnownFacts = { ...previous.knownFacts };
  const evidence = { ...previous.evidence };
  for (const [key, value] of Object.entries(inferred) as Array<[keyof ConversationalKnownFacts, string | undefined]>) {
    const merged = preferLatest(key, knownFacts[key], value);
    if (merged) {
      knownFacts[key] = merged;
      evidence[key] = sanitizeValue(String(value || merged), 160);
    }
  }

  const pendingFields = (Object.keys(FIELD_LABELS) as Array<keyof ConversationalKnownFacts>)
    .filter((key) => ["name", "phone", "email", "preferredTime", "interest"].includes(key))
    .filter((key) => !knownFacts[key])
    .map((key) => FIELD_LABELS[key]);

  const lastUserIntent = knownFacts.intent || previous.lastUserIntent;
  const currentObjective = knownFacts.objective || previous.currentObjective || inferObjectiveFromTurns(opts.recentTurns || []);
  const lastAssistantQuestion = extractLastAssistantQuestion(opts.recentTurns || []) || previous.lastAssistantQuestion;
  const lastUserAnswer = extractLastUserAnswer(opts.recentTurns || [], Object.values(inferred).find(Boolean) as string | undefined) || previous.lastUserAnswer;
  const loopRisk = detectLoopRisk(opts.recentTurns || [], pendingFields);

  return {
    ...previous,
    promptId: opts.promptId,
    schemaVersion: AGENT_CONVERSATIONAL_MEMORY_SCHEMA,
    knownFacts,
    lastUserIntent,
    currentObjective,
    lastAssistantQuestion,
    lastUserAnswer,
    loopRisk,
    pendingFields,
    lastUpdatedAt: new Date().toISOString(),
    evidence
  };
}

function inferObjectiveFromTurns(turns: ConversationTurnLike[]): string | undefined {
  const lastUser = [...turns].reverse().find((t) => !t.fromMe && String(t.body || "").trim());
  if (!lastUser) return undefined;
  return inferFactsFromUserText(String(lastUser.body || "")).objective;
}

export async function updateAgentConversationalMemory(params: {
  ticket: Ticket;
  promptId: number;
  userText: string;
  recentTurns?: ConversationTurnLike[];
}): Promise<AgentConversationalMemory> {
  const { ticket, promptId, userText, recentTurns } = params;
  const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = dw.agentState && typeof dw.agentState === "object" ? dw.agentState : {};
  const previous = normalizeAgentConversationalMemory(agentState.conversationalMemory, promptId);
  const base =
    Number(previous.promptId) === Number(promptId)
      ? previous
      : normalizeAgentConversationalMemory({ promptId }, promptId);
  const inferred = {
    ...inferFactsFromQuestionContext(userText, recentTurns || []),
    ...inferFactsFromUserText(userText)
  };
  const next = mergeAgentConversationalMemory(base, inferred, {
    promptId,
    recentTurns
  });

  const nextDw = {
    ...dw,
    agentState: {
      ...agentState,
      conversationalMemory: next
    }
  };

  try {
    await (ticket as any).update({ dataWebhook: nextDw });
    (ticket as any).setDataValue && (ticket as any).setDataValue("dataWebhook", nextDw);
  } catch (e) {
    logger.warn("[ConversationalMemory] falha ao persistir memória conversacional:", e as any);
  }

  return next;
}

export function formatConversationalMemoryForPrompt(memory: AgentConversationalMemory): string {
  const facts = Object.entries(memory.knownFacts)
    .filter(([, value]) => !!sanitizeValue(String(value || "")))
    .map(([key, value]) => `${FIELD_LABELS[key as keyof ConversationalKnownFacts] || key}=${sanitizeValue(String(value))}`);
  const pending = memory.pendingFields.length ? memory.pendingFields.join(", ") : "nenhum campo essencial evidente";
  return [
    facts.length ? `Memória consolidada: ${facts.join(" | ")}` : "Memória consolidada: ainda sem dados fortes",
    `Objetivo atual provável: ${memory.currentObjective || memory.lastUserIntent || "(não inferido)"}`,
    memory.lastAssistantQuestion ? `Última pergunta objetiva do agente: ${memory.lastAssistantQuestion}` : "Última pergunta objetiva do agente: (não detectada)",
    memory.lastUserAnswer ? `Última resposta útil do cliente: ${memory.lastUserAnswer}` : "Última resposta útil do cliente: (não detectada)",
    `Risco de loop/repetição: ${memory.loopRisk || "none"}`,
    `Campos ainda pendentes: ${pending}`
  ].join("\n");
}
