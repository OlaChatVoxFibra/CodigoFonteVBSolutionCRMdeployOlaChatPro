/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../../database/index";
import { QueryTypes } from "sequelize";

interface Return {
  data: {};
}

interface Request {
  initialDate: string;
  finalDate: string;
  companyId: number;
  userId?: number | null;
  channel?: string;
}

interface DataReturn {
  quantidade: number;
  data?: number;
  nome?: string;
}

interface dataUser {
  name: string;
}

function parseChannel(ch?: string): string[] {
  if (!ch || ch === "all") return [];
  const lower = ch.toLowerCase();
  if (lower === "whatsapp") return ["whatsapp", "whatsapp_oficial"];
  return [lower];
}

export const TicketsAttendance = async ({
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

  const sqlUsers = `select u.id, u.name from "Users" u where u."companyId" = :companyId order by u.name`;
  const users: { id: number; name: string }[] = await sequelize.query(sqlUsers, {
    type: QueryTypes.SELECT,
    replacements: { companyId }
  });

  const userFilter = filterUid != null ? ` and tt."userId" = :userId` : "";
  const channelValues = parseChannel(channel);
  const channelFilter = channelValues.length > 0 ? ` and tt."channel" in (:channelValues)` : "";

  const sql = `
  select
    COUNT(*) AS quantidade,
    coalesce(u.name, 'Sem atendente') AS nome
  from
    "Tickets" tt
    left join "Users" u on u.id = tt."userId"
  where
    tt."companyId" = :companyId
    and tt."createdAt" >= :dateStart
    and tt."createdAt" <= :dateEnd
    ${userFilter}
    ${channelFilter}
  group by
    nome
  ORDER BY
    nome asc`;

  const data: DataReturn[] = await sequelize.query(sql, {
    type: QueryTypes.SELECT,
    replacements: {
      companyId,
      dateStart: `${initialDate} 00:00:00`,
      dateEnd: `${finalDate} 23:59:59`,
      ...(filterUid != null ? { userId: filterUid } : {}),
      ...(channelValues.length > 0 ? { channelValues } : {})
    }
  });

  if (filterUid != null) {
    const target = users.find((u) => u.id === filterUid);
    if (target) {
      const row = data.find((d) => d.nome === target.name);
      return { data: [{ nome: target.name, quantidade: row ? Number(row.quantidade) : 0 }] };
    }
    return { data: [] };
  }

  users.forEach((user) => {
    const indexCreated = data.findIndex((item) => item.nome === user.name);
    if (indexCreated === -1) {
      data.push({ quantidade: 0, nome: user.name });
    }
  });

  return { data };
};