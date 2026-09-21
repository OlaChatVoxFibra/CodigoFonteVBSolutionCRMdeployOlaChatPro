/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op, fn, col, where } from "sequelize";
import Campaign from "../../models/Campaign";
import { isEmpty } from "lodash";
import ContactList from "../../models/ContactList";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  companyId: number | string;
  searchParam?: string;
  pageNumber?: string;
  pageSize?: string;
  status?: string;
  isRecurring?: string;
}

interface Response {
  records: Campaign[];
  count: number;
  hasMore: boolean;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

const ListService = async ({
  searchParam = "",
  pageNumber = "1",
  pageSize = "10",
  companyId,
  status,
  isRecurring
}: Request): Promise<Response> => {
  let whereCondition: any = {
    companyId
  };

  // Filtro por status
  if (status && status !== "") {
    whereCondition.status = status;
  }

  // Filtro por recorrência
  if (isRecurring && isRecurring !== "") {
    if (isRecurring === "true") {
      whereCondition.isRecurring = true;
    } else if (isRecurring === "false") {
      whereCondition.isRecurring = false;
    }
  }

  // Filtro por busca de texto
  if (!isEmpty(searchParam)) {
    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        {
          name: where(
            fn("LOWER", col("Campaign.name")),
            "LIKE",
            `%${searchParam.toLowerCase().trim()}%`
          )
        }
      ]
    };
  }

  const limit = parseInt(pageSize);
  const offset = limit * (+pageNumber - 1);

  const { count, rows: records } = await Campaign.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["status", "ASC"], ["scheduledAt", "DESC"]],
    include: [
      { model: ContactList },
      { model: Whatsapp, attributes: ["id", "name", "color"] }
    ]
  });

  const totalPages = Math.ceil(count / limit);
  const hasMore = +pageNumber < totalPages;

  return {
    records,
    count,
    hasMore,
    totalPages,
    currentPage: +pageNumber,
    pageSize: limit
  };
};

export default ListService;
