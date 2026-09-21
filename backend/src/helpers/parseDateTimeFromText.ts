/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Interpretação de data/hora em texto livre (PT-BR) — usado em fluxo de agendamento e ações inteligentes.
 */

export function parseTimeFromText(text: string): { hours: number; minutes: number } | null {
  const t = String(text || "").toLowerCase();
  const explicit =
    t.match(/(?:\b[aà]s?\s*)(\d{1,2})(?:[:h\.](\d{2}))?\s*(?:h|hs|horas)?\b/) ||
    t.match(/\b(\d{1,2})[:\.](\d{2})\b/) ||
    t.match(/\b(\d{1,2})\s*h(?:s|oras)?\b/);
  if (!explicit) return null;
  const hours = parseInt(explicit[1], 10);
  const minutes = explicit[2] ? parseInt(explicit[2], 10) : 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

export function parseImplicitPeriodTimeFromText(text: string): { hours: number; minutes: number } | null {
  const t = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!t.trim()) return null;
  if (/\b(depois\s+do\s+almoco|apos\s+o\s+almoco|pos\s+almoco)\b/.test(t)) {
    return { hours: 14, minutes: 0 };
  }
  if (/\b(fim\s+da\s+manha|final\s+da\s+manha|antes\s+do\s+almoco)\b/.test(t)) {
    return { hours: 11, minutes: 0 };
  }
  if (/\b(de\s+manha|pela\s+manha|manha|cedinho|cedo)\b/.test(t)) {
    return { hours: 9, minutes: 0 };
  }
  if (/\b(a\s+tarde|de\s+tarde|pela\s+tarde|tardezinha)\b/.test(t)) {
    return { hours: 15, minutes: 0 };
  }
  if (/\b(fim\s+da\s+tarde|final\s+da\s+tarde)\b/.test(t)) {
    return { hours: 17, minutes: 0 };
  }
  if (/\b(a\s+noite|de\s+noite|pela\s+noite|noitinha)\b/.test(t)) {
    return { hours: 19, minutes: 0 };
  }
  return null;
}

export function parseDateTimeFromText(text: string): { date: Date | null; matched: boolean } {
  const t = String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!t.trim()) return { date: null, matched: false };

  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  let foundDate = false;

  const dateMatch = t.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (dateMatch) {
    day = parseInt(dateMatch[1], 10);
    month = parseInt(dateMatch[2], 10);
    year = dateMatch[3] ? parseInt(dateMatch[3], 10) : now.getFullYear();
    if (year < 100) year += 2000;
    foundDate = true;
  } else if (/\b(hoje)\b/.test(t)) {
    foundDate = true;
  } else if (/\b(amanha)\b/.test(t)) {
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    day = tomorrow.getDate();
    month = tomorrow.getMonth() + 1;
    year = tomorrow.getFullYear();
    foundDate = true;
  } else {
    const weekMap: Record<string, number> = {
      domingo: 0,
      segunda: 1,
      "segunda-feira": 1,
      terca: 2,
      "terca-feira": 2,
      quarta: 3,
      "quarta-feira": 3,
      quinta: 4,
      "quinta-feira": 4,
      sexta: 5,
      "sexta-feira": 5,
      sabado: 6
    };
    const weekdayMatch = Object.keys(weekMap).find(k => new RegExp(`\\b${k}\\b`).test(t));
    if (weekdayMatch) {
      const targetDow = weekMap[weekdayMatch];
      const currentDow = now.getDay();
      let delta = (targetDow - currentDow + 7) % 7;
      if (delta === 0) delta = 7;
      const nextDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta);
      day = nextDate.getDate();
      month = nextDate.getMonth() + 1;
      year = nextDate.getFullYear();
      foundDate = true;
    }
  }

  /** Só horário (ex.: "às 15h", "14:30") — assume o dia de hoje no fuso local. */
  if (!foundDate) {
    const onlyTime = parseTimeFromText(t);
    if (onlyTime) {
      day = now.getDate();
      month = now.getMonth() + 1;
      year = now.getFullYear();
      foundDate = true;
    }
  }

  if (!foundDate) return { date: null, matched: false };
  const parsedTime = parseTimeFromText(t) || parseImplicitPeriodTimeFromText(t);
  const hours = parsedTime?.hours ?? 9;
  const minutes = parsedTime?.minutes ?? 0;
  const dt = new Date(year, month - 1, day, hours, minutes, 0);
  return { date: isNaN(dt.getTime()) ? null : dt, matched: true };
}
