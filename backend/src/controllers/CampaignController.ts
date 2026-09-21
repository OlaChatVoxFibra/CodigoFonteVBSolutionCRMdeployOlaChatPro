/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { head } from "lodash";
import fs from "fs";
import path from "path";

import ListService from "../services/CampaignService/ListService";
import CreateService from "../services/CampaignService/CreateService";
import ShowService from "../services/CampaignService/ShowService";
import UpdateService from "../services/CampaignService/UpdateService";
import DeleteService from "../services/CampaignService/DeleteService";
import FindService from "../services/CampaignService/FindService";
import ShippingService from "../services/CampaignService/ShippingService";
import CampaignStatsService from "../services/CampaignService/CampaignStatsService";

import Campaign from "../models/Campaign";

import ContactTag from "../models/ContactTag";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";

import AppError from "../errors/AppError";
import { CancelService } from "../services/CampaignService/CancelService";
import { RestartService } from "../services/CampaignService/RestartService";
import RecurrenceService from "../services/CampaignService/RecurrenceService";
import { campaignQueue } from "../queues";
import { Op, fn, col } from "sequelize";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  pageSize?: string;
  companyId: string | number;
  status?: string;
  isRecurring?: string;
};

// src/controllers/CampaignController.ts - Type StoreData completo

type StoreData = {
  name: string;
  message1?: string;
  message2?: string;
  message3?: string;
  message4?: string;
  message5?: string;
  confirmationMessage1?: string;
  confirmationMessage2?: string;
  confirmationMessage3?: string;
  confirmationMessage4?: string;
  confirmationMessage5?: string;
  status?: string;
  confirmation: boolean;
  scheduledAt: string;
  companyId: number;
  contactListId?: number | null;
  tagListId?: number | string | null;
  userId?: number | string | null;
  queueId?: number | string | null;
  whatsappId: number;
  statusTicket: string;
  openTicket: string;
  // Novos campos de recorrência
  isRecurring?: boolean;
  recurrenceType?: string | null;
  recurrenceInterval?: number | null;
  recurrenceDaysOfWeek?: number[] | string | null; // Aceita array do frontend ou string do banco
  recurrenceDayOfMonth?: number | null;
  recurrenceEndDate?: string | null;
  maxExecutions?: number | null;
  executionCount?: number;
  nextScheduledAt?: Date | null;
  lastExecutedAt?: Date | null;
  metaTemplateQuickMessageId?: number | null;
  metaTemplateVariables?: string | null;
};

type FindParams = {
  companyId: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber, pageSize, status, isRecurring } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { records, count, hasMore, totalPages, currentPage, pageSize: limit } = await ListService({
    searchParam,
    pageNumber,
    pageSize,
    companyId,
    status,
    isRecurring
  });

  return res.json({ records, count, hasMore, totalPages, currentPage, pageSize: limit });
};

export const metrics = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user as any;
  const rows = await Campaign.findAll({
    attributes: ["status", [fn("COUNT", col("Campaign.id")), "count"]],
    where: { companyId },
    group: ["Campaign.status"],
    raw: true
  });
  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of rows as any[]) {
    const c = Number(row.count) || 0;
    byStatus[row.status] = c;
    total += c;
  }
  return res.status(200).json({ total, byStatus });
};

