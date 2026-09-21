/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { delay, WAMessage, AnyMessageContent } from "baileys";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Ticket from "../../models/Ticket";
import fs from "fs";
import path from "path";
import Contact from "../../models/Contact";
import { getWbot } from "../../libs/wbot";
import logger from "../../utils/logger";
import { ENABLE_LID_DEBUG } from "../../config/debug";
import { normalizeJid } from "../../utils";

interface Request {
  whatsappId: number;
  contact: Contact;
  url: string;
  caption: string;
  msdelay?: number;
}

function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const SendWhatsAppMessageLink = async ({
  whatsappId,
  contact,
  url,
  caption,
  msdelay
}: Request): Promise<WAMessage> => {
  const wbot = await getWbot(whatsappId);

  // Construir o JID padrão e então normalizá-lo
  let jid = `${contact.number}@${
    contact.isGroup ? "g.us" : "s.whatsapp.net"
  }`;

  // Normalizar o JID para garantir formato correto
  jid = normalizeJid(jid);

  if (ENABLE_LID_DEBUG) {
    logger.info(
      `[RDS-LID] SendWhatsAppMessageLink - Enviando para JID normalizado: ${jid}`
    );
    logger.info(
      `[RDS-LID] SendWhatsAppMessageLink - Contact lid: ${contact.lid}`
    );
    logger.info(
      `[RDS-LID] SendWhatsAppMessageLink - Contact remoteJid: ${contact.remoteJid}`
    );
  }

  const name = caption.replace("/", "-");

  try {
    // ✅ CORREÇÃO: Verificar se msdelay existe antes de usar
    if (msdelay && msdelay > 0) {
      await delay(msdelay);
    }

    const sentMessage = await wbot.sendMessage(jid, {
      document: url
        ? { url }
        : fs.readFileSync(
            `${publicFolder}/company${contact.companyId}/${name}-${makeid(
              5
            )}.pdf`
          ),
      fileName: name,
      mimetype: "application/pdf"
    });

    wbot.store(sentMessage);

    return sentMessage;
  } catch (err) {
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessageLink;
