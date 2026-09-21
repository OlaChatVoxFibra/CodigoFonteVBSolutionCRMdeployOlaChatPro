/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { delay, WAMessage } from "baileys";
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import Contact from "../../models/Contact";
import { getWbot, Session } from "../../libs/wbot";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import CreateMessageService from "../MessageServices/CreateMessageService";
import logger from "../../utils/logger";
import { ENABLE_LID_DEBUG } from "../../config/debug";
import { normalizeJid } from "../../utils";
import { getJidOf } from "./getJidOf";

interface Request {
  body: string;
  whatsappId: number;
  contact: Contact;
  quotedMsg?: Message;
  msdelay?: number;
}

const SendWhatsAppMessage = async ({
  body,
  whatsappId,
  contact,
  quotedMsg,
  msdelay
}: Request): Promise<WAMessage> => {
  let options = {};
  const wbot = await getWbot(whatsappId);

  // Preferir LID nativo ou remoteJid válido; nunca tratar dígitos de LID como telefone
  let jid: string;
  const lid = String(contact.lid || "").trim();
  const phoneDigits = String(contact.number || "").replace(/\D/g, "");
  const lidDigits = lid.replace(/\D/g, "");

  if (lid.includes("@lid")) {
    jid = normalizeJid(lid);
  } else if (contact.remoteJid && contact.remoteJid.includes("@lid")) {
    jid = normalizeJid(contact.remoteJid);
  } else if (
    contact.remoteJid &&
    (contact.remoteJid.includes("@s.whatsapp.net") ||
      contact.remoteJid.includes("@g.us"))
  ) {
    jid = normalizeJid(contact.remoteJid);
  } else if (
    phoneDigits.length >= 10 &&
    phoneDigits.length <= 13 &&
    phoneDigits !== lidDigits
  ) {
    jid = normalizeJid(
      `${phoneDigits}@${contact.isGroup ? "g.us" : "s.whatsapp.net"}`
    );
  } else if (lidDigits) {
    jid = `${lidDigits}@lid`;
  } else {
    jid = getJidOf(contact);
  }

  if (ENABLE_LID_DEBUG) {
    logger.info(
      `[RDS-LID] SendMessageAPI - Enviando para JID normalizado: ${jid}`
    );
    logger.info(`[RDS-LID] SendMessageAPI - Contact lid: ${contact.lid}`);
    logger.info(
      `[RDS-LID] SendMessageAPI - Contact remoteJid: ${contact.remoteJid}`
    );
    logger.info(
      `[RDS-LID] SendMessageAPI - QuotedMsg: ${quotedMsg ? "SIM" : "NÃO"}`
    );
  }

  if (quotedMsg) {
    const quotedId: any = (quotedMsg as any)?.id ?? quotedMsg;
    let chatMessages: Message | null = null;
    if (quotedId !== undefined && quotedId !== null && String(quotedId).trim() !== "") {
      chatMessages = await Message.findOne({
        where: {
          id: quotedId
        }
      });
    }

    if (chatMessages) {
      const msgFound = JSON.parse(chatMessages.dataJson);

      options = {
        quoted: {
          key: msgFound.key,
          message: {
            extendedTextMessage: msgFound.message.extendedTextMessage
          }
        }
      };

      if (ENABLE_LID_DEBUG) {
        logger.info(
          `[RDS-LID] SendMessageAPI - ContextInfo configurado para resposta`
        );
      }
    }
  }

  try {
    // ✅ CORREÇÃO: Verificar se msdelay existe antes de usar
    if (msdelay && msdelay > 0) {
      await delay(msdelay);
    }

    const messageContent: any = {
      text: body
    };

    if (quotedMsg) {
      messageContent.contextInfo = {
        forwardingScore: 0,
        isForwarded: false
      };

      if (ENABLE_LID_DEBUG) {
        logger.info(
          `[RDS-LID] SendMessageAPI - ContextInfo adicionado para resposta`
        );
      }
    }

    const sentMessage = await wbot.sendMessage(jid, messageContent, {
      ...options
    });

    wbot.store(sentMessage);

    if (ENABLE_LID_DEBUG) {
      logger.info(
        `[RDS-LID] SendMessageAPI - Mensagem enviada com sucesso para ${jid}`
      );
    }

    const messageData = {
      wid: sentMessage.key.id,
      ticketId: undefined, // API não tem ticketId fixo no envio
      contactId: contact.id,
      body: body,
      fromMe: true,
      mediaType: "chat",
      read: true,
      quotedMsgId: quotedMsg?.id || null,
      ack: 2,
      remoteJid: jid,
      dataJson: JSON.stringify(sentMessage),
    };

    await CreateMessageService({ messageData, companyId: contact.companyId });

    // ✅ CORREÇÃO: Removido wbot.store duplicado

    return sentMessage;
  } catch (err) {
    Sentry.captureException(err);
    console.log(err);
    
    if (err instanceof AppError) {
      throw err;
    }
    
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
