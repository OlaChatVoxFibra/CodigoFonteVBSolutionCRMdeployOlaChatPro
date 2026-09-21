/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { getIO } from "../../libs/socket";
import ChatMessage from "../../models/ChatMessage";
import User from "../../models/User";

interface Request {
  messageId: number;
  message: string;
  userId: number;
  companyId: number;
}

const EditMessageService = async ({
  messageId,
  message,
  userId,
  companyId
}: Request): Promise<ChatMessage> => {
  const chatMessage = await ChatMessage.findByPk(messageId, {
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
      }
    ]
  });

  if (!chatMessage) {
    throw new Error("Message not found");
  }

  if (chatMessage.senderId !== userId) {
    throw new Error("You can only edit your own messages");
  }

  await chatMessage.update({
    message,
    isEdited: true
  });

  const io = getIO();
  io.of(String(companyId)).emit(
    `company-${companyId}-chat-${chatMessage.chatId}`,
    {
      action: "edit-message",
      message: chatMessage
    }
  );

  return chatMessage;
};

export default EditMessageService;
