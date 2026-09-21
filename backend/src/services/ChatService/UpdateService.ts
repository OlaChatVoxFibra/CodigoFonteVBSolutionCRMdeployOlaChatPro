/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";

interface ChatData {
  id: number;
  title?: string;
  users?: any[];
  description?: string;
  groupImage?: string;
}

export default async function UpdateService(data: ChatData) {
  const { users } = data;
  const record = await Chat.findByPk(data.id, {
    include: [{ model: ChatUser, as: "users" }]
  });
  const { ownerId } = record;

  await record.update({
    title: data.title,
    description: data.description,
    groupImage: data.groupImage
  });

  if (Array.isArray(users)) {
    await ChatUser.destroy({ where: { chatId: record.id } });
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
}
