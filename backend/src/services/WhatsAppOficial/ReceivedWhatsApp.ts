/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path from "path";
import moment from "moment";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { isNil } from "lodash";
import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import Contact from "../../models/Contact";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import CompaniesSettings from "../../models/CompaniesSettings";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
// removed unused import: getIO
import Message from "../../models/Message";
import verifyMessageOficial from "./VerifyMessageOficial";
import verifyQueueOficial from "./VerifyQueue";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import {
  handleMessageIntegration,
  flowbuilderIntegration
} from "../WbotServices/wbotMessageListener";
import flowBuilderQueue from "../WebhookService/flowBuilderQueue";
import ShowContactService from "../ContactServices/ShowContactService";
import UserRating from "../../models/UserRating";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import { WebhookModel } from "../../models/Webhook";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import VerifyCurrentSchedule from "../CompanyService/VerifyCurrentSchedule";
import SendWhatsAppOficialMessage from "./SendWhatsAppOficialMessage";
import typebotListenerOficial from "../TypebotServices/typebotListenerOficial";
import sgpListenerOficial from "../IntegrationsServices/Sgp/sgpListenerOficial";
import { resolveWhatsAppOficialConnection } from "./ProcessWhatsAppOficialWebhook";
import { getIO } from "../../libs/socket";
import { getMetaAccessToken } from "./metaWhatsAppAuth";
import { downloadMetaCloudMediaById } from "./downloadMetaCloudMediaById";

// ✅ IMPORTAÇÃO DO CHATBOT LISTENER OFICIAL
import { sayChatbotOficial } from "./ChatBotListenerOficial";

const mimeToExtension: { [key: string]: string } = {
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "oga",
  "audio/opus": "opus",
  "audio/wav": "wav",
  "audio/webm": "weba",
  "audio/3gpp": "3gp",
  "audio/3gpp2": "3g2",
  "audio/x-wav": "wav",
  "audio/midi": "midi",
  "application/x-abiword": "abw",
  "application/octet-stream": "arc",
  "video/x-msvideo": "avi",
  "application/vnd.amazon.ebook": "azw",
  "application/x-bzip": "bz",
  "application/x-bzip2": "bz2",
  "application/x-csh": "csh",
  "text/css": "css",
  "text/csv": "csv",
  "text/plain": "txt",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/vnd.ms-fontobject": "eot",
  "application/epub+zip": "epub",
  "image/gif": "gif",
  "text/html": "html",
  "image/x-icon": "ico",
  "text/calendar": "ics",
  "image/jpeg": "jpg",
  "application/json": "json",
  "video/mpeg": "mpeg",
  "application/vnd.apple.installer+xml": "mpkg",
  "video/ogg": "ogv",
  "application/ogg": "ogx",
  "font/otf": "otf",
  "image/png": "png",
  "application/pdf": "pdf",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/x-rar-compressed": "rar",
  "application/rtf": "rtf",
  "application/x-sh": "sh",
  "image/svg+xml": "svg",
  "application/x-shockwave-flash": "swf",
  "image/tiff": "tiff",
  "application/typescript": "ts",
  "font/ttf": "ttf",
  "application/vnd.visio": "vsd",
  "application/xhtml+xml": "xhtml",
  "application/xml": "xml",
  "application/zip": "zip",
  "application/x-7z-compressed": "7z",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/x-msdownload": "exe",
  "application/x-executable": "exe",
  "font/woff": "woff",
  "font/woff2": "woff2",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/3gpp": "3gp",
  "video/3gpp2": "3g2"
};

export interface IMessageReceived {
  type:
    | "text"
    | "image"
    | "audio"
    | "document"
    | "video"
    | "location"
    | "contacts"
    | "sticker"
    | "order"
    | "reaction"
    | "interactive";
  timestamp: number;
  idMessage: string;
  idFile?: string;
  text?: string;
  file?: string; // Base64 do arquivo (apenas para imagens, áudios, stickers)
  mimeType?: string;
  quoteMessageId?: string;
  fileUrl?: string; // ✅ URL da Meta para download direto (vídeos e documentos)
  fileSize?: number; // ✅ Tamanho do arquivo em bytes
  /** Id técnico da resposta de lista/botão (row_1); body usa o title legível */
  interactiveReplyId?: string;
  interactiveReplyTitle?: string;
}

export interface IReceivedWhatsppOficial {
  token?: string;
  whatsappId?: number;
  fromNumber: string;
  nameContact: string;
  companyId: number;
  message: IMessageReceived;
}

export interface IReceivedReadWhatsppOficialRead {
  messageId: string;
  companyId: number;
  token: string;
}

/**
 * ✅ NOVA FUNÇÃO: Baixa arquivo da URL da Meta e retorna o base64
 */
