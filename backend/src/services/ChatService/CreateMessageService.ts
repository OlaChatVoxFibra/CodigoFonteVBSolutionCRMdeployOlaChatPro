/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Chat from "../../models/Chat";
import ChatMessage from "../../models/ChatMessage";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";

export interface ChatMessageData {
  senderId: number;
  chatId: number;
  message: string;
  mediaName?: string;
  mediaPath?: string;
  mediaType?: string;
  companyId?: number;
  replyToId?: number;
  forwardedFromId?: number;
}

export default async function CreateMessageService({
  senderId,
  chatId,
  message,
  mediaName,
  mediaPath,
  mediaType = "text",
  companyId,
  replyToId,
  forwardedFromId
}: ChatMessageData) {
  const newMessage = await ChatMessage.create({
    senderId,
    chatId,
    message,
    mediaName,
    mediaPath,
    mediaType,
    companyId,
    replyToId,
    forwardedFromId
  });

  await newMessage.reload({
    include: [
      { model: User, as: "sender", attributes: ["id", "name", "profileImage"] },
      {
        model: ChatMessage,
        as: "replyTo",
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "name", "profileImage"]
          }
        ],
        attributes: ["id", "message"]
      },
      {
        model: Chat,
        as: "chat",
        include: [{ model: ChatUser, as: "users" }]
      }
    ]
  });

  const sender = await User.findByPk(senderId);

  await newMessage.chat.update({
    lastMessage: `${sender.name}: ${mediaName != null ? mediaName : message}`,
    updatedAt: new Date()
  });

  const chatUsers = await ChatUser.findAll({
    where: { chatId }
  });

  for (let chatUser of chatUsers) {
    if (chatUser.userId === senderId) {
      await chatUser.update({ unreads: 0 });
    } else {
      await chatUser.update({ unreads: chatUser.unreads + 1 });
    }
  }

  return newMessage;
}
