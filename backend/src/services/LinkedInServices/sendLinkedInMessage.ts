/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import formatBody from "../../helpers/Mustache";
import { getLinkedInCredentials } from "./linkedinCredentials";
import {
  resolveLinkedInRecipientUrn,
  sendLinkedInDirectMessage
} from "./linkedinApi";

export interface SendLinkedInResult {
  messageId: string;
  recipientUrn: string;
  body: string;
}

export async function sendLinkedInMessage(
  connection: Whatsapp,
  recipientRaw: string,
  body: string,
  ticket?: Ticket
): Promise<SendLinkedInResult> {
  const creds = getLinkedInCredentials(connection);
  const recipientUrn = resolveLinkedInRecipientUrn(recipientRaw);
  const text = ticket ? formatBody(body, ticket) : body;

  const result = await sendLinkedInDirectMessage({
    accessToken: creds.accessToken,
    senderUrn: creds.senderUrn,
    recipientUrn,
    body: text
  });

  const messageId =
    String(result.messageUrn || result.id || `${Date.now()}`).trim() ||
    `${connection.id}_${Date.now()}`;

  return {
    messageId,
    recipientUrn,
    body: text
  };
}
