/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// @ts-nocheck
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import fs from "fs";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Queue from "../models/Queue";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import { verify } from "jsonwebtoken";
import authConfig from "../config/auth";
import path from "path";
import { isNil, isNull } from "lodash";
import { Mutex } from "async-mutex";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import CreateMessageService from "../services/MessageServices/CreateMessageService";

import { sendFacebookMessageMedia, typeAttachment as typeAttachmentFacebook } from "../services/FacebookServices/sendFacebookMessageMedia";
import { sendFacebookMessage } from "../services/FacebookServices/sendFacebookMessage";
import sendSmsMessageFromTicket from "../services/SmsServices/sendSmsMessageFromTicket";
import sendTelegramMessageFromTicket from "../services/TelegramServices/sendTelegramMessageFromTicket";
import sendTelegramUserMessageFromTicket from "../services/TelegramUserServices/sendTelegramUserMessageFromTicket";

import ShowPlanCompanyService from "../services/CompanyService/ShowPlanCompanyService";
import ListMessagesServiceAll from "../services/MessageServices/ListMessagesServiceAll";
import ShowContactService from "../services/ContactServices/ShowContactService";
import FindOrCreateTicketService from "../services/TicketServices/FindOrCreateTicketService";

import Contact from "../models/Contact";

import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";
import ShowMessageService, { GetWhatsAppFromMessage } from "../services/MessageServices/ShowMessageService";
import CompaniesSettings from "../models/CompaniesSettings";
import { verifyMessageFace } from "../services/FacebookServices/facebookMessageListener";
import EditWhatsAppMessage from "../services/MessageServices/EditWhatsAppMessage";
import SendWhatsAppOficialMessage from "../services/WhatsAppOficial/SendWhatsAppOficialMessage";
import { getMetaWhatsAppSessionInfo } from "../services/WhatsAppOficial/getMetaWhatsAppSessionInfo";
import { buildMetaTemplatePayload } from "../services/WhatsAppOficial/buildMetaTemplatePayload";
import { normalizeMetaInteractivePayload } from "../services/WhatsAppOficial/sendMetaCloudMessageDirect";
import ShowService from "../services/QuickMessageService/ShowService";
import { IMetaMessageTemplateComponents, IMetaMessageTemplate } from "../libs/whatsAppOficial/IWhatsAppOficial.interfaces";
import { createFreeTextTemplateWhatsAppOficial } from "../libs/whatsAppOficial/whatsAppOficial.service";
import CheckContactNumber from "../services/WbotServices/CheckNumber";
import TranscribeAudioMessageToText from "../services/MessageServices/TranscribeAudioMessageService";
import QuickMessage from "../models/QuickMessage";
import QuickMessageComponent from "../models/QuickMessageComponent";

type IndexQuery = {
  pageNumber: string;
  ticketTrakingId: string;
  selectedQueues?: string;
};

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  number?: string;
  isPrivate?: string;
  vCard?: Contact;
};

type MessageTemplateData = {
  fromMe: boolean;
  read: boolean;
  quotedMsg?: Message;
  number?: string;
  templateId: string;
  variables: string[];
  bodyToSave: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber, selectedQueues: queueIdsStringified } = req.query as IndexQuery;
  const { companyId, profile } = req.user;
  let queues: number[] = [];

  const user = await User.findByPk(req.user.id, {
    include: [{ model: Queue, as: "queues" }]
  });

  if (queueIdsStringified) {
    queues = JSON.parse(queueIdsStringified);
  } else {
    user.queues.forEach(queue => {
      queues.push(queue.id);
    });
  }

  const { count, messages, ticket, hasMore } = await ListMessagesService({
    pageNumber,
    ticketId,
    companyId,
    queues,
    user
  });

  if (["whatsapp", "whatsapp_oficial"].includes(ticket.channel) && ticket.whatsappId) {
    SetTicketMessagesAsRead(ticket);
  }

  return res.json({ count, messages, ticket, hasMore });
};

