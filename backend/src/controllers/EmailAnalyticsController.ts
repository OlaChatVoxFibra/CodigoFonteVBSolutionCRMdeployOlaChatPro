/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { Op, fn, col, literal } from "sequelize";
import EmailAnalytics from "../models/EmailAnalytics";
import EmailLog from "../models/EmailLog";
import EmailCampaign from "../models/EmailCampaign";
import EmailTemplate from "../models/EmailTemplate";
import EmailContact from "../models/EmailContact";
import EmailSchedule from "../models/EmailSchedule";

export const summary = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const rec = await EmailAnalytics.findOne({ where: { companyId, date: dateStr } });
  const totalSent = rec?.totalSent || 0;
  const totalOpened = rec?.totalOpened || 0;
  const totalClicked = rec?.totalClicked || 0;
  const totalBounced = rec?.totalBounced || 0;
  const unsubscribeCount = rec?.unsubscribeCount || 0;
  const scheduled = await EmailSchedule.count({ where: { companyId, status: "scheduled" } as any });
  return res.json({ totalSent, totalOpened, totalClicked, totalBounced, unsubscribeCount, scheduled });
};

export const series = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { period } = req.query as any;
  const p = String(period || "week").toLowerCase();
  const limitDays = p === "year" || p === "ano" ? 365 : p === "month" || p === "mês" || p === "mes" ? 90 : 7;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const since = new Date(start.getTime() - (limitDays - 1) * 86400000);

  const rows = await EmailAnalytics.findAll({
    where: { companyId, date: { [Op.gte]: since.toISOString().slice(0, 10) } },
    order: [["date", "ASC"]]
  });

  const byDate: Record<string, EmailAnalytics> = {};
  for (const r of rows) byDate[String(r.date)] = r;

  const data: Array<{ date: string; label: string; value: number; totalSent: number }> = [];
  for (let i = 0; i < limitDays; i++) {
    const d = new Date(since.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const rec = byDate[key];
    const val = rec?.totalSent || 0;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    data.push({ date: key, label: `${dd}/${mm}`, value: val, totalSent: val });
  }

  return res.json({ data });
};

export const recent = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const logs = await EmailLog.findAll({
    where: { companyId },
    include: [{ model: EmailCampaign, as: "campaign", required: false }, { model: EmailContact, as: "contact", required: false }],
    limit: 20,
    order: [["createdAt", "DESC"]]
  });
  const items = logs.map(l => ({
    id: l.id,
    subject: l.campaign?.subject || "",
    sender: l.campaign?.name || "",
    date: l.sentAt || l.createdAt,
    status: l.bounceType ? "bounced" : l.clickedAt ? "clicked" : l.openedAt ? "opened" : l.sentAt ? "sent" : "pending",
    to: l.contact?.email || ""
  }));
  return res.json({ emails: items, count: items.length, hasMore: false });
};

