/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { isExternalApiConfigured } from "./FinalizeWhatsAppOficialConnection";
import {
  getMetaAccessToken,
  sanitizeMetaToken
} from "./metaWhatsAppAuth";
import { registerWhatsAppCloudPhone } from "./registerWhatsAppCloudPhone";
import { uploadMetaCloudMedia } from "./uploadMetaCloudMedia";
import { sendMetaCloudMessageDirect } from "./sendMetaCloudMessageDirect";
import { isNil } from "lodash";
import { sendMessageWhatsAppOficial } from "../../libs/whatsAppOficial/whatsAppOficial.service";
import { IMetaMessageTemplate, IMetaMessageinteractive, IReturnMessageMeta, ISendMessageOficial } from "../../libs/whatsAppOficial/IWhatsAppOficial.interfaces";
import CreateMessageService from "../MessageServices/CreateMessageService";
import formatBody from "../../helpers/Mustache";

interface Request {
  body: string;
  ticket: Ticket;
  type: 'text' | 'reaction' | 'audio' | 'document' | 'image' | 'sticker' | 'video' | 'location' | 'contacts' | 'interactive' | 'template',
  quotedMsg?: Message;
  msdelay?: number;
  media?: Express.Multer.File,
  vCard?: Contact;
  template?: IMetaMessageTemplate,
  interative?: IMetaMessageinteractive,
  bodyToSave?: string
}

const getTypeMessage = (type: string): 'text' | 'reaction' | 'audio' | 'document' | 'image' | 'sticker' | 'video' | 'location' | 'contacts' | 'interactive' | 'template' => {
  console.log("type", type);
  switch (type) {
    case 'video':
      return 'video';
    case 'audio':
      return 'audio';
    case 'image':
      return 'image'
    case 'application':
      return 'document'
    case 'document':
      return 'document'
    case 'text':
      return 'text'
    case 'interactive':
      return 'interactive'
    case 'contacts':
      return 'contacts'
    case 'location':
      return 'location'
    case 'template':
      return 'template'
    case 'reaction':
      return 'reaction'
    default:
      return null
  }
}

