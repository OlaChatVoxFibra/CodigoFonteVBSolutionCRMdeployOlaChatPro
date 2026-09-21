/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Duração padrão de reunião/agendamento (minutos) quando não configurada na ação do agente. */
export const DEFAULT_MEETING_SLOT_MINUTES = 60;

const SLOT_MARKER_RE = /\[schedule-slot-minutes:(\d+)\]/i;

export function resolveMeetingSlotMinutes(
  variables?: Record<string, unknown> | null
): number {
  const raw =
    variables?.slotMinutes ??
    variables?.meetingDurationMinutes ??
    DEFAULT_MEETING_SLOT_MINUTES;
  const mins = Number(raw);
  if (Number.isFinite(mins) && mins > 0) return Math.round(mins);
  return DEFAULT_MEETING_SLOT_MINUTES;
}

export function appendScheduleSlotMinutesMarker(
  body: string,
  slotMinutes: number
): string {
  const mins = resolveMeetingSlotMinutes({ slotMinutes });
  const clean = stripScheduleSlotMinutesMarker(body);
  return `${clean}\n\n[schedule-slot-minutes:${mins}]`;
}

export function stripScheduleSlotMinutesMarker(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(SLOT_MARKER_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractScheduleSlotMinutesFromBody(
  body?: string | null
): number | null {
  if (!body) return null;
  const m = String(body).match(SLOT_MARKER_RE);
  if (!m) return null;
  const mins = Number(m[1]);
  if (!Number.isFinite(mins) || mins <= 0) return null;
  return Math.round(mins);
}