export const showMedia = async (req: Request, res: Response): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;

  const message = await Message.findOne({
    where: { id: messageId, companyId }
  });

  if (!message) {
    throw new AppError("ERR_NO_MESSAGE_FOUND", 404);
  }

  const rawMediaUrl = message.getDataValue("mediaUrl");
  if (!rawMediaUrl || typeof rawMediaUrl !== "string") {
    throw new AppError("ERR_NO_MEDIA_FOUND", 404);
  }

  const cleanMedia = rawMediaUrl.trim();
  const candidates: string[] = [];

  if (/^https?:\/\//i.test(cleanMedia)) {
    return res.redirect(cleanMedia);
  }

  if (path.isAbsolute(cleanMedia)) {
    candidates.push(cleanMedia);
  } else {
    // Caminho principal do projeto para anexos de mensagem
    candidates.push(path.resolve(__dirname, "..", "..", "public", `company${companyId}`, cleanMedia));
    // Fallback defensivo para variações de persistência
    candidates.push(path.resolve(process.cwd(), "public", `company${companyId}`, cleanMedia));
    candidates.push(path.resolve(process.cwd(), "public", cleanMedia));
  }

  const mediaPath = candidates.find(candidate => fs.existsSync(candidate));
  if (!mediaPath) {
    throw new AppError("ERR_NO_MEDIA_FOUND", 404);
  }

  return res.sendFile(mediaPath);
};

export function obterNomeEExtensaoDoArquivo(url) {
  var urlObj = new URL(url);
  var pathname = urlObj.pathname;
  var filename = pathname.split('/').pop();
  var parts = filename.split('.');

  var nomeDoArquivo = parts[0];
  var extensao = parts[1];

  return `${nomeDoArquivo}.${extensao}`;
}

// ✅ CORREÇÃO: Função melhorada para detectar arquivos de áudio

