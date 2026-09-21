/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { delay, WAMessage } from "baileys";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import formatBody from "../../helpers/Mustache";
import Contact from "../../models/Contact";
import path from "path";
import fs from "fs";
import logger from "../../utils/logger";

// ✅ CORREÇÃO: Interface completa com todos os parâmetros usados
interface Request {
  ticket: Ticket;
  url?: string;
  caption?: string;
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

const SendWhatsAppMediaImage = async ({
  ticket,
  url,
  caption,
  msdelay
}: Request): Promise<WAMessage> => {
  const wbot = await GetTicketWbot(ticket);
  const contactNumber = await Contact.findByPk(ticket.contactId);

  // Sempre envie para o JID tradicional
  const jid = `${contactNumber.number}@${
    ticket.isGroup ? "g.us" : "s.whatsapp.net"
  }`;
  logger.info(`[RDS-LID] Enviando para JID tradicional: ${jid}`);

  // ✅ CORREÇÃO: Garantir caption seguro
  const safeCaption = caption || "";

  try {
    wbot.sendPresenceUpdate("available");

    // ✅ CORREÇÃO: Verificar se msdelay existe antes de usar
    if (msdelay && msdelay > 0) {
      await delay(msdelay);
    }

    const sentMessage = await wbot.sendMessage(`${jid}`, {
      image: url
        ? { url }
        : fs.readFileSync(
            `${publicFolder}/company${ticket.companyId}/${safeCaption}-${makeid(
              5
            )}.png`
          ),
      caption: formatBody(`${safeCaption}`, ticket),
      mimetype: "image/jpeg"
    });
    wbot.sendPresenceUpdate("unavailable");

    wbot.store(sentMessage);

    return sentMessage;
  } catch (err) {
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMediaImage;
