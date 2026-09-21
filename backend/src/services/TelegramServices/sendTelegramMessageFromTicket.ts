/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { sendTelegramMessage } from "./sendTelegramMessage";
import { verifyOutboundTelegramMessage } from "./verifyTelegramMessage";

export default async function sendTelegramMessageFromTicket({
  body,
  ticket
}: {
  body: string;
  ticket: Ticket;
}): Promise<void> {
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  if (!whatsapp || whatsapp.channel !== "telegram") {
    throw new Error("Conexão Telegram inválida para este ticket.");
  }

  const sendResult = await sendTelegramMessage(
    whatsapp,
    ticket.contact.number,
    body,
    ticket
  );

  await verifyOutboundTelegramMessage(
    sendResult,
    ticket,
    ticket.contact,
    body
  );
}
