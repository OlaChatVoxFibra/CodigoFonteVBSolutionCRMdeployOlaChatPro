/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Schedule from "../../models/Schedule";
import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import { channel } from "diagnostics_channel";

const ScheduleService = async (id: string | number, companyId: number): Promise<Schedule> => {
  const schedule = await Schedule.findByPk(id, {
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name"] },
      { model: User, as: "user", attributes: ["id", "name"] },
      { model: User, as: "ticketUser", attributes: ["id", "name"] },
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name", "channel", "color"] },
    ]
  });

  if (schedule?.companyId !== companyId) {
    throw new AppError("Não é possível excluir registro de outra empresa");
  }

  if (!schedule) {
    throw new AppError("ERR_NO_SCHEDULE_FOUND", 404);
  }

  return schedule;
};

export default ScheduleService;
