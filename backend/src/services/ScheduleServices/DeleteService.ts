/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Schedule from "../../models/Schedule";
import AppError from "../../errors/AppError";

const DeleteService = async (id: string | number, companyId: number): Promise<void> => {
  const schedule = await Schedule.findOne({
    where: { id, companyId }
  });

  if (!schedule) {
    throw new AppError("ERR_NO_SCHEDULE_FOUND", 404);
  }

  await schedule.destroy();
};

export default DeleteService;
