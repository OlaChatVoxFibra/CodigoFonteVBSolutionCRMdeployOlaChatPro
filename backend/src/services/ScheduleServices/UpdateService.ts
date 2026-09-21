/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import ShowService from "./ShowService";

interface ScheduleData {
  id?: number;
  body?: string;
  sendAt?: string;
  sentAt?: string;
  contactId?: number;
  companyId?: number;
  ticketId?: number;
  userId?: number;
  ticketUserId?: number | string;
  queueId?: number | string;
  openTicket?: string;
  statusTicket?: string;
  whatsappId?: number | string;
  intervalo?: number;
  valorIntervalo?: number;
  enviarQuantasVezes?: number;
  tipoDias?: number;
  assinar?: boolean;
  // ✅ Campos de lembrete
  reminderDate?: string;
}

interface Request {
  scheduleData: ScheduleData;
  id: string | number;
  companyId: number;
}

const UpdateUserService = async ({
  scheduleData,
  id,
  companyId
}: Request): Promise<Schedule | undefined> => {
  const schedule = await ShowService(id, companyId);

  if (schedule?.companyId !== companyId) {
    throw new AppError("Não é possível alterar registros de outra empresa");
  }

  const schema = Yup.object().shape({
    body: Yup.string().min(5)
  });

  const {
    body,
    sendAt,
    sentAt,
    contactId,
    ticketId,
    userId,
    ticketUserId,
    queueId,
    openTicket,
    statusTicket,
    whatsappId,
    intervalo,
    valorIntervalo,
    enviarQuantasVezes,
    tipoDias,
    assinar,
    // ✅ Campos de lembrete
    reminderDate
  } = scheduleData;

  try {
    await schema.validate({ body });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await schedule.update({
    body,
    sendAt,
    sentAt,
    contactId,
    ticketId,
    userId,
    ticketUserId,
    queueId,
    openTicket,
    statusTicket,
    whatsappId,
    intervalo,
    valorIntervalo,
    enviarQuantasVezes,
    tipoDias,
    assinar,
    // ✅ Se tem lembrete, não marcar como PENDENTE para não ser processado no horário original
    status: reminderDate ? 'AGUARDANDO_LEMBRETE' : 'PENDENTE',
    // ✅ Incluir campos de lembrete
    reminderDate: reminderDate || null,
    reminderMessage: null, // Não usar mais o campo reminderMessage
    reminderStatus: reminderDate ? 'PENDENTE' : null
  });

  await schedule.reload();
  return schedule;
};

export default UpdateUserService;
