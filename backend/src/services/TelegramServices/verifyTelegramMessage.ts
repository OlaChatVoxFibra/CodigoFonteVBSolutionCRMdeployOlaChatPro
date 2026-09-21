/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { SendTelegramResult } from "./sendTelegramMessage";
import { emitTelegramTicketSocket } from "./emitTelegramTicketSocket";
import { markTicketUnderAgentAttendance } from "../TicketServices/markTicketUnderAgentAttendance";

export async function verifyOutboundTelegramMessage(
  sendResult: SendTelegramResult,
  ticket: Ticket,
  contact: Contact,
  bodyFallback?: string,
  options?: { fromAgent?: boolean }
): Promise<void> {
  const body = sendResult.body || bodyFallback || "";
  const ticketChannel = ticket.channel || "telegram";
  const fromAgent = options?.fromAgent === true;

  const messageData = {
    wid: sendResult.messageId,
    ticketId: ticket.id,
    contactId: undefined,
    body,
    fromMe: true,
    read: true,
    quotedMsgId: null,
    ack: 2,
    dataJson: JSON.stringify(sendResult),
    channel: ticketChannel,
    mediaType: "conversation",
    fromAgent
  };

  await CreateMessageService({
    messageData: messageData as any,
    companyId: ticket.companyId
  });

  await ticket.update({ lastMessage: body, fromMe: true });

  if (fromAgent) {
    await markTicketUnderAgentAttendance(ticket);
  }

  await emitTelegramTicketSocket(ticket, "update");
}

export async function verifyInboundTelegramMessage(
  messageId: string,
  body: string,
  ticket: Ticket,
  contact: Contact
): Promise<Message> {
  const messageData = {
    wid: messageId,
    ticketId: ticket.id,
    contactId: contact.id,
    body,
    fromMe: false,
    read: false,
    quotedMsgId: null,
    ack: 0,
    dataJson: JSON.stringify({ messageId, body }),
    channel: ticket.channel || "telegram",
    mediaType: "conversation"
  };

  await ticket.update({
    lastMessage: body,
    fromMe: false,
    unreadMessages: (ticket.unreadMessages || 0) + 1
  });

  const message = await CreateMessageService({
    messageData: messageData as any,
    companyId: ticket.companyId
  });

  await emitTelegramTicketSocket(ticket, "update");

  return message;
}
