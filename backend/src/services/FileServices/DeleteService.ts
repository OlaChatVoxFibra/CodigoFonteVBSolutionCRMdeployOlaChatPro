/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Files from "../../models/Files";
import AppError from "../../errors/AppError";

const DeleteService = async (id: string | number, companyId: number): Promise<void> => {
  const file = await Files.findOne({
    where: { id, companyId }
  });

  if (!file) {
    throw new AppError("ERR_NO_RATING_FOUND", 404);
  }

  await file.destroy();
};

export default DeleteService;
