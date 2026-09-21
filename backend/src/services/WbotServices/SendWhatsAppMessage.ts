/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { WAMessage, AnyMessageContent } from "baileys";
import * as Sentry from "@sentry/node";
import fs, { unlinkSync } from "fs";

import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";

import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import mime from "mime-types";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import { getWbot, Session } from "../../libs/wbot";
import CreateMessageService from "../MessageServices/CreateMessageService";
import formatBody from "../../helpers/Mustache";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import logger from "../../utils/logger";
import { normalizeJid } from "../../utils";
import { resolveOutboundJid } from "./getJidOf";

ffmpeg.setFfmpegPath(ffmpegStatic!);

(() => {
  try {
    const resolvedPath: string | undefined =
      typeof ffmpegStatic === "string"
        ? (ffmpegStatic as unknown as string)
        : undefined;
    if (resolvedPath) {
      ffmpeg.setFfmpegPath(resolvedPath);
    } else {
      logger.warn(
        "ffmpeg não encontrado via ffmpeg-static; usando PATH do sistema."
      );
    }
  } catch (e) {
    logger.warn({ e }, "Falha ao configurar ffmpeg; tentando PATH do SO");
  }
})();

const convertToOggOpus = async (inputFile: string): Promise<string> => {
  const parsed = path.parse(inputFile);
  const outputFile = path.join(parsed.dir, `${parsed.name}-${Date.now()}.ogg`);

  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputFile)
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec("libopus")
      .audioBitrate("18k")
      .addOption(["-vbr", "off"])
      .addOption(["-avoid_negative_ts", "make_zero"])
      .format("ogg")
      .on("end", () => resolve())
      .on("error", err => reject(err))
      .save(outputFile);
  });

  return outputFile;
};

const getMediaTypeFromMimeType = (mimetype: string): string => {
  const documentMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.oasis.opendocument.graphics",
    "application/rtf",
    "text/plain",
    "text/csv",
    "text/html",
    "text/xml",
    "application/xml",
    "application/json",
    "application/ofx",
    "application/vnd.ms-outlook",
    "application/vnd.apple.keynote",
    "application/vnd.apple.numbers",
    "application/vnd.apple.pages",
    "application/x-msdownload",
    "application/x-executable",
    "application/x-msdownload",
    "application/acad",
    "application/x-pkcs12",
    "application/x-ret"
  ];

  const archiveMimeTypes = [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/gzip",
    "application/x-bzip2"
  ];

  if (mimetype === "audio/webm") {
    return "audio";
  }

  if (documentMimeTypes.includes(mimetype)) {
    return "document";
  }

  if (archiveMimeTypes.includes(mimetype)) {
    return "document";
  }

  return mimetype.split("/")[0];
};

// ✅ CORREÇÃO: Interface com media e quotedMsg opcionais
interface Request {
  body?: string;
  ticket: Ticket;
  media?: Express.Multer.File;    // ✅ Agora é opcional
  companyId?: number;
  isPrivate?: boolean;
  isForwarded?: boolean;
  quotedMsg?: Message | null;     // ✅ Adicionado para suportar ActionsWebhookService
}

const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

// ✅ CORREÇÃO: Função de conversão de áudio otimizada

export const convertAudioToOgg = async (
  inputPath: string,
  companyId: number
): Promise<string> => {
  return new Promise<string>((resolve, reject) => {
    try {
      const newMediaFileName = `${new Date().getTime()}.ogg`;
      const outputFile = path.join(
        publicFolder,
        `company${companyId}`,
        newMediaFileName
      );

      console.log("🔄 Convertendo áudio:", {
        input: inputPath,
        output: outputFile
      });

      const converter = ffmpeg(inputPath);

      converter
        .outputFormat("ogg")
        .noVideo()
        .audioCodec("libopus")
        .audioChannels(1)
        .audioFrequency(16000)
        .audioBitrate("64k")
        .addOutputOptions("-avoid_negative_ts make_zero")
        .on("end", () => {
          console.log("✅ Conversão de áudio concluída:", outputFile);
          resolve(outputFile);
        })
        .on("error", (err: Error) => {
          console.error("❌ Erro na conversão de áudio:", err);
          reject(err);
        })
        .save(outputFile);
    } catch (error) {
      console.error("❌ Erro ao configurar conversão:", error);
      reject(error);
    }
  });
};

