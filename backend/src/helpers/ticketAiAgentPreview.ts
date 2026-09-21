/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import { whatsappHasConnectionAgent } from "../providers/anthropic/services/resolveConnectionAgent";

export function ticketFromCampaign(ticket: Ticket): boolean {
  const dw = ticket.dataWebhook as Record<string, unknown> | null | undefined;
  const sourceId = dw?.sourceCampaignId;
  if (sourceId != null && sourceId !== "") return true;
  const tags = (ticket as any).contact?.tags as Array<{ name?: string }> | undefined;
  if (Array.isArray(tags)) {
    return tags.some(t => /^Campanha #\d+$/i.test(String(t?.name || "")));
  }
  return false;
}

export function shouldShowAiAgentPreview(
  ticket: Ticket,
  whatsapp?: Whatsapp | null
): boolean {
  if (!ticket.lastMessage) return false;
  if (ticket.fromMe !== true) return false;
  if (ticketFromCampaign(ticket)) return false;
  const wa = whatsapp || (ticket as any).whatsapp;
  if (!whatsappHasConnectionAgent(wa)) return false;

  const hasAgentMessage = (ticket as any).hasAgentMessage;
  if (
    hasAgentMessage !== true &&
    hasAgentMessage !== 1 &&
    hasAgentMessage !== "1" &&
    hasAgentMessage !== "true"
  ) {
    return false;
  }

  return ticket.isBot === true || ticket.useIntegration === true;
}

export async function clearCampaignTicketAgentFlags(ticket: Ticket): Promise<void> {
  if (
    ticket.isBot === true ||
    ticket.useIntegration === true ||
    ticket.integrationId != null
  ) {
    await ticket.update({
      isBot: false,
      useIntegration: false,
      integrationId: null
    });
  }
}
