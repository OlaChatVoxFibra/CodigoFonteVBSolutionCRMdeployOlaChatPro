/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../models/Ticket";
import logger from "../utils/logger";
import { normalizeTicketDataWebhook } from "../services/AgentProactiveServices/agentProactiveTicketState";
import type { ConnectionAgentRef } from "../providers/anthropic/services/resolveConnectionAgent";
import { syntheticPromptIdForAnthropicAgent } from "../providers/anthropic/services/resolveConnectionAgent";

export type ConnectionAiContextSyncResult = {
  historyAnchorAt: string | null;
};

function contextKey(ref: ConnectionAgentRef): string {
  if (ref.kind === "anthropic") {
    return `anthropic:${ref.anthropicMultiAgentId}`;
  }
  return `prompt:${ref.promptId}`;
}

function linkedPromptIdForContext(ref: ConnectionAgentRef): number {
  if (ref.kind === "anthropic") {
    return syntheticPromptIdForAnthropicAgent(ref.anthropicMultiAgentId);
  }
  return ref.promptId;
}

/**
 * Sincroniza âncora de histórico ao trocar agente da conexão (Prompt OpenAI ou multi-agente Claude).
 */
export async function syncTicketConnectionAgentContext(
  ticket: Ticket,
  ref: ConnectionAgentRef
): Promise<ConnectionAiContextSyncResult> {
  const dw = normalizeTicketDataWebhook(ticket.dataWebhook) as Record<string, any>;
  const ctx = (dw.connectionAiContext || {}) as {
    agentKey?: string;
    promptId?: number | string;
    anthropicMultiAgentId?: number | string;
    historyAnchorAt?: string;
  };
  const key = contextKey(ref);
  const storedKey =
    ctx.agentKey ||
    (ctx.anthropicMultiAgentId != null
      ? `anthropic:${ctx.anthropicMultiAgentId}`
      : ctx.promptId != null
        ? `prompt:${ctx.promptId}`
        : "");
  const linked = linkedPromptIdForContext(ref);

  if (storedKey === key) {
    return {
      historyAnchorAt: ctx.historyAnchorAt ? String(ctx.historyAnchorAt) : null
    };
  }

  if (!storedKey) {
    const nextCtx: Record<string, unknown> = {
      agentKey: key,
      promptId: linked
    };
    if (ref.kind === "anthropic") {
      nextCtx.anthropicMultiAgentId = ref.anthropicMultiAgentId;
    }
    const nextDw: Record<string, any> = { ...dw, connectionAiContext: nextCtx };
    await ticket.update({ dataWebhook: nextDw as any });
    ticket.setDataValue("dataWebhook", nextDw);
    return { historyAnchorAt: null };
  }

  const historyAnchorAt = new Date().toISOString();
  const nextDw: Record<string, any> = { ...dw };
  delete nextDw.attendanceFlow;
  const nextCtx: Record<string, unknown> = {
    agentKey: key,
    promptId: linked,
    historyAnchorAt
  };
  if (ref.kind === "anthropic") {
    nextCtx.anthropicMultiAgentId = ref.anthropicMultiAgentId;
  }
  nextDw.connectionAiContext = nextCtx;

  await ticket.update({ dataWebhook: nextDw as any });
  ticket.setDataValue("dataWebhook", nextDw);

  try {
    logger.info(
      `[connection-ai] Agente da conexão alterado: ticket=${ticket.id} ${storedKey} → ${key}; histórico a partir de ${historyAnchorAt}`
    );
  } catch {
    /* ignore */
  }

  return { historyAnchorAt };
}
