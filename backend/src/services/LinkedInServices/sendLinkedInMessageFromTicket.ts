/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { sendLinkedInMessage } from "./sendLinkedInMessage";
import { verifyOutboundLinkedInMessage } from "./verifyLinkedInMessage";

export default async function sendLinkedInMessageFromTicket({
  body,
  ticket
}: {
  body: string;
  ticket: Ticket;
}): Promise<void> {
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);
  if (!whatsapp || whatsapp.channel !== "linkedin") {
    throw new Error("Conexão LinkedIn inválida para este ticket.");
  }

  const sendResult = await sendLinkedInMessage(
    whatsapp,
    ticket.contact.number,
    body,
    ticket
  );

  await verifyOutboundLinkedInMessage(
    sendResult,
    ticket,
    ticket.contact,
    body
  );
}
