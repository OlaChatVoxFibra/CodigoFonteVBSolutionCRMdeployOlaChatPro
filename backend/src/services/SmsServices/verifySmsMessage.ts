/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { SendSmsResult } from "./sendSmsMessage";

export async function verifyOutboundSmsMessage(
  sendResult: SendSmsResult,
  ticket: Ticket,
  contact: Contact,
  bodyFallback?: string
): Promise<void> {
  const body = sendResult.body || bodyFallback || "";

  const messageData = {
    wid: sendResult.sid,
    ticketId: ticket.id,
    contactId: undefined,
    body,
    fromMe: true,
    read: true,
    quotedMsgId: null,
    ack: 2,
    dataJson: JSON.stringify(sendResult),
    channel: "sms",
    mediaType: "conversation"
  };

  await CreateMessageService({
    messageData,
    companyId: ticket.companyId
  });

  await ticket.update({ lastMessage: body, fromMe: true });

  const io = getIO();
  io.of(String(ticket.companyId)).emit(`company-${ticket.companyId}-ticket`, {
    action: "update",
    ticket
  });
}

export async function verifyInboundSmsMessage(
  wid: string,
  body: string,
  ticket: Ticket,
  contact: Contact
): Promise<void> {
  const messageData = {
    wid,
    ticketId: ticket.id,
    contactId: contact.id,
    body,
    fromMe: false,
    read: false,
    quotedMsgId: null,
    ack: 0,
    dataJson: JSON.stringify({ sid: wid, body }),
    channel: "sms",
    mediaType: "conversation"
  };

  await CreateMessageService({
    messageData,
    companyId: ticket.companyId
  });

  await ticket.update({
    lastMessage: body,
    fromMe: false,
    unreadMessages: (ticket.unreadMessages || 0) + 1
  });

  const io = getIO();
  io.of(String(ticket.companyId)).emit(`company-${ticket.companyId}-appMessage`, {
    action: "create",
    message: messageData,
    ticket,
    contact
  });
  io.of(String(ticket.companyId)).emit(`company-${ticket.companyId}-ticket`, {
    action: "update",
    ticket
  });
}
