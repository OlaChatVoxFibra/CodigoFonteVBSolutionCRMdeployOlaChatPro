/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";

export interface MessageData {
  wid: string;
  ticketId: number;
  body: string;
  contactId?: number;
  fromMe?: boolean;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string;
  ack?: number;
  queueId?: number;
  channel?: string;
  ticketTrakingId?: number;
  isPrivate?: boolean;
  ticketImported?: any;
  isForwarded?: boolean;
  fromAgent?: boolean;
}
interface Request {
  messageData: MessageData;
  companyId: number;
}

const CreateMessageService = async ({
  messageData,
  companyId
}: Request): Promise<Message> => {
  
  const correctMediaType = (data: MessageData): MessageData => {
    // Se já tem mediaType definido como audio, manter
    if (data.mediaType === 'audio') {
      return data;
    }

    // Verificar se deveria ser áudio baseado na URL ou outros indicadores
    const shouldBeAudio = (data: MessageData): boolean => {
      // Verificar pela URL
      if (data.mediaUrl) {
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aac'];
        const url = data.mediaUrl.toLowerCase();
        if (audioExtensions.some(ext => url.includes(ext))) {
          return true;
        }
        
        // Verificar se tem padrão de nome de áudio
        if (url.includes('audio_')) {
          return true;
        }
      }

      // Verificar pelo body
      if (data.body && typeof data.body === 'string') {
        const body = data.body.toLowerCase();
        if (body.includes('áudio gravado') || body.includes('🎵 arquivo de áudio')) {
          return true;
        }
      }

      return false;
    };

    // Se deveria ser áudio, corrigir o tipo
    if (shouldBeAudio(data)) {
      console.log(`🎵 Corrigindo tipo de mídia de '${data.mediaType}' para 'audio'`);
      return {
        ...data,
        mediaType: 'audio'
      };
    }

    return data;
  };

  const correctedMessageData = correctMediaType(messageData);
  
  await Message.upsert({ ...correctedMessageData, companyId });

  if (correctedMessageData.fromAgent === true) {
    await Message.update(
      { fromAgent: true },
      { where: { wid: correctedMessageData.wid, companyId } }
    );
  }

  const message = await Message.findOne({
    where: {
      wid: correctedMessageData.wid,
      companyId
    },
    include: [
      "contact",
      {
        model: Ticket,
        as: "ticket",
        include: [
          {
            model: Contact,
            attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "urlPicture", "companyId"],
            include: ["extraInfo", "tags"]
          },
          {
            model: Queue,
            attributes: ["id", "name", "color"]
          },
          {
            model: Whatsapp,
            attributes: ["id", "name", "groupAsTicket", "color"]
          },
          {
            model: User,
            attributes: ["id", "name"]
          },
          {
            model: Tag,
            as: "tags",
            attributes: ["id", "name", "color"]
          }
        ]
      },
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new Error("ERR_CREATING_MESSAGE");
  }

  const io = getIO();

  if (!messageData?.ticketImported) {
    // JSON plano: instâncias Sequelize no emit às vezes chegam ao browser sem nested ticket/uuid,
    // e o MessagesList descarta o evento (sameTicket falso → mensagem "some" da UI em tempo real).
    const messagePlain = message.get({ plain: true }) as any;
    const ticketPlain = messagePlain?.ticket || null;
    const contactPlain =
      ticketPlain?.contact || messagePlain?.contact || null;
    io.of("/" + String(companyId))
      .emit(`company-${companyId}-appMessage`, {
        action: "create",
        message: messagePlain,
        ticket: ticketPlain,
        contact: contactPlain
      });
  }

  if (message.ticket.queueId !== null && message.queueId === null) {
    await message.update({ queueId: message.ticket.queueId });
  }

  if (message.isPrivate) {
    await message.update({ wid: `PVT${message.id}` });
    const ticket = await Ticket.findByPk(message.ticketId);
    if (ticket) {
      await ticket.update({ status: "open", isBot: true, useIntegration: true });
    }
  }

  return message;
};

export default CreateMessageService;