// src/controllers/CampaignController.ts - Store method completo

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    confirmation: Yup.boolean().required(),
    scheduledAt: Yup.string().required(),
    contactListId: Yup.number().nullable(),
    tagListId: Yup.string().nullable(),
    whatsappId: Yup.number().required(),
    userId: Yup.number().nullable(),
    queueId: Yup.number().nullable(),
    statusTicket: Yup.string().required(),
    openTicket: Yup.string().required(),
    // Validação de recorrência
    isRecurring: Yup.boolean().default(false),
    recurrenceType: Yup.string().when('isRecurring', {
      is: true,
      then: Yup.string().oneOf(['minutely', 'hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']).required(),
      otherwise: Yup.string().nullable()
    }),
    recurrenceInterval: Yup.number().when('isRecurring', {
      is: true,
      then: Yup.number().min(1).required(),
      otherwise: Yup.number().nullable()
    }),
    recurrenceDaysOfWeek: Yup.mixed().nullable(), // Mixed para aceitar array ou string
    recurrenceDayOfMonth: Yup.number().when(['isRecurring', 'recurrenceType'], {
      is: (isRecurring, recurrenceType) => isRecurring && recurrenceType === 'monthly',
      then: Yup.number().min(1).max(31).required(),
      otherwise: Yup.number().nullable()
    }),
    recurrenceEndDate: Yup.date().when('isRecurring', {
      is: true,
      then: Yup.date().min(new Date(), 'Data final deve ser futura').nullable(),
      otherwise: Yup.date().nullable()
    }),
    maxExecutions: Yup.number().when('isRecurring', {
      is: true,
      then: Yup.number().min(1).nullable(),
      otherwise: Yup.number().nullable()
    })
  });

  try {
    const {
      name,
      message1,
      message2,
      message3,
      message4,
      message5,
      confirmationMessage1,
      confirmationMessage2,
      confirmationMessage3,
      confirmationMessage4,
      confirmationMessage5,
      confirmation,
      scheduledAt,
      contactListId,
      tagListId,
      whatsappId,
      userId,
      queueId,
      statusTicket,
      openTicket,
      // Novos campos de recorrência
      isRecurring,
      recurrenceType,
      recurrenceInterval,
      recurrenceDaysOfWeek,
      recurrenceDayOfMonth,
      recurrenceEndDate,
      maxExecutions,
      metaTemplateQuickMessageId,
      metaTemplateVariables
    }: StoreData = req.body;

    console.log('[Campaign Store] Dados recebidos:', {
      isRecurring,
      recurrenceType,
      recurrenceDaysOfWeek,
      recurrenceDaysOfWeekType: typeof recurrenceDaysOfWeek,
      recurrenceDaysOfWeekIsArray: Array.isArray(recurrenceDaysOfWeek)
    });

    // Processar dados de recorrência com logs
    const processedRecurrenceData = {
      isRecurring: isRecurring || false,
      recurrenceType: isRecurring ? recurrenceType : null,
      recurrenceInterval: isRecurring ? (recurrenceInterval || 1) : null,
      recurrenceDaysOfWeek: (() => {
        if (!isRecurring) return null;
        if (!recurrenceDaysOfWeek) return null;
        if (Array.isArray(recurrenceDaysOfWeek)) {
          return recurrenceDaysOfWeek.length > 0 ? JSON.stringify(recurrenceDaysOfWeek) : null;
        }
        if (typeof recurrenceDaysOfWeek === 'string') {
          return recurrenceDaysOfWeek;
        }
        return null;
      })(),
      recurrenceDayOfMonth: (isRecurring && recurrenceType === 'monthly') ? recurrenceDayOfMonth : null,
      recurrenceEndDate: (isRecurring && recurrenceEndDate) ? new Date(recurrenceEndDate) : null,
      maxExecutions: (isRecurring && maxExecutions) ? maxExecutions : null,
      executionCount: 0,
      nextScheduledAt: null,
      lastExecutedAt: null
    };

    console.log('[Campaign Store] Dados processados:', processedRecurrenceData);

    const processedData = {
      name,
      message1: message1 || null,
      message2: message2 || null,
      message3: message3 || null,
      message4: message4 || null,
      message5: message5 || null,
      confirmationMessage1: confirmationMessage1 || null,
      confirmationMessage2: confirmationMessage2 || null,
      confirmationMessage3: confirmationMessage3 || null,
      confirmationMessage4: confirmationMessage4 || null,
      confirmationMessage5: confirmationMessage5 || null,
      confirmation,
      scheduledAt,
      contactListId: contactListId || null,
      tagListId: tagListId === "Nenhuma" ? null : tagListId,
      whatsappId,
      userId: userId || null,
      queueId: queueId || null,
      statusTicket,
      openTicket,
      companyId,
      status: "PROGRAMADA",
      metaTemplateQuickMessageId: metaTemplateQuickMessageId || null,
      metaTemplateVariables: metaTemplateVariables || null,
      // Adicionar campos de recorrência processados
      ...processedRecurrenceData
    };

    await schema.validate(processedData);

    const campaign = await Campaign.create(processedData);

    console.log('[Campaign Store] Campanha criada:', campaign.id);

    // Log detalhado com informações da lista/tag
    let totalContacts = 0;
    if (campaign.contactListId) {
      // Buscar total de contatos na lista
      totalContacts = await ContactListItem.count({
        where: { contactListId: campaign.contactListId }
      });
      console.log(`[Campaign Store] Campanha por lista - Total de contatos: ${totalContacts}`);
    } else if (campaign.tagListId) {
      // Buscar total de contatos na tag
      totalContacts = await ContactTag.count({
        where: { tagId: campaign.tagListId },
        include: [{
          model: Contact,
          as: "contact",
          where: { companyId: campaign.companyId, active: true },
          required: true
        }]
      });
      console.log(`[Campaign Store] Campanha por tag - Total de contatos: ${totalContacts}`);
    }

    // Se for recorrente, calcular próxima execução
    if (campaign.isRecurring) {
      console.log('[Campaign Store] Configurando próxima execução para campanha recorrente');
      await RecurrenceService.scheduleNextExecution(campaign.id);
    }

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-campaign`, {
        action: "create",
        record: campaign
      });

    return res.status(200).json(campaign);
  } catch (err: any) {
    console.error('[Campaign Store] Erro:', err.message);
    throw new AppError(err.message);
  }
};

// Update method também precisa ser atualizado
export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { campaignId } = req.params;

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    confirmation: Yup.boolean().required(),
    scheduledAt: Yup.string().required(),
    contactListId: Yup.number().nullable(),
    tagListId: Yup.string().nullable(),
    whatsappId: Yup.number().required(),
    userId: Yup.number().nullable(),
    queueId: Yup.number().nullable(),
    statusTicket: Yup.string().required(),
    openTicket: Yup.string().required(),
    // Validação de recorrência
    isRecurring: Yup.boolean().default(false),
    recurrenceType: Yup.string().when('isRecurring', {
      is: true,
      then: Yup.string().oneOf(['minutely', 'hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']).required(),
      otherwise: Yup.string().nullable()
    }),
    recurrenceInterval: Yup.number().when('isRecurring', {
      is: true,
      then: Yup.number().min(1).required(),
      otherwise: Yup.number().nullable()
    }),
    recurrenceDaysOfWeek: Yup.mixed().nullable(),
    recurrenceDayOfMonth: Yup.number().when(['isRecurring', 'recurrenceType'], {
      is: (isRecurring, recurrenceType) => isRecurring && recurrenceType === 'monthly',
      then: Yup.number().min(1).max(31).required(),
      otherwise: Yup.number().nullable()
    }),
    recurrenceEndDate: Yup.date().when('isRecurring', {
      is: true,
      then: Yup.date().min(new Date(), 'Data final deve ser futura').nullable(),
      otherwise: Yup.date().nullable()
    }),
    maxExecutions: Yup.number().when('isRecurring', {
      is: true,
      then: Yup.number().min(1).nullable(),
      otherwise: Yup.number().nullable()
    })
  });

  try {
    const {
      name,
      message1,
      message2,
      message3,
      message4,
      message5,
      confirmationMessage1,
      confirmationMessage2,
      confirmationMessage3,
      confirmationMessage4,
      confirmationMessage5,
      confirmation,
      scheduledAt,
      contactListId,
      tagListId,
      whatsappId,
      userId,
      queueId,
      statusTicket,
      openTicket,
      // Novos campos de recorrência
      isRecurring,
      recurrenceType,
      recurrenceInterval,
      recurrenceDaysOfWeek,
      recurrenceDayOfMonth,
      recurrenceEndDate,
      maxExecutions,
      metaTemplateQuickMessageId,
      metaTemplateVariables
    }: StoreData = req.body;

    console.log('[Campaign Update] Dados recebidos:', {
      campaignId,
      isRecurring,
      recurrenceType,
      recurrenceDaysOfWeek,
      recurrenceDaysOfWeekType: typeof recurrenceDaysOfWeek,
      recurrenceDaysOfWeekIsArray: Array.isArray(recurrenceDaysOfWeek)
    });

    // Processar dados de recorrência
    const processedRecurrenceData = {
      isRecurring: isRecurring || false,
      recurrenceType: isRecurring ? recurrenceType : null,
      recurrenceInterval: isRecurring ? (recurrenceInterval || 1) : null,
      recurrenceDaysOfWeek: (() => {
        if (!isRecurring) return null;
        if (!recurrenceDaysOfWeek) return null;
        if (Array.isArray(recurrenceDaysOfWeek)) {
          return recurrenceDaysOfWeek.length > 0 ? JSON.stringify(recurrenceDaysOfWeek) : null;
        }
        if (typeof recurrenceDaysOfWeek === 'string') {
          return recurrenceDaysOfWeek;
        }
        return null;
      })(),
      recurrenceDayOfMonth: (isRecurring && recurrenceType === 'monthly') ? recurrenceDayOfMonth : null,
      recurrenceEndDate: (isRecurring && recurrenceEndDate) ? new Date(recurrenceEndDate) : null,
      maxExecutions: (isRecurring && maxExecutions) ? maxExecutions : null
    };

    const processedData = {
      name,
      message1: message1 || null,
      message2: message2 || null,
      message3: message3 || null,
      message4: message4 || null,
      message5: message5 || null,
      confirmationMessage1: confirmationMessage1 || null,
      confirmationMessage2: confirmationMessage2 || null,
      confirmationMessage3: confirmationMessage3 || null,
      confirmationMessage4: confirmationMessage4 || null,
      confirmationMessage5: confirmationMessage5 || null,
      confirmation,
      scheduledAt,
      contactListId: contactListId || null,
      tagListId: tagListId === "Nenhuma" ? null : tagListId,
      whatsappId,
      userId: userId || null,
      queueId: queueId || null,
      statusTicket,
      openTicket,
      companyId,
      metaTemplateQuickMessageId: metaTemplateQuickMessageId || null,
      metaTemplateVariables: metaTemplateVariables || null,
      // Adicionar campos de recorrência processados
      ...processedRecurrenceData
    };

    await schema.validate(processedData);

    const campaign = await Campaign.findOne({
      where: { id: campaignId, companyId },
      attributes: { exclude: ["createdAt", "updatedAt"] }
    });

    if (!campaign) {
      throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
    }

    await campaign.update(processedData);

    console.log('[Campaign Update] Campanha atualizada:', campaign.id);

    // Se for recorrente, recalcular próxima execução
    if (campaign.isRecurring) {
      console.log('[Campaign Update] Reconfigurando próxima execução para campanha recorrente');
      await RecurrenceService.scheduleNextExecution(campaign.id);
    }

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-campaign`, {
        action: "update",
        record: campaign
      });

    return res.status(200).json(campaign);
  } catch (err: any) {
    console.error('[Campaign Update] Erro:', err.message);
    throw new AppError(err.message);
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowService(id);

  return res.status(200).json(record);
};

