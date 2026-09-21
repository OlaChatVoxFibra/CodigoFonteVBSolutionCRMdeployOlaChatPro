/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { sanitizeAgentCustomerVisibleText } from "./sanitizeAgentCustomerVisibleText";

/** Mesmo âncora que slice/tail do roteiro — “DO LEAD” é opcional no texto do autor. */
const RE_EXEMPLO = /EXEMPLO\s+DE\s+RESPOSTA/i;
const RE_OBJEÇÕES = /(^|\n)\s*#?\s*OBJE[CÇ][AÃ]O(E)?S\b[\s\S]*/i;

/** Trecho após RESPOSTA: até próximo marcador de etapa / divisor (alinhado ao split do roteiro). */
const RE_STEP_HEADING_IN_BLOCK = String.raw`\n\s*#?\s*(?:(?:pr[oó]xima\s+etapa|pr[oó]ximo\s+passo|nova\s+etapa|next\s+step)\b|(?:etapa|passo)\s*\d+|(?:etapa|passo)\b|\d+[\.)]\s+\S)`;
const RE_FIRST_RESPOSTA_BODY = new RegExp(
  String.raw`RESPOSTA\s*:\s*\n*([\s\S]*?)(?=\n\s*---\s*\n|\nEXEMPLO\s+DE\s+RESPOSTA|${RE_STEP_HEADING_IN_BLOCK}|$)`,
  "i"
);

const RE_SCRIPT_CMD_IN_TEXT = /\/[a-zA-Z][a-zA-Z0-9_-]*/;

function meaningfulLetterCount(t: string): number {
  return String(t || "")
    .replace(/[\s#\-=*_·•.!?,;:\/]/g, "")
    .replace(/\d/g, "")
    .length;
}

function stripLeadingDividers(s: string): string {
  let t = s;
  while (/^\s*---\s*(\n|$)/.test(t)) {
    t = t.replace(/^\s*---\s*\n?/, "");
  }
  return t.trim();
}

function finalizeVisibleChunk(t: string): string {
  const lines = String(t || "").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const tr = line.trim();
    if (/^mensagem\s*:?\s*$/i.test(tr)) continue;
    if (/^resposta\s*:/i.test(tr)) continue;
    if (/^EXEMPLO\s+DE\s+RESPOSTA/i.test(tr)) continue;
    if (/^#?\s*(?:ETAPA|PASSO)\s*\d+/i.test(tr)) continue;
    if (/^(?:ETAPA|PASSO)\s*\d+\s*[—\-–:]/i.test(tr)) continue;
    out.push(line);
  }
  return sanitizeAgentCustomerVisibleText(out.join("\n"));
}

/**
 * Remove do texto do passo do fluxo tudo que é anotação interna (exemplos de fala do lead,
 * objeções de treinamento, rótulos "Mensagem:" / "RESPOSTA:") e devolve só o que pode ir ao WhatsApp.
 *
 * Regra principal: preferir o bloco **antes** do primeiro "EXEMPLO DE RESPOSTA DO LEAD" (ex.: abertura da etapa).
 * Se não houver conteúdo público ali, tentar bloco após "Mensagem:". Se ainda vazio e o passo tiver
 * "RESPOSTA:" com comando de roteiro (/agendamento etc.) — típico da etapa de fechamento — usar esse corpo.
 */
export function stripAgentFlowScriptTrainingMarkers(rawInput: string): string {
  let s = String(rawInput || "").replace(/\r\n/g, "\n");
  s = s.replace(RE_OBJEÇÕES, "").trimEnd();

  const exMatch = RE_EXEMPLO.exec(s);
  const head =
    exMatch && exMatch.index > 0 ? s.slice(0, exMatch.index).trim() : exMatch ? "" : s.trim();
  const headClean = stripLeadingDividers(head);

  const fromHead = finalizeVisibleChunk(headClean);
  if (meaningfulLetterCount(fromHead) >= 12 || fromHead.replace(/\s/g, "").length >= 40) {
    return fromHead;
  }

  const mensagemMatch = s.match(
    new RegExp(
      String.raw`MENSAGEM\s*:\s*\n+([\s\S]*?)(?=EXEMPLO\s+DE\s+RESPOSTA|${RE_STEP_HEADING_IN_BLOCK}|$)`,
      "i"
    )
  );
  if (mensagemMatch) {
    const fromMsg = finalizeVisibleChunk(stripLeadingDividers(mensagemMatch[1].trim()));
    if (meaningfulLetterCount(fromMsg) >= 12 || fromMsg.replace(/\s/g, "").length >= 40) {
      return fromMsg;
    }
  }

  if (RE_SCRIPT_CMD_IN_TEXT.test(s)) {
    const resp = RE_FIRST_RESPOSTA_BODY.exec(s);
    if (resp && resp[1]) {
      const fromResp = finalizeVisibleChunk(resp[1].trim());
      if (meaningfulLetterCount(fromResp) >= 8 || fromResp.replace(/\s/g, "").length >= 24) {
        return fromResp;
      }
    }
  }

  return fromHead.length > 0 ? fromHead : "";
}
