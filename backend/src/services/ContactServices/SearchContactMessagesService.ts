/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";

interface Request {
  contactId: number;
  companyId: number;
  searchParam: string;
  pageNumber?: string;
}

interface Response {
  messages: Message[];
  count: number;
  hasMore: boolean;
}

const SearchContactMessagesService = async ({
  contactId,
  companyId,
  searchParam,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  // Buscar todos os tickets do contato
  const tickets = await Ticket.findAll({
    where: {
      contactId,
      companyId
    },
    attributes: ["id"]
  });

  const ticketIds = tickets.map(ticket => ticket.id);

  if (ticketIds.length === 0) {
    return {
      messages: [],
      count: 0,
      hasMore: false
    };
  }

  const whereCondition = {
    ticketId: {
      [Op.in]: ticketIds
    },
    body: {
      [Op.iLike]: `%${searchParam}%`
    },
    isDeleted: false
  };

  const { count, rows: messages } = await Message.findAndCountAll({
    where: whereCondition,
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name"]
      },
      {
        model: Ticket,
        as: "ticket",
        attributes: ["id", "uuid"]
      }
    ],
    attributes: [
      "id",
      "wid",
      "body",
      "fromMe",
      "mediaType",
      "mediaUrl",
      "createdAt",
      "ticketId"
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + messages.length;

  return {
    messages,
    count,
    hasMore
  };
};

export default SearchContactMessagesService;