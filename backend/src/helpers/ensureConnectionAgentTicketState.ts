/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../models/Ticket";
import { whatsappHasConnectionAgent } from "../providers/anthropic/services/resolveConnectionAgent";
import Whatsapp from "../models/Whatsapp";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";

/** Prepara ticket para o agente da conexão responder (modo bot + sem fila humana). */
export async function ensureConnectionAgentTicketState(
  ticket: Ticket,
  whatsapp: Whatsapp,
  companyId: number
): Promise<void> {
  if (!whatsappHasConnectionAgent(whatsapp)) return;

  const patch: Record<string, unknown> = {};
  if (ticket.useIntegration !== true) patch.useIntegration = true;
  if (ticket.isBot !== true) patch.isBot = true;
  if (ticket.queueId != null) patch.queueId = null;
  if (ticket.userId != null) patch.userId = null;

  if (Object.keys(patch).length) {
    await UpdateTicketService({
      ticketData: patch as any,
      ticketId: ticket.id,
      companyId
    });
    if (patch.useIntegration === true) ticket.setDataValue("useIntegration", true);
    if (patch.isBot === true) ticket.setDataValue("isBot", true);
    if (patch.queueId === null) ticket.setDataValue("queueId", null);
    if (patch.userId === null) ticket.setDataValue("userId", null);
  }
}