const isAudioFile = (media: Express.Multer.File): boolean => {
  console.log("🔍 Verificando se é áudio:", {
    originalname: media.originalname,
    mimetype: media.mimetype,
    fieldname: media.fieldname
  });

  // 1. Verificar se foi enviado pelo campo de áudio (resposta rápida)
  if (media.fieldname === 'audio') {
    console.log("✅ Detectado como áudio pelo fieldname");
    return true;
  }

  // 2. Verificar mimetype
  if (media.mimetype && media.mimetype.startsWith('audio/')) {
    console.log("✅ Detectado como áudio pelo mimetype:", media.mimetype);
    return true;
  }

  // 3. Verificar extensão do arquivo
  if (media.originalname) {
    const audioExtensions = ['.mp3', '.ogg', '.wav', '.webm', '.m4a', '.aac', '.opus'];
    const extension = path.extname(media.originalname).toLowerCase();

    if (audioExtensions.includes(extension)) {
      console.log("✅ Detectado como áudio pela extensão:", extension);
      return true;
    }
  }

  // 4. Verificar padrões no nome do arquivo
  if (media.originalname &&
      (media.originalname.includes('audio_') ||
       media.originalname.includes('áudio') ||
       media.originalname.includes('voice'))) {
    console.log("✅ Detectado como áudio pelo padrão do nome");
    return true;
  }

  console.log("❌ Não detectado como áudio");
  return false;
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { body, quotedMsg, vCard, isPrivate = "false" }: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const { companyId } = req.user;

  const ticket = await ShowTicketService(ticketId, companyId);

  if (!ticket.whatsappId) {
    throw new AppError("Este ticket não possui conexão vinculada, provavelmente foi excluída a conexão.", 400);
  }

  void SetTicketMessagesAsRead(ticket).catch(() => undefined);

  try {
    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File, index) => {
          console.log(`🔍 Processando mídia ${index + 1}:`, {
            originalname: media.originalname,
            mimetype: media.mimetype,
            fieldname: media.fieldname,
            size: media.size
          });

          // ✅ CORREÇÃO: Verificação melhorada para áudio
          if (isAudioFile(media)) {
            console.log("🎵 Processando como arquivo de áudio");
          } else {
            console.log("📎 Processando como arquivo comum");
          }

          if (ticket.channel === "whatsapp") {
            await SendWhatsAppMedia({
              media,
              ticket,
              body: Array.isArray(body) ? body[index] : body,
              isPrivate: isPrivate === "true",
              isForwarded: false
            });
          }

          if (ticket.channel == 'whatsapp_oficial') {
            await SendWhatsAppOficialMessage({
              media,
              body: Array.isArray(body) ? body[index] : body,
              ticket,
              type: null,
              quotedMsg
            })
          }

          if (["facebook", "instagram"].includes(ticket.channel)) {
            try {
              const sentMedia = await sendFacebookMessageMedia({
                media,
                ticket,
                body: Array.isArray(body) ? body[index] : body
              });

              if (sentMedia?.message_id) {
                await CreateMessageService({
                  messageData: {
                    wid: sentMedia.message_id,
                    ticketId: ticket.id,
                    contactId: undefined,
                    body: Array.isArray(body) ? body[index] : body || media.filename,
                    fromMe: true,
                    read: true,
                    quotedMsgId: null,
                    ack: 3,
                    dataJson: JSON.stringify(sentMedia),
                    channel: ticket.channel,
                    mediaType: typeAttachmentFacebook(media),
                    mediaUrl: media.filename
                  },
                  companyId: ticket.companyId
                });
              }
            } catch (error) {
              console.log(error);
            }
          }

          // ✅ CORREÇÃO: Limpar arquivo após envio (exceto para privadas)
          // if (isPrivate === "false") {
          //   const filePath = path.resolve("public", `company${companyId}`, media.filename);
          //   const fileExists = fs.existsSync(filePath);

          //   if (fileExists) {
          //     try {
          //       // fs.unlinkSync(filePath);
          //       // console.log("🗑️ Arquivo temporário removido:", filePath);
          //     } catch (unlinkError) {
          //       console.warn("⚠️ Erro ao remover arquivo temporário:", unlinkError);
          //     }
          //   }
          // }
        })
      );
  } else {
    // Tratamento para mensagens sem mídia (código existente)
    if (ticket.channel === "whatsapp" && isPrivate === "false") {
      await SendWhatsAppMessage({ body, ticket, quotedMsg, vCard });
    } else if (ticket.channel == 'whatsapp_oficial' && isPrivate === "false") {
        // Suporte a seleção manual de template via templateId/variables no envio padrão
        const { templateId, variables, bodyToSave } = (req.body || {}) as any;

        if (templateId) {
          const template = await ShowService(templateId, companyId);
          if (!template) {
            throw new AppError("Template não encontrado", 400);
          }

          let templateData: IMetaMessageTemplate = {
            name: template.shortcode,
            language: { code: template.language }
          };

          let buttonsToSave: any[] = [];
          if (variables && Object.keys(variables).length > 0) {
            templateData = {
              name: template.shortcode,
              language: { code: template.language }
            };

            if (Array.isArray(template.components) && template.components.length > 0) {
              template.components.forEach((component, index) => {
                const componentType = component.type.toLowerCase() as "header" | "body" | "footer" | "button";
                if (variables[componentType] && Object.keys(variables[componentType]).length > 0) {
                  let newComponent: any;

                  if (componentType.replace("buttons", "button") === "button") {
                    const buttons = JSON.parse(component.buttons);
                    buttons.forEach((button, btnIndex) => {
                      const subButton = Object.values(variables[componentType]);
                      subButton.forEach((sub: any) => {
                        if (sub.buttonIndex === btnIndex) {
                          const buttonType = button.type;
                          newComponent = {
                            type: componentType.replace("buttons", "button"),
                            sub_type: buttonType,
                            index: btnIndex,
                            parameters: []
                          };
                        }
                      });
                    });
                  } else {
                    newComponent = {
                      type: componentType,
                      parameters: []
                    };
                  }

                  if (newComponent) {
                    Object.keys(variables[componentType]).forEach(key => {
                      if (componentType.replace("buttons", "button") === "button") {
                        if ((newComponent as any)?.sub_type === "COPY_CODE") {
                          newComponent.parameters.push({
                            type: "coupon_code",
                            coupon_code: variables[componentType][key].value
                          });
                        } else {
                          newComponent.parameters.push({
                            type: "text",
                            text: variables[componentType][key].value
                          });
                        }
                      } else {
                        if (template.components[index].format === 'IMAGE') {
                          newComponent.parameters.push({
                            type: "image",
                            image: { link: variables[componentType][key].value }
                          });
                        } else {
                          const variableValue = variables[componentType][key].value;
                          newComponent.parameters.push({
                            type: "text",
                            text: variableValue
                          });
                        }
                      }
                    });
                  }
                  if (!Array.isArray(templateData.components)) {
                    templateData.components = [];
                  }
                  templateData.components.push(newComponent as IMetaMessageTemplateComponents);
                }
              });
            }
          }

          if (template.components.length > 0) {
            for (const component of template.components) {
              if (component.type === 'BUTTONS') {
                buttonsToSave.push(component.buttons);
              }
            }
          }

          const finalBody = bodyToSave ? String(bodyToSave).concat('||||', JSON.stringify(buttonsToSave)) : body;
          SetTicketMessagesAsRead(ticket);
          await SendWhatsAppOficialMessage({
            body: finalBody,
            ticket,
            quotedMsg,
            type: 'template',
            media: null,
            template: templateData
          });
          return res.send();
        }

        // Regras Meta: fora da janela 24h ou primeira interação -> exige template
        const session = await getMetaWhatsAppSessionInfo(ticket.id, companyId);
        const within24h = session.within24h === true;

        if (!isNil(vCard)) {
          // envio de contato permitido
          await SendWhatsAppOficialMessage({ body, ticket, quotedMsg, type: 'contacts', media: null, vCard });
        } else if (within24h) {
          // dentro da janela de 24h: texto normal
        // AUTO-DETECT: Se o body corresponde a uma QuickMessage oficial com botões, enviar como template
        const matchedQuickMessage = await QuickMessage.findOne({
          where: {
            companyId,
            isOficial: true,
            status: 'APPROVED',
            message: body
          },
          include: [{ model: QuickMessageComponent, as: 'components' }]
        });
        if (matchedQuickMessage) {
          const hasButtons = matchedQuickMessage.components?.some((c: any) => (c.type || '').toUpperCase() === 'BUTTONS');
          if (hasButtons) {
            console.log("[WABA] Auto-detect: QuickMessage oficial com botões detectada, enviando como template");
            const templateData: IMetaMessageTemplate = {
              name: matchedQuickMessage.shortcode,
              language: { code: matchedQuickMessage.language || 'pt_BR' }
            };
            let buttonsToSave: any[] = [];
            for (const comp of (matchedQuickMessage.components || [])) {
              if ((comp.type || '').toUpperCase() === 'BUTTONS') {
                buttonsToSave.push(comp.buttons);
              }
            }
            const finalBody = body.concat('||||', JSON.stringify(buttonsToSave));
            SetTicketMessagesAsRead(ticket);
            await SendWhatsAppOficialMessage({
              body: finalBody,
              ticket,
              quotedMsg,
              type: 'template',
              media: null,
              template: templateData
            });
            return res.send();
          }
        }
          await SendWhatsAppOficialMessage({ body, ticket, quotedMsg, type: 'text', media: null });
        } else {
          throw new AppError(
            "Fora da janela de 24h a Meta bloqueia texto livre. Use o menu WhatsApp → Template Meta (modelo aprovado).",
            400
          );
        }
      } else if (isPrivate === "true") {
        const messageData = {
          wid: `PVT${ticket.updatedAt.toString().replace(' ', '')}`,
          ticketId: ticket.id,
          contactId: undefined,
          body,
          fromMe: true,
          mediaType: !isNil(vCard) ? 'contactMessage' : 'extendedTextMessage',
          read: true,
          quotedMsgId: null,
          ack: 2,
          remoteJid: ticket.contact?.remoteJid,
          participant: null,
          dataJson: null,
          ticketTrakingId: null,
          isPrivate: isPrivate === "true"
        };

        await CreateMessageService({ messageData, companyId: ticket.companyId });

      } else if (["facebook", "instagram"].includes(ticket.channel) && isPrivate === "false") {
        const sendText = await sendFacebookMessage({ body, ticket, quotedMsg });

        if (ticket.channel === "facebook" || ticket.channel === "instagram") {
          await verifyMessageFace(sendText, body, ticket, ticket.contact, true);
        }
      } else if (ticket.channel === "sms" && isPrivate === "false") {
        await sendSmsMessageFromTicket({ body, ticket });
      } else if (ticket.channel === "telegram" && isPrivate === "false") {
        await sendTelegramMessageFromTicket({ body, ticket });
      } else if (ticket.channel === "telegram_oficial" && isPrivate === "false") {
        await sendTelegramUserMessageFromTicket({ body, ticket });
      } else if (ticket.channel === "linkedin" && isPrivate === "false") {
        const sendLinkedInMessageFromTicket = (
          await import("../services/LinkedInServices/sendLinkedInMessageFromTicket")
        ).default;
        await sendLinkedInMessageFromTicket({ body, ticket });
      }
    }
    return res.send();
  } catch (error) {
    console.error("❌ Erro no envio de mensagem:", error);
    return res.status(400).json({ error: error.message });
  }
};

