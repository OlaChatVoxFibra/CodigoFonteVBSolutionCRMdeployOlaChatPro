/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */
import { QueryTypes } from "sequelize";
import * as _ from "lodash";
import sequelize from "../../database";
import path from "path";
const fs = require('fs');

export interface DashboardData {
  counters: any;
  attendants: [];
}

export interface Params {
  days?: number;
  date_from?: string;
  date_to?: string;
  /** Filtro opcional: métricas e tabela só deste atendente (WhatsApp dashboard). */
  user_id?: string | number;
  /** Vários atendentes, CSV numérico (ex.: "1,2,3"). Tem precedência sobre user_id quando informado. */
  user_ids?: string;
  /** Filtro por canal: whatsapp, telegram, sms, facebook, instagram */
  channel?: string;
}

function parseChannelFilter(channel?: string): string[] {
  if (!channel || channel === "all") return [];
  const lower = channel.toLowerCase();
  if (lower === "whatsapp") return ["whatsapp", "whatsapp_oficial"];
  return [lower];
}

function parseDashboardUserIds(params: Params): number[] {
  const rawMulti = params.user_ids;
  const fromCsv: number[] = [];
  if (rawMulti != null && String(rawMulti).trim() !== "") {
    String(rawMulti)
      .split(",")
      .map(s => s.trim())
      .forEach(s => {
        if (/^\d+$/.test(s)) {
          const n = parseInt(s, 10);
          if (n > 0) fromCsv.push(n);
        }
      });
  }
  if (fromCsv.length > 0) {
    return [...new Set(fromCsv)];
  }
  const filterUserIdRaw = params.user_id != null ? String(params.user_id).trim() : "";
  if (filterUserIdRaw && /^\d+$/.test(filterUserIdRaw)) {
    const n = parseInt(filterUserIdRaw, 10);
    return n > 0 ? [n] : [];
  }
  return [];
}

