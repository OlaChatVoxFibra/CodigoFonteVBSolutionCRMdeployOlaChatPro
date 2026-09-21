/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ContactListItem from "../../models/ContactListItem";
import AppError from "../../errors/AppError";

const DeleteService = async (id: string): Promise<void> => {
  const record = await ContactListItem.findOne({
    where: { id }
  });

  if (!record) {
    throw new AppError("ERR_NO_CONTACTLISTITEM_FOUND", 404);
  }

  await record.destroy();
};

export default DeleteService;