// ✅ Função para converter PNG/WebP para JPG usando ffmpeg
export const convertPngToJpg = async (
  inputPath: string,
  companyId: number
): Promise<Buffer> => {
  try {
    console.log("🔄 Convertendo imagem para JPG:", inputPath);

    const outputPath = path.join(
      publicFolder,
      `company${companyId}`,
      `temp_${new Date().getTime()}.jpg`
    );

    // Usar ffmpeg para converter qualquer formato de imagem para JPG
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .outputFormat('mjpeg')
        .outputOptions('-q:v', '2') // Qualidade alta
        .on('end', () => {
          console.log("✅ Conversão para JPG concluída");
          resolve();
        })
        .on('error', (err) => {
          console.error("❌ Erro na conversão para JPG:", err);
          reject(err);
        })
        .save(outputPath);
    });

    // Ler o arquivo JPG convertido
    const imageBuffer = fs.readFileSync(outputPath);

    // Limpar arquivo temporário
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    console.log("✅ Conversão concluída e buffer retornado");
    return imageBuffer;
  } catch (error) {
    console.error("❌ Erro na conversão para JPG:", error);
    throw error;
  }
};

export const getMessageOptions = async (
  fileName: string,
  pathMedia: string,
  companyId: string,
  body: string = " "
): Promise<any> => {
  const mimeType = mime.lookup(pathMedia);
  const typeMessage = mimeType ? mimeType.split("/")[0] : "application";

  console.log("🔍 Processando mídia:", {
    fileName,
    pathMedia,
    mimeType,
    typeMessage
  });

  try {
    if (!mimeType) {
      throw new Error("Invalid mimetype");
    }

    let options: AnyMessageContent;

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: body ? body : null,
        fileName: fileName
      };
    } else if (typeMessage === "audio") {
      // ✅ CORREÇÃO: Verificar se o arquivo já está em formato adequado
      const isAlreadyOgg = pathMedia.toLowerCase().endsWith(".ogg");
      let audioPath = pathMedia;

      if (!isAlreadyOgg) {
        console.log("🔄 Arquivo não é OGG, convertendo...");
        audioPath = await convertAudioToOgg(pathMedia, +companyId);
      } else {
        console.log("✅ Arquivo já é OGG, usando diretamente");
      }

      options = {
        audio: fs.readFileSync(audioPath),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true
      };

      // Limpar arquivo temporário se foi convertido
      if (audioPath !== pathMedia && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    } else if (typeMessage === "document" || typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: body ? body : null,
        fileName: fileName,
        mimetype: mimeType
      };
    } else {
      options = {
        image: fs.readFileSync(pathMedia),
        caption: body ? body : null
      };
    }

    return options;
  } catch (e) {
    Sentry.captureException(e);
    console.error("❌ Erro ao processar mídia:", e);
    return null;
  }
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body = "",
  isPrivate = false,
  isForwarded = false,
  quotedMsg = null
}: Request): Promise<WAMessage> => {
  try {
    let wbot: Session;
    try {
      wbot = await getWbot(ticket.whatsappId);
    } catch (err) {
      if (err instanceof AppError && err.message === "ERR_WAPP_NOT_INITIALIZED") {
        console.log("⚠️ WhatsApp do ticket não inicializado, tentando conexão padrão...");
        const defaultWapp = await GetDefaultWhatsApp(ticket.companyId);
        wbot = await getWbot(defaultWapp.id);
        // Atualizar o ticket para usar a nova conexão funcional
        await ticket.update({ whatsappId: defaultWapp.id });
      } else {
        throw err;
      }
    }
    const companyId = ticket.companyId.toString();

    // ✅ CORREÇÃO: Verificar se body é válido antes de usar
    const safeBody = body || "";
    const formattedBody = ticket ? formatBody(safeBody, ticket) : safeBody;

    // ✅ Preparar opções de quoted message se existir
    let quotedOptions = {};
    if (quotedMsg) {
      try {
        const quotedId: any = (quotedMsg as any)?.id ?? quotedMsg;
        let chatMessages: Message | null = null;

        if (quotedId !== undefined && quotedId !== null && String(quotedId).trim() !== "") {
          chatMessages = await Message.findOne({
            where: { id: quotedId }
          });
        }

        if (chatMessages && chatMessages.dataJson) {
          const msgFound = JSON.parse(chatMessages.dataJson);
          quotedOptions = {
            quoted: {
              key: msgFound.key,
              message: {
                extendedTextMessage: msgFound.message?.extendedTextMessage
              }
            }
          };
        }
      } catch (quotedErr) {
        console.log("⚠️ Erro ao processar quotedMsg, ignorando:", quotedErr);
      }
    }

    // ✅ CORREÇÃO: Se não há mídia, enviar apenas texto
    if (!media) {
      console.log("📤 Enviando mensagem de texto puro (sem mídia)");

      if (!formattedBody || formattedBody.trim() === "") {
        throw new AppError("ERR_EMPTY_MESSAGE");
      }

      // Mensagem privada (apenas texto)
      if (isPrivate === true) {
        const messageData = {
          wid: `PVT${companyId}${ticket.id}${safeBody.substring(0, 6)}`,
          ticketId: ticket.id,
          contactId: undefined,
          body: formattedBody,
          fromMe: true,
          mediaUrl: null,
          mediaType: "chat",
          read: true,
          quotedMsgId: null,
          ack: 2,
          remoteJid: null,
          participant: null,
          dataJson: null,
          ticketTrakingId: null,
          isPrivate
        };

        await CreateMessageService({ messageData, companyId: ticket.companyId });
        return;
      }

      const contactNumber = await Contact.findByPk(ticket.contactId);
      if (!contactNumber) {
        throw new AppError("ERR_NO_CONTACT_FOUND");
      }

      // Garante lid/number no ticket.contact (ShowTicket às vezes omite lid)
      if (ticket.contact) {
        ticket.contact.lid = contactNumber.lid || ticket.contact.lid;
        ticket.contact.number = contactNumber.number || ticket.contact.number;
        ticket.contact.remoteJid =
          contactNumber.remoteJid || ticket.contact.remoteJid;
      }

      const targetJid = await resolveOutboundJid(wbot, contactNumber, ticket);
      logger.info(
        `[SEND] Texto ticket=${ticket.id} → ${targetJid} (contact=${contactNumber.id} number=${contactNumber.number} lid=${contactNumber.lid || "-"} remoteJid=${contactNumber.remoteJid || "-"})`
      );

      const sendTextPayload = {
        text: formattedBody,
        contextInfo: {
          forwardingScore: isForwarded ? 2 : 0,
          isForwarded: isForwarded
        }
      };

      let sentMessage: WAMessage;
      try {
        sentMessage = await wbot.sendMessage(targetJid, sendTextPayload, quotedOptions);
      } catch (firstErr) {
        const phoneDigits = String(contactNumber?.number || "").replace(/\D/g, "");
        const lidRaw = String(contactNumber?.lid || "").trim();
        const candidates: string[] = [];

        if (lidRaw.includes("@lid")) {
          candidates.push(normalizeJid(lidRaw));
        } else if (lidRaw && /^\d+$/.test(lidRaw)) {
          candidates.push(`${lidRaw}@lid`);
        }

        if (
          phoneDigits.length >= 10 &&
          phoneDigits.length <= 13 &&
          phoneDigits !== lidRaw.replace(/\D/g, "")
        ) {
          candidates.push(
            normalizeJid(
              `${phoneDigits}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`
            )
          );
        }

        let recovered: WAMessage | null = null;
        for (const fallbackJid of candidates) {
          if (!fallbackJid || fallbackJid === targetJid) continue;
          try {
            logger.warn(
              `[SEND] Falha em ${targetJid}, tentando fallback ${fallbackJid}`
            );
            recovered = await wbot.sendMessage(
              fallbackJid,
              sendTextPayload,
              quotedOptions
            );
            break;
          } catch (fallbackErr) {
            logger.warn(
              `[SEND] Fallback ${fallbackJid} também falhou:`,
              fallbackErr
            );
          }
        }

        if (!recovered) {
          throw firstErr;
        }
        sentMessage = recovered;
      }

      wbot.store(sentMessage);

      await ticket.update({
        lastMessage: formattedBody,
        imported: null
      });

      // ack 1 = enviado ao servidor WhatsApp; ACK real (2/3) vem do messages.update
      const messageData = {
        wid: sentMessage.key.id,
        ticketId: ticket.id,
        contactId: ticket.contactId,
        body: formattedBody,
        fromMe: true,
        mediaType: "chat",
        read: true,
        quotedMsgId: quotedMsg?.id || null,
        ack: 1,
        remoteJid: sentMessage.key.remoteJid || contactNumber.remoteJid,
        dataJson: JSON.stringify(sentMessage),
      };

      await CreateMessageService({ messageData, companyId: ticket.companyId });

      return sentMessage;
    }

    // ✅ FLUXO ORIGINAL: Envio com mídia
    // Construir o caminho absoluto baseado no companyId
    let pathMedia;

    // Verificar se media.path já é um caminho absoluto ou relativo
    if (media.path.startsWith('/') && !media.path.includes('public')) {
      // Caminho relativo como /company1/fileList/4/arquivo.pdf
      pathMedia = path.join(publicFolder, media.path);
    } else if (media.path.includes('public')) {
      // Caminho já absoluto, usar diretamente
      pathMedia = media.path;
    } else if (media.path.startsWith('company')) {
      // Caminho que começa com company (ex: company1/fileList/4/arquivo.pdf)
      pathMedia = path.join(publicFolder, media.path);
    } else {
      // Caminho relativo sem barra inicial
      pathMedia = path.join(publicFolder, media.path);
    }

    // Debug: verificar se o arquivo existe
    console.log("🔍 Verificando arquivo de mídia:", {
      originalPath: media.path,
      publicFolder,
      fullPath: pathMedia,
      exists: fs.existsSync(pathMedia)
    });

    if (!fs.existsSync(pathMedia)) {
      throw new Error(`Arquivo de mídia não encontrado: ${pathMedia}`);
    }

    // ✅ CORREÇÃO: Detectar mimetype correto pela extensão se vier como octet-stream
    let realMimetype = media.mimetype;
    if (media.mimetype === "application/octet-stream") {
      const detectedMime = mime.lookup(pathMedia);
      if (detectedMime) {
        realMimetype = detectedMime;
        console.log("🔄 Mimetype corrigido:", { original: media.mimetype, detected: realMimetype });
      }
    }
    const typeMessage = realMimetype.split("/")[0];

    let options: AnyMessageContent;
    let bodyTicket = "";
    const bodyMedia = formattedBody;

    console.log("📤 Enviando mídia:", {
      originalname: media.originalname,
      mimetype: realMimetype,
      typeMessage,
      pathMedia
    });

    if (typeMessage === "video") {
      options = {
        video: fs.readFileSync(pathMedia),
        caption: bodyMedia,
        fileName: media.originalname.replace("/", "-"),
        contextInfo: {
          forwardingScore: isForwarded ? 2 : 0,
          isForwarded: isForwarded
        }
      };
      bodyTicket = "🎥 Arquivo de vídeo";
    } else if (typeMessage === "audio" || realMimetype.includes("audio")) {
      // ✅ CORREÇÃO: Tratamento específico para arquivos de áudio
      let audioPath = pathMedia;

      console.log("🔄 Convertendo áudio para OGG...");
      audioPath = await convertToOggOpus(pathMedia);

      options = {
        audio: fs.readFileSync(audioPath),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
        contextInfo: {
          forwardingScore: isForwarded ? 2 : 0,
          isForwarded: isForwarded
        }
      };

      // Limpar arquivo convertido se necessário
      if (audioPath !== pathMedia && fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }

      bodyTicket = bodyMedia || "🎵 Mensagem de voz";
    } else if (typeMessage === "document" || typeMessage === "text") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMedia,
        fileName: media.originalname.replace("/", "-"),
        mimetype: realMimetype,
        contextInfo: {
          forwardingScore: isForwarded ? 2 : 0,
          isForwarded: isForwarded
        }
      };
      bodyTicket = "📂 Documento";
    } else if (typeMessage === "application") {
      options = {
        document: fs.readFileSync(pathMedia),
        caption: bodyMedia,
        fileName: media.originalname.replace("/", "-"),
        mimetype: realMimetype,
        contextInfo: {
          forwardingScore: isForwarded ? 2 : 0,
          isForwarded: isForwarded
        }
      };
      bodyTicket = "📎 Outros anexos";
    } else {
      if (realMimetype.includes("gif")) {
        options = {
          image: fs.readFileSync(pathMedia),
          caption: bodyMedia,
          mimetype: "image/gif",
          contextInfo: {
            forwardingScore: isForwarded ? 2 : 0,
            isForwarded: isForwarded
          },
          gifPlayback: true
        };
      } else {
        if (realMimetype.includes("png") || realMimetype.includes("webp")) {
          // ✅ Converter PNG/WebP para JPG antes de enviar
          console.log("🔄 Detectado arquivo PNG/WebP, convertendo para JPG...");
          const imageBuffer = await convertPngToJpg(pathMedia, ticket.companyId);
          options = {
            image: imageBuffer,
            caption: bodyMedia,
            contextInfo: {
              forwardingScore: isForwarded ? 2 : 0,
              isForwarded: isForwarded
            }
          };
        } else {
          options = {
            image: fs.readFileSync(pathMedia),
            caption: bodyMedia,
            contextInfo: {
              forwardingScore: isForwarded ? 2 : 0,
              isForwarded: isForwarded
            }
          };
        }
      }
      bodyTicket = "🖼️ Imagem";
    }

    if (isPrivate === true) {
      const messageData = {
        wid: `PVT${companyId}${ticket.id}${safeBody.substring(0, 6)}`,
        ticketId: ticket.id,
        contactId: undefined,
        body: bodyMedia,
        fromMe: true,
        mediaUrl: media.filename,
        mediaType: getMediaTypeFromMimeType(realMimetype),
        read: true,
        quotedMsgId: null,
        ack: 2,
        remoteJid: null,
        participant: null,
        dataJson: null,
        ticketTrakingId: null,
        isPrivate
      };

      await CreateMessageService({ messageData, companyId: ticket.companyId });
      return;
    }

    const contactNumber = await Contact.findByPk(ticket.contactId);
    if (!contactNumber) {
      throw new AppError("ERR_NO_CONTACT_FOUND");
    }

    if (ticket.contact) {
      ticket.contact.lid = contactNumber.lid || ticket.contact.lid;
      ticket.contact.number = contactNumber.number || ticket.contact.number;
      ticket.contact.remoteJid =
        contactNumber.remoteJid || ticket.contact.remoteJid;
    }

    const jid = await resolveOutboundJid(wbot, contactNumber, ticket);
    logger.info(
      `[SEND] Mídia ticket=${ticket.id} → ${jid} (contact=${contactNumber.id})`
    );

    let sentMessage: WAMessage = await wbot.sendMessage(
      jid,
      options,
      quotedOptions
    );

    wbot.store(sentMessage);

    const messageData = {
      wid: sentMessage.key.id,
      ticketId: ticket.id,
      contactId: ticket.contactId,
      body: bodyMedia || bodyTicket,
      fromMe: true,
      mediaType: typeMessage,
      mediaUrl: media.filename,
      read: true,
      quotedMsgId: quotedMsg?.id || null,
      ack: 1,
      remoteJid: sentMessage.key.remoteJid || contactNumber.remoteJid,
      dataJson: JSON.stringify(sentMessage),
    };

    await CreateMessageService({ messageData, companyId: ticket.companyId });

    await ticket.update({
      lastMessage: safeBody !== media.filename ? safeBody : bodyMedia,
      imported: null
    });

    return sentMessage;
  } catch (err) {
    console.error(
      `❌ ERRO AO ENVIAR MÍDIA ${ticket.id} media ${media?.originalname || 'texto'}:`,
      err
    );
    Sentry.captureException(err);
    
    // ✅ CORREÇÃO: Não mascarar erro de sessão não inicializada
    if (err instanceof AppError) {
      throw err;
    }
    
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
