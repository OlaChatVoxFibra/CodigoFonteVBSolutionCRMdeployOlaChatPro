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
  userIds: number[];
  companyId: number;
}

const AddUsersToGroupService = async ({
  chatId,
  userIds,
  companyId
}: Request): Promise<void> => {
  const chat = await Chat.findByPk(chatId);

  if (!chat) {
    throw new AppError("ERR_CHAT_NOT_FOUND", 404);
  }

  if (!chat.isGroup) {
    throw new AppError("ERR_CHAT_IS_NOT_GROUP", 400);
  }

  await Promise.all(
    userIds.map(userId =>
      ChatUser.create({
        chatId,
        userId,
        companyId
      })
    )
  );
};

export default AddUsersToGroupService;