async function downloadFileFromMetaUrl(
  fileUrl: string,
  whatsappToken: string,
  fileSize?: number
): Promise<string> {
  try {
    logger.info(
      `[META DOWNLOAD] Iniciando download - Tamanho: ${
        fileSize ? (fileSize / 1024 / 1024).toFixed(2) : "?"
      } MB`
    );

    const response = await axios.get(fileUrl, {
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        "User-Agent": "curl/7.64.1"
      },
      responseType: "arraybuffer",
      timeout: 60000 // 60 segundos de timeout
    });

    if (response.status !== 200) {
      throw new Error(
        `Falha ao baixar arquivo da Meta: HTTP ${response.status}`
      );
    }

    const base64 = Buffer.from(response.data).toString("base64");

    logger.info(
      `[META DOWNLOAD] ✅ Download concluído - Base64 gerado: ${(
        base64.length /
        1024 /
        1024
      ).toFixed(2)} MB`
    );

    return base64;
  } catch (error: any) {
    logger.error(
      `[META DOWNLOAD] ❌ Erro ao baixar arquivo da Meta: ${error.message}`
    );
    throw new Error(`Erro ao baixar arquivo da Meta: ${error.message}`);
  }
}

export async function generateVCard(contact: any): Promise<string> {
  const firstName =
    contact?.name?.first_name || contact?.name?.formatted_name?.split(" ")[0];
  const lastName = String(contact?.name?.formatted_name).replace(firstName, "");
  const formattedName = contact?.name?.formatted_name || "";
  const phoneEntries = contact?.phones?.map((phone: any) => {
    const phoneNumber = phone?.phone || "";
    const waId = phone?.wa_id || "";
    const phoneType = phone?.type || "CELL";
    return `TEL;type=${phoneType};waid=${waId}:+${phoneNumber}\n`;
  });

  const vcard =
    "BEGIN:VCARD\n" +
    "VERSION:3.0\n" +
    `N:${lastName};${firstName};;;\n` +
    `FN:${formattedName}\n` +
    `${phoneEntries}` +
    "END:VCARD";
  return vcard;
}

export class ReceibedWhatsAppService {
  async processStatuses(params: {
    statuses: any[];
    companyId: number;
    whatsapp: Whatsapp;
  }) {
    const { statuses, companyId } = params;
    const io = getIO();

    for (const status of statuses) {
      try {
        const message = await Message.findOne({
          where: { wid: status.id, companyId }
        });

        if (!message) continue;

        let ack = 0;
        if (status.status === "sent") ack = 1;
        if (status.status === "delivered") ack = 2;
        if (status.status === "read") ack = 3;
        if (status.status === "failed") ack = -1;

        if (ack !== 0 && (ack > message.ack || ack === -1)) {
          await message.update({ ack });
          io.of(String(companyId)).emit(`company-${companyId}-appMessage`, {
            action: "update",
            message
          });
        }
      } catch (err) {
        logger.error(`[WHATSAPP OFICIAL] Erro ao atualizar status: ${err}`);
      }
    }
  }

  async getMessage(data: IReceivedWhatsppOficial) {
    try {
      logger.info(`[${this.constructor.name}] getMessage`);
      const { message, fromNumber, nameContact, token, whatsappId, companyId: companyIdParam } = data;

      const conexao = await resolveWhatsAppOficialConnection({
        whatsappId,
        token,
        companyId: companyIdParam
      });

      if (!conexao) {
        logger.error(
          `[WHATSAPP OFICIAL] getMessage - conexão não encontrada (whatsappId=${whatsappId}, token=${token?.slice?.(0, 8)}...)`
        );
        return;
      }

      const { companyId } = conexao;

      const whatsapp = await ShowWhatsAppService(conexao.id, companyId);

      let contact = await Contact.findOne({
        where: { number: fromNumber, companyId }
      });

      if (!contact) {
        contact = await Contact.create({
          name: nameContact,
          number: fromNumber,
          companyId,
          whatsappId: whatsapp.id
        });
      }

      let fileName;

      const {
        file,
        mimeType,
        idFile,
        type,
        quoteMessageId,
        fileUrl,
        fileSize
      } = message;

      // Cloud API direta: media_id sem URL/base64 — baixa via Graph API
      if (!file && !fileUrl && idFile && mimeType) {
        try {
          const downloaded = await downloadMetaCloudMediaById(conexao, idFile);
          const ext =
            mimeToExtension[downloaded.mimeType] ||
            mimeToExtension[mimeType] ||
            "bin";
          fileName = `${idFile}.${ext}`;
          const folder = path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "public",
            `company${companyId}`
          );
          if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
            chmodSync(folder, 0o777);
          }
          writeFileSync(
            `${folder}/${fileName}`,
            new Uint8Array(downloaded.buffer)
          );
          logger.info(
            `[RECEIVED WHATSAPP] ✅ Mídia inbound Cloud API salva: ${fileName}`
          );
        } catch (mediaErr: any) {
          logger.error(
            `[RECEIVED WHATSAPP] ❌ Falha download media_id ${idFile}: ${mediaErr.message}`
          );
        }
      }

