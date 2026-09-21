/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Help from "../../models/Help";
import AppError from "../../errors/AppError";

const DeleteService = async (id: string): Promise<void> => {
  const record = await Help.findOne({
    where: { id }
  });

  if (!record) {
    throw new AppError("ERR_NO_HELP_FOUND", 404);
  }

  await record.destroy();
};

export default DeleteService;
