/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import EmailCampaign from "../models/EmailCampaign";
import EmailTemplate from "../models/EmailTemplate";
import EmailSchedule from "../models/EmailSchedule";
import EmailContact from "../models/EmailContact";
import sequelize from "../database";
import { enqueueEmailSchedule } from "../emailQueues";
import { getIO } from "../libs/socket";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { pageNumber, searchParam, status } = req.query as any;
  const page = parseInt(pageNumber || "1");
  const limit = 20;
  const offset = (page - 1) * limit;
  const where: any = { companyId };
  if (searchParam) where.name = { [Op.iLike]: `%${searchParam}%` };
  if (status) where.status = status;
  const { rows, count } = await EmailCampaign.findAndCountAll({
    where,
    limit,
    offset,
    order: [["updatedAt", "DESC"]],
    include: [{ model: EmailTemplate, as: "template" }]
  });
  const hasMore = count > offset + rows.length;
  return res.json({ campaigns: rows, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const { templateId, name, subject, scheduledAt } = req.body;
  if (!templateId || !name) throw new AppError("INVALID_CAMPAIGN", 400);
  const template = await EmailTemplate.findOne({ where: { id: templateId, companyId } });
  if (!template) throw new AppError("TEMPLATE_NOT_FOUND", 404);
  const campaign = await EmailCampaign.create({
    companyId,
    templateId,
    name,
    subject: subject || template.subject,
    status: scheduledAt ? "scheduled" : "draft",
    scheduledAt: scheduledAt || null,
    createdBy: userId
  } as any);
  return res.status(201).json(campaign);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const campaign = await EmailCampaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new AppError("CAMPAIGN_NOT_FOUND", 404);
  const { templateId, name, subject, status, scheduledAt } = req.body;
  await campaign.update({ templateId, name, subject, status, scheduledAt });
  return res.json(campaign);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const campaign = await EmailCampaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new AppError("CAMPAIGN_NOT_FOUND", 404);
  await campaign.destroy();
  return res.status(204).send();
};

export const scheduleContacts = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const { contactIds, scheduledAt } = req.body as { contactIds: number[]; scheduledAt?: string };
  const campaign = await EmailCampaign.findOne({ where: { id, companyId } });
  if (!campaign) throw new AppError("CAMPAIGN_NOT_FOUND", 404);
  if (!Array.isArray(contactIds) || contactIds.length === 0) throw new AppError("INVALID_CONTACTS", 400);

  let createdSchedules: EmailSchedule[] = [];
  await sequelize.transaction(async t => {
    const contacts = await EmailContact.findAll({ where: { id: { [Op.in]: contactIds }, companyId }, transaction: t });
    if (contacts.length === 0) throw new AppError("CONTACTS_NOT_FOUND", 404);
    const rows = contacts.map(c => ({
      companyId,
      campaignId: campaign.id,
      contactId: c.id,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      status: "scheduled",
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    createdSchedules = await EmailSchedule.bulkCreate(rows as any, { transaction: t, returning: true }) as any;
    await campaign.update({ status: "scheduled", totalRecipients: contacts.length }, { transaction: t });
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-email`, { action: "scheduled", campaignId: campaign.id });

  try {
    await Promise.all(
      createdSchedules.map(s => enqueueEmailSchedule(s.id, s.scheduledAt || undefined))
    );
  } catch (err: any) {
    // enqueueEmailSchedule já registra fallback; evita falha 500 se um dos envios falhar após agendamento criado
    console.error("[EmailCampaign] enqueue schedules:", err?.message || err);
  }

  return res.json({ ok: true });
};
