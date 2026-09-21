/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Trial / contagem regressiva no fuso America/Sao_Paulo (sem DST). */

const BRT = "America/Sao_Paulo";

export function brtTodayYmd() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRT,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

/** Dias de calendário entre hoje (BRT) e dueYmd (YYYY-MM-DD), inclusive. null se já venceu. */
export function brtCalendarDaysRemaining(dueYmd) {
  const due = String(dueYmd || "").split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return null;
  const today = brtTodayYmd();
  if (today > due) return null;
  const t0 = new Date(`${today}T12:00:00-03:00`);
  const t1 = new Date(`${due}T12:00:00-03:00`);
  return Math.round((t1 - t0) / 86400000);
}

/** ms até 23:59:59.999 do dia due no horário de Brasília (UTC−3 fixo). */
export function msUntilEndOfDueDayBrt(dueYmd) {
  const due = String(dueYmd || "").split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return 0;
  const end = new Date(`${due}T23:59:59.999-03:00`);
  return Math.max(0, end.getTime() - Date.now());
}

export function splitCountdownMs(ms) {
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return { days, hh: pad(h), mm: pad(m), ss: pad(s) };
}
