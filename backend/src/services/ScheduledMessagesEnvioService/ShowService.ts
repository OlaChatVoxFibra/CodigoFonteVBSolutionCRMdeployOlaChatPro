/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ScheduledMessages from "../../models/ScheduledMessages";
import AppError from "../../errors/AppError";

const ScheduleService = async (id: string | number): Promise<ScheduledMessages> => {
  const schedule = await ScheduledMessages.findByPk(id);

  if (!schedule) {
    throw new AppError("ERR_NO_SCHEDULE_FOUND", 404);
  }

  return schedule;
};

export default ScheduleService;
