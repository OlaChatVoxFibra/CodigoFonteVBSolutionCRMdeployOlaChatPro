/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../../database/index";
import { QueryTypes } from "sequelize";

interface Return {
  data: {};
  count: number;
}

interface Request {
  initialDate: string;
  finalDate: string;
  companyId: number;
  userId?: number | null;
  channel?: string;
}

interface DataReturn {
  total: number;
  data?: number;
  horario?: string;
}

function parseChannel(ch?: string): string[] {
  if (!ch || ch === "all") return [];
  const lower = ch.toLowerCase();
  if (lower === "whatsapp") return ["whatsapp", "whatsapp_oficial"];
  return [lower];
}

export const TicketsDayService = async ({
  initialDate,
  finalDate,
  companyId,
  userId,
  channel
}: Request): Promise<Return> => {
  const filterUid =
    userId != null && Number.isFinite(Number(userId)) && Number(userId) > 0
      ? Number(userId)
      : null;
  const userFilter = filterUid != null ? ` and tick."userId" = :userId` : "";
  const channelValues = parseChannel(channel);
  const channelFilter = channelValues.length > 0 ? ` and tick."channel" in (:channelValues)` : "";

  let sql = "";
  let count = 0;

  if (initialDate && initialDate.trim() === finalDate && finalDate.trim()) {
    sql = `
    SELECT
      COUNT(*) AS total,
      extract(hour from tick."createdAt") AS horario
    FROM
      "Tickets" tick
    WHERE
      tick."companyId" = :companyId
      and DATE(tick."createdAt") >= :dateStart::date
      AND DATE(tick."createdAt") <= :dateEnd::date
      ${userFilter}
      ${channelFilter}
    GROUP BY
      extract(hour from tick."createdAt")
    ORDER BY
      horario asc;
    `;
  } else {
    sql = `
    SELECT
    COUNT(*) AS total,
    to_char(DATE(tick."createdAt"), 'dd/mm/YYYY') as data
  FROM
    "Tickets" tick
  WHERE
    tick."companyId" = :companyId
    and DATE(tick."createdAt") >= :dateStart::date
    AND DATE(tick."createdAt") <= :dateEnd::date
    ${userFilter}
    ${channelFilter}
  GROUP BY
    to_char(DATE(tick."createdAt"), 'dd/mm/YYYY')
  ORDER BY
    data asc;
  `;
  }

  const replacements: Record<string, unknown> = {
    companyId,
    dateStart: initialDate,
    dateEnd: finalDate
  };
  if (filterUid != null) {
    replacements.userId = filterUid;
  }
  if (channelValues.length > 0) {
    replacements.channelValues = channelValues;
  }

  const data: DataReturn[] = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements
  });

  data.forEach((register) => {
    count += Number(register.total);
  });

  return { data, count };
};
