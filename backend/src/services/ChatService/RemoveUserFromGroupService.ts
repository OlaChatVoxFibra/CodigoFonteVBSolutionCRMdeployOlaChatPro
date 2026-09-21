/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";
import AppError from "../../errors/AppError";

interface Request {
  chatId: number;
  userId: number;
}

const RemoveUserFromGroupService = async ({
  chatId,
  userId
}: Request): Promise<void> => {
  const chat = await Chat.findByPk(chatId);

  if (!chat) {
    throw new AppError("ERR_CHAT_NOT_FOUND", 404);
  }

  if (!chat.isGroup) {
    throw new AppError("ERR_CHAT_IS_NOT_GROUP", 400);
  }

  if (chat.groupAdminId === userId) {
    throw new AppError("ERR_CANNOT_REMOVE_GROUP_ADMIN", 400);
  }

  await ChatUser.destroy({
    where: {
      chatId,
      userId
    }
  });
};

export default RemoveUserFromGroupService;
