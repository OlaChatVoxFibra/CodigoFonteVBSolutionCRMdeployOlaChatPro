/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import LeadSale from "../../models/LeadSale";
import Contact from "../../models/Contact";
import User from "../../models/User";
import LeadPipeline from "../../models/LeadPipeline";

interface Request {
  searchParam?: string;
  pageNumber?: string | number;
  status?: string;
  pipelineId?: string | number;
  responsibleId?: number | string;
  contactId?: number | string;
  dateStart?: string;
  dateEnd?: string;
  companyId: number;
}

interface Response {
  leads: LeadSale[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  searchParam = "",
  pageNumber = 1,
  status,
  pipelineId,
  responsibleId,
  contactId,
  dateStart,
  dateEnd,
  companyId
}: Request): Promise<Response> => {
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const where: any = { companyId };

  if (searchParam) {
    const like = `%${searchParam}%`;
    where[Op.or] = [
      { name: { [Op.iLike]: like } },
      { description: { [Op.iLike]: like } },
      { companyName: { [Op.iLike]: like } },
      { phone: { [Op.iLike]: like } }
    ];
  }
  if (status) where.status = status;
  if (pipelineId) {
    const pid = Number(pipelineId);
    if (Number.isFinite(pid)) {
      // Include legacy records (NULL pipeline) only when requesting the first/default pipeline of the company
      const first = await LeadPipeline.findOne({ where: { companyId }, order: [["id", "ASC"]] });
      if (first && Number(first.id) === pid) {
        where[Op.or] = [{ pipelineId: pid }, { pipelineId: { [Op.is]: null } }];
      } else {
        where.pipelineId = pid;
      }
    }
  }
  if (responsibleId) where.responsibleId = responsibleId;
  if (contactId) where.contactId = contactId;
  if (dateStart && dateEnd) {
    where.date = {
      [Op.between]: [new Date(dateStart), new Date(dateEnd)]
    };
  }

  const { count, rows } = await LeadSale.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      { model: Contact, attributes: ["id", "name", "number", "profilePicUrl"] },
      { model: User, attributes: ["id", "name"] }
    ]
  });

  const leads = rows;

  return {
    leads: leads as unknown as LeadSale[],
    count,
    hasMore: count > offset + rows.length
  };
};

export default ListService;
