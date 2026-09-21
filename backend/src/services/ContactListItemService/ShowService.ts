/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ContactListItem from "../../models/ContactListItem";
import AppError from "../../errors/AppError";

const ShowService = async (id: string | number): Promise<ContactListItem> => {
  const record = await ContactListItem.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_CONTACTLISTITEM_FOUND", 404);
  }

  return record;
};

export default ShowService;
