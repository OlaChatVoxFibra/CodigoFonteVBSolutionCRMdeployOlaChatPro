/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Remove marcadores internos de sync (Google Calendar etc.) da descrição exibida. */
export function cleanActivityDescription(text) {
  if (!text) return "";
  const cleaned = String(text)
    .replace(/\[google-calendar-sync:\w+:\d+\]/gi, "")
    .replace(/\[google-calendar:[^\]]+\]/gi, "")
    .replace(/\[schedule-slot-minutes:\d+\]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned;
}

/** Duração em minutos gravada pelo agente na ação de agendamento. */
export function extractScheduleSlotMinutes(text) {
  if (!text) return null;
  const m = String(text).match(/\[schedule-slot-minutes:(\d+)\]/i);
  if (!m) return null;
  const mins = Number(m[1]);
  return Number.isFinite(mins) && mins > 0 ? mins : null;
}

export function activityDescriptionPreview(text, maxLen = 38) {
  const cleaned = cleanActivityDescription(text);
  if (!cleaned) return "Sem descrição";
  return cleaned.length > maxLen ? `${cleaned.substring(0, maxLen)}...` : cleaned;
}
