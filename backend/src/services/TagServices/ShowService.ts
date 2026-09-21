/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Tag from "../../models/Tag";
import AppError from "../../errors/AppError";

const TagService = async (id: string | number): Promise<Tag> => {
  const tag = await Tag.findByPk(id, { include: [ "contacts"] });

  if (!tag) {
    throw new AppError("ERR_NO_TAG_FOUND", 404);
  }

  return tag;
};

export default TagService;
