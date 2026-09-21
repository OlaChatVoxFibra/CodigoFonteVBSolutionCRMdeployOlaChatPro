/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";

interface Data {
  ownerId: number;
  companyId: number;
  users: any[];
  title: string;
  description?: string;
  groupImage?: string;
  isGroup?: boolean;
}

const CreateService = async (data: Data): Promise<Chat> => {
  const {
    ownerId,
    companyId,
    users,
    title,
    description = "",
    groupImage = "",
    isGroup
  } = data;

  const record = await Chat.create({
    ownerId,
    companyId,
    title,
    isGroup: isGroup !== undefined ? isGroup : users.length > 1,
    groupName: users.length > 1 ? title : "",
    groupAdminId: ownerId,
    description,
    groupImage
  });

  if (Array.isArray(users) && users.length > 0) {
    await ChatUser.create({ chatId: record.id, userId: ownerId });
    for (let user of users) {
      if (user.id !== ownerId) {
        await ChatUser.create({ chatId: record.id, userId: user.id });
      }
    }
  }

  await record.reload({
    include: [
      { model: ChatUser, as: "users", include: [{ model: User, as: "user" }] },
      { model: User, as: "owner" }
    ]
  });

  return record;
};

export default CreateService;
