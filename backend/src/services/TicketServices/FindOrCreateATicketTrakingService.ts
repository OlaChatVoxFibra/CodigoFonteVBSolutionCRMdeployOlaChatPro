/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import TicketTraking from "../../models/TicketTraking";

interface Params {
  ticketId: string | number;
  companyId: string | number;
  whatsappId: string | number;
  userId: string | number | null;
}

const FindOrCreateATicketTrakingService = async ({
  ticketId,
  companyId,
  whatsappId,
  userId = null
}: Params): Promise<TicketTraking> => {
  const ticketTraking = await TicketTraking.findOne({
    where: {
      ticketId,
      finishedAt: {
        [Op.is]: null
      }
    }
  });

  if (ticketTraking) {
     return ticketTraking;
  }

  const newRecord = await TicketTraking.create({
    ticketId,
    companyId,
    whatsappId,
    userId: userId !== null && userId !== "" ? userId : null
  });

  return newRecord;
};

export default FindOrCreateATicketTrakingService;
