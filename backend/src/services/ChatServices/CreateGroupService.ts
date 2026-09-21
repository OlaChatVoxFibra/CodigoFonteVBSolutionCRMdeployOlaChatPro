/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";

interface Request {
  name: string;
  userIds: number[];
  companyId: number;
  groupAdminId: number;
}

const CreateGroupService = async ({
  name,
  userIds,
  companyId,
  groupAdminId
}: Request): Promise<Chat> => {
  const chat = await Chat.create({
    title: name,
    isGroup: true,
    groupName: name,
    groupAdminId,
    companyId
  });

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
