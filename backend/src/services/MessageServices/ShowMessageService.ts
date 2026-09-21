/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../../database";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

const ShowMessageService = async (messageId: string) => {
  const message = await sequelize.query(`select * from "Messages" where id = '${messageId}'`, {
    model: Message,
    mapToModel: true
  });
  if (message.length > 0) {
    return message[0] as unknown as Message;
  }
  return undefined;
}

export const GetWhatsAppFromMessage = async (message: Message): Promise<number | null> => {
  const ticketId = message.ticketId;
  const ticket = await Ticket.findByPk(ticketId);
  if (!ticket) {
    return null;
  }
  return ticket.whatsappId;
}


export default ShowMessageService;
