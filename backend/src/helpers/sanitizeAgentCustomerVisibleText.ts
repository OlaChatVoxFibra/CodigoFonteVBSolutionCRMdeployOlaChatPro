/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Remove marcadores de roteiro interno que não devem ir ao cliente (ex.: títulos em MAIÚSCULAS).
 * Remove também aspas envolvendo a fala inteira (comum em saída de LLM).
 */

import { sanitizeOrchestratorCustomerReply } from "./agentOrchestratorReplyGuard";

const MIN_INNER_LEN = 2;
const INVISIBLE_AGENT_CHARS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function stripAgentInvisibleChars(text: string): string {
  return String(text || "").replace(INVISIBLE_AGENT_CHARS, "");
}

export function hasCustomerVisibleText(text: string): boolean {
  return stripAgentInvisibleChars(text).trim().length > 0;
}

/** Remove até `maxLayers` pares de aspas externas (", ", « », etc.) de um bloco de texto. */
function stripOuterQuoteLayers(block: string, maxLayers: number): string {
  let t = block.trim();
  let layers = 0;
  const pairs: Array<[string, string]> = [
    ['"', '"'],
    ["\u201C", "\u201D"],
    ["\u00AB", "\u00BB"],
    ["\u2039", "\u203A"]
  ];
  while (layers < maxLayers && t.length >= 4) {
    let changed = false;
    for (const [open, close] of pairs) {
      if (
        t.startsWith(open) &&
        t.endsWith(close) &&
        t.length >= open.length + close.length + MIN_INNER_LEN
      ) {
        const inner = t.slice(open.length, t.length - close.length).trim();
        if (inner.length >= MIN_INNER_LEN) {
          t = inner;
          layers++;
          changed = true;
          break;
        }
      }
    }
    if (!changed) break;
  }
  return t;
}

export function stripAgentOutboundQuotes(text: string): string {
  const raw = stripAgentInvisibleChars(text).trim();
  if (!raw) return raw;
  const paragraphs = raw.split(/\n{2,}/).map((p) => stripOuterQuoteLayers(p.trim(), 4));
  return paragraphs.filter((p) => p.length > 0).join("\n\n").trim();
}

function isInternalStageHeaderLine(trimmed: string): boolean {
  const t = trimmed.trim();
  if (/^ETAPA\s*\d+/i.test(t)) return true;
  if (/^PASSO\s*\d+/i.test(t)) return true;
  if (t.length < 10 || t.length > 200) return false;
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  if (letters.length < 8) return false;
  if (t === t.toUpperCase() && /[A-ZÀ-Ü]/.test(t)) return true;
  return /^(APÓS|APOS|IDENTIFICAR|APRESENTAÇÃO|APRESENTACAO|ROTEIRO|ETAPA\s*\d+)/i.test(t);
}

/** Separadores / markdown interno do roteiro — nunca enviar ao cliente. */
function isInternalSeparatorOrNoiseLine(trimmed: string): boolean {
  const t = trimmed.trim();
  if (!t) return false;
  if (/^#+\s+\S/.test(t)) return true;
  if (/^[\s\-=*_·•]{3,}$/.test(t)) return true;
  if (/^(\*\s*){3,}$/.test(t)) return true;
  if (/^(-\s*){3,}$/.test(t)) return true;
  return false;
}

export function sanitizeAgentCustomerVisibleText(text: string): string {
  const raw = stripAgentInvisibleChars(text);
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (t && isInternalSeparatorOrNoiseLine(t)) continue;
    if (t && isInternalStageHeaderLine(t)) continue;
    out.push(line);
  }
  const joined = out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return sanitizeOrchestratorCustomerReply(stripAgentOutboundQuotes(joined));
}