export const cancel = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  await CancelService(+id);

  return res.status(204).json({ message: "Cancelamento realizado" });
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  await RestartService(+id);

  return res.status(204).json({ message: "Reinício dos disparos" });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteService(id);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-campaign`, {
      action: "delete",
      id
    });

  return res.status(200).json({ message: "Campaign deleted" });
};

export const sendNow = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params as any;
    const { companyId } = req.user as any;
    const body = (req.body || {}) as { messageIntervalSeconds?: number };
    const messageIntervalSeconds = Math.min(300, Math.max(10, Number(body.messageIntervalSeconds) || 30));
    const campaign = await Campaign.findByPk(id);
    if (!campaign) {
      throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
    }
    if (campaign.companyId !== +companyId) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }

    const campaignIdNum = Number(campaign.id);
    const pendingJobs = [
      ...(await campaignQueue.getWaiting()),
      ...(await campaignQueue.getDelayed()),
      ...(await campaignQueue.getActive())
    ];
    const alreadyQueued = pendingJobs.some(
      (job) =>
        job.name === "ProcessCampaign" && Number((job.data as any)?.id) === campaignIdNum
    );
    if (alreadyQueued) {
      return res.status(200).json({ ok: true, alreadyQueued: true });
    }

    await campaign.update({
      status: "EM_ANDAMENTO",
      scheduledAt: new Date(),
      nextScheduledAt: null
    });
    await campaignQueue.add(
      "ProcessCampaign",
      {
        id: campaign.id,
        restartMode: true,
        messageInterval: messageIntervalSeconds,
        longerIntervalAfter: 999999,
        greaterInterval: messageIntervalSeconds
      },
      {
        priority: 1,
        removeOnComplete: { age: 3600, count: 10 },
        removeOnFail: { age: 3600, count: 10 }
      }
    );
    const io = getIO();
    io.of(`/${companyId}`).emit(`company-${companyId}-campaign`, {
      action: "update",
      record: campaign
    });
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};
export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const params = req.query as FindParams;
  const records: Campaign[] = await FindService(params);

  return res.status(200).json(records);
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    const campaign = await Campaign.findByPk(id);
    campaign.mediaPath = file.filename;
    campaign.mediaName = file.originalname;
    await campaign.save();
    return res.send({ mensagem: "Mensagem enviada" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  try {
    const campaign = await Campaign.findByPk(id);
    const filePath = path.resolve("public", `company${companyId}`, campaign.mediaPath);
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
      fs.unlinkSync(filePath);
    }

    campaign.mediaPath = null;
    campaign.mediaName = null;
    await campaign.save();
    return res.send({ mensagem: "Arquivo excluído" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const previewRecurrence = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { recurrenceType, recurrenceInterval, recurrenceDaysOfWeek, recurrenceDayOfMonth } = req.query;

  try {
    const campaign = await Campaign.findByPk(id);
    if (!campaign) {
      throw new AppError("Campanha não encontrada", 404);
    }

    const config = {
      type: recurrenceType as string,
      interval: parseInt(recurrenceInterval as string),
      daysOfWeek: recurrenceDaysOfWeek ? JSON.parse(recurrenceDaysOfWeek as string) : undefined,
      dayOfMonth: recurrenceDayOfMonth ? parseInt(recurrenceDayOfMonth as string) : undefined
    };

    const executions = [];
    let currentDate = new Date(campaign.scheduledAt);
    
    for (let i = 0; i < 10; i++) { // Preview das próximas 10 execuções
      executions.push(new Date(currentDate));
      currentDate = RecurrenceService.calculateNextExecution(currentDate, config);
    }

    return res.json({ executions });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const stopRecurrence = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  try {
    const campaign = await Campaign.findByPk(id);
    if (!campaign) {
      throw new AppError("Campanha não encontrada", 404);
    }

    await campaign.update({
      isRecurring: false,
      nextScheduledAt: null,
      status: campaign.status === 'PROGRAMADA' ? 'FINALIZADA' : campaign.status
    });

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-campaign`, {
        action: "update",
        record: campaign
      });

    return res.status(200).json({ message: "Recorrência interrompida com sucesso" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

// Endpoint rápido só para contar destinatários (lista ou tag) - usado no alerta de progresso
export const getRecipientsCount = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { companyId } = req.user as any;
    const campaign = await Campaign.findByPk(id, {
      attributes: ["id", "contactListId", "tagListId", "companyId"]
    });
    if (!campaign || campaign.companyId !== +companyId) {
      return res.status(404).json({ count: 0 });
    }
    let count = 0;
    if (campaign.contactListId) {
      count = await ContactListItem.count({
        where: { contactListId: campaign.contactListId }
      });
    } else if (campaign.tagListId) {
      const contactIds = await ContactTag.findAll({
        where: { tagId: campaign.tagListId },
        attributes: ["contactId"]
      });
      const ids = contactIds.map((ct: any) => ct.contactId);
      if (ids.length > 0) {
        count = await Contact.count({
          where: { id: { [Op.in]: ids }, companyId: campaign.companyId, active: true }
        });
      }
    }
    return res.status(200).json({ count });
  } catch (err: any) {
    console.error("getRecipientsCount:", err);
    return res.status(500).json({ count: 0 });
  }
};

// Novo endpoint para dados de shipping com paginação
export const getShipping = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { page = 1, pageSize = 50, searchParam, status } = req.query;

  try {
    const result = await ShippingService({
      campaignId: id,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      searchParam: searchParam as string,
      status: status as 'delivered' | 'pending' | 'failed'
    });

    return res.status(200).json(result);
  } catch (err: any) {
    console.error("Erro ao buscar dados de shipping:", err);
    throw new AppError(err.message || "Erro interno do servidor", 500);
  }
};

// Novo endpoint para estatísticas da campanha
export const getStats = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  try {
    const stats = await CampaignStatsService(id);
    return res.status(200).json(stats);
  } catch (err: any) {
    console.error("Erro ao buscar estatísticas da campanha:", err);
    throw new AppError(err.message || "Erro interno do servidor", 500);
  }
};
