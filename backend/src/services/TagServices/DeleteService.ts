/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Tag from "../../models/Tag";
import AppError from "../../errors/AppError";

const DeleteService = async (id: string | number): Promise<void> => {
  const tag = await Tag.findOne({
    where: { id }
  });

  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  await tag.destroy();
};

export default DeleteService;
