/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import TicketFinalizationReason from "../../models/TicketFinalizationReason";
import { Op } from "sequelize";

interface Request {
  companyId: number;
  searchParam?: string;
}

const ListTicketFinalizationReasonsService = async ({
  companyId,
  searchParam
}: Request): Promise<TicketFinalizationReason[]> => {
  const whereCondition: any = {
    companyId
  };

  if (searchParam) {
    whereCondition.name = {
      [Op.like]: `%${searchParam}%`
    };
  }

  const reasons = await TicketFinalizationReason.findAll({
    where: whereCondition,
    order: [["name", "ASC"]]
  });

  return reasons;
};

export default ListTicketFinalizationReasonsService;
