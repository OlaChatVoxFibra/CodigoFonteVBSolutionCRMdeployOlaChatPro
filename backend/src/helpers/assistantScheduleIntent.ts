/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Detecta oferta de agendamento pelo agente e pedidos/data do cliente (PT-BR).
 */

import { parseDateTimeFromText } from "./parseDateTimeFromText";

function stripDiacritics(text: string): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeTriggerText(text: string): string {
  return stripDiacritics(text).replace(/\s+/g, " ").trim();
}

export function triggerPatternMatches(text: string, pattern: string): boolean {
  const p = String(pattern || "").trim();
  if (!p) return false;
  if (p.startsWith("/") && p.endsWith("/") && p.length > 2) {
    try {
      return new RegExp(p.slice(1, -1), "i").test(text);
    } catch {
      return false;
    }
  }
  return normalizeTriggerText(text).includes(normalizeTriggerText(p));
}

/** Agente convida ou pergunta data/horário para agendar. */
export function assistantTextImpliesSchedulingOffer(text: string): boolean {
  const raw = String(text || "").trim();
  if (!raw) return false;
  if (/ação:\s*agend/i.test(raw)) return true;

  const t = stripDiacritics(raw);

  const patterns = [
    /\b(gostaria|quer|deseja|posso|podemos|vamos|queria)\s+(de\s+)?(agendar|marcar|reservar|reagendar)\b/,
    /\b(vou|irei)\s+(agendar|marcar|reservar|confirmar\s+(o\s+)?horario)\b/,
    /\b(qual|quando)\s+(o\s+)?(melhor\s+)?(dia|hora|horario|data)\b/,
    /\b(prefere\s+que\s+dia|melhor\s+(dia|horario))\b/,
    /\bme\s+(passe|envie|informe)\s+(o\s+)?(dia|horario|data)\b/,
    /\b(consultar|verificar|conferir|checar)\s+(a\s+)?(agenda|disponibilidade)\b/,
    /\brealizar\s+um\s+agendamento\b/,
    /\bmarcar\s+(uma\s+)?(visita|reuniao|consulta|horario)\b/,
    /\breservar\s+(um\s+)?horario\b/
  ];
  return patterns.some((p) => p.test(t));
}

/** Cliente pede agendamento (com ou sem data na mesma mensagem). */
export function userRequestsScheduling(text: string): boolean {
  const t = stripDiacritics(text).trim();
  if (!t || t.length < 4) return false;
  if (/\b(nao|não)\s+quero\s+agendar\b/.test(t)) return false;

  const patterns = [
    /\b(quero|preciso|gostaria|posso)\s+(de\s+)?(agendar|marcar|reservar|reagendar)\b/,
    /\b(agendar|marcar|reservar)\s+(uma\s+)?(visita|reuniao|consulta|horario)\b/,
    /\bpode\s+(ser\s+)?(agendar|marcar)\b/,
    /\b(fazer|fazer um)\s+agendamento\b/
  ];
  return patterns.some((p) => p.test(t));
}

export function userMessageMatchesSchedulingTriggers(
  text: string,
  userTriggerPatterns: string[]
): boolean {
  if (!Array.isArray(userTriggerPatterns) || !userTriggerPatterns.length) return false;
  const raw = String(text || "");
  return userTriggerPatterns.some((p) => triggerPatternMatches(raw, String(p || "")));
}

export function userProvidesScheduleDateTime(text: string): {
  matched: boolean;
  date: Date | null;
} {
  const parsed = parseDateTimeFromText(text);
  return { matched: parsed.matched, date: parsed.date };
}

export function scheduleExecutionAuthorized(params: {
  scheduleAuthorized?: unknown;
  date?: unknown;
  customerReply?: unknown;
  lastUserMessage?: unknown;
}): boolean {
  if (params.scheduleAuthorized === true) return true;
  if (params.date instanceof Date && !isNaN(params.date.getTime())) return true;
  const reply = String(params.customerReply ?? params.lastUserMessage ?? "").trim();
  if (reply) {
    const { matched, date } = userProvidesScheduleDateTime(reply);
    if (matched && date) return true;
  }
  return false;
}
