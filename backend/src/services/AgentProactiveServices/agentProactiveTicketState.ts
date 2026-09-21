/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import { AgentProactiveTicketState } from "../../types/agentProactiveSettings";

/**
 * Garante objeto plano para merges. Se `dataWebhook` vier string (JSON) ou for inválido,
 * evita `...dw` quebrar (ex.: string vira índices numéricos) e apagar `type`/`settings` da IA.
 */
export function normalizeTicketDataWebhook(raw: unknown): Record<string, unknown> {
  if (raw == null || raw === "") return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return normalizeTicketDataWebhook(parsed);
    } catch {
      return {};
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return {};
  return { ...(raw as Record<string, unknown>) };
}

export function getAgentProactiveState(ticket: Ticket): AgentProactiveTicketState {
  const dw = normalizeTicketDataWebhook(ticket.dataWebhook);
  const ap = dw.agentProactive as AgentProactiveTicketState | undefined;
  return ap && typeof ap === "object" ? { ...ap } : {};
}

export function mergeAgentProactiveState(
  ticket: Ticket,
  patch: Partial<AgentProactiveTicketState>
): Record<string, unknown> {
  const dw = normalizeTicketDataWebhook(ticket.dataWebhook);
  const prev = getAgentProactiveState(ticket);
  return {
    ...dw,
    agentProactive: {
      ...prev,
      ...patch
    }
  };
}
