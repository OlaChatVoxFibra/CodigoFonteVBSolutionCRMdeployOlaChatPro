/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import { Op } from "sequelize";
import {
  isOutsideMetaSendWindow,
  metaSendWindowError,
  resolveMetaMessageTag,
  type MetaMessageTag
} from "../../helpers/resolveMetaMessageTag";
import AppError from "../../errors/AppError";

export const getLastInboundMessageAt = async (
  ticket: Ticket
): Promise<Date | null> => {
  const lastMessage = await Message.findOne({
    where: {
      ticketId: { [Op.lte]: ticket.id },
      companyId: ticket.companyId,
      contactId: ticket.contactId,
      fromMe: false
    },
    order: [["createdAt", "DESC"]],
    attributes: ["createdAt"]
  });

  return lastMessage?.createdAt ?? null;
};

export const resolveOutboundMetaTagForTicket = async (
  ticket: Ticket
): Promise<MetaMessageTag | null> => {
  const lastInboundMessageAt = await getLastInboundMessageAt(ticket);
  return resolveMetaMessageTag({
    channel: ticket.channel,
    lastInboundMessageAt
  });
};

export const assertMetaSendAllowed = async (
  ticket: Ticket
): Promise<MetaMessageTag | null> => {
  const lastInboundMessageAt = await getLastInboundMessageAt(ticket);

  if (isOutsideMetaSendWindow(ticket.channel, lastInboundMessageAt)) {
    throw new AppError(metaSendWindowError(ticket.channel), 400);
  }

  return resolveMetaMessageTag({
    channel: ticket.channel,
    lastInboundMessageAt
  });
};