      // ✅ NOVO: Processar arquivo da URL da Meta (para vídeos e documentos grandes)
      if (!!fileUrl && !file) {
        logger.info(
          `[RECEIVED WHATSAPP] Arquivo recebido via URL da Meta - Tipo: ${type}, Tamanho: ${
            fileSize ? (fileSize / 1024 / 1024).toFixed(2) : "?"
          } MB`
        );

        try {
          // Baixar o arquivo da URL da Meta
          const downloadedBase64 = await downloadFileFromMetaUrl(
            fileUrl,
            getMetaAccessToken(conexao),
            fileSize
          );

          // Processar o arquivo baixado
          const buffer = Buffer.from(downloadedBase64, "base64");

          fileName = `${idFile}.${mimeToExtension[mimeType]}`;

          const folder = path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "public",
            `company${companyId}`
          );

          if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
            chmodSync(folder, 0o777);
          }

          writeFileSync(`${folder}/${fileName}`, new Uint8Array(buffer));

          logger.info(
            `[RECEIVED WHATSAPP] ✅ Arquivo salvo localmente: ${fileName}`
          );
        } catch (error: any) {
          logger.error(
            `[RECEIVED WHATSAPP] ❌ Erro ao processar arquivo da URL: ${error.message}`
          );
          // Continua o fluxo mesmo com erro no download
        }
      }
      // ✅ ORIGINAL: Processar arquivo base64 (para imagens, áudios, stickers)
      else if (file) {
        logger.info(
          `[RECEIVED WHATSAPP] Arquivo recebido via Base64 - Tipo: ${type}`
        );

        const base64Data = file.replace(/^data:image\/\w+;base64,/, "");

        console.log("base64Data", base64Data);

        const buffer = Buffer.from(base64Data, "base64");

        fileName = `${idFile}.${mimeToExtension[mimeType]}`;

        console.log("fileName", fileName);

        const folder = path.resolve(
          __dirname,
          "..",
          "..",
          "..",
          "public",
          `company${companyId}`
        );

        console.log("folder", folder);

        // const folder = `public/company${companyId}`; // Correção adicionada por Altemir 16-08-2023
        if (!existsSync(folder)) {
          mkdirSync(folder, { recursive: true }); // Correção adicionada por Altemir 16-08-2023
          chmodSync(folder, 0o777);
        }

        writeFileSync(`${folder}/${fileName}`, new Uint8Array(buffer));

        logger.info(
          `[RECEIVED WHATSAPP] ✅ Arquivo salvo localmente: ${fileName}`
        );
      }
      const settings =
        (await CompaniesSettings.findOne({
          where: { companyId }
        })) || ({} as CompaniesSettings);

      const ticket = await FindOrCreateTicketService(
        contact,
        whatsapp,
        0,
        companyId,
        null,
        null,
        null,
        "whatsapp_oficial",
        false,
        false,
        settings
      );

      const ticketTraking = await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        userId: null,
        whatsappId: whatsapp.id
      });

      const lastMsg =
        message.type === "contacts" ? "Contato" : message?.text || "";
      await ticket.update({
        lastMessage: lastMsg,
        fromMe: false,
        unreadMessages: ticket.unreadMessages + 1
      });

      await verifyMessageOficial(
        message,
        ticket,
        contact,
        companyId,
        fileName,
        fromNumber,
        data,
        quoteMessageId
      );

      await ticket.reload();

      if (["closed", "group", "chatbot"].includes(String(ticket.status))) {
        await ticket.update({ status: "pending" });
        await ticket.reload();
      }

      if (!ticket.userId && ticket.status === "open") {
        const shouldMarkAsBot =
          ticket.isBot === true ||
          ticket.useIntegration === true ||
          !isNil(ticket.integrationId);
        if (shouldMarkAsBot && (ticket.isBot !== true || ticket.useIntegration !== true)) {
          await ticket.update({ isBot: true, useIntegration: true });
          await ticket.reload();
        }
      }

      try {
        const ticketToEmit = await ShowTicketService(ticket.id, companyId);
        getIO()
          .of(String(companyId))
          .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket: ticketToEmit,
            ticketId: ticket.id
          });
      } catch (emitErr) {
        logger.warn(
          `[WHATSAPP OFICIAL] Falha ao emitir ticket após mensagem inbound: ${emitErr}`
        );
      }

      // ✅ NPS (avaliação) para API Oficial
      if (ticket.status === "nps" && ticketTraking !== null) {
        const bodyMessage =
          message.type === "text" ? message.text || "" : message.text || "";

        if (!Number.isNaN(parseFloat(bodyMessage))) {
          const rateRaw = parseFloat(bodyMessage);
          const finalRate = Math.max(0, Math.min(10, rateRaw));

          await UserRating.create({
            ticketId: ticketTraking.ticketId,
            companyId,
            userId: ticketTraking.userId,
            rate: finalRate
          });

          const whatsappConfig = await ShowWhatsAppService(
            ticket.whatsappId,
            companyId
          );
          const completion = whatsappConfig?.complationMessage;

          if (!isNil(completion) && completion !== "" && !ticket.isGroup) {
            await SendWhatsAppOficialMessage({
              body: `\u200e${completion}`,
              ticket,
              quotedMsg: null,
              type: "text",
              media: null,
              vCard: null
            });
          }

          await ticketTraking.update({
            ratingAt: moment().toDate(),
            finishedAt: moment().toDate(),
            rated: true
          });

          await CreateLogTicketService({
            userId: ticket.userId,
            queueId: ticket.queueId,
            ticketId: ticket.id,
            type: "closed"
          });

          await ticket.update({
            isBot: false,
            status: "closed",
            amountUsedBotQueuesNPS: 0,
            useIntegration: null,
            integrationId: null
          });

          return;
        }
        const whatsappConfig = await ShowWhatsAppService(
          ticket.whatsappId,
          companyId
        );
        const errorMsg = "\u200eOpção inválida, tente novamente.\n";
        const ratingPrompt = whatsappConfig?.ratingMessage || "";

        if (
          ticket.amountUsedBotQueuesNPS <
          (whatsappConfig?.maxUseBotQueuesNPS || 0)
        ) {
          await SendWhatsAppOficialMessage({
            body: errorMsg,
            ticket,
            quotedMsg: null,
            type: "text",
            media: null,
            vCard: null
          });

          if (ratingPrompt && ratingPrompt !== "") {
            await SendWhatsAppOficialMessage({
              body: `\u200e${ratingPrompt}\n`,
              ticket,
              quotedMsg: null,
              type: "text",
              media: null,
              vCard: null
            });
          }

          await ticket.update({
            amountUsedBotQueuesNPS: (ticket.amountUsedBotQueuesNPS || 0) + 1
          });
        }

        return;
      }

      // ✅ CONTINUAÇÃO DE FLUXO (FLOWBUILDER) QUANDO HÁ MENU/ETAPAS EM ANDAMENTO
      if (ticket.flowStopped && ticket.lastFlowId) {
        const simulatedMsgForQueue = {
          key: {
            fromMe: false,
            remoteJid: `${fromNumber}@s.whatsapp.net`,
            id: message.idMessage || `ofc-${Date.now()}`
          },
          message: {
            conversation: message.text || ticket.lastMessage || "",
            timestamp: message.timestamp || Math.floor(Date.now() / 1000)
          }
        } as any;

        await flowBuilderQueue(
          ticket,
          simulatedMsgForQueue,
          null as any,
          whatsapp,
          companyId,
          contact,
          ticket
        );
        // Evitar processar outras integrações no mesmo ciclo
        return;
      }

      // ✅ VERIFICAÇÃO DE HORÁRIO DE ATENDIMENTO (mesma lógica do wbotMessageListener)
      let currentSchedule;

      if (settings.scheduleType === "company") {
        currentSchedule = await VerifyCurrentSchedule(companyId, 0, 0);
      } else if (settings.scheduleType === "connection") {
        currentSchedule = await VerifyCurrentSchedule(
          companyId,
          0,
          whatsapp.id
        );
      }

      try {
        if (
          settings.scheduleType &&
          (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
          !["open", "group"].includes(ticket.status)
        ) {
          /**
           * Tratamento para envio de mensagem quando a empresa está fora do expediente
           */
          if (
            (settings.scheduleType === "company" ||
              settings.scheduleType === "connection") &&
            !isNil(currentSchedule) &&
            (!currentSchedule || currentSchedule.inActivity === false)
          ) {
            if (
              whatsapp.maxUseBotQueues &&
              whatsapp.maxUseBotQueues !== 0 &&
              ticket.amountUsedBotQueues >= whatsapp.maxUseBotQueues
            ) {
              return;
            }

            if (whatsapp.timeUseBotQueues !== "0") {
              if (
                ticket.isOutOfHour === false &&
                ticketTraking.chatbotAt !== null
              ) {
                await ticketTraking.update({
                  chatbotAt: null
                });
                await ticket.update({
                  amountUsedBotQueues: 0
                });
              }

              // Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
              const dataLimite = new Date();
              const Agora = new Date();

              if (ticketTraking.chatbotAt !== null) {
                dataLimite.setMinutes(
                  ticketTraking.chatbotAt.getMinutes() +
                    Number(whatsapp.timeUseBotQueues)
                );
                if (
                  ticketTraking.chatbotAt !== null &&
                  Agora < dataLimite &&
                  whatsapp.timeUseBotQueues !== "0" &&
                  ticket.amountUsedBotQueues !== 0
                ) {
                  return;
                }
              }

              await ticketTraking.update({
                chatbotAt: null
              });
            }

            if (whatsapp.outOfHoursMessage !== "" && !ticket.imported) {
              const body = whatsapp.outOfHoursMessage
                .replace("{{nome}}", contact.name || "")
                .replace("{{ticket}}", ticket.id.toString());

              await SendWhatsAppOficialMessage({
                body,
                ticket,
                quotedMsg: null,
                type: "text",
                media: null,
                vCard: null
              });
            }

            // atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
            await ticket.update({
              isOutOfHour: true,
              amountUsedBotQueues: ticket.amountUsedBotQueues + 1
            });

            return;
          }
        }
      } catch (e) {
        logger.error(
          `[WHATSAPP OFICIAL] Erro ao verificar horário de atendimento: ${e}`
        );
        console.log(e);
      }

      if (
        !ticket.imported &&
        !ticket.queue &&
        (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
        !ticket.userId &&
        whatsapp?.queues?.length >= 1
      ) {
        // console.log("antes do verifyqueue")
        await verifyQueueOficial(message, ticket, settings, ticketTraking);

        if (ticketTraking.chatbotAt === null) {
          await ticketTraking.update({
            chatbotAt: moment().toDate()
          });
        }
      }

      // ✅ IMPLEMENTAÇÃO DO SAYCHATBOT PARA API OFICIAL
      if (
        ticket.queue &&
        ticket.queueId &&
        !ticket.useIntegration &&
        !ticket.integrationId &&
        ticket.queue?.chatbots?.length > 0
      ) {
        // ✅ CORRIGIDO: Executar ChatBot apenas se ticket não estiver "open" (aceito por atendente)
        if (ticket.status !== "open") {
          const simulatedMsg = {
            key: {
              fromMe: false,
              remoteJid: `${fromNumber}@s.whatsapp.net`,
              id: message.idMessage
            },
            message: {
              buttonsResponseMessage:
                message.type === "interactive"
                  ? {
                      selectedButtonId:
                        message.interactiveReplyId || message.text
                    }
                  : undefined,
              listResponseMessage:
                message.type === "interactive"
                  ? {
                      singleSelectReply: {
                        selectedRowId:
                          message.interactiveReplyId || message.text
                      }
                    }
                  : undefined,
              conversation: message.text || "",
              timestamp: message.timestamp
            }
          };

          try {
            await sayChatbotOficial(
              ticket.queueId,
              ticket,
              contact,
              simulatedMsg,
              ticketTraking
            );
          } catch (error) {
            console.error(
              "[WHATSAPP OFICIAL] Erro ao executar sayChatbotOficial:",
              error
            );
            logger.error(`[WHATSAPP OFICIAL] Erro sayChatbotOficial: ${error}`);
          }
        }

        // Atualiza mensagem para indicar que houve atividade e aí contar o tempo novamente para enviar mensagem de inatividade
        await ticket.update({
          sendInactiveMessage: false
        });
      }

      // ✅ VERIFICAÇÃO DE CAMPANHAS E FLUXOS (mesma lógica do wbotMessageListener)
      if (!ticket.imported && !ticket.isGroup && ticket.isBot !== false) {
        // Verificar se ticket.integrationId existe antes de continuar
        if (!ticket.integrationId) {
          logger.info(
            "[WHATSAPP OFICIAL] Ticket sem integração, pulando verificação de campanhas"
          );
        } else {
          console.log("[WHATSAPP OFICIAL] Verificando campanhas de fluxo...");

          const contactForCampaign = await ShowContactService(
            ticket.contactId,
            ticket.companyId
          );

          try {
            const queueIntegrations = await ShowQueueIntegrationService(
              ticket.integrationId,
              companyId
            );

            // ✅ EXECUTAR CAMPANHA APENAS UMA VEZ
            const simulatedMsgForFlow = {
              key: {
                fromMe: false,
                remoteJid: `${fromNumber}@s.whatsapp.net`,
                id: message.idMessage || `ofc-${Date.now()}`
              },
              message: {
                conversation: message.text || ticket.lastMessage || "",
                timestamp: message.timestamp || Math.floor(Date.now() / 1000)
              }
            } as any;

            const campaignExecuted = await flowbuilderIntegration(
              simulatedMsgForFlow, // usar mensagem simulada
              null, // wbot é null pois não temos conexão wbot
              companyId,
              queueIntegrations,
              ticket,
              contactForCampaign,
              null,
              null
            );

            if (campaignExecuted) {
              console.log(
                "[WHATSAPP OFICIAL] ✅ Campanha executada, parando outros fluxos"
              );
              return;
            }
          } catch (error) {
            console.error(
              "[WHATSAPP OFICIAL] Erro ao verificar campanhas:",
              error
            );
          }
        }
      }

      // ✅ VERIFICAÇÃO DE INTEGRAÇÕES EXISTENTES
      // ✅ CONTINUAÇÃO DE FLUXO WEBHOOK EXISTENTE (sem campanha)
      if (ticket.flowWebhook && ticket.hashFlowId) {
        console.log(
          `[FLOW WEBHOOK - OFICIAL] Processando fluxo webhook existente para ticket ${ticket.id}`
        );

        try {
          const webhook = await WebhookModel.findOne({
            where: {
              company_id: ticket.companyId,
              hash_id: ticket.hashFlowId
            }
          });

          const cfg = (webhook?.config || {}) as {
            details?: { idFlow: number; [key: string]: any };
          };

          if (cfg.details) {
            const flow = await FlowBuilderModel.findOne({
              where: {
                id: cfg.details.idFlow,
                company_id: companyId
              }
            });

            if (flow) {
              const flowJson = (flow.flow || {}) as {
                nodes: any[];
                connections: any[];
              };
              const { nodes } = flowJson;
              const { connections } = flowJson;
              const numberPhrase = {
                number: contact.number,
                name: contact.name,
                email: contact.email || ""
              };

              await ActionsWebhookService(
                whatsapp.id,
                cfg.details.idFlow,
                ticket.companyId,
                nodes,
                connections,
                ticket.lastFlowId,
                ticket.dataWebhook,
                cfg.details,
                ticket.hashFlowId,
                message.text || "",
                ticket.id,
                numberPhrase
              );

              console.log(
                "[FLOW WEBHOOK - OFICIAL] ✅ Fluxo webhook executado!"
              );
              return; // Após processar o fluxo, sair para evitar cair em outras verificações
            }
            console.error(
              `[FLOW WEBHOOK - OFICIAL] ❌ Fluxo ${cfg.details.idFlow} não encontrado`
            );
          }
        } catch (error) {
          console.error(
            "[FLOW WEBHOOK - OFICIAL] ❌ Erro ao processar fluxo webhook:",
            error
          );
        }
      } else if (
        ticket.flowWebhook &&
        !ticket.hashFlowId &&
        ticket.flowStopped
      ) {
        // Fallback: continuar fluxo usando flowStopped quando hashFlowId estiver ausente
        try {
          const recoveredFlowId = parseInt(String(ticket.flowStopped), 10);
          if (!Number.isNaN(recoveredFlowId)) {
            const flow = await FlowBuilderModel.findOne({
              where: { id: recoveredFlowId, company_id: companyId }
            });

            if (flow) {
              console.warn(
                `[FLOW WEBHOOK - OFICIAL][RECOVERY] Continuando fluxo via flowStopped=${recoveredFlowId} para ticket ${ticket.id}`
              );

              const flowJson = (flow.flow || {}) as {
                nodes: any[];
                connections: any[];
              };
              const { nodes } = flowJson;
              const { connections } = flowJson;
              const recoveryHash = `recovery-${ticket.id}`;
              const minimalDetails = {
                idFlow: recoveredFlowId,
                inputs: [],
                keysFull: []
              } as any;
              const numberPhrase = {
                number: contact.number,
                name: contact.name,
                email: contact.email || ""
              };

              await ActionsWebhookService(
                whatsapp.id,
                recoveredFlowId,
                ticket.companyId,
                nodes,
                connections,
                ticket.lastFlowId,
                ticket.dataWebhook,
                minimalDetails,
                recoveryHash,
                message.text || "",
                ticket.id,
                numberPhrase
              );

              console.log(
                "[FLOW WEBHOOK - OFICIAL][RECOVERY] ✅ Fluxo executado via flowStopped"
              );
              return;
            }
          }
        } catch (error) {
          console.error(
            "[FLOW WEBHOOK - OFICIAL][RECOVERY] ❌ Erro no fallback de fluxo:",
            error
          );
        }
      }

      if (
        !ticket.imported &&
        !ticket.queue &&
        !ticket.isGroup &&
        !ticket.user &&
        !isNil(whatsapp.integrationId)
      ) {
        const integrations = await ShowQueueIntegrationService(
          whatsapp.integrationId,
          companyId
        );

        // Criar um objeto msg simulado para compatibilidade
        const simulatedMsg = {
          key: {
            fromMe: false,
            remoteJid: `${fromNumber}@s.whatsapp.net`,
            id: message.idMessage
          },
          message: {
            conversation: message.text || "",
            timestamp: message.timestamp,
            text: message.text || ""
          }
        };

        // Helper: fallback oficial em caso de erro
        const notifyIntegrationErrorAndResetOficial = async (
          bodyText?: string
        ) => {
          const fallbackText =
            bodyText ||
            "Desculpe, ocorreu um problema na integração. O atendimento seguirá pelo fluxo padrão.";
          try {
            await SendWhatsAppOficialMessage({
              body: fallbackText,
              ticket,
              type: "text"
            });
          } catch (sendErr) {
            logger.error(
              `[INTEGRATION FALLBACK OFICIAL] Erro ao enviar mensagem: ${sendErr?.message}`
            );
          }
          try {
            await UpdateTicketService({
              ticketId: ticket.id,
              companyId,
              ticketData: {
                status: "closed",
                useIntegration: null,
                integrationId: null
              }
            });
            logger.info(
              `[INTEGRATION FALLBACK OFICIAL] Ticket ${ticket.id} finalizado e integração limpa.`
            );
          } catch (updateErr) {
            logger.error(
              `[INTEGRATION FALLBACK OFICIAL] Erro ao finalizar/limpar ticket ${ticket.id}: ${updateErr?.message}`
            );
          }
        };

        // ✅ VERIFICAR SE É TYPEBOT
        if (integrations.type === "typebot") {
          console.log("[TYPEBOT OFICIAL] Enviando mensagem para Typebot");
          try {
            await typebotListenerOficial({
              ticket,
              msg: simulatedMsg,
              typebot: integrations
            });
            await ticket.update({
              useIntegration: true,
              integrationId: integrations.id,
              typebotSessionTime: moment().toDate()
            });
          } catch (err) {
            logger.error(
              `[TYPEBOT OFICIAL] Erro na integração: ${err?.message}`
            );
            await notifyIntegrationErrorAndResetOficial();
          }
        } else {
          console.error(
            `[TYPEBOT OFICIAL] Integração não é Typebot, é ${integrations.type}`
          );
          // ✅ CHECAR SE É SGP VIA TYPE OU jsonContent
          let cfg: any = {};
          try {
            cfg = integrations.jsonContent
              ? JSON.parse(integrations.jsonContent)
              : {};
          } catch {
            cfg = {};
          }

          if (
            integrations.type === "SGP" ||
            ((cfg?.sgpUrl || cfg?.tipoIntegracao) && integrations.type !== "typebot")
          ) {
            console.log(
              "[SGP OFICIAL] SGP detectado via WhatsApp.integrationId: aguardando CPF do cliente"
            );
            try {
              // Não iniciar integração agora; apenas marcar no ticket
              await ticket.update({
                useIntegration: true,
                integrationId: integrations.id
              });
            } catch (err) {
              logger.error(
                `[SGP OFICIAL] Erro ao marcar integração: ${err?.message}`
              );
              await notifyIntegrationErrorAndResetOficial();
            }
          } else {
            // ✅ OUTRAS INTEGRAÇÕES (n8n, dialogflow, flowbuilder, webhook)
            try {
              await handleMessageIntegration(
                simulatedMsg as any,
                null, // wbot é null
                companyId,
                integrations,
                ticket
              );

              await ticket.update({
                useIntegration: true,
                integrationId: integrations.id
              });
            } catch (err) {
              logger.error(
                `[OFICIAL] Erro na integração ${integrations.type}: ${err?.message}`
              );
              await notifyIntegrationErrorAndResetOficial();
            }
          }
        }

        return;
      }

      // ✅ VERIFICAÇÃO DE INTEGRAÇÕES NO TICKET
      if (
        !ticket.imported &&
        !ticket.isGroup &&
        !ticket.userId &&
        ticket.integrationId &&
        ticket.useIntegration
      ) {
        const integrations = await ShowQueueIntegrationService(
          ticket.integrationId,
          companyId
        );

        // Criar um objeto msg simulado para compatibilidade
        const simulatedMsg = {
          key: {
            fromMe: false,
            remoteJid: `${fromNumber}@s.whatsapp.net`,
            id: message.idMessage
          },
          message: {
            conversation: message.text || "",
            timestamp: message.timestamp,
            text: message.text || ""
          }
        };

        // ✅ VERIFICAR SE É TYPEBOT
        if (integrations.type === "typebot") {
          console.log("[TYPEBOT OFICIAL] Continuando conversa com Typebot");
          try {
            await typebotListenerOficial({
              ticket,
              msg: simulatedMsg,
              typebot: integrations
            });
          } catch (err) {
            logger.error(
              `[TYPEBOT OFICIAL] Erro na integração: ${err?.message}`
            );
            // Reutiliza helper definido acima no mesmo escopo do bloco
            const notifyIntegrationErrorAndResetOficial = async (
              bodyText?: string
            ) => {
              const fallbackText =
                bodyText ||
                "Desculpe, ocorreu um problema na integração. O atendimento seguirá pelo fluxo padrão.";
              try {
                await SendWhatsAppOficialMessage({
                  body: fallbackText,
                  ticket,
                  type: "text"
                });
              } catch (e) {
                logger.error(String(e));
              }
              try {
                await UpdateTicketService({
                  ticketId: ticket.id,
                  companyId,
                  ticketData: {
                    status: "closed",
                    useIntegration: null,
                    integrationId: null
                  }
                });
              } catch (e) {
                logger.error(String(e));
              }
            };
            await notifyIntegrationErrorAndResetOficial();
          }
        } else {
          console.error(
            `[TYPEBOT OFICIAL 2] Integração não é Typebot, é ${integrations.type}`
          );
          let cfg: any = {};
          try {
            cfg = integrations.jsonContent
              ? JSON.parse(integrations.jsonContent)
              : {};
          } catch {
            cfg = {};
          }

          if (
            integrations.type === "SGP" ||
            ((cfg?.sgpUrl || cfg?.tipoIntegracao) && integrations.type !== "typebot")
          ) {
            console.log(
              "[SGP OFICIAL] Processando mensagem para integração SGP no ticket"
            );
            try {
              await sgpListenerOficial({
                msg: simulatedMsg,
                ticket,
                queueIntegration: integrations
              });
            } catch (err) {
              logger.error(`[SGP OFICIAL] Erro na integração: ${err?.message}`);
              const notifyIntegrationErrorAndResetOficial = async (
                bodyText?: string
              ) => {
                const fallbackText =
                  bodyText ||
                  "Desculpe, ocorreu um problema na integração. O atendimento seguirá pelo fluxo padrão.";
                try {
                  await SendWhatsAppOficialMessage({
                    body: fallbackText,
                    ticket,
                    type: "text"
                  });
                } catch (e) {
                  logger.error(String(e));
                }
                try {
                  await UpdateTicketService({
                    ticketId: ticket.id,
                    companyId,
                    ticketData: {
                      status: "closed",
                      useIntegration: null,
                      integrationId: null
                    }
                  });
                } catch (e) {
                  logger.error(String(e));
                }
              };
              await notifyIntegrationErrorAndResetOficial();
            }
          } else {
            // ✅ OUTRAS INTEGRAÇÕES (n8n, dialogflow, flowbuilder, webhook)
            try {
              await handleMessageIntegration(
                simulatedMsg as any,
                null, // wbot é null
                companyId,
                integrations,
                ticket
              );
            } catch (err) {
              logger.error(
                `[OFICIAL] Erro na integração ${integrations.type}: ${err?.message}`
              );
              const notifyIntegrationErrorAndResetOficial = async (
                bodyText?: string
              ) => {
                const fallbackText =
                  bodyText ||
                  "Desculpe, ocorreu um problema na integração. O atendimento seguirá pelo fluxo padrão.";
                try {
                  await SendWhatsAppOficialMessage({
                    body: fallbackText,
                    ticket,
                    type: "text"
                  });
                } catch (e) {
                  logger.error(String(e));
                }
                try {
                  await UpdateTicketService({
                    ticketId: ticket.id,
                    companyId,
                    ticketData: {
                      status: "closed",
                      useIntegration: null,
                      integrationId: null
                    }
                  });
                } catch (e) {
                  logger.error(String(e));
                }
              };
              await notifyIntegrationErrorAndResetOficial();
            }
          }
        }
      }

      // ✅ VERIFICAÇÃO FINAL DE CAMPANHAS (após outros processamentos)
      if (!ticket.imported && !ticket.isGroup && ticket.status === "pending") {
        // Aguardar um pouco para garantir que outros processamentos terminaram
        setTimeout(async () => {
          try {
            await ticket.reload({
              include: [{ model: Contact, as: "contact" }]
            });

            // Só verificar se não entrou em fluxo
            if (!ticket.flowWebhook || !ticket.lastFlowId) {
              await ShowContactService(ticket.contactId, ticket.companyId);

              // Verificar se existe integrationId antes de prosseguir
              try {
                if (!whatsapp.integrationId) {
                  logger.info(
                    `[WHATSAPP OFICIAL] whatsapp.integrationId não está definido para a conexão WhatsApp ID: ${whatsapp.id}`
                  );
                  return; // Encerrar execução se não houver integrationId
                }

                const queueIntegrations = await ShowQueueIntegrationService(
                  whatsapp.integrationId,
                  companyId
                );

                // DEBUG - Verificar tipo de integração para diagnóstico
                logger.info(
                  `[WHATSAPP OFICIAL] Iniciando flowbuilder para ticket ${
                    ticket.id
                  }, integração tipo: ${
                    queueIntegrations?.type || "indefinido"
                  }`
                );

                // ✅ VERIFICAÇÃO FINAL APENAS SE NECESSÁRIO
                const simulatedMsgForFlow2 = {
                  key: {
                    fromMe: false,
                    remoteJid: `${fromNumber}@s.whatsapp.net`,
                    id: message.idMessage || `ofc-${Date.now()}`
                  },
                  message: {
                    conversation: message.text || ticket.lastMessage || "",
                    timestamp:
                      message.timestamp || Math.floor(Date.now() / 1000)
                  }
                } as any;

                await flowbuilderIntegration(
                  simulatedMsgForFlow2, // usar mensagem simulada
                  null, // wbot é null
                  companyId,
                  queueIntegrations,
                  ticket,
                  contact,
                  null,
                  null
                );

                // DEBUG - Verificar se flowbuilder foi executado com sucesso
                logger.info(
                  `[WHATSAPP OFICIAL] flowbuilderIntegration executado para ticket ${ticket.id}`
                );
              } catch (error) {
                console.error(
                  "[WHATSAPP OFICIAL] Erro ao verificar campanhas:",
                  error
                );
              }
            }
          } catch (error) {
            console.error(
              "[WHATSAPP OFICIAL] Erro ao verificar campanhas:",
              error
            );
          }
        }, 1000); // Aguardar 1 segundo para garantir que outros processamentos terminaram
      }
    } catch (error) {
      console.error("[WHATSAPP OFICIAL] Erro em getMessage:", error);
      logger.error(`[WHATSAPP OFICIAL] Erro getMessage: ${error}`);
    }
  }

  async readMessage(data: IReceivedReadWhatsppOficialRead) {
    const { messageId, token, companyId } = data;

    try {
      logger.info(`[${this.constructor.name}] readMessage`);
      console.log("data READ", data);
      const conexao = await Whatsapp.findOne({ where: { token, companyId } });

      if (!conexao) {
        logger.error("readMessage - Nenhum whatsApp encontrado");
        return;
      }

      const message = await Message.findOne({
        where: { wid: messageId, companyId }
      });

      if (!message) {
        logger.error(`readMessage - Mensagem não encontrada - ${messageId}`);
        return;
      }
      message.update({ read: true, ack: 2 });
    } catch (error) {
      logger.error(`Erro ao atualizar ack da mensagem ${messageId} - ${error}`);
    }
  }
}