export default async function DashboardDataService(
  companyId: string | number,
  params: Params
): Promise<DashboardData> {
  const filterUserIds = parseDashboardUserIds(params);
  const userTicketSql =
    filterUserIds.length === 1
      ? ` and t."userId" = ${filterUserIds[0]}`
      : filterUserIds.length > 1
      ? ` and t."userId" in (${filterUserIds.join(",")})`
      : "";
  const userTtSql =
    filterUserIds.length === 1
      ? ` and tt."userId" = ${filterUserIds[0]}`
      : filterUserIds.length > 1
      ? ` and tt."userId" in (${filterUserIds.join(",")})`
      : "";
  const userTt1Sql =
    filterUserIds.length === 1
      ? ` and tt1."userId" = ${filterUserIds[0]}`
      : filterUserIds.length > 1
      ? ` and tt1."userId" in (${filterUserIds.join(",")})`
      : "";
  const attendantsUserWhere =
    filterUserIds.length === 1
      ? ` and u1.id = ${filterUserIds[0]}`
      : filterUserIds.length > 1
      ? ` and u1.id in (${filterUserIds.join(",")})`
      : "";

  const channelValues = parseChannelFilter(params.channel);

  // Construir filtros dinamicamente
  let whereClause = `where tt."companyId" = :companyId${userTtSql}`;
  const replacements: any = { companyId };

  // Adicionar filtros de data
  if (_.has(params, "days") && params.days) {
    whereClause += ` and tt."createdAt" >= (now() - INTERVAL ':days days')`;
    replacements.days = parseInt(`${params.days}`.replace(/\D/g, ""), 10);
  }

  if (_.has(params, "date_from") && params.date_from) {
    whereClause += ` and tt."createdAt" >= :dateFrom`;
    replacements.dateFrom = `${params.date_from} 00:00:00`;
  }

  if (_.has(params, "date_to") && params.date_to) {
    whereClause += ` and tt."createdAt" <= :dateTo`;
    replacements.dateTo = `${params.date_to} 23:59:59`;
  }

  if (channelValues.length > 0) {
    whereClause += ` and t."channel" in (:channelValues)`;
    replacements.channelValues = channelValues;
  }

  const channelTicketSql =
    channelValues.length > 0 ? ` and t."channel" in (:channelValues)` : "";

  // Adicionar filtros adicionais nas CTEs que precisam dos mesmos filtros
  const leadsDateFilter =
    params.date_from && params.date_to
      ? `where ct1."createdAt" between :dateFrom and :dateTo${userTt1Sql}`
      : `where ct1."createdAt" >= (now() - INTERVAL '30 days')${userTt1Sql}`;

  const query = `
    with
    traking as (
      select
        c.name "companyName",
        u.name "userName",
        u.online "userOnline",
        w.name "whatsappName",
        ct.name "contactName",
        ct.number "contactNumber",
        (t."status" = 'closed') "finished",
        (tt."userId" is null and coalesce(tt."closedAt",tt."finishedAt") is null and t."status" = 'pending') "pending",
        (t."status" = 'group') "groups",
        (t."isActiveDemand" = true) "active",
        (t."isActiveDemand" = false) "passive",
        coalesce((
          (EXTRACT(day FROM age(coalesce(tt."closedAt",tt."finishedAt"), tt."startedAt")) * 24 * 60) +
          (EXTRACT(hour FROM age(coalesce(tt."closedAt",tt."finishedAt"), tt."startedAt")) * 60) +
          (EXTRACT(minutes FROM age(coalesce(tt."closedAt",tt."finishedAt"), tt."startedAt")))
        ), 0) "supportTime",
        coalesce(extract(epoch from tt."updatedAt" - tt."queuedAt") / 60, 0) AS "waitTime",
        t.status,
        tt.*,
        ct."id" "contactId"
      from "TicketTraking" tt
      left join "Companies" c on c.id = tt."companyId"
      left join "Users" u on u.id = tt."userId"
      left join "Whatsapps" w on w.id = tt."whatsappId"
      inner join "Tickets" t on t.id = tt."ticketId"
      left join "Contacts" ct on ct.id = t."contactId"
      ${whereClause}
    ),
    counters as (
      select
        coalesce((select avg("supportTime") from traking where "supportTime" >= 0), 0) "avgSupportTime",
        (select avg("waitTime") from traking where "waitTime" > 0) "avgWaitTime",       
        coalesce((select count(id) from traking where finished), 0) "supportFinished",
        coalesce((
          select count(distinct "id")
          from "Tickets" t
          where status = 'open' and t."companyId" = :companyId${userTicketSql}${channelTicketSql}
        ), 0) "supportHappening",
        coalesce((
          select count(distinct "id")
          from "Tickets" t
          where status = 'pending' and t."companyId" = :companyId${userTicketSql}${channelTicketSql}
        ), 0) "supportPending",
        coalesce((select count(id) from traking where groups), 0) "supportGroups",
        coalesce((
          select count(leads.id) from (
            select
              ct1.id,
              count(tt1.id) total
            from "TicketTraking" tt1
            left join "Tickets" t1 on t1.id = tt1."ticketId"
            left join "Contacts" ct1 on ct1.id = t1."contactId"
            ${leadsDateFilter}
            group by 1
            having count(tt1.id) = 1
          ) leads
        ), 0) "leads",        
        coalesce((select count(*) from traking where active), 0) "activeTickets",
        coalesce((select count(*) from traking where passive), 0) "passiveTickets",
        coalesce((select count(id) from traking), 0) "tickets",
        coalesce((select count(id) from traking where "status" = 'nps'), 0) "waitRating",
        coalesce((select count(id) from traking where "status" = 'closed' and "rated" = false), 0) "withoutRating",
        coalesce((select count(id) from traking where "status" = 'closed' and "rated" = true), 0) "withRating",
        coalesce((((select count(id) from traking where "rated" = true) * 100.0) / NULLIF((select count(id) from traking),0)), 0) "percRating",
        coalesce((select 
          (100.0 * count(tt.*)) / NULLIF((select count(*) from traking tt2 inner join "UserRatings" ur2 on ur2."ticketId" = tt2."ticketId" where tt2.rated = true), 0)
          from traking tt
          inner join "UserRatings" ur on ur."ticketId" = tt."ticketId"
          where tt.rated = true 
            and ur."rate" > 8
        ), 0) "npsPromotersPerc",
        coalesce((select 
          (100.0 * count(tt.*)) / NULLIF((select count(*) from traking tt2 inner join "UserRatings" ur2 on ur2."ticketId" = tt2."ticketId" where tt2.rated = true), 0)
          from traking tt
          inner join "UserRatings" ur on ur."ticketId" = tt."ticketId"
          where tt.rated = true 
            and ur."rate" in (7,8)
        ), 0) "npsPassivePerc",
        coalesce((
          select 
            (100.0 * count(tt.*)) / NULLIF((select count(*) from traking tt2 inner join "UserRatings" ur2 on ur2."ticketId" = tt2."ticketId" where tt2.rated = true), 0)
          from traking tt
          inner join "UserRatings" ur on ur."ticketId" = tt."ticketId"
          where tt.rated = true 
            and ur."rate" < 7
        ), 0) "npsDetractorsPerc",
        coalesce((
          select 
            coalesce(sum(nps.promoter), 0) - coalesce(sum(nps.detractor), 0) 
          from (
            select 
              (100.0 * count(tt.*)) / NULLIF((select count(*) from traking tt2 inner join "UserRatings" ur2 on ur2."ticketId" = tt2."ticketId" where tt2.rated = true), 0) promoter,
              0 detractor
            from traking tt
            inner join "UserRatings" ur on ur."ticketId" = tt."ticketId"
            where tt.rated = true 
              and ur."rate" > 8
            union all
            select 
              0,
              (100.0 * count(tt.*)) / NULLIF((select count(*) from traking tt2 inner join "UserRatings" ur2 on ur2."ticketId" = tt2."ticketId" where tt2.rated = true), 0)
            from traking tt
            inner join "UserRatings" ur on ur."ticketId" = tt."ticketId"
            where tt.rated = true 
              and ur.rate < 7
          ) nps
        ), 0) "npsScore"
    ),
    attendants as (
      select
        u1.id,
        u1."name",
        u1."online",
        coalesce(avg(case when t."waitTime" >= 0 then t."waitTime" else null end), 0) "avgWaitTime",
        coalesce(avg(case when t."supportTime" >= 0 then t."supportTime" else null end), 0) "avgSupportTime",
        coalesce(count(t."id"), 0) "tickets",
        coalesce(round(avg(ur."rate"), 2), 0) "rating",
        coalesce(count(ur."id"), 0) "countRating"
      from "Users" u1
        left join traking t on t."userId" = u1.id
        left join "UserRatings" ur on ur."userId" = t."userId" and ur."ticketId" = t."ticketId"
      where u1."companyId" = :companyId${attendantsUserWhere}
      group by u1.id, u1."name", u1."online"
      order by u1."name"
    )
    select
      (select coalesce(json_build_object(
        'avgSupportTime', "avgSupportTime",
        'avgWaitTime', "avgWaitTime",
        'supportFinished', "supportFinished",
        'supportHappening', "supportHappening",
        'supportPending', "supportPending",
        'supportGroups', "supportGroups",
        'leads', "leads",
        'activeTickets', "activeTickets",
        'passiveTickets', "passiveTickets",
        'tickets', "tickets",
        'waitRating', "waitRating",
        'withoutRating', "withoutRating",
        'withRating', "withRating",
        'percRating', "percRating",
        'npsPromotersPerc', "npsPromotersPerc",
        'npsPassivePerc', "npsPassivePerc",
        'npsDetractorsPerc', "npsDetractorsPerc",
        'npsScore', "npsScore"
      ), '{}')::jsonb from counters) counters,
      (select coalesce(json_agg(a.*), '[]')::jsonb from attendants a) attendants;
  `;

  // console.log('Dashboard Query:', query);
  // console.log('Dashboard Replacements:', replacements);

  try {
    const responseData: DashboardData = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
      plain: true
    });

    // console.log('Dashboard Response:', responseData);

    return responseData;
  } catch (error) {
    console.error('Erro ao executar query do dashboard:', error);
    throw error;
  }
}