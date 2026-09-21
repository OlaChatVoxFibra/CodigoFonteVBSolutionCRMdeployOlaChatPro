/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  isTrivialFlowInboundNoise,
  looksLikeCustomerInterruption
} from "./agentAttendanceFlowMemory";

/** Normaliza texto do cliente para comparação com opções do fluxo visual. */
export function normAttendanceFlowText(s: string): string {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Texto com conteúdo útil (resposta livre / número / data por extenso). */
function isSubstantiveCustomerReply(body: string): boolean {
  const b = normAttendanceFlowText(body.replace(/\u200e/g, ""));
  if (!b) return false;
  if (/^[\s.!?]+$/.test(b)) return false;
  return /[0-9a-zà-ÿ]/.test(b);
}

/**
 * Escolhe a opção de ramificação que casa com a mensagem do cliente (fluxo visual).
 */
export function matchAttendanceFlowResponseOption(body: string, options: any[]): any | null {
  const raw = String(body || "").trim();
  const b = normAttendanceFlowText(body);
  if (!b) return null;

  /** Menu 1/2/3 no roteiro: cliente manda só o dígito — casa com a opção pelo índice (como no fluxo visual). */
  const list = Array.isArray(options) ? options : [];
  const digitOnly = raw.replace(/\u200e/g, "").trim().match(/^(\d{1,2})\s*[\).\]]?\s*$/);
  if (digitOnly && list.length > 0) {
    const n = parseInt(digitOnly[1], 10);
    if (n >= 1 && n <= list.length) {
      return list[n - 1];
    }
  }

  for (const o of list) {
    const mode = String(o?.matchMode || "flex").toLowerCase();
    const t = normAttendanceFlowText(o?.text || "");

    if (mode === "number") {
      const compact = raw.replace(/\s/g, "").replace(",", ".");
      if (/^\d+(\.\d+)?$/.test(compact)) return o;
      continue;
    }

    if (mode === "any") {
      /** Evita avançar etapa com cumprimento/ruído — só mensagens do cliente reais devem ramificar. */
      if (
        b.length > 0 &&
        !isTrivialFlowInboundNoise(body) &&
        !looksLikeCustomerInterruption(body)
      ) {
        return o;
      }
      continue;
    }

    /** Resposta livre (configure no fluxo visual para aceitar "4 adultos", datas, etc.) */
    if (mode === "open") {
      if (
        isSubstantiveCustomerReply(body) &&
        !isTrivialFlowInboundNoise(body) &&
        !looksLikeCustomerInterruption(body)
      ) {
        return o;
      }
      continue;
    }

    if (mode === "starts") {
      if (t && b.startsWith(t)) return o;
      continue;
    }

    if (mode === "email") {
      if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(raw)) return o;
      continue;
    }

    if (mode === "affirm") {
      if (
        /^(sim|s|ss|ok|confirmo|isso|certo|pode|aceito)(\s|!|\.)*$/i.test(b) ||
        /\b(sim|ok|confirmo)\b/.test(b)
      )
        return o;
      continue;
    }

    if (mode === "neg") {
      if (/^(não|nao|n|nop|cancelar)(\s|!|\.)*$/i.test(b) || /\b(não|nao|cancelar)\b/.test(b))
        return o;
      continue;
    }

    if (mode === "greeting") {
      if (
        /^(oi|ol[aá]|opa|e\s*a[ií]|hey|hello)(\s|!|\.)*$/i.test(b) ||
        /\b(bom\s*dia|boa\s*tarde|boa\s*noite)\b/.test(b)
      )
        return o;
      continue;
    }

    if (mode === "equals") {
      if (t && b === t) return o;
      continue;
    }

    if (mode === "contains") {
      if (t && b.includes(t)) return o;
      continue;
    }

    if (!t || t.length < 1) continue;
    if (b.includes(t) || t.includes(b)) return o;
  }
  return null;
}
