/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";
import AppError from "../../errors/AppError";

interface Request {
  name: string;
  userIds: number[];
  companyId: number;
  groupAdminId?: number;
}

const CreateGroupService = async ({
  name,
  userIds,
  companyId,
  groupAdminId
}: Request): Promise<Chat> => {
  if (userIds.length < 2) {
    throw new AppError("ERR_GROUP_MUST_HAVE_AT_LEAST_2_USERS", 400);
  }

  const chat = await Chat.create({
    title: name,
    isGroup: true,
    groupName: name,
    groupAdminId,
    companyId
  });

  // Adiciona usuários ao grupo
  await Promise.all(
    userIds.map(userId =>
      ChatUser.create({
        chatId: chat.id,
        userId,
        companyId
      })
    )
  );

  return chat;
};

export default CreateGroupService;
