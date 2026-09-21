/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import CompaniesSettings from "../../models/CompaniesSettings";
import ListSettingsService from "../SettingServices/ListSettingsService";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import Message from "../../models/Message";
import logger from "../../utils/logger";
import { parseLinkedInInboundPayload } from "./parseLinkedInInboundPayload";
import { verifyInboundLinkedInMessage } from "./verifyLinkedInMessage";
import { sendLinkedInMessage } from "./sendLinkedInMessage";
import { verifyOutboundLinkedInMessage } from "./verifyLinkedInMessage";
import { processLinkedInAgentInbound } from "./processLinkedInAgentInbound";

export async function handleLinkedInInbound(
  connection: Whatsapp,
  payload: unknown
): Promise<void> {
  const parsed = parseLinkedInInboundPayload(payload);
  if (!parsed) {
    logger.warn(
      `[LINKEDIN] Payload não reconhecido connection=${connection.id}`
    );
    return;
  }

  const companyId = connection.companyId;
  const ticketChannel = "linkedin";
  const chatId = parsed.senderUrn;
  const messageId = `${connection.id}_${parsed.messageId}`;

  const contact = await CreateOrUpdateContactService({
    name: parsed.senderName || chatId,
    number: chatId,
    isGroup: false,
    companyId,
    channel: ticketChannel,
    whatsappId: connection.id,
    remoteJid: `${chatId}@linkedin`
  });

  const settings = await CompaniesSettings.findOne({ where: { companyId } });
  const listSettings = await ListSettingsService({ companyId });
  const settingsMerged = { ...listSettings, ...settings?.toJSON() };

  const ticket = await FindOrCreateTicketService(
    contact,
    connection,
    1,
    companyId,
    null,
    null,
    null,
    ticketChannel,
    false,
    false,
    settingsMerged,
    false,
    false
  );

  const fullTicket = await ShowTicketService(ticket.id, companyId);
  await verifyInboundLinkedInMessage(messageId, parsed.body, fullTicket, contact);

  const inboundCount = await Message.count({
    where: { ticketId: ticket.id, fromMe: false, companyId }
  });

  if (connection.greetingMessage?.trim() && inboundCount === 1) {
    try {
      const greeting = connection.greetingMessage.trim();
      const sendResult = await sendLinkedInMessage(
        connection,
        chatId,
        greeting,
        fullTicket
      );
      await verifyOutboundLinkedInMessage(
        sendResult,
        fullTicket,
        contact,
        greeting
      );
    } catch (greetErr: any) {
      logger.warn(`[LINKEDIN] greeting: ${greetErr.message}`);
    }
  }

  try {
    await processLinkedInAgentInbound({
      connection,
      ticket: fullTicket,
      contact,
      body: parsed.body,
      messageWid: messageId
    });
  } catch (agentErr: any) {
    logger.warn(`[LINKEDIN] agente IA: ${agentErr.message}`);
  }

  logger.info(
    `[LINKEDIN] Inbound sender=${chatId} ticket=${ticket.id} connection=${connection.id}`
  );
}