export const forwardMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {

  const { quotedMsg, signMessage, messageId, contactId } = req.body;
  const { id: userId, companyId } = req.user;
  const requestUser = await User.findByPk(userId);

  if (!messageId || !contactId) {
    return res.status(200).send("MessageId or ContactId not found");
  }
  const message = await ShowMessageService(messageId);
  const contact = await ShowContactService(contactId, companyId);

  if (!message) {
    return res.status(404).send("Message not found");
  }
  if (!contact) {
    return res.status(404).send("Contact not found");
  }

  const settings = await CompaniesSettings.findOne({
    where: { companyId }
  }
  )

  const whatsAppConnectionId = await GetWhatsAppFromMessage(message);
  if (!whatsAppConnectionId) {
    return res.status(404).send('Whatsapp from message not found');
  }

  const ticket = await ShowTicketService(message.ticketId, message.companyId);

  const mutex = new Mutex();

  const createTicket = await mutex.runExclusive(async () => {
    const result = await FindOrCreateTicketService(
      contact,
      ticket?.whatsapp,
      0,
      ticket.companyId,
      ticket.queueId,
      requestUser.id,
      contact.isGroup ? contact : null,
      ticket.channel,
      null,
      true,
      settings,
      false,
      false
    );
    return result;
  });

  let ticketData;

  if (isNil(createTicket?.queueId)) {
    ticketData = {
      status: createTicket.isGroup ? "group" : "open",
      userId: requestUser.id,
      queueId: ticket.queueId
    }
  } else {
    ticketData = {
      status: createTicket.isGroup ? "group" : "open",
      userId: requestUser.id
    }
  }

  await UpdateTicketService({
    ticketData,
    ticketId: createTicket.id,
    companyId: createTicket.companyId
  });

  let body = message.body;
  if (message.mediaType === 'conversation'
    || message.mediaType === 'extendedTextMessage'
    || message.mediaType === 'text'
    || message.mediaType === 'location'
    || message.mediaType === 'contactMessage'
    || message.mediaType === 'interactive') {
    if (ticket.channel === "whatsapp") {
      await SendWhatsAppMessage({ body, ticket: createTicket, quotedMsg, isForwarded: message.fromMe ? false : true });
    }
    if (ticket.channel === "whatsapp_oficial") {
      await SendWhatsAppOficialMessage({ body: `_Mensagem encaminhada_:\n ${body}`, ticket: createTicket, quotedMsg, type: 'text', media: null });
    }
  } else {

    const mediaUrl = message.mediaUrl.replace(`:${process.env.PORT}`, '');
    const fileName = obterNomeEExtensaoDoArquivo(mediaUrl);

    if (body === fileName) {
      body = "";
    }

    const publicFolder = path.join(__dirname, '..', '..', '..', 'backend', 'public');

    const filePath = path.join(publicFolder, `company${createTicket.companyId}`, fileName)

    const mediaSrc = {
      fieldname: 'medias',
      originalname: fileName,
      encoding: '7bit',
      mimetype: message.mediaType,
      filename: fileName,
      path: filePath
    } as Express.Multer.File

    if (ticket.channel === "whatsapp") {
      await SendWhatsAppMedia({ media: mediaSrc, ticket: createTicket, body, isForwarded: message.fromMe ? false : true });
    }
    if (ticket.channel === "whatsapp_oficial") {
      await SendWhatsAppOficialMessage({ body: `_Mensagem encaminhada_:\n ${body}`, ticket: createTicket, quotedMsg, type: null, media: mediaSrc });
    }
  }

  return res.send();
}

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;

  const message = await DeleteWhatsAppMessage(messageId, companyId);
  const io = getIO();

  if (message.isPrivate) {
    await Message.destroy({
      where: {
        id: message.id
      }
    });
    io.of(String(companyId))
      // .to(message.ticketId.toString())
      .emit(`company-${companyId}-appMessage`, {
        action: "delete",
        message
      });
  }

  io.of(String(companyId))
    // .to(message.ticketId.toString())
    .emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });

  return res.send();
};

