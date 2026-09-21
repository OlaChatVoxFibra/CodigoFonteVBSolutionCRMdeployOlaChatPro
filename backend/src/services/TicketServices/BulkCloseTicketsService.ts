/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import ShowUserService from "../UserServices/ShowUserService";
import UpdateTicketService from "./UpdateTicketService";
import ListTicketsService from "./ListTicketsService";
import { canUserBulkCloseTickets } from "../../helpers/ticketVisibility";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import { Op } from "sequelize";

interface Request {
  companyId: number;
  userId: number;
  status?: string;
  queueIds?: number[];
  users?: number[];
  tags?: number[];
  whatsappIds?: number[];
  showAll?: string;
  withUnreadMessages?: string;
  dateStart?: string;
  dateEnd?: string;
  updatedStart?: string;
  updatedEnd?: string;
}

interface Response {
  closed: number;
}

const BATCH_SIZE = 20;

const BulkCloseTicketsService = async ({
  companyId,
  userId,
  status = "open",
  queueIds = [],
  users = [],
  tags = [],
  whatsappIds = [],
  showAll = "false",
  withUnreadMessages = "false",
  dateStart,
  dateEnd,
  updatedStart,
  updatedEnd
}: Request): Promise<Response> => {
  const user = await ShowUserService(userId, companyId);

  if (!canUserBulkCloseTickets(user)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const ticketMap = new Map<
    number,
    { id: number; userId: number | null; queueId: number | null }
  >();
  let pageNumber = 1;
  let hasMore = true;

  while (hasMore) {
    const { tickets, hasMore: pageHasMore } = await ListTicketsService({
      pageNumber: String(pageNumber),
      status,
      userId,
      companyId,
      queueIds,
      tags,
      users,
      whatsappIds,
      showAll,
      withUnreadMessages,
      dateStart,
      dateEnd,
      updatedStart,
      updatedEnd,
      searchParam: "",
      searchOnMessages: "false"
    });

    tickets.forEach(ticket => {
      if (ticket.status === status) {
        ticketMap.set(ticket.id, {
          id: ticket.id,
          userId: ticket.userId ?? null,
          queueId: ticket.queueId ?? null
        });
      }
    });

    hasMore = pageHasMore;
    pageNumber += 1;
  }

  // Tickets do Agente IA / integração aparecem na aba Atendendo mesmo fora do filtro
  // de fila (via socket no frontend). Incluí-los aqui evita "Finalizar todos" retornar 0.
  if (status === "open") {
    const agentTickets = await Ticket.findAll({
      where: {
        companyId,
        status: "open",
        [Op.or]: [{ isBot: true }, { useIntegration: true }]
      },
      attributes: ["id", "userId", "queueId", "status"]
    });

    agentTickets.forEach(ticket => {
      ticketMap.set(ticket.id, {
        id: ticket.id,
        userId: ticket.userId ?? null,
        queueId: ticket.queueId ?? null
      });
    });
  }

  const tickets = Array.from(ticketMap.values());

  let closed = 0;

  for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
    const batch = tickets.slice(i, i + BATCH_SIZE);

    for (const ticket of batch) {
      await UpdateTicketService({
        ticketId: ticket.id,
        companyId,
        requestUserId: userId,
        ticketData: {
          status: "closed",
          userId: ticket.userId || null,
          queueId: ticket.queueId || null,
          unreadMessages: 0,
          amountUsedBotQueues: 0,
          isBot: false,
          sendFarewellMessage: false
        }
      });
      closed++;
    }

    if (i + BATCH_SIZE < tickets.length) {
      const io = getIO();
      io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
        action: "bulkProgress",
        type: "close",
        processed: Math.min(i + BATCH_SIZE, tickets.length),
        total: tickets.length
      });
    }
  }

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
    action: "bulkComplete",
    type: "close",
    closed
  });

  return { closed };
};

export default BulkCloseTicketsService;
