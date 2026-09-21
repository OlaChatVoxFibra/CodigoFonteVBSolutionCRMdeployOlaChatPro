/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import AppError from "../errors/AppError";
import Ticket from "../models/Ticket";
import User from "../models/User";
import Queue from "../models/Queue";

const CheckContactOpenTickets = async (contactId, whatsappId): Promise<void> => {
  const ticket = await Ticket.findOne({
    where: { contactId, status: { [Op.or]: ["open", "pending", "chatbot"]}, whatsappId},
      include:  [{
        model: Queue,
        as: "queue",
        attributes: ["id", "name", "color"]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name"]
      }]
  });

  if (ticket) {
    // throw new AppError(`CONTATO COM TICKET ABERTO POR OUTRO USUÁRIO: ${user?.name.toUpperCase( )}`);
    throw new AppError(JSON.stringify(ticket), 409);
  }
};

export default CheckContactOpenTickets;