export const allMe = async (req: Request, res: Response): Promise<Response> => {

  const dateStart: any = req.query.dateStart;
  const dateEnd: any = req.query.dateEnd;
  const fromMe: any = req.query.fromMe;
  const rawIds = req.query.ticketUserIds ?? req.query.user_ids;
  let ticketUserIds: number[] | undefined;
  if (rawIds != null && String(rawIds).trim() !== "") {
    const parsed = String(rawIds)
      .split(",")
      .map(s => s.trim())
      .filter(s => /^\d+$/.test(s))
      .map(s => parseInt(s, 10));
    const uniq = [...new Set(parsed)].filter(n => n > 0);
    if (uniq.length > 0) ticketUserIds = uniq;
  }

  const ticketUserIdRaw = req.query.ticketUserId ?? req.query.userId;
  const ticketUserId =
    ticketUserIds == null &&
    ticketUserIdRaw != null &&
    String(ticketUserIdRaw).trim() !== "" &&
    !Number.isNaN(Number(ticketUserIdRaw))
      ? Number(ticketUserIdRaw)
      : undefined;

  const { companyId } = req.user;

  const { count } = await ListMessagesServiceAll({
    companyId,
    fromMe,
    dateStart,
    dateEnd,
    ticketUserId,
    ticketUserIds
  });

  return res.json({ count });
};

