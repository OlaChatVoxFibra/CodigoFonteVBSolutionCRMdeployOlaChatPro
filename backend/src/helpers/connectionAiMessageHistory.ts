/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Ticket from "../models/Ticket";
import { normalizeTicketDataWebhook } from "../services/AgentProactiveServices/agentProactiveTicketState";

/**
 * Cláusula `where` para carregar mensagens enviadas ao modelo no contexto do agente
 * vinculado à conexão (Prompt). Usa `ticket.dataWebhook.connectionAiContext`, preenchido
 * por `syncTicketConnectionAiContext`: ao trocar o agente da conexão, `historyAnchorAt`
 * limita o histórico ao período do agente atual (sem misturar respostas de outro agente).
 */
export function buildWhereForConnectionAgentHistory(
  ticket: Ticket,
  promptId: number
): { ticketId: number; createdAt?: { [Op.gte]: Date } } {
  const where: { ticketId: number; createdAt?: { [Op.gte]: Date } } = {
    ticketId: ticket.id
  };
  const dw = normalizeTicketDataWebhook(ticket.dataWebhook) as Record<string, any>;
  const ctx = dw.connectionAiContext as
    | {
        promptId?: number | string;
        anthropicMultiAgentId?: number | string;
        agentKey?: string;
        historyAnchorAt?: string;
      }
    | undefined;
  const storedPid =
    ctx?.promptId != null && String(ctx.promptId).trim() !== "" && !Number.isNaN(Number(ctx.promptId))
      ? Number(ctx.promptId)
      : null;
  const anchor = ctx?.historyAnchorAt ? String(ctx.historyAnchorAt).trim() : "";
  const sameAgent =
    storedPid === Number(promptId) ||
    (ctx?.agentKey && String(ctx.agentKey).includes(String(promptId)));
  if (sameAgent && anchor) {
    where.createdAt = { [Op.gte]: new Date(anchor) };
  }
  return where;
}
