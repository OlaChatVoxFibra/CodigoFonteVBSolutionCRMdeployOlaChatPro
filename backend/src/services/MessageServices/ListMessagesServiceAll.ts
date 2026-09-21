/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FindOptions } from "sequelize/types";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";
import Queue from "../../models/Queue";

import { QueryTypes } from "sequelize";
import sequelize from "../../database";

// Usa a instância global de conexão já configurada

interface Request {
  companyId: number;
  fromMe: boolean;
  dateStart: string;
  dateEnd: string;
  /** Conta só mensagens de tickets atribuídos a este usuário (dashboard responsável). */
  ticketUserId?: number | null;
  /** Vários atendentes (IN). Tem precedência sobre ticketUserId quando informado. */
  ticketUserIds?: number[] | null;
}

interface Response {
  count: number;
}

const ListMessagesServiceAll = async ({
  companyId,
  fromMe,
  dateStart,
  dateEnd,
  ticketUserId,
  ticketUserIds
}: Request): Promise<Response> => {
  let ticketsCounter: any;
  const queryParams: any = { companyId };

  const idsFromMulti =
    ticketUserIds != null && ticketUserIds.length > 0
      ? [...new Set(ticketUserIds.map(n => Number(n)).filter(n => Number.isFinite(n) && n > 0))]
      : [];

  const filterUid =
    idsFromMulti.length === 0 &&
    ticketUserId != null &&
    Number.isFinite(Number(ticketUserId)) &&
    Number(ticketUserId) > 0
      ? Number(ticketUserId)
      : null;

  let query = `SELECT COUNT(1) AS count FROM "Messages" m`;
  if (idsFromMulti.length > 0 || filterUid != null) {
    query += ` INNER JOIN "Tickets" t ON t.id = m."ticketId" AND t."companyId" = m."companyId"`;
  }
  query += ` WHERE m."companyId" = :companyId`;

  if (idsFromMulti.length === 1) {
    query += ` AND t."userId" = ${idsFromMulti[0]}`;
  } else if (idsFromMulti.length > 1) {
    query += ` AND t."userId" IN (${idsFromMulti.join(",")})`;
  } else if (filterUid != null) {
    queryParams.filterUid = filterUid;
    query += ` AND t."userId" = :filterUid`;
  }

  if (fromMe) {
    query += ` AND m."fromMe" = :fromMe`;
    queryParams.fromMe = fromMe;
  }

  if (dateStart && dateEnd) {
    query += ` AND m."createdAt" BETWEEN :dateStart AND :dateEnd`;
    queryParams.dateStart = `${dateStart} 00:00:00`;
    queryParams.dateEnd = `${dateEnd} 23:59:59`;
  }

  ticketsCounter = await sequelize.query(query, {
    type: QueryTypes.SELECT,
    replacements: queryParams
  });

  return {
    count: ticketsCounter
  };
};

export default ListMessagesServiceAll;
