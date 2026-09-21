/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import logger from "../../utils/logger";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";

type ProcessingStatus = "processing" | "completed" | "failed";

function buildPatch(ticket: Ticket, patch: Record<string, unknown>): Record<string, unknown> {
  const base = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
  const agentState = base.agentState && typeof base.agentState === "object" ? base.agentState : {};
  return {
    ...base,
    agentState: {
      ...agentState,
      processing: {
        ...(agentState.processing && typeof agentState.processing === "object" ? agentState.processing : {}),
        ...patch,
        updatedAt: new Date().toISOString()
      }
    }
  };
}

async function updateProcessing(ticket: Ticket, patch: Record<string, unknown>): Promise<void> {
  try {
    const next = buildPatch(ticket, patch);
    await ticket.update({ dataWebhook: next as any });
    ticket.setDataValue("dataWebhook", next as any);
  } catch (error: any) {
    logger.warn(`[AGENT-PROCESSING] falha ao atualizar estado ticket=${ticket.id}: ${error?.message || error}`);
  }
}

export async function markAgentProcessingStarted(params: {
  ticket: Ticket;
  promptId: number;
  wid?: string | null;
  userText?: string;
}): Promise<void> {
  await updateProcessing(params.ticket, {
    active: true,
    status: "processing" as ProcessingStatus,
    promptId: params.promptId,
    wid: params.wid || null,
    startedAt: new Date().toISOString(),
    lastUserTextPreview: String(params.userText || "").replace(/\s+/g, " ").trim().slice(0, 220),
    error: null
  });
}

export async function markAgentProcessingFinished(params: {
  ticket: Ticket;
  promptId: number;
  wid?: string | null;
  ok: boolean;
  error?: unknown;
}): Promise<void> {
  await updateProcessing(params.ticket, {
    active: false,
    status: (params.ok ? "completed" : "failed") as ProcessingStatus,
    promptId: params.promptId,
    wid: params.wid || null,
    finishedAt: new Date().toISOString(),
    error: params.ok ? null : String((params.error as any)?.message || params.error || "agent_processing_failed").slice(0, 500)
  });
}

