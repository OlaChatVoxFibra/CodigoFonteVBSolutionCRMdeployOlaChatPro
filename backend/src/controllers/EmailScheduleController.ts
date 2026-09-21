/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { Op } from "sequelize";
import EmailSchedule from "../models/EmailSchedule";
import EmailCampaign from "../models/EmailCampaign";
import EmailContact from "../models/EmailContact";
import EmailTemplate from "../models/EmailTemplate";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { pageNumber, status, searchParam } = req.query as any;
  const page = parseInt(pageNumber || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const where: any = { companyId };
  if (status) where.status = status;

  const include = [
    { model: EmailCampaign, as: "campaign", include: [{ model: EmailTemplate, as: "template" }] },
    { model: EmailContact, as: "contact" }
  ];

  if (searchParam) {
    // Busca por email do contato ou nome da campanha/template
    (include as any)[1].where = {
      ...(include as any)[1].where,
      email: { [Op.iLike]: `%${searchParam}%` }
    };
  }

  const { rows, count } = await EmailSchedule.findAndCountAll({
    where,
    include: include as any,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  const items = rows.map((s: any) => ({
    id: s.id,
    status: s.status,
    scheduledAt: s.scheduledAt,
    sentAt: s.sentAt,
    errorMessage: s.errorMessage,
    contactEmail: s.contact?.email || "",
    contactName: s.contact?.name || "",
    campaignId: s.campaignId,
    campaignName: s.campaign?.name || "",
    subject: s.campaign?.subject || s.campaign?.template?.subject || "",
  }));

  const hasMore = count > offset + rows.length;
  return res.json({ items, count, hasMore });
};

export const cancel = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const sched = await EmailSchedule.findOne({ where: { id, companyId } });
  if (!sched) return res.status(404).json({ error: "SCHEDULE_NOT_FOUND" });
  if (["sent", "failed", "canceled"].includes(String(sched.status))) {
    return res.json({ ok: true, status: sched.status });
  }
  await sched.update({ status: "canceled", errorMessage: "Canceled by user", updatedAt: new Date() } as any);
  return res.json({ ok: true });
};

export const cancelAll = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { olderThanMinutes } = req.body as any;
  const where: any = { companyId, status: "scheduled" };
  if (olderThanMinutes && !Number.isNaN(Number(olderThanMinutes))) {
    const dt = new Date(Date.now() - Number(olderThanMinutes) * 60000);
    (where as any).scheduledAt = { [Op.lte]: dt };
  }
  const rows = await EmailSchedule.findAll({ where });
  for (const r of rows) {
    await r.update({ status: "canceled", errorMessage: "Bulk canceled", updatedAt: new Date() } as any);
  }
  return res.json({ ok: true, affected: rows.length });
};

export default { index, cancel, cancelAll };
