/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { sanitizeAgentCustomerVisibleText } from "../../helpers/sanitizeAgentCustomerVisibleText";
import {
  isAgentOutboundGuardEnabled,
  recordSentOutbound,
  shouldSendOutbound
} from "../PromptServices/AgentOutboundGuard";
import { splitAgentReplyIntoSmartBlocks } from "../PromptServices/AgentOrchestratorService";
import {
  AGENT_OUTBOUND_BUBBLE_DELAY_MS,
  AGENT_OUTBOUND_BUBBLE_MAX_CHARS
} from "../../config/openAiDefaults";
import { sendLinkedInMessage } from "./sendLinkedInMessage";
import { verifyOutboundLinkedInMessage } from "./verifyLinkedInMessage";
import { markTicketUnderAgentAttendance } from "../TicketServices/markTicketUnderAgentAttendance";
import logger from "../../utils/logger";

export async function deliverLinkedInAgentReply(params: {
  connection: Whatsapp;
  ticket: Ticket;
  contact: Contact;
  prompt: { id: number };
  text: string;
}): Promise<number> {
  const blocks = splitAgentReplyIntoSmartBlocks(params.text, {
    maxChars: AGENT_OUTBOUND_BUBBLE_MAX_CHARS,
    maxBlocks: 12
  });

  let sent = 0;
  for (const block of blocks) {
    const safeBlock = sanitizeAgentCustomerVisibleText(block);
    if (!safeBlock) continue;

    if (isAgentOutboundGuardEnabled()) {
      const guard = shouldSendOutbound(safeBlock, params.ticket, params.prompt.id);
      if (!guard.send) {
        logger.info(
          `[LINKEDIN-AGENT] outbound guard (${guard.reason}) ticket=${params.ticket.id}`
        );
        continue;
      }
    }

    const agentBody = `\u200e ${safeBlock}`;
    const sendResult = await sendLinkedInMessage(
      params.connection,
      params.contact.number,
      agentBody,
      params.ticket
    );
    await verifyOutboundLinkedInMessage(
      sendResult,
      params.ticket,
      params.contact,
      agentBody,
      { fromAgent: true }
    );

    if (isAgentOutboundGuardEnabled()) {
      await recordSentOutbound(safeBlock, params.ticket, params.prompt.id);
    }

    sent += 1;
    if (blocks.length > 1) {
      await new Promise((resolve) =>
        setTimeout(resolve, AGENT_OUTBOUND_BUBBLE_DELAY_MS)
      );
    }
  }

  if (sent > 0) {
    await markTicketUnderAgentAttendance(params.ticket);
  }

  return sent;
}
