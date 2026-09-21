/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { getIO } from "../../libs/socket";
import ChatMessage from "../../models/ChatMessage";
import User from "../../models/User";
import CreateMessageService from "./CreateMessageService";

interface Request {
  messageId: number;
  targetChatId: number;
  userId: number;
  companyId: number;
}

const ForwardMessageService = async ({
  messageId,
  targetChatId,
  userId,
  companyId
}: Request): Promise<ChatMessage> => {
  const originalMessage = await ChatMessage.findByPk(messageId, {
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

  if (!originalMessage) {
    throw new Error("Original message not found");
  }

  const newMessage = await CreateMessageService({
    chatId: targetChatId,
    senderId: userId,
    message: originalMessage.message,
    mediaName: originalMessage.mediaName,
    mediaPath: originalMessage.mediaPath,
    mediaType: originalMessage.mediaType,
    companyId,
    forwardedFromId: originalMessage.id
  });

  const io = getIO();
  io.of(String(companyId)).emit(`company-${companyId}-chat-${targetChatId}`, {
    action: "new-message",
    message: newMessage
  });

  return newMessage;
};

export default ForwardMessageService;
