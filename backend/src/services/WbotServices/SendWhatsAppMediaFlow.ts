/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  WAMessage,
  AnyMessageContent,
  delay,
  WAPresence
} from "baileys";
import * as Sentry from "@sentry/node";
import fs from "fs";
import { exec } from "child_process";
import path from "path";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import mime from "mime-types";
import Contact from "../../models/Contact";
import { getWbot } from "../../libs/wbot";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import logger from "../../utils/logger";
import { ENABLE_LID_DEBUG } from "../../config/debug";

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

interface RequestFlow {
  media: string;
  ticket: Ticket;
  whatsappId: number;
  body?: string;
  isFlow?: boolean;
  isRecord?: boolean;
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

const processAudio = async (audio: string): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i ${audio} -vn -ab 128k -ar 44100 -f ipod ${outputAudio} -y`,
      (error, _stdout, _stderr) => {
        if (error) reject(error);
        //fs.unlinkSync(audio);
        resolve(outputAudio);
      }
    );
  });
};

const processAudioFile = async (audio: string): Promise<string> => {
  const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
  return new Promise((resolve, reject) => {
    exec(
      `${ffmpegPath.path} -i ${audio} -vn -ar 44100 -ac 2 -b:a 192k ${outputAudio}`,
      (error, _stdout, _stderr) => {
        if (error) reject(error);
        //fs.unlinkSync(audio);
        resolve(outputAudio);
      }
    );
  });
};

const nameFileDiscovery = (pathMedia: string) => {
  const spliting = pathMedia.split("/");
  const first = spliting[spliting.length - 1];
  return first.split(".")[0];
};

export const typeSimulation = async (ticket: Ticket, presence: WAPresence) => {
  const wbot = await GetTicketWbot(ticket);

  const contact = await Contact.findOne({
    where: {
      id: ticket.contactId
    }
  });

  // ✅ CORREÇÃO: Verificar se contact existe
  if (!contact) {
    logger.error(`[SendWhatsAppMediaFlow] Contato não encontrado para ticket ${ticket.id}`);
    return;
  }

  const jid = `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;

  await wbot.sendPresenceUpdate(presence, jid);
  await delay(5000);
  await wbot.sendPresenceUpdate("paused", jid);
};

const SendWhatsAppMediaFlow = async ({
  media,
  ticket,
  whatsappId,
  body,
  isFlow = false,
  isRecord = false
}: RequestFlow): Promise<WAMessage> => {
  try {
    const wbot = await getWbot(whatsappId);

    // ✅ CORREÇÃO: Verificar se mimetype é válido
    const mimetype = mime.lookup(media);
    if (!mimetype) {
      throw new AppError("ERR_INVALID_MEDIA_TYPE");
    }

    const pathMedia = media;
    const typeMessage = mimetype.split("/")[0];
    const mediaName = nameFileDiscovery(media);

    let options: AnyMessageContent;

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: body,
        fileName: mediaName
        // gifPlayback: true
      };
    } else if (typeMessage === "audio") {
      console.log("record", isRecord);
      if (isRecord) {
        const convert = await processAudio(pathMedia);
        options = {
          audio: fs.readFileSync(convert),
          mimetype: "audio/mp4",
          ptt: true
        };
      } else {
        const convert = await processAudioFile(pathMedia);
        options = {
          audio: fs.readFileSync(convert),
          mimetype: "audio/mp4",
          ptt: false
        };
      }
    } else if (typeMessage === "document" || typeMessage === "text") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body,
        fileName: mediaName,
        mimetype: mimetype
      };
    } else if (typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body,
        fileName: mediaName,
        mimetype: mimetype
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: body
      };
    }

    const contact = await Contact.findOne({
      where: {
        id: ticket.contactId
      }
    });

    // ✅ CORREÇÃO: Verificar se contact existe
    if (!contact) {
      throw new AppError("ERR_CONTACT_NOT_FOUND");
    }

    // ✅ CORREÇÃO: Sempre envie para o JID tradicional
    const jid = `${contact.number}@${
      ticket.isGroup ? "g.us" : "s.whatsapp.net"
    }`;

    if (ENABLE_LID_DEBUG) {
      logger.info(
        `[RDS-LID] SendWhatsAppMediaFlow - Enviando para JID tradicional: ${jid}`
      );
      logger.info(
        `[RDS-LID] SendWhatsAppMediaFlow - Contact lid: ${contact.lid}`
      );
      logger.info(
        `[RDS-LID] SendWhatsAppMediaFlow - Contact remoteJid: ${contact.remoteJid}`
      );
      logger.info(
        `[RDS-LID] SendWhatsAppMediaFlow - Media type: ${typeMessage}`
      );
    }

    const sentMessage = await wbot.sendMessage(jid, {
      ...options
    });

    if (ENABLE_LID_DEBUG) {
      logger.info(
        `[RDS-LID] SendWhatsAppMediaFlow - Mídia enviada com sucesso para ${jid}`
      );
    }

    wbot.store(sentMessage);

    await ticket.update({ lastMessage: mediaName });

    return sentMessage;
  } catch (err) {
    Sentry.captureException(err);
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMediaFlow;
