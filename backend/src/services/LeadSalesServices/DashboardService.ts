/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op, fn, col, literal, Sequelize } from "sequelize";
import LeadSale from "../../models/LeadSale";
import Contact from "../../models/Contact";
import User from "../../models/User";
import LeadPipeline from "../../models/LeadPipeline";
import {
  buildWonStatusWhere,
  isLeadSaleWon,
  isLostStatus,
  loadWonStatusKeysForCompany,
  mergeWhereWithWonFilter
} from "../../utils/leadSaleWonStatus";

type Request = {
  status?: string;
  pipelineId?: string | number;
  responsibleId?: string | number;
  contactId?: string | number;
  dateStart?: string;
  dateEnd?: string;
  companyId: number;
};

type DayAgg = { date: string; revenue: number; leads: number; value: number };
type Ranking = { id: number | null; name: string; leads: number; value: number };
type Origin = { origin: string; won: number };

export type LeadsDashboardResponse = {
  summary: {
    totalLeads: number;
    leadsWon: number;
    leadsLost: number;
    totalSales: number;
    efficiency: number;
  };
  revenuePerDay: DayAgg[];
  clientsValueByDay: DayAgg[];
  rankingResponsibles: Ranking[];
  conversionByOrigin: Origin[];
};

export default async function DashboardService({
  status,
  pipelineId,
  responsibleId,
  contactId,
  dateStart,
  dateEnd,
  companyId
}: Request): Promise<LeadsDashboardResponse> {
  const where: any = { companyId };
  if (status) where.status = status;
  if (pipelineId) {
    const pid = Number(pipelineId);
    if (Number.isFinite(pid)) {
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
    where.createdAt = { [Op.between]: [new Date(dateStart), new Date(dateEnd)] };
  }

  const wonStatusKeys = await loadWonStatusKeysForCompany(companyId, pipelineId);

  // Summary
  const all = await LeadSale.findAll({
    attributes: ["status", "value"],
    where,
    raw: true
  });
  const totalLeads = all.length;
  const leadsWon = all.filter((r) => isLeadSaleWon(String(r.status), wonStatusKeys)).length;
  const leadsLost = all.filter((r) => isLostStatus(String(r.status))).length;
  const totalSales = all
    .filter((r) => isLeadSaleWon(String(r.status), wonStatusKeys))
    .reduce((sum, r: any) => sum + (Number(r.value) || 0), 0);
  const baseEff = leadsWon + leadsLost;
  const efficiency = baseEff > 0 ? (leadsWon / baseEff) * 100 : 0;

  // Helpers for date truncation (Postgres)
  const dt = (field: string) => fn("date_trunc", "day", col(field));
  const castDate = (field: string) =>
    Sequelize.cast(fn("to_char", dt(field), literal(`'YYYY-MM-DD'`)), "text");

  const wonFilter = buildWonStatusWhere(wonStatusKeys) as any;
  const revenueWhere: any = { ...where };
  if (revenueWhere[Op.or]) {
    const prevOr = revenueWhere[Op.or];
    delete revenueWhere[Op.or];
    revenueWhere[Op.and] = [...(revenueWhere[Op.and] || []), { [Op.or]: prevOr }, wonFilter];
  } else {
    revenueWhere[Op.and] = [...(revenueWhere[Op.and] || []), wonFilter];
  }

  const revenuePerDayRaw = await LeadSale.findAll({
    attributes: [
      [castDate("updatedAt"), "date"],
      [fn("sum", col("value")), "revenue"]
    ],
    where: revenueWhere,
    group: [castDate("updatedAt") as any],
    order: [[literal("date"), "ASC"]],
    raw: true
  });

  // Clients x Value per day (all leads)
  const clientsValueRaw = await LeadSale.findAll({
    attributes: [
      [castDate("createdAt"), "date"],
      [fn("count", col("id")), "leads"],
      [fn("sum", col("value")), "value"]
    ],
    where,
    group: [castDate("createdAt") as any],
    order: [[literal("date"), "ASC"]],
    raw: true
  });

  // Ranking de Responsáveis
  const rankingRaw = await LeadSale.findAll({
    attributes: [
      "responsibleId",
      [fn("count", col("LeadSale.id")), "leads"],
      [fn("sum", col("value")), "value"]
    ],
    where,
    include: [{ model: User, attributes: ["id", "name"], required: false }],
    group: ["responsibleId", "User.id"],
    order: [[literal("value"), "DESC"]],
    raw: true
  });

  // Conversão por Origem (canal do contato) - conta ganhos por canal
  const originRaw = await LeadSale.findAll({
    attributes: [
      [literal('"contact"."channel"'), "origin"],
      [fn("count", col("LeadSale.id")), "won"]
    ],
    where: mergeWhereWithWonFilter(where, wonFilter),
    include: [{ model: Contact, attributes: [], required: false }],
    group: [literal('"contact"."channel"') as any],
    raw: true
  });

  const normalizeDateAgg = (arr: any[], shape: "revenue" | "clientsValue"): DayAgg[] =>
    arr.map((r) => ({
      date: String(r.date),
      revenue: Number((r as any).revenue || 0),
      leads: Number((r as any).leads || 0),
      value: Number((r as any).value || 0)
    }));

  const rankingResponsibles: Ranking[] = rankingRaw.map((r: any) => ({
    id: r.responsibleId ? Number(r.responsibleId) : null,
    name: r["User.name"] || "Não definido",
    leads: Number(r.leads || 0),
    value: Number(r.value || 0)
  }));

  const conversionByOrigin: Origin[] = originRaw.map((r: any) => ({
    origin: r.origin || "indefinido",
    won: Number(r.won || 0)
  }));

  return {
    summary: {
      totalLeads,
      leadsWon,
      leadsLost,
      totalSales,
      efficiency: Number(efficiency.toFixed(2))
    },
    revenuePerDay: normalizeDateAgg(revenuePerDayRaw, "revenue"),
    clientsValueByDay: normalizeDateAgg(clientsValueRaw, "clientsValue"),
    rankingResponsibles,
    conversionByOrigin
  };
}

