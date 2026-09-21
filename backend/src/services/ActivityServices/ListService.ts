/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Activity from "../../models/Activity";
import Company from "../../models/Company";
import Project from "../../models/Project";

function stripSyncMarkers(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/\[google-calendar-sync:\w+:\d+\]/gi, "")
    .replace(/\[google-calendar:[^\]]+\]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  dateStart?: string;
  dateEnd?: string;
  companyId: number;
}

interface Response {
  activities: Activity[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  searchParam = "",
  pageNumber = "1",
  status,
  dateStart,
  dateEnd,
  companyId
}: Request): Promise<Response> => {
  const where: any = {
    companyId
  };

  if (searchParam) {
    const like = `%${searchParam}%`;
    where[Op.or] = [
      {
        title: {
          [Op.like]: like
        }
      },
      {
        description: {
          [Op.like]: like
        }
      }
    ];
  }

  if (status) {
    where.status = status;
  }

  if (dateStart || dateEnd) {
    const range: any = {};

    if (dateStart) {
      range[Op.gte] = new Date(dateStart);
    }

    if (dateEnd) {
      range[Op.lte] = new Date(dateEnd);
    }

    where.date = range;
  }

  const limit = 20;
  const page = Number(pageNumber) || 1;
  const offset = limit * (page - 1);

  const listIncludes = [
    { model: Company, as: "company", attributes: ["id", "name"] },
    { model: Project, as: "project", attributes: ["id", "name"] }
  ];

  try {
    const { count, rows } = await Activity.findAndCountAll({
      where,
      limit,
      offset,
      order: [
        ["date", "DESC"],
        ["id", "DESC"]
      ],
      include: listIncludes
    });

    const hasMore = count > offset + rows.length;
    const activities = rows.map(row => {
      const plain =
        typeof (row as any).get === "function"
          ? (row as any).get({ plain: true })
          : { ...(row as any).dataValues };
      return {
        ...plain,
        description: stripSyncMarkers(plain.description as string)
      };
    });

    return {
      activities: activities as unknown as Activity[],
      count,
      hasMore
    };
  } catch (err: any) {
    const code = err?.original?.code;
    const message = String(err?.message || "").toLowerCase();

    if (
      code === "42P01" ||
      (message.includes("no such table") && message.includes("activities"))
    ) {
      return {
        activities: [],
        count: 0,
        hasMore: false
      };
    }

    if (
      message.includes("projectid") ||
      message.includes("projects") ||
      message.includes("does not exist")
    ) {
      const { count, rows } = await Activity.findAndCountAll({
        where,
        limit,
        offset,
        order: [
          ["date", "DESC"],
          ["id", "DESC"]
        ],
        include: [
          { model: Company, as: "company", attributes: ["id", "name"] }
        ]
      });

      const hasMore = count > offset + rows.length;
      const activities = rows.map(row => {
        const plain =
          typeof (row as any).get === "function"
            ? (row as any).get({ plain: true })
            : { ...(row as any).dataValues };
        return {
          ...plain,
          description: stripSyncMarkers(plain.description as string)
        };
      });

      return {
        activities: activities as unknown as Activity[],
        count,
        hasMore
      };
    }

    throw err;
  }
};

export default ListService;
