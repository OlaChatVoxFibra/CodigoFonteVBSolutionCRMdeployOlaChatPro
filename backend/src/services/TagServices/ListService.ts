/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op, literal, fn, col, Sequelize } from "sequelize";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";
import TicketTag from "../../models/TicketTag";

import removeAccents from "remove-accents";
import Contact from "../../models/Contact";

interface Request {
  companyId: number;
  searchParam?: string;
  pageNumber?: string | number;
  kanban?: number;
  tagId?: number;
  limit?: string | number;
}

interface Response {
  tags: Tag[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  companyId,
  searchParam = "",
  pageNumber = "1",
  kanban = 0,
  tagId = 0,
  limit: rawLimit
}: Request): Promise<Response> => {
  let whereCondition = {};

  // Resolve limit and offset. If limit is 'all' or -1, fetch everything
  const limitParam = typeof rawLimit === "string" ? rawLimit : rawLimit?.toString();
  const unlimited = limitParam === "all" || limitParam === "-1";
  const limit = unlimited ? undefined : Number(limitParam || 20);
  const offset = unlimited ? undefined : (limit as number) * (+pageNumber - 1);

  const sanitizedSearchParam = removeAccents(searchParam.toLocaleLowerCase().trim());

  if (Number(kanban) === 0) {
    if (searchParam) {
      whereCondition = {
        [Op.or]: [
          {
            name: Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("Tag.name")),
              "LIKE",
              `%${sanitizedSearchParam}%`
            )
          },
          { color: { [Op.like]: `%${sanitizedSearchParam}%` } }
          // { kanban: { [Op.like]: `%${searchParam}%` } }
        ]
      };
    }

    const { count, rows: tags } = await Tag.findAndCountAll({
      where: { ...whereCondition, companyId, kanban },
      ...(limit !== undefined ? { limit } : {}),
      include: [
        {
          // model: ContactTag,
          // as: "contactTags",
          // include: [
          //   {
          model: Contact,
          as: "contacts",
          //   }
          // ]
        },
      ],
      attributes: [
        'id',
        'name',
        'color',
      ],
      ...(offset !== undefined ? { offset } : {}),
      order: [["name", "ASC"]],
    });

    const hasMore = unlimited ? false : count > (offset as number) + tags.length;

    return {
      tags,
      count,
      hasMore
    };

  } else {
    if (searchParam) {
      whereCondition = {
        [Op.or]: [
          {
            name: Sequelize.where(
              Sequelize.fn("LOWER", Sequelize.col("Tag.name")),
              "LIKE",
              `%${sanitizedSearchParam}%`
            )
          },
          { color: { [Op.like]: `%${sanitizedSearchParam}%` } }
          // { kanban: { [Op.like]: `%${searchParam}%` } }
        ]
      };
    }

    if (tagId > 0) {
      whereCondition = {
        ...whereCondition,
        id: { [Op.ne]: [tagId] }
      }
    }

    // console.log(whereCondition)
    const { count, rows: tags } = await Tag.findAndCountAll({
      where: { ...whereCondition, companyId, kanban },
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      order: [["name", "ASC"]],
      include: [
        {
          model: TicketTag,
          as: "ticketTags",

        },
      ],
      attributes: [
        'id',
        'name',
        'color',
      ],
    });

    const hasMore = unlimited ? false : count > (offset as number) + tags.length;

    return {
      tags,
      count,
      hasMore
    };
  }
};

export default ListService;
