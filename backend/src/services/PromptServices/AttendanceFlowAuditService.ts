/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * AttendanceFlowAuditService (PR 7) — emite eventos de timeline estruturados
 * para cada decisão do motor v2. Saída: log estruturado (logger.info) + opcional
 * persistência no `ticket.dataWebhook.attendanceFlowTimeline` (array bounded).
 *
 * Não é DB-backed (sem nova tabela) — é um array no payload do ticket. Bound em 50
 * eventos para não inflar o dataWebhook.
 *
 * Cada evento tem shape estável para o painel UI consumir.
 */

import logger from "../../utils/logger";

export type TimelineEvent = {
  ts: string;
  ticketId: number;
  promptId: number;
  intent: string;
  fromStepId: string | null;
  toStepId: string | null;
  confidence: number;
  reasoning: string;
  source: string;
  filledSlot?: {
    name: string;
    type: string;
    value: unknown;
  } | null;
  matchedBranch?: {
    matcher: string;
    label: string;
    nextStepId: string | null;
  } | null;
  hookFires?: Array<{
    moment: string;
    stepId: string;
    matched?: boolean;
  }>;
  /** Free-form metadata. */
  meta?: Record<string, unknown>;
};

const MAX_TIMELINE_ENTRIES = 50;

export function appendTimelineEvent(
  prev: unknown,
  event: TimelineEvent
): TimelineEvent[] {
  const list = Array.isArray(prev) ? (prev as TimelineEvent[]) : [];
  const next = [...list, event];
  if (next.length > MAX_TIMELINE_ENTRIES) {
    return next.slice(next.length - MAX_TIMELINE_ENTRIES);
  }
  return next;
}

export function logTimelineEvent(event: TimelineEvent): void {
  try {
    logger.info(
      JSON.stringify({
        evt: "attendance_flow_timeline",
        ts: event.ts,
        ticketId: event.ticketId,
        promptId: event.promptId,
        intent: event.intent,
        from: event.fromStepId,
        to: event.toStepId,
        confidence: event.confidence,
        source: event.source,
        slot: event.filledSlot ? `${event.filledSlot.name}=${String(event.filledSlot.value).slice(0, 80)}` : null,
        branch: event.matchedBranch?.label || null,
        hooks: event.hookFires ? event.hookFires.map((h) => `${h.moment}:${h.stepId}`) : []
      })
    );
  } catch {
    /* logger não pode quebrar fluxo */
  }
}

export function buildTimelineEventFromDecision(params: {
  ticketId: number;
  promptId: number;
  audit: {
    intent: string;
    fromStepId: string | null;
    toStepId: string | null;
    confidence: number;
    reasoning: string;
    source: string;
    filledSlot?: any;
  };
  matchedBranch?: any;
  hookFires?: Array<{ moment: string; step: { stepId: string }; matched?: boolean }>;
  meta?: Record<string, unknown>;
}): TimelineEvent {
  return {
    ts: new Date().toISOString(),
    ticketId: params.ticketId,
    promptId: params.promptId,
    intent: params.audit.intent,
    fromStepId: params.audit.fromStepId,
    toStepId: params.audit.toStepId,
    confidence: params.audit.confidence,
    reasoning: params.audit.reasoning,
    source: params.audit.source,
    filledSlot: params.audit.filledSlot
      ? {
          name: String(params.audit.filledSlot.name || ""),
          type: String(params.audit.filledSlot.type || ""),
          value: params.audit.filledSlot.value
        }
      : null,
    matchedBranch: params.matchedBranch
      ? {
          matcher: String(params.matchedBranch.matcher || ""),
          label: String(params.matchedBranch.label || ""),
          nextStepId:
            params.matchedBranch.nextStepId != null
              ? String(params.matchedBranch.nextStepId)
              : null
        }
      : null,
    hookFires: (params.hookFires || []).map((h) => ({
      moment: h.moment,
      stepId: h.step.stepId,
      matched: h.matched
    })),
    meta: params.meta
  };
}
