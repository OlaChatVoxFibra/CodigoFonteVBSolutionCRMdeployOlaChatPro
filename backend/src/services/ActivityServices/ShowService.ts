/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Activity from "../../models/Activity";
import AppError from "../../errors/AppError";

const ShowService = async (id: string | number): Promise<Activity> => {
  const record = await Activity.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_ACTIVITY_FOUND", 404);
  }

  return record;
};

export default ShowService;

