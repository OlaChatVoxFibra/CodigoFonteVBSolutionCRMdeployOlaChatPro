/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { sendSmsMessage } from "./sendSmsMessage";
import { verifyOutboundSmsMessage } from "./verifySmsMessage";

export default async function sendSmsMessageFromTicket({
  body,
  ticket
}: {
  body: string;
  ticket: Ticket;
}): Promise<void> {
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  if (!whatsapp || whatsapp.channel !== "sms") {
    throw new Error("Conexão SMS inválida para este ticket.");
  }

  const sendResult = await sendSmsMessage(
    whatsapp,
    ticket.contact.number,
    body,
    ticket
  );

  await verifyOutboundSmsMessage(
    sendResult,
    ticket,
    ticket.contact,
    body
  );
}
