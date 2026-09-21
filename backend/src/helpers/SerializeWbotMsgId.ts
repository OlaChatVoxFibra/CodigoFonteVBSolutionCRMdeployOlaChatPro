/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Message from "../models/Message";
import Ticket from "../models/Ticket";

const SerializeWbotMsgId = (ticket: Ticket, message: Message): string => {
  const serializedMsgId = `${message.fromMe}_${ticket.contact.number}@${
    ticket.isGroup ? "g" : "c"
  }.us_${message.id}`;

  return serializedMsgId;
};

export default SerializeWbotMsgId;