export const send = async (req: Request, res: Response): Promise<Response> => {
  const messageData: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];

  try {

    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");

    const whatsapp = await Whatsapp.findOne({ where: { token } });
    const companyId = whatsapp.companyId;
    const company = await ShowPlanCompanyService(companyId);
    const sendMessageWithExternalApi = company.plan.useExternalApi

    if (sendMessageWithExternalApi) {

      if (!whatsapp) {
        throw new Error("Não foi possível realizar a operação");
      }

      if (messageData.number === undefined) {
        throw new Error("O número é obrigatório");
      }

      const number = messageData.number;
      const body = messageData.body;

      if (medias) {
        await Promise.all(
          medias.map(async (media: Express.Multer.File) => {
            req.app.get("queues").messageQueue.add(
              "SendMessage",
              {
                whatsappId: whatsapp.id,
                data: {
                  number,
                  body: media.originalname.replace('/', '-'),
                  mediaPath: media.path
                }
              },
              { removeOnComplete: true, attempts: 3 }
            );
          })
        );
      } else {
        req.app.get("queues").messageQueue.add(
          "SendMessage",
          {
            whatsappId: whatsapp.id,
            data: {
              number,
              body
            }
          },
          { removeOnComplete: true, attempts: 3 }
        );
      }
      return res.send({ mensagem: "Mensagem enviada!" });
    }
    return res.status(400).json({ error: 'Essa empresa não tem permissão para usar a API Externa. Entre em contato com o Suporte para verificar nossos planos!' });

  } catch (err: any) {

    console.log(err);
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};

export const edit = async (req: Request, res: Response): Promise<Response> => {
  const { messageId } = req.params;
  const { companyId } = req.user;
  const { body }: MessageData = req.body;

  const { ticket, message } = await EditWhatsAppMessage({ messageId, body });

  const io = getIO();
  io.of(String(companyId))
    // .to(String(ticket.id))
    .emit(`company-${companyId}-appMessage`, {
      action: "update",
      message
    });

  io.of(String(companyId))
    // .to(ticket.status)
    // .to("notification")
    // .to(String(ticket.id))
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
  return res.send();
}

