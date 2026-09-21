/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Chat from "../../models/Chat";
import AppError from "../../errors/AppError";

const ShowService = async (id: string | number): Promise<Chat> => {
  const record = await Chat.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_CHAT_FOUND", 404);
  }

  return record;
};

export default ShowService;
