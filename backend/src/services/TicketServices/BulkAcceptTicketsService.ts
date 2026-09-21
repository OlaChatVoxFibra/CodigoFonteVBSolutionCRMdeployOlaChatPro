/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import ShowUserService from "../UserServices/ShowUserService";
import UpdateTicketService from "./UpdateTicketService";
import { getIO } from "../../libs/socket";
import { humanAcceptTicketFlags } from "../../helpers/ticketHumanAccept";

interface Request {
  companyId: number;
  userId: number;
  queueIds?: number[];
}

interface Response {
  accepted: number;
  skipped: number;
}

const BATCH_SIZE = 20;

const BulkAcceptTicketsService = async ({
  companyId,
  userId,
  queueIds
}: Request): Promise<Response> => {
  const user = await ShowUserService(userId, companyId);
  const isAdmin = user.profile === "admin" || user.super;
  const userQueueIds = Array.isArray(user.queues)
    ? user.queues.map((q) => q.id)
    : [];

  const where: any = {
    companyId,
    status: { [Op.in]: ["pending", "lgpd", "chatbot"] },
    userId: null
  };

  if (queueIds && queueIds.length > 0) {
    where.queueId = { [Op.in]: queueIds };
  }

  const tickets = await Ticket.findAll({
    where,
    order: [["updatedAt", "ASC"]]
  });

  let accepted = 0;
  let skipped = 0;

  for (let i = 0; i < tickets.length; i += BATCH_SIZE) {
    const batch = tickets.slice(i, i + BATCH_SIZE);

    for (const ticket of batch) {
      if (
        !isAdmin &&
        ticket.queueId &&
        !userQueueIds.includes(ticket.queueId)
      ) {
        skipped++;
        continue;
      }

      const isWhatsappGroup =
        ticket.isGroup && ticket.channel === "whatsapp";

      await UpdateTicketService({
        ticketId: ticket.id,
        companyId,
        requestUserId: userId,
        ticketData: {
          ...humanAcceptTicketFlags(),
          userId,
          status: isWhatsappGroup ? "group" : "open"
        }
      });

      accepted++;
    }

    if (i + BATCH_SIZE < tickets.length) {
      const io = getIO();
      io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
        action: "bulkProgress",
        type: "accept",
        processed: Math.min(i + BATCH_SIZE, tickets.length),
        total: tickets.length
      });
    }
  }

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
    action: "bulkComplete",
    type: "accept",
    accepted,
    skipped
  });

  return { accepted, skipped };
};

export default BulkAcceptTicketsService;