export const storeTemplate = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;

  const { quotedMsg, templateId, variables, bodyToSave }: MessageTemplateData = req.body;
  const { companyId } = req.user;

  const ticket = await ShowTicketService(ticketId, companyId);

  const template = await ShowService(templateId, companyId);

  if (!template) {
    throw new Error("Template not found");
  }

  let templateData: IMetaMessageTemplate;
  try {
    templateData = buildMetaTemplatePayload(template, variables || {});
  } catch (buildErr: any) {
    throw new AppError(
      buildErr?.message || "Não foi possível montar o payload do template Meta.",
      400
    );
  }

  const buttonsToSave: any[] = [];
  if (Array.isArray(template.components)) {
    for (const component of template.components) {
      if (String(component.type || "").toUpperCase() === "BUTTONS") {
        buttonsToSave.push(component.buttons);
      }
    }
  }

  console.log(JSON.stringify(templateData, null, 2));
  const newBodyToSave = String(bodyToSave || "").concat(
    "||||",
    JSON.stringify(buttonsToSave)
  );
  if (["whatsapp_oficial"].includes(ticket.channel) && ticket.whatsappId) {
    SetTicketMessagesAsRead(ticket);
  }

  try {
    if (ticket.channel == "whatsapp_oficial") {
      await SendWhatsAppOficialMessage({
        body: newBodyToSave,
        ticket,
        quotedMsg,
        type: "template",
        media: null,
        template: templateData
      });
    }

    return res.sendStatus(200);
  } catch (error: any) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  }
};

export const storeInteractive = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { interactive, bodyToSave } = req.body || {};
  const { companyId } = req.user;

  let normalizedInteractive: any;
  try {
    normalizedInteractive = normalizeMetaInteractivePayload(interactive);
  } catch (e: any) {
    throw new AppError(e?.message || "Payload interativo inválido.", 400);
  }

  const ticket = await ShowTicketService(ticketId, companyId);

  if (ticket.channel !== "whatsapp_oficial") {
    throw new AppError(
      "Mensagens interativas Meta estão disponíveis apenas em tickets WhatsApp API Oficial.",
      400
    );
  }

  // Recalcula janela 24h no momento do envio (evita session stale no ticket)
  const session = await getMetaWhatsAppSessionInfo(ticket.id, companyId);
  if (session.requiresTemplate || session.within24h === false) {
    throw new AppError(
      "Fora da janela de 24h a Meta não permite botões/enquete. Envie um template aprovado.",
      400
    );
  }

  SetTicketMessagesAsRead(ticket);

  try {
    await SendWhatsAppOficialMessage({
      body:
        bodyToSave ||
        normalizedInteractive?.body?.text ||
        "Mensagem interativa",
      ticket,
      quotedMsg: null,
      type: "interactive",
      media: null,
      interative: normalizedInteractive,
      bodyToSave:
        bodyToSave ||
        normalizedInteractive?.body?.text ||
        "Mensagem interativa"
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    throw new AppError(msg, err?.statusCode || 400);
  }

  return res.status(200).json({ ok: true });
};

export const sendMessageFlow = async (
  whatsappId: number,
  body: any,
  req: Request,
  files?: Express.Multer.File[]
): Promise<String> => {
  const messageData = body;
  const medias = files;

  try {
    const whatsapp = await Whatsapp.findByPk(whatsappId);

    if (!whatsapp) {
      throw new Error("Não foi possível realizar a operação");
    }

    if (messageData.number === undefined) {
      throw new Error("O número é obrigatório");
    }

    const numberToTest = messageData.number;
    const body = messageData.body;

    const companyId = messageData.companyId;

    const CheckValidNumber: any = await CheckContactNumber(numberToTest, companyId);
    const number = CheckValidNumber.jid.split("@")[0];

    if (medias) {
      await Promise.all(
        medias.map(async (media: Express.Multer.File) => {
          await req.app.get("queues").messageQueue.add(
            "SendMessage",
            {
              whatsappId,
              data: {
                number,
                body: media.originalname,
                mediaPath: media.path
              }
            },
            { removeOnComplete: true, attempts: 3 }
          );
        })
      );
    } else {
      req.app.get("queues").messageQueue.add(
        "SendMessage",
        {
          whatsappId,
          data: {
            number,
            body
          }
        },

        { removeOnComplete: false, attempts: 3 }
      );
    }

    return "Mensagem enviada";
  } catch (err: any) {
    if (Object.keys(err).length === 0) {
      throw new AppError(
        "Não foi possível enviar a mensagem, tente novamente em alguns instantes"
      );
    } else {
      throw new AppError(err.message);
    }
  }
};

export const transcribeAudioMessage = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { wid } = req.body;

  const transcribedText = await TranscribeAudioMessageToText(wid, companyId.toString());

  return res.send(transcribedText);
}
