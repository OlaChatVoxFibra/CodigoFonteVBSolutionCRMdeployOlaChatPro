/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";

interface Request {
  body: string;
  sendAt: string;
  contactId: number | string;
  companyId: number | string;
  userId?: number | string;
  ticketUserId?: number | string;
  queueId?: number | string;
  openTicket?: string;
  statusTicket?: string;
  whatsappId?: number | string;
  ticketId?: number | string;
  intervalo?: number;
  valorIntervalo?: number;
  enviarQuantasVezes?: number;
  tipoDias?: number;
  contadorEnvio?: number;
  assinar?: boolean;
  // ✅ Campos de lembrete
  reminderDate?: string;
}

const CreateService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId,
  ticketUserId,
  queueId,
  openTicket,
  statusTicket,
  whatsappId,
  ticketId,
  intervalo,
  valorIntervalo,
  enviarQuantasVezes,
  tipoDias,
  assinar,
  contadorEnvio,
  // ✅ Campos de lembrete
  reminderDate
}: Request): Promise<Schedule> => {
  const schema = Yup.object().shape({
    body: Yup.string().required().min(5),
    sendAt: Yup.string().required()
  });

  try {
    await schema.validate({ body, sendAt });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const createPayload: Record<string, unknown> = {
    body,
    sendAt,
    contactId,
    companyId,
    userId,
    // ✅ Se tem lembrete, não marcar como PENDENTE para não ser processado no horário original
    status: reminderDate ? "AGUARDANDO_LEMBRETE" : "PENDENTE",
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
    contadorEnvio,
    // ✅ Incluir campos de lembrete
    reminderDate: reminderDate || null,
    reminderMessage: null, // Não usar mais o campo reminderMessage
    reminderStatus: reminderDate ? "PENDENTE" : null
  };
  if (ticketId != null && ticketId !== "") {
    createPayload.ticketId = ticketId;
  }

  const schedule = await Schedule.create(createPayload as any);

  await schedule.reload();

  return schedule;
};

export default CreateService;
