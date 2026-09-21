/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import ChatMessage from "../../models/ChatMessage";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";

import { sortBy } from "lodash";

interface Request {
  chatId: string;
  ownerId: number;
  pageNumber?: string;
}

interface Response {
  records: ChatMessage[];
  count: number;
  hasMore: boolean;
}

const FindMessages = async ({
  chatId,
  ownerId,
  pageNumber = "1"
}: Request): Promise<Response> => {
  // Removidos logs de debug

  const userInChat = await ChatUser.count({
    where: { chatId, userId: ownerId }
  });

  if (userInChat === 0) {
    throw new AppError("UNAUTHORIZED", 400);
  }

  // Verificar se existem mensagens neste chat
  const totalMessages = await ChatMessage.count({
    where: { chatId }
  });

  // Lógica de paginação simplificada
  const limit = 10; // Sempre carregar 10 mensagens por vez
  const page = parseInt(pageNumber) || 1;
  const offset = (page - 1) * limit;

  // Buscar mensagens paginadas
  const { count, rows: records } = await ChatMessage.findAndCountAll({
    where: {
      chatId
    },
    include: [
      {
        model: User,
        as: "sender",
        attributes: ["id", "name", "profileImage"]
      }
    ],
    limit,
    offset,
    order: [["createdAt", "DESC"]], // Buscar as mais recentes primeiro
    subQuery: false
  });

  // Buscar todas as replyToId que não vieram no resultado
  const replyToIds = records.map(msg => msg.replyToId).filter(id => !!id);

  // Buscar as mensagens replyTo
  let replyToMessages: ChatMessage[] = [];
  if (replyToIds.length > 0) {
    replyToMessages = await ChatMessage.findAll({
      where: { id: replyToIds },
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "name", "profileImage"]
          }
      ],
      attributes: ["id", "message", "mediaType", "mediaPath"]
    });
  }
  // Mapear por id para acesso rápido
  const replyToMap = new Map();
  replyToMessages.forEach(msg => {
    replyToMap.set(msg.id, msg);
  });

  // Atribuir manualmente o campo replyTo
  const recordsWithReply = records.map(msg => {
    const plain: any = msg.toJSON();
    if (msg.replyToId) {
      plain.replyTo = replyToMap.get(msg.replyToId) || null;
    } else {
      plain.replyTo = null;
    }
    return plain;
  });

  // Inverter para exibir do mais antigo para o mais novo
  const recordsOrdered: any[] = recordsWithReply.reverse();

  // Calcular se há mais mensagens para carregar
  const hasMore = count > offset + records.length;

  return {
    records: recordsOrdered,
    count,
    hasMore
  };
};

export default FindMessages;
