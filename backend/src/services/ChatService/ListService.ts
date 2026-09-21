/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";
import ChatMessage from "../../models/ChatMessage";

interface Request {
  ownerId: number;
  companyId?: number;
  pageNumber?: string;
}

interface ChatWithLastMessage extends ReturnType<Chat["toJSON"]> {
  lastMessage: ChatMessage | null;
}

interface Response {
  records: ChatWithLastMessage[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  ownerId,
  companyId,
  pageNumber = "1"
}: Request): Promise<Response> => {
  const chatUsers = await ChatUser.findAll({
    where: { userId: ownerId }
  });

  const chatIds = chatUsers.map(chat => chat.chatId);

  const limit = 100;
  const offset = limit * (+pageNumber - 1);

  const whereClause: any = {
    id: {
      [Op.in]: chatIds
    }
  };
  if (companyId) {
    whereClause.companyId = companyId;
  }

  const { count, rows: records } = await Chat.findAndCountAll({
    where: whereClause,
    include: [
      { model: User, as: "owner" },
      { model: ChatUser, as: "users", include: [{ model: User, as: "user" }] },
      {
        model: ChatMessage,
        as: "messages",
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "name", "profileImage"]
          },
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
      }
    ],
    limit,
    offset,
    order: [["updatedAt", "DESC"]]
  });

  const recordsWithLastMessage = await Promise.all(
    records.map(async chat => {
      const lastMessage = await ChatMessage.findOne({
        where: { chatId: chat.id },
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "name", "profileImage"]
          },
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
      return { ...chat.toJSON(), lastMessage };
    })
  );

  const hasMore = count > offset + records.length;

  return {
    records: recordsWithLastMessage,
    count,
    hasMore
  };
};

export default ListService;
