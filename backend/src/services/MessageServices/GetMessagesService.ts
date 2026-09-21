/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Message from "../../models/Message";

interface Request {
  id: string;
}

const GetMessageService = async ({ id }: Request): Promise<Message> => {
  const messageExists = await Message.findOne({
    where: { id }
  });

  if (!messageExists) {
    throw new AppError("MESSAGE_NOT_FIND");
  }

  return messageExists;
};

export default GetMessageService;