const SendWhatsAppOficialMessage = async ({
  body,
  ticket,
  media,
  type,
  vCard,
  template,
  interative,
  quotedMsg,
  bodyToSave
}: Request): Promise<IReturnMessageMeta> => {

  console.error(`Chegou SendWhatsAppOficialMessage - ticketId: ${ticket.id} - contactId: ${ticket.contactId}`);

  const pathMedia = !!media ? media.path : null;
  let options: ISendMessageOficial = {} as ISendMessageOficial;
  const typeMessage = !!media ? media.mimetype.split("/")[0] : null;
  let bodyTicket = "";
  let mediaType: string;

  const bodyMsg = body ? formatBody(body, ticket) : null;

  type = !type ? getTypeMessage(typeMessage) : type;

  if ((!media || type === "text") && type === "text") {
    const check = typeof bodyMsg === "string" ? bodyMsg.trim() : "";
    if (!check) {
      throw new AppError("ERR_EMPTY_MESSAGE");
    }
  }

  switch (type) {
    case 'video':
      options.body_video = { caption: bodyMsg };
      options.type = 'video';
      options.fileName = media.originalname.replace('/', '-');
      bodyTicket = "🎥 Arquivo de vídeo";
      mediaType = 'video';
      break;
    case 'audio':
      options.type = 'audio';
      options.fileName = media.originalname.replace('/', '-');
      bodyTicket = "🎵 Arquivo de áudio";
      mediaType = 'audio';
      break;
    case 'document':
      options.type = 'document';
      options.body_document = { caption: bodyMsg };
      options.fileName = media.originalname.replace('/', '-');
      bodyTicket = "📂 Arquivo de Documento";
      mediaType = 'document';
      break;
    case 'image':
      options.body_image = { caption: bodyMsg };
      options.fileName = media.originalname.replace('/', '-');
      bodyTicket = "📷 Arquivo de Imagem";
      mediaType = 'image';
      break;
    case 'text':
      options.body_text = { body: bodyMsg };
      mediaType = 'conversation';
      break;
    case 'interactive':
      mediaType = 'interactive';
      options.body_interactive = interative;
      break;
    case 'contacts':
      mediaType = 'contactMessage';
      const first_name = vCard?.name?.split(' ')[0];
      const last_name = String(vCard?.name).replace(vCard?.name?.split(' ')[0], '');
      options.body_contacts = {
        name: { first_name: first_name, last_name: last_name, formatted_name: `${first_name} ${last_name}`.trim() },
        phones: [{ phone: `+${vCard?.number}`, wa_id: +vCard?.number, type: 'CELL' }],
        emails: [{ email: vCard?.email }]
      }
      break;
    case 'location':
      throw new Error(`Tipo ${type} não configurado para enviar mensagem a Meta`);
    case 'template':
      // Para templates, o body já vem formatado do storeTemplate com texto + botões
      // Formato: "texto do template||||[botões em JSON]"
      bodyTicket = bodyMsg || `📋 Template: ${template?.name || 'Mensagem'}`;
      options.body_template = template;
      mediaType = 'template';
      break;
    case 'reaction':
      throw new Error(`Tipo ${type} não configurado para enviar mensagem a Meta`)
    default:
      throw new Error(`Tipo ${type} não configurado para enviar mensagem a Meta`);
  }

  const contact = await Contact.findByPk(ticket.contactId)

  let vcard;

  if (!isNil(vCard)) {
    console.log(vCard)
    const numberContact = vCard.number;
    const firstName = vCard.name.split(' ')[0];
    const lastName = String(vCard.name).replace(vCard.name.split(' ')[0], '')
    vcard = `BEGIN:VCARD\n`
      + `VERSION:3.0\n`
      + `N:${lastName};${firstName};;;\n`
      + `FN:${vCard.name}\n`
      + `TEL;type=CELL;waid=${numberContact}:+${numberContact}\n`
      + `END:VCARD`;
    console.log(vcard)
  }

  options.to = `+${contact.number}`;
  options.type = type;
  options.quotedId = quotedMsg?.wid;

  try {
    const wapp = await Whatsapp.findByPk(ticket.whatsappId);
    if (!wapp) {
      throw new AppError("ERR_NO_WAPP_FOUND");
    }

    let sendMessage;

    // Se tiver URL da API externa, usa o fluxo legado
    if (isExternalApiConfigured()) {
      sendMessage = await sendMessageWhatsAppOficial(
        pathMedia,
        wapp.token,
        options
      );
    } else {
      // Fluxo DIRETO (Cloud API da Meta)
      const { phone_number_id } = wapp;
      const cleanToken = getMetaAccessToken(wapp);

      if (!phone_number_id || !cleanToken) {
        throw new AppError(
          "Phone Number ID ou token Meta ausente. Atualize o token permanente na conexão WhatsApp API Oficial.",
          400
        );
      }

      const metaToken = sanitizeMetaToken(cleanToken);

      // LOG DE DIAGNÓSTICO DO TOKEN
      const tokenMasked = cleanToken.length > 15 
          ? `${cleanToken.substring(0, 10)}...${cleanToken.substring(cleanToken.length - 5)}` 
          : "TOKEN_INVALIDO_CURTO";
      
      console.log(`[SendWhatsAppOficialMessage] Token Original Len: ${metaToken.length} | Limpo Len: ${cleanToken.length}`);
      
      if (metaToken.length === 255) {
        console.error(
          `[SendWhatsAppOficialMessage] ALERTA: token com 255 chars — possível truncamento no banco.`
        );
      }

      console.log(`[SendWhatsAppOficialMessage] Usando Token: ${tokenMasked}`);
      
      if (cleanToken !== metaToken) {
        console.warn(`[SendWhatsAppOficialMessage] AVISO: O token continha caracteres inválidos que foram removidos.`);
      }

      // ✅ CORREÇÃO BRASIL: Verifica se o número é brasileiro (55), tem 12 dígitos (sem o 9) e é móvel
      let finalNumber = contact.number;
      if (finalNumber.startsWith("55") && finalNumber.length === 12) {
        const ddd = finalNumber.substring(2, 4);
        const numberPart = finalNumber.substring(4);
        // Se o número começar com 7, 8 ou 9, assume-se que é móvel e adiciona o 9
        if (["7", "8", "9"].includes(numberPart[0])) {
           finalNumber = `55${ddd}9${numberPart}`;
           console.log(`[SendWhatsAppOficialMessage] ⚠️ Corrigindo número BR sem 9º dígito: ${contact.number} -> ${finalNumber}`);
        }
      }

      const url = `https://graph.facebook.com/v21.0/${phone_number_id}/messages`;
      
      let payload: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: finalNumber,
      };

      if (type === "text") {
        const messageId = await sendMetaCloudMessageDirect({
          whatsapp: wapp,
          toNumber: finalNumber,
          type: "text",
          textBody: bodyMsg
        });
        if (!messageId) {
          throw new AppError("Meta não confirmou o envio da mensagem de texto.", 400);
        }
        sendMessage = { idMessageWhatsApp: [messageId] };
      } else if (type === "template") {
        if (!template) {
          throw new AppError("Payload de template Meta ausente.", 400);
        }
        const messageId = await sendMetaCloudMessageDirect({
          whatsapp: wapp,
          toNumber: finalNumber,
          type: "template",
          template
        });
        if (!messageId) {
          throw new AppError("Meta não confirmou o envio do template.", 400);
        }
        sendMessage = { idMessageWhatsApp: [messageId] };
      } else if (type === "interactive") {
        if (!interative) {
          throw new AppError("Payload interativo ausente.", 400);
        }
        const messageId = await sendMetaCloudMessageDirect({
          whatsapp: wapp,
          toNumber: finalNumber,
          type: "interactive",
          interactive: interative
        });
        if (!messageId) {
          throw new AppError("Meta não confirmou o envio da mensagem interativa.", 400);
        }
        sendMessage = { idMessageWhatsApp: [messageId] };
      } else if (media && pathMedia && ["image", "video", "audio", "document"].includes(type)) {
        const uploaded = await uploadMetaCloudMedia(
          wapp,
          pathMedia,
          media.mimetype
        );
        const messageId = await sendMetaCloudMessageDirect({
          whatsapp: wapp,
          toNumber: finalNumber,
          type: type as "image" | "video" | "audio" | "document",
          mediaId: uploaded.id,
          mediaCaption: bodyMsg || undefined,
          mediaFilename: media.originalname?.replace("/", "-")
        });
        sendMessage = { idMessageWhatsApp: [messageId] };
      } else {
        console.log(`[SendWhatsAppOficialMessage] Enviando para URL: ${url}`);
        console.log(`[SendWhatsAppOficialMessage] Payload:`, JSON.stringify(payload, null, 2));

        const postToMeta = () =>
          axios.post(url, payload, {
            headers: {
              Authorization: `Bearer ${cleanToken}`,
              "Content-Type": "application/json"
            }
          });

        try {
          const response = await postToMeta();
          console.log(`[SendWhatsAppOficialMessage] Resposta Meta:`, response.data);
          sendMessage = { idMessageWhatsApp: [response.data.messages[0].id] };
        } catch (err: any) {
          const metaError = err.response?.data?.error;
          console.error(
            `[SendWhatsAppOficialMessage] Erro Axios:`,
            err.response?.data || err.message
          );

          if (metaError?.code === 133010) {
            const reg = await registerWhatsAppCloudPhone(wapp);
            if (reg.success) {
              const retryResponse = await postToMeta();
              console.log(
                `[SendWhatsAppOficialMessage] Enviado após registro Cloud API:`,
                retryResponse.data
              );
              sendMessage = {
                idMessageWhatsApp: [retryResponse.data.messages[0].id]
              };
            } else {
              throw new Error(
                JSON.stringify({
                  ...metaError,
                  registerError: reg.error,
                  hint:
                    "Número não registrado na Cloud API. Configure META_WABA_REGISTER_PIN (6 dígitos) se o número já tiver 2FA na Meta, ou use Reparar conexão."
                })
              );
            }
          } else {
            throw new Error(JSON.stringify(metaError || err.message));
          }
        }
      }

      if (!sendMessage) {
        throw new AppError("ERR_SENDING_WAPP_MSG");
      }
    }

    await ticket.update({
      lastMessage: !bodyMsg && (!!media || type === 'template') ? bodyTicket : bodyMsg,
      fromMe: true,
      imported: null,
      unreadMessages: 0
    });

    const wid: any = sendMessage

    const bodyMessage = !isNil(vCard) ? vcard : !bodyMsg ? '' : bodyMsg;
    const messageData = {
      wid: wid?.idMessageWhatsApp[0],
      ticketId: ticket.id,
      contactId: contact.id,
      body: type === 'interactive' ? bodyToSave : (type === 'template' ? bodyTicket : bodyMessage),
      fromMe: true,
      mediaType: mediaType,
      mediaUrl: !!media ? media.filename : null,
      read: true,
      quotedMsgId: quotedMsg?.id || null,
      ack: 2,
      channel: 'whatsapp_oficial',
      remoteJid: `${contact.number}@s.whatsapp.net`,
      participant: null,
      dataJson: JSON.stringify(
        type === "interactive" && interative
          ? { interactive: interative }
          : type === "template" && template
            ? { template }
            : body
      ),
      ticketTrakingId: null,
      isPrivate: false,
      createdAt: new Date().toISOString(),
      ticketImported: ticket.imported,
      isForwarded: false,
      originalName: !!media ? media.filename : null
    };

    await CreateMessageService({ messageData, companyId: ticket.companyId });

    return sendMessage;
  } catch (err: any) {
    console.log(`[SendWhatsAppOficialMessage] Erro Catch Principal:`, err);

    if (err instanceof AppError) {
      throw err;
    }

    // Tenta extrair o erro da resposta da Meta
    if (err.response && err.response.data && err.response.data.error) {
        const metaError = err.response.data.error;
        let errorMessage = metaError.message || JSON.stringify(metaError);
        const errorDetails = metaError.error_data ? JSON.stringify(metaError.error_data) : '';
        
        if (metaError.code === 190) {
            errorMessage =
              "Token Meta expirado ou inválido (#190). Use Reparar conexão ou refaça o Embedded Signup / cole um System User Token permanente.";
        }
        if (metaError.code === 133010) {
            errorMessage =
              "Número não registrado na WhatsApp Cloud API. Clique em Reparar conexão (nuvem) ou salve a conexão de novo. Se o número já tem PIN 2FA na Meta, defina META_WABA_REGISTER_PIN no servidor com esse PIN.";
        }
        if (metaError.code === 131047) {
          throw new AppError(
            "Fora da janela de 24h: a Meta só aceita Template aprovado. Use o menu WhatsApp → Template Meta.",
            400
          );
        }
        if (metaError.code === 131005) {
          throw new AppError(
            "Meta recusou o envio (Access denied #131005). Atualize o token permanente da conexão (permissões whatsapp_business_messaging) ou use Reparar conexão. Se a janela 24h estiver fechada, envie um Template Meta.",
            400
          );
        }
        if (metaError.code === 132012) {
          throw new AppError(
            "Parâmetros do template não batem com o formato aprovado na Meta (#132012). Confira variáveis do HEADER (texto vs link de mídia), BODY na ordem {{1}}, {{2}}… e botões dinâmicos (URL/cupom).",
            400
          );
        }

        console.error(`[SendWhatsAppOficialMessage] Erro Meta Detalhado: ${errorMessage} ${errorDetails}`);
        
        // Retorna o erro exato da Meta para o frontend
        throw new AppError(`Erro Meta: ${errorMessage} ${errorDetails}`, 400);
    }

    // Se for erro de rede ou outro sem response
    if (err.message) {
        const parsed = (() => {
          try {
            return JSON.parse(err.message);
          } catch {
            return null;
          }
        })();
        if (parsed?.code === 190) {
          throw new AppError(
            "ERR_META_TOKEN_INVALID: Token Meta expirado ou inválido. Atualize o token na conexão WhatsApp API Oficial.",
            400
          );
        }
        if (parsed?.code === 133010) {
          throw new AppError(
            parsed.hint ||
              "Número não registrado na WhatsApp Cloud API. Use Reparar conexão na tela de Conexões.",
            400
          );
        }
        if (parsed?.code === 131047) {
          throw new AppError(
            "Fora da janela de 24h: a Meta só aceita Template aprovado. Use o menu WhatsApp → Template Meta.",
            400
          );
        }
        if (parsed?.code === 131005) {
          throw new AppError(
            "Meta recusou o envio (Access denied #131005). Atualize o token permanente da conexão (permissões whatsapp_business_messaging) ou use Reparar conexão. Se a janela 24h estiver fechada, envie um Template Meta.",
            400
          );
        }
        throw new AppError(
          String(err.message).includes("código") ||
            String(err.message).toLowerCase().includes("meta") ||
            String(err.message).includes("janela") ||
            String(err.message).includes("Template")
            ? String(err.message)
            : `Não foi possível enviar pelo WhatsApp Oficial: ${err.message}`,
          400
        );
    }
    
    throw new AppError(
      "Não foi possível enviar a mensagem pelo WhatsApp Oficial. Tente novamente."
    );
  }

}

export default SendWhatsAppOficialMessage;
