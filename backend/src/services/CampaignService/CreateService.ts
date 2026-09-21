/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import Whatsapp from "../../models/Whatsapp";
import User from "../../models/User";
import Queue from "../../models/Queue";

interface Data {
  name: string;
  status: string;
  confirmation: boolean;
  scheduledAt: string;
  companyId: number;
  contactListId: number;
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
  userId: number | string;
  queueId: number | string;
  statusTicket: string;
  openTicket: string;
  isRecurring?: boolean;
  recurrenceType?: string;
  recurrenceInterval?: number;
  recurrenceDaysOfWeek?: string;
  recurrenceDayOfMonth?: number;
  recurrenceEndDate?: string;
  maxExecutions?: number;
}

const CreateService = async (data: Data): Promise<Campaign> => {
  // "" / null do front (coerce de formulário) → string válida antes do Yup
  const safeName = String(data?.name ?? "").trim();
  if (safeName) {
    data.name = safeName;
  } else {
    data.name = `Campanha ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  }

  const { name } = data;

  const ticketnoteSchema = Yup.object().shape({
    name: Yup.string()
      .min(3, "ERR_CAMPAIGN_INVALID_NAME")
      .required("ERR_CAMPAIGN_REQUIRED")
  });

  try {
    await ticketnoteSchema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  if (data.scheduledAt != null && data.scheduledAt != "") {
    data.status = "PROGRAMADA";
  }

  const record = await Campaign.create(data);

  await record.reload({
    include: [
      { model: ContactList },
      { model: Whatsapp, attributes: ["id", "name", "color"] },
      { model: User, attributes: ["id", "name"] },
      { model: Queue, attributes: ["id", "name", "color"] },
        ]
  });

  return record;
};

export default CreateService;
