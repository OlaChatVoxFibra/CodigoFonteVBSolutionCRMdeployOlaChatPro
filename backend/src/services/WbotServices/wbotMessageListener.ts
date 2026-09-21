/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path, { join } from "path";
import { readFile } from "fs";
import fs from "fs";
import { promises as fsp } from "fs";
import * as Sentry from "@sentry/node";
import { isNil, isNull } from "lodash";
import { clearCampaignTicketAgentFlags } from "../../helpers/ticketAiAgentPreview";

import {
  downloadMediaMessage,
  extractMessageContent,
  getContentType,
  GroupMetadata,
  jidNormalizedUser,
  delay,
  MediaType,
  MessageUpsertType,
  proto,
  WAMessage,
  WAMessageStubType,
  WAMessageUpdate,
  WASocket
} from "baileys";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import { Mutex } from "async-mutex";
import { getIO } from "../../libs/socket";
import CreateMessageService from "../MessageServices/CreateMessageService";
import logger from "../../utils/logger";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { debounce } from "../../helpers/Debounce";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import formatBody from "../../helpers/Mustache";
import {
  buildQueueEntryMessageText,
  resolveQueueEntryMessageTemplate,
  resolveShouldSendQueueEntryMessage
} from "../../helpers/queueEntryMessage";
import TicketTraking from "../../models/TicketTraking";
import UserRating from "../../models/UserRating";
import SendWhatsAppMessage from "./SendWhatsAppMessage";
import { sendFacebookMessage } from "../FacebookServices/sendFacebookMessage";
import moment from "moment";
import Queue from "../../models/Queue";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import VerifyCurrentSchedule from "../CompanyService/VerifyCurrentSchedule";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import { Op } from "sequelize";
import { campaignQueue, agentInboundQueue, parseToMilliseconds, randomValue } from "../../queues";
import User from "../../models/User";
import { sayChatbot } from "./ChatBotListener";
import MarkDeleteWhatsAppMessage from "./MarkDeleteWhatsAppMessage";
import ListUserQueueServices from "../UserQueueServices/ListUserQueueServices";
import cacheLayer from "../../libs/cache";
import { addLogs } from "../../helpers/addLogs";
import SendWhatsAppMedia, { getMessageOptions } from "./SendWhatsAppMedia";

import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import { createDialogflowSessionWithModel } from "../QueueIntegrationServices/CreateSessionDialogflow";
import { queryDialogFlow } from "../QueueIntegrationServices/QueryDialogflow";
import CompaniesSettings from "../../models/CompaniesSettings";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import Whatsapp from "../../models/Whatsapp";
import QueueIntegrations from "../../models/QueueIntegrations";
import ShowFileService from "../FileServices/ShowService";

import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import typebotListener from "../TypebotServices/typebotListener";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import pino from "pino";
import axios from "axios";
import BullQueues from "../../libs/queue";
import { REDIS_URI_MSG_CONN } from "../../config/redis";
import { Transform } from "stream";
// import { msgDB } from "../../libs/wbot";
import { title } from "process";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { IConnections, INodes } from "../WebhookService/DispatchWebHookService";
import { FlowDefaultModel } from "../../models/FlowDefault";
import { ActionsWebhookService } from "../WebhookService/ActionsWebhookService";
import { WebhookModel } from "../../models/Webhook";
import { FlowCampaignModel } from "../../models/FlowCampaign";
import ShowContactService from "../ContactServices/ShowContactService";

import { ENABLE_LID_DEBUG } from "../../config/debug";
import {
  OPENAI_DEFAULT_CHAT_MODEL,
  AGENT_OUTBOUND_BUBBLE_DELAY_MS,
  AGENT_OUTBOUND_BUBBLE_MAX_CHARS
} from "../../config/openAiDefaults";
import { normalizeJid } from "../../utils";
import {
  handleOpenAiFlow,
  tryScheduleMeeting,
  getExtensionsForWhatsappAgentPrompt,
  buildAgentRoleInstructionLines,
  applyPromptIntegrationAgentTransfer,
  getAgentActionsFromPromptProdutividade,
  isPromptIntegrationTransferConfigured
} from "../IntegrationsServices/OpenAiService";
import { buildWhatsappPromptScopePreamble } from "../../helpers/whatsappPromptPreamble";
import {
  WHATSAPP_AGENT_AGGREGATED_DOCUMENT_BRIDGE,
  WHATSAPP_AGENT_CONVERSATION_POLICY
} from "../../helpers/whatsappAgentConversationPolicy";
import {
  AGENT_CONSULTIVE_MODE_DIRECTIVE_PT,
  isAgentRoteiroRuntimeActive
} from "../../helpers/agentRoteiroRuntime";
import {
  buildAttendanceFlowLlmAnchor,
  normalizeAttendanceFlowMemory,
  isTrivialFlowInboundNoise
} from "../../helpers/agentAttendanceFlowMemory";
import { stripAgentFlowScriptTrainingMarkers } from "../../helpers/stripAgentFlowScriptTrainingMarkers";
import { sanitizeAgentCustomerVisibleText } from "../../helpers/sanitizeAgentCustomerVisibleText";
import { buildConversationContextDigest } from "../../helpers/conversationContextDigest";
import { updateAgentConversationalMemory } from "../../helpers/agentConversationalMemory";
import {
  classifyAgentOutbound,
  registerPendingIntents,
  shouldRunSmartActionTriggersForPrompt,
  filterIntentsToEnabledSmartActions
} from "../PromptServices/IntentTriggerEngine";
import { resolvePendingIntents } from "../PromptServices/PendingIntentResolver";
import {
  shouldSendOutbound,
  recordSentOutbound,
  isAgentOutboundGuardEnabled
} from "../PromptServices/AgentOutboundGuard";
import { onAgentUserInboundText } from "../AgentProactiveServices/onUserInboundAgent";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";
import { getJidOf, resolveReplyJid } from "./getJidOf";
import { verifyContact } from "./verifyContact";
// import { verifyContact } from "./verifyContact";
import os from "os";
import request from "request";
import { Session } from "../../libs/wbot";
import { getGroupMetadataCache, groupMetadataCache, updateGroupMetadataCache } from "../../utils/RedisGroupCache";
import sgpListenerOficial from "../IntegrationsServices/Sgp/sgpListenerOficial";
import { format } from "date-fns";
import { tryHandlePromptAttendanceFlowTurn } from "../PromptServices/AttendanceFlowTurnService";
import { postGenerationGuard } from "../PromptServices/AttendanceFlowSingleTurnGuard";
import ShowPromptService from "../PromptServices/ShowPromptService";
import ShowCompanyService from "../CompanyService/ShowCompanyService";
import { expandAgentScriptPlaceholders } from "../../helpers/agentScriptPlaceholders";
import { resolveOwnedPromptBlobsForRuntime } from "../../helpers/promptJsonOwner";
import { syncTicketConnectionAgentContext } from "../../helpers/syncTicketConnectionAgentContext";
import {
  resolveConnectionAgentFromWhatsapp,
  whatsappHasConnectionAgent
} from "../../providers/anthropic/services/resolveConnectionAgent";
import { ensureConnectionAgentTicketState } from "../../helpers/ensureConnectionAgentTicketState";
import { buildWhereForConnectionAgentHistory } from "../../helpers/connectionAiMessageHistory";
import { logAiCallDebug } from "../../helpers/aiCallDebugLog";
import {
  assistantTextImpliesTransferToHuman,
  truncateAssistantResponseAfterDeclaredTransfer
} from "../../helpers/assistantTransferIntent";
import { clipPrematureAssistantProgressAfterQuestion } from "../../helpers/whatsappAssistantSingleTurnReply";
import {
  applyAgentOrchestratorGuardrails,
  runAgentOrchestrator,
  runProviderDirectReplyFallback,
  splitAgentReplyIntoSmartBlocks,
  isAgentLlmFirstRuntimeEnabled
} from "../PromptServices/AgentOrchestratorService";
import {
  markAgentProcessingFinished,
  markAgentProcessingStarted
} from "../PromptServices/AgentProcessingStateService";
import { enqueueAgentInboundJob, isAgentInboundQueueEnabled } from "../PromptServices/AgentInboundQueueService";
import { markTicketUnderAgentAttendance } from "../TicketServices/markTicketUnderAgentAttendance";
import { sendGeminiImagesToWhatsapp } from "../../providers/gemini/agents/geminiWhatsappMedia";

let ffmpegPath: string;
if (os.platform() === "win32") {
  // Windows
  ffmpegPath = "C:\\ffmpeg\\ffmpeg.exe"; // Substitua pelo caminho correto no Windows
} else if (os.platform() === "darwin") {
  // macOS
  ffmpegPath = "/opt/homebrew/bin/ffmpeg"; // Substitua pelo caminho correto no macOS
} else {
  // Outros sistemas operacionais (Linux, etc.)
  ffmpegPath = "/usr/bin/ffmpeg"; // Substitua pelo caminho correto em sistemas Unix-like
}
ffmpeg.setFfmpegPath(ffmpegPath);

let i = 0;

setInterval(() => {
  i = 0;
}, 5000);

interface ImessageUpsert {
  messages: proto.IWebMessageInfo[];
  type: MessageUpsertType;
}

export interface IExtendedMessageKey extends proto.IMessageKey {
  sender_lid?: string;
  participant_lid?: string;
  sender_pn?: string;
  participant_pn?: string;
  peer_recipient_pn?: string
}

export interface IMe {
  name: string;
  id: string;
  lid?: string;
  senderPn?: string;
}

const lidUpdateMutex = new Mutex();

// Adicionar depois das interfaces existentes:
interface PhraseCondition {
  text: string;
  type: "exact" | "partial";
}

interface CampaignPhrase {
  id: number;
  flowId: number;
  phrase: PhraseCondition[];
  whatsappId: number;
  status: boolean;
  companyId: number;
}



// Removido promisify(writeFile); usando fs.promises.writeFile

function removeFile(directory) {
  fs.unlink(directory, error => {
    if (error) throw error;
  });
}

const getTimestampMessage = (msgTimestamp: any) => {
  return msgTimestamp * 1;
};

const multVecardGet = function (param: any) {
  let output = " ";

  let name = param
    .split("\n")[2]
    .replace(";;;", "\n")
    .replace("N:", "")
    .replace(";", "")
    .replace(";", " ")
    .replace(";;", " ")
    .replace("\n", "");
  let inicio = param.split("\n")[4].indexOf("=");
  let fim = param.split("\n")[4].indexOf(":");
  let contact = param
    .split("\n")[4]
    .substring(inicio + 1, fim)
    .replace(";", "");
  let contactSemWhats = param.split("\n")[4].replace("item1.TEL:", "");
  //console.log(contact);
  if (contact != "item1.TEL") {
    output = output + name + ": 📞" + contact + "" + "\n";
  } else output = output + name + ": 📞" + contactSemWhats + "" + "\n";
  return output;
};

const contactsArrayMessageGet = (msg: any) => {
  let contactsArray = msg.message?.contactsArrayMessage?.contacts;
  let vcardMulti = contactsArray.map(function (item, indice) {
    return item.vcard;
  });

  let bodymessage = ``;
  vcardMulti.forEach(function (vcard, indice) {
    bodymessage += vcard + "\n\n" + "";
  });

  let contacts = bodymessage.split("BEGIN:");

  contacts.shift();
  let finalContacts = "";
  for (let contact of contacts) {
    finalContacts = finalContacts + multVecardGet(contact);
  }

  return finalContacts;
};

const getTypeMessage = (msg: proto.IWebMessageInfo): string => {
  let msgType = getContentType(msg.message) as string;
  // Contas comerciais / WhatsApp Business: texto pode vir só em template ou hydrated (getContentType não retorna esses casos).
  if (!msgType && msg.message?.templateMessage) {
    msgType = "templateMessage";
  }
  if (!msgType && (msg.message as any)?.hydratedContentText) {
    msgType = "hydratedContentText";
  }
  if (msg.message?.extendedTextMessage && msg.message?.extendedTextMessage?.contextInfo && msg.message?.extendedTextMessage?.contextInfo?.externalAdReply) {
    return 'adMetaPreview'; // Adicionado para tratar mensagens de anúncios;
  }
  if (msg.message?.viewOnceMessageV2) {
    return "viewOnceMessageV2";
  }
  return msgType;
};
const getAd = (msg: any): string => {
  if (
    msg.key.fromMe &&
    msg.message?.listResponseMessage?.contextInfo?.externalAdReply
  ) {
    let bodyMessage = `*${msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title}*`;

    bodyMessage += `\n\n${msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.body}`;

    return bodyMessage;
  }
};

const getBodyButton = (msg: any): string => {
  try {
    if (
      msg?.messageType === "buttonsMessage" ||
      msg?.message?.buttonsMessage?.contentText
    ) {
      let bodyMessage = `[BUTTON]\n\n*${msg?.message?.buttonsMessage?.contentText}*\n\n`;
      // eslint-disable-next-line no-restricted-syntax
      for (const button of msg.message?.buttonsMessage?.buttons) {
        bodyMessage += `*${button.buttonId}* - ${button.buttonText.displayText}\n`;
      }

      return bodyMessage;
    }
    if (
      msg?.messageType === "listMessage" ||
      msg?.message?.listMessage?.description
    ) {
      let bodyMessage = `[LIST]\n\n*${msg?.message?.listMessage?.description}*\n\n`;
      // eslint-disable-next-line no-restricted-syntax
      for (const button of msg.message?.listMessage?.sections[0]?.rows) {
        bodyMessage += `${button.title}\n`;
      }

      return bodyMessage;
    }
  } catch (error) {
    logger.error(error);
  }
};

const msgLocation = (image, latitude, longitude) => {
  if (image) {
    var b64 = Buffer.from(image).toString("base64");

    let data = `data:image/png;base64, ${b64} | https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17&hl=pt-BR|${latitude}, ${longitude} `;
    return data;
  }
};

export const getBodyMessage = (msg: proto.IWebMessageInfo): string | null => {
  try {
    const msgType = getTypeMessage(msg);
    if (msgType === undefined) console.log(JSON.stringify(msg));
    
    // DEBUG: Log de mensagem recebida
    console.log(`[RDS-DEBUG] Recebida mensagem do Baileys: ID=${msg.key.id}, JID=${msg.key.remoteJid}, Tipo=${msgType}`);

    const types = {
      conversation: msg.message?.conversation,
      imageMessage: msg.message?.imageMessage?.caption,
      videoMessage: msg.message?.videoMessage?.caption,
      extendedTextMessage: msg?.message?.extendedTextMessage?.text,
      buttonsResponseMessage:
        msg.message?.buttonsResponseMessage?.selectedDisplayText,
      listResponseMessage:
        msg.message?.listResponseMessage?.title ||
        msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      templateButtonReplyMessage:
        msg.message?.templateButtonReplyMessage?.selectedId,
      messageContextInfo:
        msg.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message?.listResponseMessage?.title,
      buttonsMessage:
        getBodyButton(msg) || msg.message?.listResponseMessage?.title,
      stickerMessage: "sticker",
      contactMessage: msg.message?.contactMessage?.vcard,
      contactsArrayMessage:
        msg.message?.contactsArrayMessage?.contacts &&
        contactsArrayMessageGet(msg),
      //locationMessage: `Latitude: ${msg.message.locationMessage?.degreesLatitude} - Longitude: ${msg.message.locationMessage?.degreesLongitude}`,
      locationMessage: msgLocation(
        msg.message?.locationMessage?.jpegThumbnail,
        msg.message?.locationMessage?.degreesLatitude,
        msg.message?.locationMessage?.degreesLongitude
      ),
      liveLocationMessage: `Latitude: ${msg.message?.liveLocationMessage?.degreesLatitude} - Longitude: ${msg.message?.liveLocationMessage?.degreesLongitude}`,
      documentMessage: msg.message?.documentMessage?.caption,
      audioMessage: "Áudio",
      listMessage:
        getBodyButton(msg) || msg.message?.listResponseMessage?.title,
      viewOnceMessage: getBodyButton(msg),
      reactionMessage: msg.message?.reactionMessage?.text || "reaction",
      senderKeyDistributionMessage:
        msg?.message?.senderKeyDistributionMessage
          ?.axolotlSenderKeyDistributionMessage,
      documentWithCaptionMessage:
        msg.message?.documentWithCaptionMessage?.message?.documentMessage
          ?.caption,
      viewOnceMessageV2:
        msg.message?.viewOnceMessageV2?.message?.imageMessage?.caption,
      adMetaPreview: msgAdMetaPreview(
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.thumbnail,
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.title,
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.body,
        msg.message?.extendedTextMessage?.contextInfo?.externalAdReply?.sourceUrl,
        msg.message?.extendedTextMessage?.text
      ),
      editedMessage:
        msg?.message?.protocolMessage?.editedMessage?.conversation ||
        msg?.message?.editedMessage?.message?.protocolMessage?.editedMessage
          ?.conversation,
      ephemeralMessage:
        msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text,
      imageWhitCaptionMessage:
        msg?.message?.ephemeralMessage?.message?.imageMessage,
      highlyStructuredMessage: msg.message?.highlyStructuredMessage,
      protocolMessage:
        msg?.message?.protocolMessage?.editedMessage?.conversation,
      advertising:
        getAd(msg) ||
        msg.message?.listResponseMessage?.contextInfo?.externalAdReply?.title,
      templateMessage: (() => {
        try {
          const inner = extractMessageContent(msg.message) as any;
          if (inner?.conversation) return String(inner.conversation);
          if (inner?.extendedTextMessage?.text) return String(inner.extendedTextMessage.text);
          const t = msg.message?.templateMessage as any;
          const ht = t?.hydratedTemplate || t?.hydratedFourRowTemplate || t?.fourRowTemplate;
          if (ht?.hydratedContentText) return String(ht.hydratedContentText);
          if (ht?.hydratedTitleText) return String(ht.hydratedTitleText);
          if (typeof ht?.body === "string") return ht.body;
        } catch {
          /* ignore */
        }
        return "[Mensagem de template comercial]";
      })(),
      hydratedContentText: String((msg.message as any)?.hydratedContentText || "").trim() || "[Mensagem comercial]"
    };

    const objKey = Object.keys(types).find(key => key === msgType);

    if (!objKey) {
      logger.warn(
        `#### Nao achou o type 152: ${msgType} ${JSON.stringify(msg.message)}`
      );
      Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, type: msgType });
      Sentry.captureException(
        new Error("Novo Tipo de Mensagem em getTypeMessage")
      );
    }
    return types[msgType];
  } catch (error) {
    Sentry.setExtra("Error getTypeMessage", { msg, BodyMsg: msg?.message });
    Sentry.captureException(error);
    console.log(error);
  }
};

const msgAdMetaPreview = (image, title, body, sourceUrl, messageUser) => {
  if (image) {
    var b64 = Buffer.from(image).toString("base64");
    let data = `data:image/png;base64, ${b64} | ${sourceUrl} | ${title} | ${body} | ${messageUser}`;
    return data;
  }
};

export const getQuotedMessage = (msg: proto.IWebMessageInfo) => {
  const body = extractMessageContent(msg.message)[
    Object.keys(msg?.message).values().next().value
  ];

  if (!body?.contextInfo?.quotedMessage) return;
  const quoted = extractMessageContent(
    body?.contextInfo?.quotedMessage[
    Object.keys(body?.contextInfo?.quotedMessage).values().next().value
    ]
  );

  return quoted;
};

export const getQuotedMessageId = (msg: proto.IWebMessageInfo) => {
  const body = extractMessageContent(msg.message)[
    Object.keys(msg?.message).values().next().value
  ];
  let reaction = msg?.message?.reactionMessage
    ? msg?.message?.reactionMessage?.key?.id
    : "";

  return reaction ? reaction : body?.contextInfo?.stanzaId;
};

const getMeSocket = (wbot: Session): IMe => {
  return {
    id: jidNormalizedUser((wbot as WASocket).user.id),
    name: (wbot as WASocket).user.name
  };
};

const getSenderMessage = (
  msg: proto.IWebMessageInfo,
  wbot: Session
): string => {
  const me = getMeSocket(wbot);
  if (msg.key.fromMe) return me.id;

  const key: IExtendedMessageKey = msg.key;
  console.log("[DEBUG RODRIGO] key", key.participant_pn, msg.participant, key.participant, key.remoteJid)
  const senderId =
    key.participant_pn || msg.participant || key.participant || key.remoteJid || undefined;

  return senderId && jidNormalizedUser(senderId);
};

const normalizeContactIdentifier = (msg: proto.IWebMessageInfo): string => {
  // @ts-ignore: lid pode não estar definido no tipo, mas existe na versão mais recente
  return normalizeJid(msg.key.sender_lid || msg.key.remoteJid);
};

const getContactMessage = async (msg: proto.IWebMessageInfo, wbot: Session) => {
  const key: IExtendedMessageKey = msg.key;

  const isGroup = msg.key.remoteJid.includes("g.us");
  const rawNumber = msg.key.remoteJid.replace(/\D/g, "");
  console.log("[DEBUG RODRIGO] key", JSON.stringify(key, null, 2));

  const lid =
    (key.sender_lid && key.sender_lid.includes("@lid") && key.sender_lid) ||
    (key.participant_lid &&
      key.participant_lid.includes("@lid") &&
      key.participant_lid) ||
    (key.remoteJid && key.remoteJid.includes("@lid") && key.remoteJid) ||
    null;

  // Baileys pode enviar senderPn (camel) ou sender_pn (snake)
  const senderPnRaw =
    (key as any).senderPn ||
    key.sender_pn ||
    (key as any).participantPn ||
    key.participant_pn ||
    (key as any).peer_recipient_pn ||
    null;
  const senderPn =
    senderPnRaw && String(senderPnRaw).length > 0 ? String(senderPnRaw) : null;

  console.log("[DEBUG RODRIGO] senderPn", senderPn);

  // Contato individual: preferir telefone real (senderPn); senão LID nativo; nunca inventar @s.whatsapp.net a partir do LID
  let contactId: string;
  if (isGroup) {
    contactId = getSenderMessage(msg, wbot);
  } else if (senderPn) {
    contactId = senderPn;
  } else if (key.remoteJid && !key.remoteJid.includes("@lid")) {
    contactId = key.remoteJid;
  } else {
    // Tentar mapear LID → PN via repositório Signal do Baileys
    try {
      const lidMapping = (wbot as any)?.signalRepository?.lidMapping;
      const pnFromLid =
        (lidMapping?.getPNForLID &&
          (await lidMapping.getPNForLID(key.remoteJid))) ||
        (lidMapping?.getPNForLID && lid && (await lidMapping.getPNForLID(lid)));
      if (pnFromLid) {
        contactId = String(pnFromLid);
        console.log("[DEBUG RODRIGO] PN via lidMapping", contactId);
      } else {
        contactId = lid || key.remoteJid;
      }
    } catch {
      contactId = lid || key.remoteJid;
    }
  }

  console.log("[DEBUG RODRIGO] remoteJid/contactId", contactId);

  return isGroup
    ? {
        id: contactId,
        name: msg.pushName,
        lid: lid
      }
    : {
        id: contactId,
        name: msg.key.fromMe ? rawNumber : msg.pushName,
        lid: lid
      };
};

function findCaption(obj) {
  if (typeof obj !== "object" || obj === null) {
    return null;
  }

  for (const key in obj) {
    if (key === "caption" || key === "text" || key === "conversation") {
      return obj[key];
    }

    const result = findCaption(obj[key]);
    if (result) {
      return result;
    }
  }

  return null;
}

const allowedMimeTypes = [
  "text/plain",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/postscript",
  "application/x-zip-compressed",
  "application/zip",
  "application/octet-stream",
  "application/x-mtx",
  "application/x-aud",
  "application/x-rul",
  "application/x-exp",
  "application/x-plt",
  "application/x-mdl",
  "image/vnd.adobe.photoshop",
  "application/x-photoshop",
  "image/x-photoshop",
  "application/vnd.corel-draw",
  "application/illustrator",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "application/vnd.ms-word.document.macroEnabled.12",
  "application/x-msdownload",
  "application/x-executable",
  "application/x-ret"
];

const downloadMedia = async (
  msg: proto.IWebMessageInfo,
  isImported: Date = null,
  wbot: Session
) => {
  const mineType =
    msg.message?.imageMessage ||
    msg.message?.audioMessage ||
    msg.message?.videoMessage ||
    msg.message?.stickerMessage ||
    msg.message?.ephemeralMessage?.message?.stickerMessage ||
    msg.message?.documentMessage ||
    msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
    msg.message?.ephemeralMessage?.message?.audioMessage ||
    msg.message?.ephemeralMessage?.message?.documentMessage ||
    msg.message?.ephemeralMessage?.message?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.imageMessage ||
    msg.message?.viewOnceMessage?.message?.imageMessage ||
    msg.message?.viewOnceMessage?.message?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.imageMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.videoMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.audioMessage ||
    msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
      ?.documentMessage ||
    msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
    msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
    msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
    msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
    msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
    msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
    msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
    msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
    msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
    msg.message?.interactiveMessage?.header?.imageMessage ||
    msg.message?.interactiveMessage?.header?.documentMessage ||
    msg.message?.interactiveMessage?.header?.videoMessage;

  let filename =
    msg.message?.documentMessage?.fileName ||
    msg.message?.documentWithCaptionMessage?.message?.documentMessage
      ?.fileName ||
    msg.message?.extendedTextMessage?.text ||
    "";

  if (!filename && msg.message?.documentMessage?.title) {
    filename = msg.message.documentMessage.title;
  }

  // Se for um documento e tiver extensão, verifica se é permitido
  if (msg.message?.documentMessage && filename) {
    const ext = filename.split(".").pop().toLowerCase();
    const isAllowedExt = [
      "mtx",
      "aud",
      "rul",
      "exp",
      "zip",
      "plt",
      "mdl",
      "pdf",
      "psd",
      "cdr",
      "ai",
      "xls",
      "xlsx",
      "xlsm",
      "doc",
      "docx",
      "docm",
      "txt",
      // Novos formatos
      "odt",
      "ods",
      "odp",
      "odg",
      "xml",
      "ofx",
      "rtf",
      "csv",
      "html",
      "json",
      "rar",
      "7z",
      "tar",
      "gz",
      "bz2",
      "msg",
      "key",
      "numbers",
      "pages",
      "ppt",
      "pptx",
      // Executáveis e arquivos compactados
      "exe",
      // Imagens como documento
      "png",
      "jpg",
      "jpeg",
      "gif",
      "bmp",
      "webp",
      "dwg",
      "pfx",
      "p12",
      "ret"
    ].includes(ext);

    if (!isAllowedExt) {
      throw new Error("Invalid file type");
    }
  }

  if (!filename) {
    const mimeToExt = {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        "docx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        "xlsx",
      "application/vnd.ms-excel": "xls",
      "application/msword": "doc",
      "application/pdf": "pdf",
      "text/plain": "txt",
      "image/vnd.adobe.photoshop": "psd",
      "application/x-photoshop": "psd",
      "application/photoshop": "psd",
      "application/psd": "psd",
      "image/psd": "psd",
      "application/vnd.oasis.opendocument.text": "odt",
      "application/vnd.oasis.opendocument.spreadsheet": "ods",
      "application/vnd.oasis.opendocument.presentation": "odp",
      "application/vnd.oasis.opendocument.graphics": "odg",
      "application/xml": "xml",
      "text/xml": "xml",
      "application/ofx": "ofx",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        "pptx",
      "application/rtf": "rtf",
      "text/csv": "csv",
      "text/html": "html",
      "application/json": "json",
      "application/zip": "zip",
      "application/x-rar-compressed": "rar",
      "application/x-7z-compressed": "7z",
      "application/x-tar": "tar",
      "application/gzip": "gz",
      "application/x-bzip2": "bz2",
      "application/vnd.ms-outlook": "msg",
      "application/vnd.apple.keynote": "key",
      "application/vnd.apple.numbers": "numbers",
      "application/vnd.apple.pages": "pages",
      "application/x-msdownload": "exe",
      "application/x-executable": "exe",
      "application/acad": "dwg",
      "image/vnd.dwg": "dwg",
      "application/dwg": "dwg",
      "application/x-dwg": "dwg",
      "image/x-dwg": "dwg",
      "application/x-pkcs12": "pfx",
      "application/pkcs-12": "pfx",
      "application/pkcs12": "pfx",
      "application/x-pkcs-12": "pfx",
      "application/pfx": "pfx"
    };

    const ext =
      mimeToExt[mineType.mimetype] ||
      mineType.mimetype.split("/")[1].split(";")[0];
    const shortId = String(new Date().getTime()).slice(-4);
    filename = `file_${shortId}.${ext}`;
  } else {
    const ext = filename.split(".").pop();
    const name = filename
      .split(".")
      .slice(0, -1)
      .join(".")
      .replace(/\s/g, "_")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const sanitizedName = `${name.trim()}.${ext}`;
    const folder = path.resolve(
      __dirname,
      "..",
      "..",
      "..",
      "public",
      `company${msg.key.remoteJid?.split("@")[0]}`
    );

    if (fs.existsSync(path.join(folder, sanitizedName))) {
      let counter = 1;
      let newName = `${name.trim()}_${counter}.${ext}`;

      while (fs.existsSync(path.join(folder, newName)) && counter < 100) {
        counter++;
        newName = `${name.trim()}_${counter}.${ext}`;
      }

      filename = newName;
    } else {
      filename = sanitizedName;
    }
  }

  if (msg.message?.stickerMessage) {
    const urlAnt = "https://web.whatsapp.net";
    const directPath = msg.message?.stickerMessage?.directPath;
    const newUrl = "https://mmg.whatsapp.net";
    const final = newUrl + directPath;
    if (msg.message?.stickerMessage?.url?.includes(urlAnt)) {
      msg.message.stickerMessage.url = msg.message?.stickerMessage.url.replace(
        urlAnt,
        final
      );
    }
  }

  let buffer;
  try {
    buffer = await downloadMediaMessage(
      msg,
      "buffer",
      {},
      {
        logger,
        reuploadRequest: wbot.updateMediaMessage
      }
    );
  } catch (err) {
    if (isImported) {
      console.log(
        "Falha ao fazer o download de uma mensagem importada, provavelmente a mensagem já não esta mais disponível"
      );
    } else {
      console.error("Erro ao baixar mídia:", err);
    }
  }

  const media = {
    data: buffer,
    mimetype: mineType.mimetype,
    filename
  };

  return media;
};

const checkLIDStatus = async (wbot: Session): Promise<boolean> => {
  try {
    const isLIDEnabled = wbot.user?.lid;
    return !!isLIDEnabled;
  } catch (error) {
    return false;
  }
};

const verifyQuotedMessage = async (
  msg: proto.IWebMessageInfo
): Promise<Message | null> => {
  if (!msg) return null;
  const quoted = getQuotedMessageId(msg);

  if (!quoted) return null;

  const quotedMsg = await Message.findOne({
    where: { wid: quoted }
  });

  if (!quotedMsg) return null;

  return quotedMsg;
};

export const verifyMediaMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  ticketTraking: TicketTraking,
  isForwarded: boolean = false,
  isPrivate: boolean = false,
  wbot: Session,
  fromAgent: boolean = false
): Promise<Message> => {
  const io = getIO();
  const quotedMsg = await verifyQuotedMessage(msg);
  const companyId = ticket.companyId;

  try {
    const media = await downloadMedia(msg, ticket?.imported, wbot);

    if (!media && ticket.imported) {
      const body =
        "*System:* \nFalha no download da mídia verifique no dispositivo";
      const messageData = {
        //mensagem de texto
        wid: msg.key.id,
        ticketId: ticket.id,
        contactId: msg.key.fromMe ? undefined : ticket.contactId,
        body,
        reactionMessage: msg.message?.reactionMessage,
        fromMe: msg.key.fromMe,
        mediaType: getTypeMessage(msg),
        read: msg.key.fromMe,
        quotedMsgId: quotedMsg?.id || msg.message?.reactionMessage?.key?.id,
        ack: msg.status,
        companyId: companyId,
        remoteJid: msg.key.remoteJid,
        participant: msg.key.participant,
        timestamp: getTimestampMessage(msg.messageTimestamp),
        createdAt: new Date(
          Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)
        ).toISOString(),
        dataJson: JSON.stringify(msg),
        ticketImported: ticket.imported,
        isForwarded,
        isPrivate,
        fromAgent
      };

      await ticket.update({
        lastMessage: body,
        fromMe: msg.key.fromMe
      });
      logger.error(Error("ERR_WAPP_DOWNLOAD_MEDIA"));
      return CreateMessageService({ messageData, companyId: companyId });
    }

    if (!media) {
      throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
    }

    // if (!media.filename || media.mimetype === "audio/mp4") {
    //   const ext = media.mimetype === "audio/mp4" ? "m4a" : media.mimetype.split("/")[1].split(";")[0];
    //   media.filename = `${new Date().getTime()}.${ext}`;
    // } else {
    //   // ext = tudo depois do ultimo .
    //   const ext = media.filename.split(".").pop();
    //   // name = tudo antes do ultimo .
    //   const name = media.filename.split(".").slice(0, -1).join(".").replace(/\s/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    //   media.filename = `${name.trim()}_${new Date().getTime()}.${ext}`;
    // }
    if (!media.filename) {
      const ext = media.mimetype.split("/")[1].split(";")[0];
      media.filename = `${new Date().getTime()}.${ext}`;
    } else {
      // Preserva o nome original do arquivo, apenas sanitizando caracteres especiais
      const ext = media.filename.split(".").pop();
      const name = media.filename
        .split(".")
        .slice(0, -1)
        .join(".")
        .replace(/\s/g, "_")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      // Verifica se já existe um arquivo com o mesmo nome
      const folder = path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "public",
        `company${companyId}`
      );
      const sanitizedName = `${name.trim()}.${ext}`;

      if (fs.existsSync(path.join(folder, sanitizedName))) {
        // Se já existe um arquivo com o mesmo nome, adiciona timestamp
        media.filename = `${name.trim()}_${new Date().getTime()}.${ext}`;
      } else {
        // Se não existe, mantém o nome original sanitizado
        media.filename = sanitizedName;
      }
    }

    try {
      const folder = path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "public",
        `company${companyId}`
      );

      // const folder = `public/company${companyId}`; // Correção adicionada por Altemir 16-08-2023
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true }); // Correção adicionada por Altemir 16-08-2023
        fs.chmodSync(folder, 0o777);
      }

      await fsp.writeFile(
        join(folder, media.filename),
        media.data.toString("base64"),
        "base64"
      ) // Correção adicionada por Altemir 16-08-2023
        .then(() => {
          // console.log("Arquivo salvo com sucesso!");
          if (media.mimetype.includes("audio")) {
            console.log(media.mimetype);
            const inputFile = path.join(folder, media.filename);
            let outputFile: string;

            if (inputFile.endsWith(".mpeg")) {
              outputFile = inputFile.replace(".mpeg", ".mp3");
            } else if (inputFile.endsWith(".ogg")) {
              outputFile = inputFile.replace(".ogg", ".mp3");
            } else {
              // Trate outros formatos de arquivo conforme necessário
              //console.error("Formato de arquivo não suportado:", inputFile);
              return;
            }

            return new Promise<void>((resolve, reject) => {
              ffmpeg(inputFile)
                .toFormat("mp3")
                .save(outputFile)
                .on("end", () => {
                  resolve();
                })
                .on("error", (err: any) => {
                  reject(err);
                });
            });
          }
        });
      // .then(() => {
      //   //console.log("Conversão concluída!");
      //   // Aqui você pode fazer o que desejar com o arquivo MP3 convertido.
      // })
    } catch (err) {
      Sentry.setExtra("Erro media", {
        companyId: companyId,
        ticket,
        contact,
        media,
        quotedMsg
      });
      Sentry.captureException(err);
      logger.error(err);
      console.log(msg);
    }

    const body = getBodyMessage(msg);

    const messageData = {
      wid: msg.key.id,
      ticketId: ticket.id,
      contactId: msg.key.fromMe ? undefined : contact.id,
      body: body || media.filename,
      fromMe: msg.key.fromMe,
      read: msg.key.fromMe,
      mediaUrl: media.filename,
      mediaType: getMediaTypeFromMimeType(media.mimetype),
      quotedMsgId: quotedMsg?.id,
      ack:
        Number(
          String(msg.status).replace("PENDING", "1").replace("NaN", "1")
        ) || 2,
      remoteJid: msg.key.remoteJid,
      participant: msg.key.participant,
      dataJson: JSON.stringify(msg),
      ticketTrakingId: ticketTraking?.id,
      createdAt: new Date(
        Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)
      ).toISOString(),
      ticketImported: ticket.imported,
      isForwarded,
      isPrivate,
      fromAgent
    };

    await ticket.update({
      lastMessage: body || media.filename,
      fromMe: msg.key.fromMe
    });

    // Garantir sinalização de IA/integração também para mensagens de mídia do cliente
    if (!msg.key.fromMe && ticket.status === "open" && !ticket.userId) {
      const wa =
        ticket.whatsapp || (await Whatsapp.findByPk(ticket.whatsappId));
      if (whatsappHasConnectionAgent(wa)) {
        const shouldMarkAsBot =
          ticket.isBot === true ||
          ticket.useIntegration === true ||
          !isNil(ticket.integrationId);
        if (
          !shouldMarkAsBot ||
          ticket.isBot !== true ||
          ticket.useIntegration !== true
        ) {
          await ticket.update({
            isBot: true,
            useIntegration: true
          });
        }
      }
    }

    // Rodar emissões em paralelo
    const [_, newMessage] = await Promise.all([
      io.of("/" + String(companyId))
        .emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket
        }),
      CreateMessageService({
        messageData,
        companyId: companyId
      })
    ]).catch(err => {
      logger.error("Erro nas emissões de socket em verifyMediaMessage:", err);
      return [null, null];
    });

    console.log(`[DEBUG 2026] Media message processing initiated for Ticket: ${ticket.id}`);

    if (!msg.key.fromMe && ["closed", "group", "chatbot"].includes(String(ticket.status))) {
      await ticket.update({ status: "pending" });
      await ticket.reload({
        attributes: [
          "id",
          "uuid",
          "queueId",
          "isGroup",
          "channel",
          "status",
          "contactId",
          "useIntegration",
          "lastMessage",
          "updatedAt",
          "unreadMessages",
          "companyId",
          "whatsappId",
          "imported",
          "lgpdAcceptedAt",
          "amountUsedBotQueues",
          "useIntegration",
          "integrationId",
          "userId",
          "amountUsedBotQueuesNPS",
          "lgpdSendMessageAt",
          "isBot"
        ],
        include: [
          { model: Queue, as: "queue" },
          { model: User, as: "user" },
          { model: Contact, as: "contact" },
          { model: Whatsapp, as: "whatsapp" }
        ]
      });

      io.of("/" + String(companyId))
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
      });
    }

    return newMessage;
  } catch (error) {
    console.log(error);
    logger.warn("Erro ao baixar media: ", JSON.stringify(msg));
  }
};

export const verifyMessage = async (
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  ticketTraking?: TicketTraking,
  isPrivate?: boolean,
  isForwarded: boolean = false,
  fromAgent: boolean = false
) => {
  const io = getIO();
  const quotedMsg = await verifyQuotedMessage(msg);
  let body = getBodyMessage(msg);
  const companyId = ticket.companyId;
  // Marcador invisível de campanha (\u200c): não exibir na UI nem no lastMessage do ticket.
  if (body && /\u200c/.test(body)) {
    body = body.replace(/\u200c/g, "").trimStart();
  }

  if (msg.key.fromMe) {
    const dw = ticket.dataWebhook as Record<string, unknown> | null | undefined;
    if (dw?.sourceCampaignId != null) {
      await clearCampaignTicketAgentFlags(ticket);
    }
  }

  if (msg.key.fromMe && body && msg.key.id) {
    const existingDup = await Message.findOne({
      where: {
        ticketId: ticket.id,
        companyId,
        fromMe: true,
        wid: { [Op.ne]: msg.key.id },
        createdAt: { [Op.gte]: moment().subtract(3, "minutes").toDate() },
        [Op.or]: [{ body }, { body: `\u200c ${body}` }]
      }
    });
    if (existingDup) {
      logger.debug(
        `verifyMessage: duplicata outbound ignorada (ticket ${ticket.id}, wid ${msg.key.id})`
      );
      return;
    }
  }

  const ts = getTimestampMessage(msg.messageTimestamp);
  const createdAtIso = (() => {
    try {
      const epochMs = isNaN(ts) ? Date.now() : Math.floor(ts * 1000);
      return new Date(epochMs).toISOString();
    } catch {
      return new Date().toISOString();
    }
  })();

  const messageData = {
    wid: msg.key.id,
    ticketId: ticket.id,
    contactId: msg.key.fromMe ? undefined : contact.id,
    body,
    fromMe: msg.key.fromMe,
    mediaType: getTypeMessage(msg),
    read: msg.key.fromMe,
    quotedMsgId: quotedMsg?.id,
    ack:
      Number(String(msg.status).replace("PENDING", "1").replace("NaN", "1")) ||
      1,
    remoteJid: msg.key.remoteJid,
    participant: msg.key.participant,
    dataJson: JSON.stringify(msg),
    ticketTrakingId: ticketTraking?.id,
    isPrivate,
    createdAt: createdAtIso,
    ticketImported: ticket.imported,
    isForwarded,
    fromAgent: !!fromAgent
  };

  await ticket.update({
    lastMessage: body,
    fromMe: msg.key.fromMe
  });

  if (
    !msg.key.fromMe &&
    ["closed", "group", "chatbot"].includes(String(ticket.status))
  ) {
    await ticket.update({ status: "pending" });
    await ticket.reload({
      include: [
        { model: Queue, as: "queue" },
        { model: User, as: "user" },
        { model: Contact, as: "contact" },
        { model: Whatsapp, as: "whatsapp" }
      ]
    });
  }

  console.log(`[DEBUG 2026] verifyMessage: lastMessage atualizada para ticket ${ticket.id}. Reloading ticket for socket emission...`);

  // Garantir visibilidade em "Atendendo" e continuidade do Agente na 2ª mensagem:
  // Só marcar IA quando a conexão tem agente configurado (não campanha / chatbot genérico).
  if (!msg.key.fromMe && ticket.status === "open" && !ticket.userId) {
    const wa =
      ticket.whatsapp || (await Whatsapp.findByPk(ticket.whatsappId));
    if (whatsappHasConnectionAgent(wa)) {
      const shouldMarkAsBot =
        ticket.isBot === true ||
        ticket.useIntegration === true ||
        !isNil(ticket.integrationId);
      if (!shouldMarkAsBot) {
        await ticket.update({
          isBot: true,
          useIntegration: true
        });
      } else {
        // Mesmo quando já marcado, garantir consistência mínima
        if (ticket.isBot !== true || ticket.useIntegration !== true) {
          await ticket.update({
            isBot: true,
            useIntegration: true
          });
        }
      }
    }
  }

  const ticketToEmit = await ShowTicketService(ticket.id, companyId);
  
  console.log(`[DEBUG 2026] Emitting socket for ticket ${ticket.id}: status=${ticketToEmit.status}, queueId=${ticketToEmit.queueId}, userId=${ticketToEmit.userId}`);

  // OBRIGATÓRIO aguardar: se não await, handleMessage segue para a IA enquanto a mensagem
  // ainda não foi persistida / appMessage não emitido — UI atrasada, histórico incompleto na IA e ordem estranha.
  try {
    await Promise.all([
      Promise.resolve(
        io.of("/" + String(companyId)).emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket: ticketToEmit,
          ticketId: ticket.id
        })
      ),
      CreateMessageService({ messageData, companyId: companyId })
    ]);
  } catch (err) {
    logger.error("Erro nas emissões de socket em verifyMessage:", err);
  }

  // Rastreamento de segunda interação: cliente -> agente -> cliente
  if (!msg.key.fromMe) {
    const wasOpen = ticket.status === "open";
    console.log(`[TRACK] Mensagem recebida do cliente no ticket ${ticket.id}. Status atual=${ticket.status}, userId=${ticket.userId}, queueId=${ticket.queueId}, wasOpen=${wasOpen}`);
  }

};

const isValidMsg = (msg: proto.IWebMessageInfo): boolean => {
  if (msg.key.remoteJid === "status@broadcast") return false;
  try {
    const msgType = getTypeMessage(msg);
    if (!msgType) {
      return;
    }

    const ifType =
      msgType === "conversation" ||
      msgType === "extendedTextMessage" ||
      msgType === "audioMessage" ||
      msgType === "videoMessage" ||
      msgType === "ptvMessage" ||
      msgType === "imageMessage" ||
      msgType === "documentMessage" ||
      msgType === "stickerMessage" ||
      msgType === "buttonsResponseMessage" ||
      msgType === "buttonsMessage" ||
      msgType === "messageContextInfo" ||
      msgType === "locationMessage" ||
      msgType === "liveLocationMessage" ||
      msgType === "contactMessage" ||
      msgType === "voiceMessage" ||
      msgType === "mediaMessage" ||
      msgType === "contactsArrayMessage" ||
      msgType === "reactionMessage" ||
      msgType === "ephemeralMessage" ||
      msgType === "protocolMessage" ||
      msgType === "listResponseMessage" ||
      msgType === "listMessage" ||
      msgType === "interactiveMessage" ||
      msgType === "pollCreationMessageV3" ||
      msgType === "viewOnceMessage" ||
      msgType === "documentWithCaptionMessage" ||
      msgType === "viewOnceMessageV2" ||
      msgType === "editedMessage" ||
      msgType === "advertisingMessage" ||
      msgType === "highlyStructuredMessage" ||
      msgType === "eventMessage" ||
      msgType === "adMetaPreview" ||
      msgType === "templateMessage" ||
      msgType === "hydratedContentText";

    if (!ifType) {
      logger.warn(`#### Nao achou o type em isValidMsg: ${msgType}
${JSON.stringify(msg?.message)}`);
      Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, msgType });
      Sentry.captureException(new Error("Novo Tipo de Mensagem em isValidMsg"));
    }

    return !!ifType;
  } catch (error) {
    Sentry.setExtra("Error isValidMsg", { msg });
    Sentry.captureException(error);
  }
};

const sendDialogflowAwswer = async (
  wbot: Session,
  ticket: Ticket,
  msg: WAMessage,
  contact: Contact,
  inputAudio: string | undefined,
  companyId: number,
  queueIntegration: QueueIntegrations
) => {
  const session = await createDialogflowSessionWithModel(queueIntegration);

  if (session === undefined) {
    return;
  }

  wbot.presenceSubscribe(contact.remoteJid);
  await delay(500);

  let dialogFlowReply = await queryDialogFlow(
    session,
    queueIntegration.projectName,
    contact.remoteJid,
    getBodyMessage(msg),
    queueIntegration.language,
    inputAudio
  );

  if (!dialogFlowReply) {
    wbot.sendPresenceUpdate("composing", contact.remoteJid);

    const bodyDuvida = formatBody(
      `\u200e *${queueIntegration?.name}:* Não consegui entender sua dúvida.`
    );

    await delay(1000);

    await wbot.sendPresenceUpdate("paused", contact.remoteJid);

    const sentMessage = await wbot.sendMessage(getJidOf(ticket.contact), {
      text: bodyDuvida
    });

    wbot.store(sentMessage);

    await verifyMessage(sentMessage, ticket, contact, undefined, false, false, true);
    return;
  }

  if (dialogFlowReply.endConversation) {
    await ticket.update({
      contactId: ticket.contact.id,
      useIntegration: false
    });
  }

  const image = dialogFlowReply.parameters.image?.stringValue ?? undefined;

  const react = dialogFlowReply.parameters.react?.stringValue ?? undefined;

  const audio = dialogFlowReply.encodedAudio.toString("base64") ?? undefined;

  wbot.sendPresenceUpdate("composing", contact.remoteJid);
  await delay(500);

  let lastMessage;

  for (let message of dialogFlowReply.responses) {
    lastMessage = message.text.text[0] ? message.text.text[0] : lastMessage;
  }
  for (let message of dialogFlowReply.responses) {
    if (message.text) {
      await sendDelayedMessages(
        wbot,
        ticket,
        contact,
        message.text.text[0],
        lastMessage,
        audio,
        queueIntegration
      );
    }
  }
};

async function sendDelayedMessages(
  wbot: Session,
  ticket: Ticket,
  contact: Contact,
  message: string,
  lastMessage: string,
  audio: string | undefined,
  queueIntegration: QueueIntegrations
) {
  const companyId = ticket.companyId;
  // console.log("GETTING WHATSAPP SEND DELAYED MESSAGES", ticket.whatsappId, wbot.id)
  const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);
  const farewellMessage = whatsapp.farewellMessage.replace(/[_*]/g, "");

  // if (react) {
  //   const test =
  //     /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g.test(
  //       react
  //     );
  //   if (test) {
  //     msg.react(react);
  //     await delay(1000);
  //   }
  // }
  const sentMessage = await wbot.sendMessage(`${contact.number}@c.us`, {
    text: `\u200e *${queueIntegration?.name}:* ` + message
  });

  wbot.store(sentMessage);

  await verifyMessage(sentMessage, ticket, contact, undefined, false, false, true);
  if (message != lastMessage) {
    await delay(500);
    wbot.sendPresenceUpdate("composing", contact.remoteJid);
  } else if (audio) {
    wbot.sendPresenceUpdate("recording", contact.remoteJid);
    await delay(500);

    // if (audio && message === lastMessage) {
    //   const newMedia = new MessageMedia("audio/ogg", audio);

    //   const sentMessage = await wbot.sendMessage(
    //     `${contact.number}@c.us`,
    //     newMedia,
    //     {
    //       sendAudioAsVoice: true
    //     }
    //   );

    //   await verifyMessage(sentMessage, ticket, contact);
    // }

    // if (sendImage && message === lastMessage) {
    //   const newMedia = await MessageMedia.fromUrl(sendImage, {
    //     unsafeMime: true
    //   });
    //   const sentMessage = await wbot.sendMessage(
    //     `${contact.number}@c.us`,
    //     newMedia,
    //     {
    //       sendAudioAsVoice: true
    //     }
    //   );

    //   await verifyMessage(sentMessage, ticket, contact);
    //   await ticket.update({ lastMessage: "📷 Foto" });
    // }

    if (farewellMessage && message.includes(farewellMessage)) {
      await delay(1000);
      setTimeout(async () => {
        await ticket.update({
          contactId: ticket.contact.id,
          useIntegration: true
        });
        await UpdateTicketService({
          ticketId: ticket.id,
          ticketData: { status: "closed" },
          companyId: companyId
        });
      }, 3000);
    }
  }
}

const verifyQueue = async (
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  settings?: any,
  ticketTraking?: TicketTraking
) => {
  const companyId = ticket.companyId;

  try {
    const waAgentCheck = await ShowWhatsAppService(wbot.id!, companyId);
    if (whatsappHasConnectionAgent(waAgentCheck)) {
      logger.info(
        `[verifyQueue] ticket ${ticket.id}: agente IA na conexão — fila automática ignorada`
      );
      return;
    }
  } catch {
    /* segue fluxo legado de fila */
  }

  // console.log("GETTING WHATSAPP VERIFY QUEUE", ticket.whatsappId, wbot.id)
  const {
    queues,
    greetingMessage,
    maxUseBotQueues,
    timeUseBotQueues,
    complationMessage,
    queuesEnabled,
    sendGreetingMessage
  } = await ShowWhatsAppService(wbot.id!, companyId);

  let chatbot = false;

  if (queues.length === 1 && queuesEnabled === false) {
    chatbot = queues[0]?.chatbots?.length > 1;
  }

  const enableQueuePosition = settings.sendQueuePosition === "enabled";

  const autoAssignSingle =
    queues.length >= 1 &&
    (queues.length === 1 || queuesEnabled === false) &&
    !chatbot;

  if (autoAssignSingle) {

    // integração: iniciar APENAS apos CPF no caso de SGP; outras integrações iniciam normalmente
    if (!msg.key.fromMe && !ticket.isGroup && queues[0].integrationId) {
      const integrations = await ShowQueueIntegrationService(
        queues[0].integrationId,
        companyId
      );

      if (String(integrations.type).toUpperCase() === "SGP") {
        // Não iniciar integração agora; apenas marcar integração no ticket
        await ticket.update({
          useIntegration: true,
          integrationId: integrations.id
        });
      } else {
        await handleMessageIntegration(
          msg,
          wbot,
          companyId,
          integrations,
          ticket
        );

        if (msg.key.fromMe) {
          await ticket.update({
            typebotSessionTime: moment().toDate(),
            useIntegration: true,
            integrationId: integrations.id
          });
        } else {
          await ticket.update({
            useIntegration: true,
            integrationId: integrations.id
          });
        }
      }
    }

    const greetingText = String(greetingMessage || "").trim();
    const shouldSendSimpleGreeting =
      greetingText.length > 0 &&
      (Boolean(sendGreetingMessage) ||
        (queuesEnabled === false &&
          settings.sendGreetingMessageOneQueues === "enabled"));

    if (shouldSendSimpleGreeting) {
      const body = formatBody(greetingText, ticket);

      if (ticket.whatsapp.greetingMediaAttachment !== null) {
        const filePath = path.resolve(
          "public",
          `company${companyId}`,
          ticket.whatsapp.greetingMediaAttachment
        );

        const fileExists = fs.existsSync(filePath);

        if (fileExists) {
          const messagePath = ticket.whatsapp.greetingMediaAttachment;
          const optionsMsg = await getMessageOptions(
            messagePath,
            filePath,
            String(companyId),
            body
          );
          const debouncedSentgreetingMediaAttachment = debounce(
            async () => {
              const sentMessage = await wbot.sendMessage(
                getJidOf(ticket),
                { ...optionsMsg }
              );

              wbot.store(sentMessage);

              await verifyMediaMessage(
                sentMessage,
                ticket,
                contact,
                ticketTraking,
                false,
                false,
                wbot,
                true
              );
            },
            1000,
            ticket.id
          );
          debouncedSentgreetingMediaAttachment();
        } else {
          await wbot.sendMessage(
            getJidOf(ticket),
            {
              text: body
            }
          );
        }
      } else {
        const sentMessage = await wbot.sendMessage(
          getJidOf(ticket),
          {
            text: body
          }
        );

        wbot.store(sentMessage);
      }
    }

    if (!isNil(queues[0].fileListId)) {
      try {
        const publicFolder = path.resolve(
          __dirname,
          "..",
          "..",
          "..",
          "public"
        );

        const files = await ShowFileService(
          queues[0].fileListId,
          ticket.companyId
        );

        const folder = path.resolve(
          publicFolder,
          `company${ticket.companyId}`,
          "fileList",
          String(files.id)
        );

        for (const [index, file] of files.options.entries()) {
          const mediaSrc = {
            fieldname: "medias",
            originalname: path.basename(file.path),
            encoding: "7bit",
            mimetype: file.mediaType,
            filename: file.path,
            path: path.resolve(folder, file.path)
          } as Express.Multer.File;

          await SendWhatsAppMedia({
            media: mediaSrc,
            ticket,
            body: file.name,
            isPrivate: false,
            isForwarded: false
          });
        }
      } catch (error) {
        logger.info(error);
      }
    }

    if (queues[0].closeTicket) {
      await UpdateTicketService({
        ticketData: {
          status: "closed",
          queueId: queues[0].id,
          sendFarewellMessage: false
        },
        ticketId: ticket.id,
        companyId
      });

      return;
    } else {
      await UpdateTicketService({
        ticketData: {
          queueId: queues[0].id,
          status: ticket.status === "lgpd" ? "pending" : ticket.status
        },
        ticketId: ticket.id,
        companyId
      });
    }

    const count = await Ticket.findAndCountAll({
      where: {
        userId: null,
        status: "pending",
        companyId,
        queueId: queues[0].id,
        isGroup: false
      }
    });

    if (enableQueuePosition) {
      const qtd = count.count === 0 ? 1 : count.count;
        const shouldSend = resolveShouldSendQueueEntryMessage({
          queueName: queues[0].name,
          contactName: contact?.name,
          position: qtd,
          queueEntryMessage: queues[0].queueEntryMessage,
          queueSendEntryMessage: queues[0].sendQueueEntryMessage,
          connectionSendQueueEntryMessage: ticket.whatsapp?.sendQueueEntryMessage,
          connectionQueueEntryMessage: ticket.whatsapp?.queueEntryMessage,
          companySendQueuePosition: settings.sendQueuePosition
        });

      if (shouldSend) {
        const entryTemplate = resolveQueueEntryMessageTemplate({
          queueName: queues[0].name,
          queueEntryMessage: queues[0].queueEntryMessage,
          connectionSendQueueEntryMessage: ticket.whatsapp?.sendQueueEntryMessage,
          connectionQueueEntryMessage: ticket.whatsapp?.queueEntryMessage
        });
        const msgFila = buildQueueEntryMessageText({
          queueName: queues[0].name,
          contactName: contact?.name,
          position: qtd,
          queueEntryMessage: entryTemplate
        });
        const bodyFila = formatBody(`${msgFila}`, ticket);
        const debouncedSentMessagePosicao = debounce(
          async () => {
            const sentMessage = await wbot.sendMessage(
              getJidOf(ticket),
              {
                text: bodyFila
              }
            );

            wbot.store(sentMessage);
          },
          3000,
          ticket.id
        );
        debouncedSentMessagePosicao();
      }
    }

    return;
  }

  // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
  if (contact.disableBot) {
    return;
  }

  if (queuesEnabled === false || queues.length < 2) {
    return;
  }

  let selectedOption = "";

  if (ticket.status !== "lgpd") {
    selectedOption =
      msg?.message?.buttonsResponseMessage?.selectedButtonId ||
      msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
      getBodyMessage(msg);
  } else {
    if (!isNil(ticket.lgpdAcceptedAt))
      await ticket.update({
        status: "pending"
      });

    await ticket.reload();
  }

  if (String(selectedOption).toLocaleLowerCase() === "sair") {
    // Enviar mensagem de conclusão antes de fechar para aparecer no frontend
    if (complationMessage) {
      await SendWhatsAppMessage({ body: complationMessage, ticket });
    }

    // Fechar ticket via serviço central para emitir sockets adequadamente
    await UpdateTicketService({
      ticketData: {
        isBot: false,
        status: "closed",
        // já enviamos a farewell acima
        sendFarewellMessage: false,
        amountUsedBotQueues: 0,
        useIntegration: null,
        integrationId: null,
      },
      ticketId: ticket.id,
      companyId
    });

    await ticketTraking.update({
      userId: ticket.userId,
      closedAt: moment().toDate(),
      finishedAt: moment().toDate()
    });

    await CreateLogTicketService({
      ticketId: ticket.id,
      type: "clientClosed",
      queueId: ticket.queueId
    });

    return;
  }

  let choosenQueue =
    chatbot && queues.length === 1
      ? queues[+selectedOption]
      : queues[+selectedOption - 1];

  const typeBot = settings?.chatBotType || "text";

  // Serviço p/ escolher consultor aleatório para o ticket, ao selecionar fila.
  let randomUserId;

  if (choosenQueue) {
    try {
      const userQueue = await ListUserQueueServices(choosenQueue.id);
      console.log("userQueue", userQueue.userId);
      if (userQueue.userId > -1) {
        randomUserId = userQueue.userId;
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Ativar ou desativar opção de escolher consultor aleatório.
  /*   let settings = await CompaniesSettings.findOne({
      where: {
        companyId: companyId
      }
    }); */

  const botText = async () => {
    if (choosenQueue || (queues.length === 1 && chatbot)) {
      // console.log("entrou no choose", ticket.isOutOfHour, ticketTraking.chatbotAt)
      if (queues.length === 1) choosenQueue = queues[0];
      const queue = await Queue.findByPk(choosenQueue.id);

      if (ticket.isOutOfHour === false && ticketTraking.chatbotAt !== null) {
        await ticketTraking.update({
          chatbotAt: null
        });
        await ticket.update({
          amountUsedBotQueues: 0
        });
      }

      let currentSchedule;

      if (settings?.scheduleType === "queue") {
        currentSchedule = await VerifyCurrentSchedule(companyId, queue.id, 0);
      }

      if (
        settings?.scheduleType === "queue" &&
        ticket.status !== "open" &&
        !isNil(currentSchedule) &&
        (ticket.amountUsedBotQueues < maxUseBotQueues ||
          maxUseBotQueues === 0) &&
        (!currentSchedule || currentSchedule.inActivity === false) &&
        (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")
      ) {
        if (timeUseBotQueues !== "0") {
          //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
          //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
          let dataLimite = new Date();
          let Agora = new Date();

          if (ticketTraking.chatbotAt !== null) {
            dataLimite.setMinutes(
              ticketTraking.chatbotAt.getMinutes() + Number(timeUseBotQueues)
            );

            if (
              ticketTraking.chatbotAt !== null &&
              Agora < dataLimite &&
              timeUseBotQueues !== "0" &&
              ticket.amountUsedBotQueues !== 0
            ) {
              return;
            }
          }
          await ticketTraking.update({
            chatbotAt: null
          });
        }

        const outOfHoursMessage = queue.outOfHoursMessage;

        if (outOfHoursMessage !== "") {
          // console.log("entrei3");
          const body = formatBody(`${outOfHoursMessage}`, ticket);

          const debouncedSentMessage = debounce(
            async () => {
              const sentMessage = await wbot.sendMessage(
                getJidOf(ticket),
                {
                  text: body
                }
              );

              wbot.store(sentMessage);
            },
            1000,
            ticket.id
          );
          debouncedSentMessage();

          //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
          // await ticket.update({
          //   queueId: queue.id,
          //   isOutOfHour: true,
          //   amountUsedBotQueues: ticket.amountUsedBotQueues + 1
          // });

          // return;
        }
        //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
        await ticket.update({
          queueId: queue.id,
          isOutOfHour: true,
          amountUsedBotQueues: ticket.amountUsedBotQueues + 1
        });
        return;
      }

      await UpdateTicketService({
        ticketData: { amountUsedBotQueues: 0, queueId: choosenQueue.id },
        // ticketData: { queueId: queues.length ===1 ? null : choosenQueue.id },
        ticketId: ticket.id,
        companyId
      });
      // }

      if (choosenQueue.chatbots.length > 0 && !ticket.isGroup) {
        let options = "";
        choosenQueue.chatbots.forEach((chatbot, index) => {
          options += `*[ ${index + 1} ]* - ${chatbot.name}\n`;
        });

        const body = formatBody(
          `\u200e ${choosenQueue.greetingMessage}\n\n${options}\n*[ # ]* Voltar para o menu principal\n*[ Sair ]* Encerrar atendimento`,
          ticket
        );

        const sentMessage = await wbot.sendMessage(
          getJidOf(ticket),

          {
            text: body
          }
        );

        wbot.store(sentMessage);

        await verifyMessage(sentMessage, ticket, contact, ticketTraking, false, false, true);

      }

      // Atribuir usuário imediatamente se randomização imediata estiver ativada
      if ((queue?.randomizeImmediate) || (settings?.settingsUserRandom === "enabled") && randomUserId) {
        await UpdateTicketService({
          ticketData: { userId: randomUserId },
          ticketId: ticket.id,
          companyId
        });
        console.log(`[IMMEDIATE RANDOMIZATION] Ticket ${ticket.id} atribuído imediatamente para usuário ${randomUserId}`);
      }

      if (
        !choosenQueue.chatbots.length &&
        choosenQueue.greetingMessage.length !== 0
      ) {
        const body = formatBody(
          `\u200e${choosenQueue.greetingMessage}`,
          ticket
        );
        const sentMessage = await wbot.sendMessage(
          getJidOf(ticket),
          {
            text: body
          }
        );

        wbot.store(sentMessage);

        await verifyMessage(sentMessage, ticket, contact, ticketTraking, false, false, true);
      }

      // integração: iniciar APENAS apos CPF no caso de SGP; outras integrações iniciam normalmente
      if (!msg.key.fromMe && !ticket.isGroup && choosenQueue?.integrationId) {
        const integrations = await ShowQueueIntegrationService(
          choosenQueue.integrationId,
          companyId
        );

        if (String(integrations.type).toUpperCase() === "SGP") {
          // Apenas marcar integração no ticket; aguardar CPF do cliente
          if (msg.key.fromMe) {
            await ticket.update({
              typebotSessionTime: moment().toDate(),
              useIntegration: true,
              integrationId: choosenQueue.integrationId
            });
          } else {
            await ticket.update({
              useIntegration: true,
              integrationId: choosenQueue.integrationId
            });
          }
        } else {
          await handleMessageIntegration(
            msg,
            wbot,
            companyId,
            integrations,
            ticket
          );

          if (msg.key.fromMe) {
            await ticket.update({
              typebotSessionTime: moment().toDate(),
              useIntegration: true,
              integrationId: choosenQueue.integrationId
            });
          } else {
            await ticket.update({
              useIntegration: true,
              integrationId: choosenQueue.integrationId
            });
          }
        }
      }

      if (!isNil(choosenQueue.fileListId)) {
        try {
          const publicFolder = path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "public"
          );

          const files = await ShowFileService(
            choosenQueue.fileListId,
            ticket.companyId
          );

          const folder = path.resolve(
            publicFolder,
            `company${ticket.companyId}`,
            "fileList",
            String(files.id)
          );

          for (const [index, file] of files.options.entries()) {
            const mediaSrc = {
              fieldname: "medias",
              originalname: path.basename(file.path),
              encoding: "7bit",
              mimetype: file.mediaType,
              filename: file.path,
              path: path.resolve(folder, file.path)
            } as Express.Multer.File;

            // const debouncedSentMessagePosicao = debounce(
            //   async () => {
            const sentMessage = await SendWhatsAppMedia({
              media: mediaSrc,
              ticket,
              body: `\u200e ${file.name}`,
              isPrivate: false,
              isForwarded: false
            });

            await verifyMediaMessage(
              sentMessage,
              ticket,
              ticket.contact,
              ticketTraking,
              false,
              false,
              wbot,
              true
            );
            //   },
            //   2000,
            //   ticket.id
            // );
            // debouncedSentMessagePosicao();
          }
        } catch (error) {
          logger.info(error);
        }
      }

      await delay(4000);

      //se fila está parametrizada para encerrar ticket automaticamente
      if (choosenQueue.closeTicket) {
        try {
          await UpdateTicketService({
            ticketData: {
              status: "closed",
              queueId: choosenQueue.id,
              sendFarewellMessage: false,
              useIntegration: null,
              integrationId: null,
            },
            ticketId: ticket.id,
            companyId
          });
        } catch (error) {
          logger.info(error);
        }

        return;
      }

      const count = await Ticket.findAndCountAll({
        where: {
          userId: null,
          status: "pending",
          companyId,
          queueId: choosenQueue.id,
          whatsappId: wbot.id,
          isGroup: false
        }
      });

      await CreateLogTicketService({
        ticketId: ticket.id,
        type: "queue",
        queueId: choosenQueue.id
      });

      if (enableQueuePosition && !choosenQueue.chatbots.length) {
        const qtd = count.count === 0 ? 1 : count.count;
        const shouldSend = resolveShouldSendQueueEntryMessage({
          queueName: choosenQueue.name,
          contactName: contact?.name,
          position: qtd,
          queueEntryMessage: choosenQueue.queueEntryMessage,
          queueSendEntryMessage: choosenQueue.sendQueueEntryMessage,
          connectionSendQueueEntryMessage: ticket.whatsapp?.sendQueueEntryMessage,
          connectionQueueEntryMessage: ticket.whatsapp?.queueEntryMessage,
          companySendQueuePosition: settings.sendQueuePosition
        });

        if (shouldSend) {
          const entryTemplate = resolveQueueEntryMessageTemplate({
            queueName: choosenQueue.name,
            queueEntryMessage: choosenQueue.queueEntryMessage,
            connectionSendQueueEntryMessage: ticket.whatsapp?.sendQueueEntryMessage,
            connectionQueueEntryMessage: ticket.whatsapp?.queueEntryMessage
          });
          const msgFila = buildQueueEntryMessageText({
            queueName: choosenQueue.name,
            contactName: contact?.name,
            position: qtd,
            queueEntryMessage: entryTemplate
          });
          const bodyFila = formatBody(`${msgFila}`, ticket);
          const debouncedSentMessagePosicao = debounce(
            async () => {
              const sentMessage = await wbot.sendMessage(
                getJidOf(ticket),
                {
                  text: bodyFila
                }
              );

              wbot.store(sentMessage);
            },
            3000,
            ticket.id
          );
          debouncedSentMessagePosicao();
        }
      }
    } else {
      if (ticket.isGroup) return;

      if (
        maxUseBotQueues &&
        maxUseBotQueues !== 0 &&
        ticket.amountUsedBotQueues >= maxUseBotQueues
      ) {
        // await UpdateTicketService({
        //   ticketData: { queueId: queues[0].id },
        //   ticketId: ticket.id
        // });

        return;
      }

      if (timeUseBotQueues !== "0") {
        //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
        //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
        let dataLimite = new Date();
        let Agora = new Date();

        if (ticketTraking.chatbotAt !== null) {
          dataLimite.setMinutes(
            ticketTraking.chatbotAt.getMinutes() + Number(timeUseBotQueues)
          );

          if (
            ticketTraking.chatbotAt !== null &&
            Agora < dataLimite &&
            timeUseBotQueues !== "0" &&
            ticket.amountUsedBotQueues !== 0
          ) {
            return;
          }
        }
        await ticketTraking.update({
          chatbotAt: null
        });
      }

      // if (wbot.waitForSocketOpen()) {
      //   console.log("AGUARDANDO")
      //   console.log(wbot.waitForSocketOpen())
      // }

      wbot.presenceSubscribe(contact.remoteJid);

      let options = "";

      wbot.sendPresenceUpdate("composing", contact.remoteJid);

      queues.forEach((queue, index) => {
        options += `*[ ${index + 1} ]* - ${queue.name}\n`;
      });
      options += `\n*[ Sair ]* - Encerrar atendimento`;

      const body = formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket);

      await CreateLogTicketService({
        ticketId: ticket.id,
        type: "chatBot"
      });

      await delay(1000);

      await wbot.sendPresenceUpdate("paused", contact.remoteJid);

      if (ticket.whatsapp.greetingMediaAttachment !== null) {
        const filePath = path.resolve(
          "public",
          `company${companyId}`,
          ticket.whatsapp.greetingMediaAttachment
        );

        const fileExists = fs.existsSync(filePath);
        // console.log(fileExists);
        if (fileExists) {
          const messagePath = ticket.whatsapp.greetingMediaAttachment;
          const optionsMsg = await getMessageOptions(
            messagePath,
            filePath,
            String(companyId),
            body
          );

          const debouncedSentgreetingMediaAttachment = debounce(
            async () => {
              const sentMessage = await wbot.sendMessage(getJidOf(ticket),
                { ...optionsMsg }
              );

              wbot.store(sentMessage);

              await verifyMediaMessage(
                sentMessage,
                ticket,
                contact,
                ticketTraking,
                false,
                false,
                wbot,
                true
              );
            },
            1000,
            ticket.id
          );
          debouncedSentgreetingMediaAttachment();
        } else {
          const debouncedSentMessage = debounce(
            async () => {
              const sentMessage = await wbot.sendMessage(getJidOf(ticket),
                {
                  text: body
                }
              );

              wbot.store(sentMessage);

              await verifyMessage(sentMessage, ticket, contact, ticketTraking, false, false, true);
            },
            1000,
            ticket.id
          );
          debouncedSentMessage();
        }
        await UpdateTicketService({
          ticketData: { amountUsedBotQueues: ticket.amountUsedBotQueues + 1 },
          ticketId: ticket.id,
          companyId
        });

        return;
      } else {
        const debouncedSentMessage = debounce(
          async () => {
            const sentMessage = await wbot.sendMessage(
              getJidOf(ticket),
              {
                text: body
              }
            );

            wbot.store(sentMessage);

            await verifyMessage(sentMessage, ticket, contact, ticketTraking, false, false, true);
          },
          1000,
          ticket.id
        );

        await UpdateTicketService({
          ticketData: { amountUsedBotQueues: ticket.amountUsedBotQueues + 1 },
          ticketId: ticket.id,
          companyId
        });

        debouncedSentMessage();
      }
    }
  };

  if (typeBot === "text") {
    return botText();
  }

  if (typeBot === "button" && queues.length > 3) {
    return botText();
  }
};

export const verifyRating = (ticketTraking: TicketTraking) => {
  if (
    ticketTraking &&
    ticketTraking.finishedAt === null &&
    ticketTraking.closedAt !== null &&
    ticketTraking.userId !== null &&
    ticketTraking.ratingAt === null
  ) {
    return true;
  }
  return false;
};

export const handleRating = async (
  rate: number,
  ticket: Ticket,
  ticketTraking: TicketTraking
) => {
  const io = getIO();
  const companyId = ticket.companyId;

  // console.log("GETTING WHATSAPP HANDLE RATING", ticket.whatsappId, ticket.id)
  const { complationMessage } = await ShowWhatsAppService(
    ticket.whatsappId,

    companyId
  );

  let finalRate = rate;

  if (rate < 0) {
    finalRate = 0;
  }
  if (rate > 10) {
    finalRate = 10;
  }

  await UserRating.create({
    ticketId: ticketTraking.ticketId,
    companyId: ticketTraking.companyId,
    userId: ticketTraking.userId,
    rate: finalRate
  });

  if (
    !isNil(complationMessage) &&
    complationMessage !== "" &&
    !ticket.isGroup
  ) {
    const body = formatBody(`\u200e${complationMessage}`, ticket);
    if (ticket.channel === "whatsapp") {
      const msg = await SendWhatsAppMessage({ body, ticket });

      await verifyMessage(msg, ticket, ticket.contact, ticketTraking, false, false, true);
    }

    if (["facebook", "instagram"].includes(ticket.channel)) {
      await sendFacebookMessage({ body, ticket });
    }
  }

  await ticket.update({
    isBot: false,
    status: "closed",
    amountUsedBotQueuesNPS: 0,
    useIntegration: null,
    integrationId: null
  });

  //loga fim de atendimento
  await CreateLogTicketService({
    userId: ticket.userId,
    queueId: ticket.queueId,
    ticketId: ticket.id,
    type: "closed"
  });

  io.of(String(companyId))
    // .to("open")
    .emit(`company-${companyId}-ticket`, {
      action: "delete",
      ticket,
      ticketId: ticket.id
    });

  io.of(String(companyId))
    // .to(ticket.status)
    // .to(ticket.id.toString())
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket,
      ticketId: ticket.id
    });
};

const sanitizeName = (name: string): string => {
  let sanitized = name.split(" ")[0];
  sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
  return sanitized.substring(0, 60);
};

async function sendSmartAgentTextBlocks(params: {
  wbot: Session;
  msg: proto.IWebMessageInfo;
  ticket: Ticket;
  contact: Contact;
  ticketTraking?: any;
  prompt: any;
  text: string;
  guardLabel: string;
  verifyFromMe?: boolean;
  userText?: string;
  skipLlmBlockedReprocess?: boolean;
}): Promise<number> {
  const blocks = splitAgentReplyIntoSmartBlocks(params.text, {
    maxChars: AGENT_OUTBOUND_BUBBLE_MAX_CHARS,
    maxBlocks: 12
  });
  let sent = 0;
  let blocked = 0;
  const blockedReasons: string[] = [];
  for (const block of blocks) {
    const safeBlock = sanitizeAgentCustomerVisibleText(block);
    if (!safeBlock) continue;
    if (isAgentOutboundGuardEnabled()) {
      const guard = shouldSendOutbound(safeBlock, params.ticket, params.prompt.id);
      if (!guard.send) {
        blocked += 1;
        blockedReasons.push(guard.reason || "blocked");
        logger.info(`[OUTBOUND-GUARD] bloqueando ${params.guardLabel} (${guard.reason}) ticket=${params.ticket.id}`);
        continue;
      }
    }
    const sentMessage = await params.wbot.sendMessage(
      resolveReplyJid(params.msg, params.contact),
      {
      text: `\u200e ${safeBlock}`
    }
    );    await verifyMessage(
      sentMessage!,
      params.ticket,
      params.contact,
      params.ticketTraking,
      params.verifyFromMe !== false,
      false,
      true
    );
    if (isAgentOutboundGuardEnabled()) {
      await recordSentOutbound(safeBlock, params.ticket, params.prompt.id);
    }
    sent += 1;
    if (blocks.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, AGENT_OUTBOUND_BUBBLE_DELAY_MS));
    }
  }
  if (sent === 0 && blocked > 0 && params.userText && !params.skipLlmBlockedReprocess) {
    logger.warn(
      `[OUTBOUND-GUARD] todos os blocos foram bloqueados; reprocessando pela LLM ticket=${params.ticket.id}`
    );
    const reprocessed = await runAgentOrchestrator({
      prompt: params.prompt,
      ticket: params.ticket,
      contact: params.contact,
      userText: params.userText,
      blockedOutboundContext: {
        blockedReply: params.text,
        reasons: [...new Set(blockedReasons)]
      }
    });
    const llmReply = sanitizeAgentCustomerVisibleText(String(reprocessed.reply || ""));
    if (reprocessed.handled && llmReply) {
      return sendSmartAgentTextBlocks({
        ...params,
        text: llmReply,
        guardLabel: `${params.guardLabel} reprocessado pela LLM`,
        skipLlmBlockedReprocess: true
      });
    }
  }
  if (sent === 0 && blocked > 0) {
    logger.warn(
      `[OUTBOUND-GUARD] todos os blocos foram bloqueados; nenhuma recuperação manual foi enviada ticket=${params.ticket.id}`
    );
  }
  if (sent > 0) {
    await markTicketUnderAgentAttendance(params.ticket);
    (params.ticket as any).__connectionAgentAgentReplySent = true;
  }
  return sent;
}

function connectionAgentReplySent(ticket: Ticket): boolean {
  return !!(ticket as any).__connectionAgentAgentReplySent;
}

function markConnectionAgentReplySent(ticket: Ticket): void {
  (ticket as any).__connectionAgentAgentReplySent = true;
}

/** Roteiro visual só encerra o turno quando houve saída real (texto/mídia ou ação). */
function attendanceFlowDeliveredOutput(outcome: {
  handled: boolean;
  sentCount?: number;
  actionCount?: number;
}): boolean {
  return (
    outcome.handled === true &&
    (Number(outcome.sentCount) > 0 || Number(outcome.actionCount) > 0)
  );
}

const deleteFileSync = (path: string): void => {
  try {
    fs.unlinkSync(path);
  } catch (error) {
    console.error("Erro ao deletar o arquivo:", error);
  }
};

export const convertTextToSpeechAndSaveToFile = (
  text: string,
  filename: string,
  subscriptionKey: string,
  serviceRegion: string,
  voice: string = "pt-BR-FabioNeural",
  audioToFormat: string = "mp3"
): Promise<void> => {
  return new Promise((resolve, reject) => {
    let SpeechConfig: any;
    let SpeechSynthesizer: any;
    let AudioConfig: any;
    try {
      const sdk = require("microsoft-cognitiveservices-speech-sdk");
      SpeechConfig = sdk.SpeechConfig;
      SpeechSynthesizer = sdk.SpeechSynthesizer;
      AudioConfig = sdk.AudioConfig;
    } catch (err) {
      reject(new Error("Speech SDK não disponível: " + (err instanceof Error ? err.message : String(err))));
      return;
    }
    const speechConfig = SpeechConfig.fromSubscription(
      subscriptionKey,
      serviceRegion
    );
    speechConfig.speechSynthesisVoiceName = voice;
    const audioConfig = AudioConfig.fromAudioFileOutput(`${filename}.wav`);
    const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
    synthesizer.speakTextAsync(
      text,
      result => {
        if (result) {
          convertWavToAnotherFormat(
            `${filename}.wav`,
            `${filename}.${audioToFormat}`,
            audioToFormat
          )
            .then(output => {
              resolve();
            })
            .catch(error => {
              console.error(error);
              reject(error);
            });
        } else {
          reject(new Error("No result from synthesizer"));
        }
        synthesizer.close();
      },
      error => {
        console.error(`Error: ${error}`);
        synthesizer.close();
        reject(error);
      }
    );
  });
};

const convertWavToAnotherFormat = (
  inputPath: string,
  outputPath: string,
  toFormat: string
) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .toFormat(toFormat)
      .on("end", () => resolve(outputPath))
      .on("error", (err: { message: any }) =>
        reject(new Error(`Error converting file: ${err.message}`))
      )
      .save(outputPath);
  });
};

export const keepOnlySpecifiedChars = (str: string) => {
  return str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôûÂÊÎÔÛãõÃÕçÇ!?.,;:\s]/g, "");
};

export const transferQueue = async (
  queueId: number,
  ticket: Ticket,
  contact: Contact,
  userId?: number | null,
  whatsappId?: number | null
): Promise<void> => {
  const ticketData: {
    queueId: number;
    userId?: number;
    whatsappId?: number | null;
  } = { queueId };
  if (userId != null && Number(userId) > 0) {
    ticketData.userId = Number(userId);
  }
  if (whatsappId != null && Number(whatsappId) > 0) {
    ticketData.whatsappId = Number(whatsappId);
  }
  await UpdateTicketService({
    ticketData,
    ticketId: ticket.id,
    companyId: ticket.companyId
  });
};

const matchesAnyPhrase = (
  campaignPhrases: PhraseCondition[],
  messageBody: string
): boolean => {
  if (
    !campaignPhrases ||
    !Array.isArray(campaignPhrases) ||
    campaignPhrases.length === 0
  ) {
    return false;
  }

  if (!messageBody || typeof messageBody !== "string") {
    return false;
  }

  const bodyLower = messageBody.toLowerCase().trim();

  return campaignPhrases.some((condition: PhraseCondition) => {
    if (!condition.text || typeof condition.text !== "string") {
      return false;
    }

    const phraseLower = condition.text.toLowerCase().trim();

    if (condition.type === "exact") {
      return bodyLower === phraseLower;
    } else if (condition.type === "partial") {
      return bodyLower.includes(phraseLower);
    }

    return false;
  });
};

/**
 * Normaliza frases de campanha para garantir backward compatibility
 */
const normalizeCampaignPhrases = (phrase: any): PhraseCondition[] => {
  if (!phrase) return [];

  if (Array.isArray(phrase)) {
    return phrase.filter(item => item && item.text);
  }

  if (typeof phrase === "string") {
    try {
      const parsed = JSON.parse(phrase);

      if (Array.isArray(parsed)) {
        return parsed.filter(item => item && item.text);
      }

      if (typeof parsed === "string") {
        return [{ text: parsed, type: "exact" }];
      }
    } catch {
      return [{ text: phrase, type: "exact" }];
    }
  }

  return [];
};

/**
 * Encontra uma campanha que faça match com a mensagem
 */
const findMatchingCampaign = (
  campaigns: CampaignPhrase[],
  messageBody: string
): CampaignPhrase | null => {
  if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) {
    return null;
  }

  if (!messageBody || typeof messageBody !== "string") {
    return null;
  }

  return (
    campaigns.find((campaign: CampaignPhrase) => {
      if (!campaign.status) {
        return false;
      }

      const phrases = normalizeCampaignPhrases(campaign.phrase);
      const hasMatch = matchesAnyPhrase(phrases, messageBody);

      if (hasMatch) {
        console.log(
          `[CAMPANHA MATCH] ID: ${campaign.id}, Mensagem: "${messageBody}", Frases:`,
          phrases
        );
      }

      return hasMatch;
    }) || null
  );
};

export const flowbuilderIntegration = async (
  msg: proto.IWebMessageInfo | null,
  wbot: Session | null,
  companyId: number,
  queueIntegration: QueueIntegrations,
  ticket: Ticket,
  contact: Contact,
  isFirstMsg?: Ticket,
  isTranfered?: boolean
) => {

  if (contact.disableBot) {
    return;
  }

  const io = getIO();
  const body = msg ? getBodyMessage(msg) : ticket.lastMessage || "";

  // DEBUG - Verificar parâmetros de entrada
  logger.info(`[RDS-FLOW-DEBUG] flowbuilderIntegration iniciado para ticket ${ticket.id}`);
  logger.info(`[RDS-FLOW-DEBUG] Parâmetros: queueIntegration.type=${queueIntegration?.type}, flowWebhook=${ticket.flowWebhook}, lastFlowId=${ticket.lastFlowId}`);
  logger.info(`[RDS-FLOW-DEBUG] Mensagem: ${body}`);

  // ✅ VERIFICAR SE JÁ ESTÁ EXECUTANDO CAMPANHA PARA EVITAR REPETIÇÃO
  // CORREÇÃO: Permitir iniciar novos fluxos mesmo se flowWebhook estiver true
  if (ticket.flowWebhook && ticket.lastFlowId && msg) {
    // Se o fluxo já estiver ativo, verificar se devemos ignorar ou forçar início do fluxo
    const isInFlow = ticket.flowWebhook && ticket.lastFlowId;

    // Se o queueIntegration.type for 'flowbuilder', então forçamos início do fluxo
    if (queueIntegration?.type === 'flowbuilder' && !ticket.userId) {
      logger.info(`[RDS-FLOW-DEBUG] Forçando início do fluxo para ticket ${ticket.id}, mesmo com flowWebhook=${ticket.flowWebhook}`);
    } else {
      logger.info(`[RDS-FLOW-DEBUG] Ticket ${ticket.id} já em fluxo ativo (lastFlowId: ${ticket.lastFlowId}), ignorando nova verificação de campanha`);
      return false;
    }
  }

  // Só processar se não for mensagem minha (exceto quando msg é null = verificação pós-fluxo)
  if (msg && msg.key.fromMe) {
    logger.info(`[RDS-FLOW-DEBUG] Mensagem é fromMe, ignorando fluxo para ticket ${ticket.id}`);
    return false;
  }

  if (msg && msg.messageStubType) {
    if (ENABLE_LID_DEBUG) {
      logger.info(
        `[RDS-LID] FlowBuilder - Ignorando evento de grupo: ${msg.messageStubType}`
      );
    }
    return false;
  }

  // ✅ ADICIONAR CACHE/CONTROLE PARA EVITAR EXECUÇÃO REPETIDA
  const messageId = msg?.key?.id;
  const cacheKey = `campaign_check_${ticket.id}_${messageId || 'manual'}`;

  // Verificar se já processamos esta mensagem/ticket para campanhas
  if (messageId && await cacheLayer.get(cacheKey)) {
    console.log(`[CAMPANHAS] Mensagem ${messageId} já processada para campanhas no ticket ${ticket.id}`);
    return false;
  }

  // Verificar se ticket foi fechado e reabrir se necessário
  if (msg && !msg.key.fromMe && ticket.status === "closed") {
    console.log(`[FLOW INTEGRATION] Reabrindo ticket fechado ${ticket.id}`);

    await ticket.update({ status: "pending" });
    await ticket.reload({
      include: [
        { model: Queue, as: "queue" },
        { model: User, as: "user" },
        { model: Contact, as: "contact" }
      ]
    });

    await UpdateTicketService({
      ticketData: { status: "pending", integrationId: ticket.integrationId },
      ticketId: ticket.id,
      companyId
    });

    io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
      action: "delete",
      ticket,
      ticketId: ticket.id
    });

    io.to(ticket.status).emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket,
      ticketId: ticket.id
    });
  }

  const whatsapp = await ShowWhatsAppService(
    wbot?.id || ticket.whatsappId,
    companyId
  );

  // DEBUG - Verificar configurações de fluxo
  console.log(
    `[FLOW-DEBUG] Configurações de fluxo - flowIdNotPhrase: ${whatsapp.flowIdNotPhrase}, flowIdWelcome: ${whatsapp.flowIdWelcome}`
  );

  // *** PRIORIDADE MÁXIMA: CAMPANHAS SEMPRE SÃO VERIFICADAS PRIMEIRO ***
  console.log(
    `[CAMPANHAS] Verificando campanhas para: "${body}" na conexão ${whatsapp.id} (${whatsapp.name})`
  );

  try {
    // Buscar campanhas ativas da empresa
    const activeCampaigns = await FlowCampaignModel.findAll({
      where: {
        companyId: ticket.companyId,
        status: true
      }
    });

    console.log(
      `[CAMPANHAS] ${activeCampaigns.length} campanhas ativas encontradas`
    );

    // ALTERAÇÃO PRINCIPAL: Filtrar campanhas que incluem esta conexão WhatsApp específica
    const campaignsForThisWhatsapp = activeCampaigns.filter(campaign => {
      try {
        const whatsappIds = campaign.whatsappIds || [];
        const includes = whatsappIds.includes(whatsapp.id);

        if (includes) {
          console.log(
            `[CAMPANHAS] Campanha "${campaign.name}" (ID: ${campaign.id}) inclui conexão ${whatsapp.id}`
          );
        }

        return includes;
      } catch (error) {
        console.error(
          `[CAMPANHAS] Erro ao verificar campanha ${campaign.id}:`,
          error
        );
        return false;
      }
    });

    console.log(
      `[CAMPANHAS] ${campaignsForThisWhatsapp.length} campanhas aplicáveis para conexão ${whatsapp.id}`
    );

    // Verificar se alguma campanha faz match com a mensagem
    const matchingCampaign = campaignsForThisWhatsapp.find(campaign => {
      try {
        if (!campaign.status) {
          return false;
        }

        // Usar novo método que considera a conexão específica
        const matches = campaign.matchesMessage(body, whatsapp.id);

        if (matches) {
          console.log(
            `[CAMPANHAS] ✅ MATCH encontrado! Campanha "${campaign.name}" (ID: ${campaign.id}) para mensagem: "${body}"`
          );
        }

        return matches;
      } catch (error) {
        console.error(
          `[CAMPANHAS] Erro ao verificar match da campanha ${campaign.id}:`,
          error
        );
        return false;
      }
    });

    if (matchingCampaign) {
      console.log(
        `[CAMPANHAS] 🚀 EXECUTANDO FLUXO! Campanha: ${matchingCampaign.name} (ID: ${matchingCampaign.id}) | Fluxo: ${matchingCampaign.flowId} | Conexão: ${whatsapp.id} | Ticket: ${ticket.id}`
      );

      // ✅ MARCAR QUE CAMPANHA FOI EXECUTADA NO CACHE
      if (messageId) {
        await cacheLayer.set(cacheKey, "300"); // 5 minutos de cache
      }

      // Verificar se pode disparar campanha (não está em outro fluxo)
      if (msg && ticket.flowWebhook && ticket.lastFlowId) {
        console.log(
          `[CAMPANHAS] ⚠️ Ticket ${ticket.id} já em fluxo ativo (lastFlowId: ${ticket.lastFlowId}), aguardando...`
        );
        return false;
      }

      // *** IMPORTANTE: LIMPAR FLUXO ANTERIOR ANTES DE EXECUTAR CAMPANHA ***
      console.log(
        `[CAMPANHAS] 🧹 Limpando fluxo anterior do ticket ${ticket.id}`
      );

      await ticket.update({
        flowWebhook: true,
        flowStopped: null,
        lastFlowId: null,
        hashFlowId: null,
        dataWebhook: null,
        isBot: true,
        status: ticket.status === "open" ? "open" : "pending"
      });

      await ticket.reload();

      // Buscar o fluxo a ser executado
      const flow = await FlowBuilderModel.findOne({
        where: {
          id: matchingCampaign.flowId,
          company_id: companyId
        }
      });

      if (!flow) {
        console.error(
          `[CAMPANHAS] ❌ Fluxo ${matchingCampaign.flowId} não encontrado para empresa ${companyId}`
        );

        // ✅ LIMPAR ESTADO EM CASO DE ERRO
        await ticket.update({
          flowWebhook: false,
          isBot: false
        });

        return false;
      }

      console.log(
        `[CAMPANHAS] ✅ Fluxo encontrado: ${flow.name} (ID: ${flow.id})`
      );

      try {
        const nodes: INodes[] = flow.flow["nodes"];
        const connections: IConnections[] = flow.flow["connections"];

        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
          console.error(
            `[CAMPANHAS] ❌ Fluxo ${flow.id} não possui nós válidos`
          );

          // ✅ LIMPAR ESTADO EM CASO DE ERRO
          await ticket.update({
            flowWebhook: false,
            isBot: false
          });

          return false;
        }

        const mountDataContact = {
          number: contact.number,
          name: contact.name,
          email: contact.email
        };

        console.log(
          `[CAMPANHAS] 🎯 Iniciando execução do fluxo com dados do contato:`,
          mountDataContact
        );

        // Executar o fluxo
        await ActionsWebhookService(
          whatsapp.id,
          matchingCampaign.flowId,
          ticket.companyId,
          nodes,
          connections,
          flow.flow["nodes"][0].id, // Começar pelo primeiro nó
          null,
          "",
          "",
          null,
          ticket.id,
          mountDataContact
        );

        console.log(
          `[CAMPANHAS] ✅ SUCESSO! Campanha ${matchingCampaign.id} executada com sucesso na conexão ${whatsapp.id}!`
        );

        return true; // Retorna true indicando que uma campanha foi executada
      } catch (executionError) {
        console.error(
          `[CAMPANHAS] ❌ Erro ao executar fluxo da campanha ${matchingCampaign.id}:`,
          executionError
        );

        // ✅ LIMPAR ESTADO EM CASO DE ERRO
        await ticket.update({
          flowWebhook: false,
          isBot: false,
          lastFlowId: null,
          hashFlowId: null,
          flowStopped: null
        });

        return false;
      }
    }

    console.log(
      `[CAMPANHAS] ℹ️ Nenhuma campanha fez match com "${body}" na conexão ${whatsapp.id}`
    );
  } catch (error) {
    console.error("[CAMPANHAS] ❌ Erro geral ao executar campanhas:", error);

    // ✅ LIMPAR ESTADO EM CASO DE ERRO GERAL
    try {
      await ticket.update({
        flowWebhook: false,
        isBot: false,
        lastFlowId: null,
        hashFlowId: null,
        flowStopped: null
      });
    } catch (cleanupError) {
      console.error("[CAMPANHAS] ❌ Erro ao limpar estado do ticket:", cleanupError);
    }
  }

  // Se é verificação pós-fluxo (msg = null) e não houve match de campanha, parar aqui
  if (!msg) {
    console.log(
      `[FLOW INTEGRATION] Verificação pós-fluxo concluída para ticket ${ticket.id}`
    );
    return false;
  }

  // Contar mensagens do cliente para verificar se é primeira interação
  const messageCount = await Message.count({
    where: {
      ticketId: ticket.id,
      fromMe: false // Apenas mensagens do cliente
    }
  });

  // Verificar se o contato é novo na base (primeira vez que aparece)
  const isNewContact = contact.createdAt &&
    Math.abs(new Date().getTime() - new Date(contact.createdAt).getTime()) < 5000; // 5 segundos de tolerância

  console.log(
    `[FIRST CONTACT CHECK] Ticket ${ticket.id} - Mensagens do cliente: ${messageCount}`
  );
  console.log(
    `[CONTACT STATUS] Contato ${contact.id} - Novo na base: ${isNewContact}, Criado em: ${contact.createdAt}`
  );

  // Buscar todas as campanhas para verificar se há match (para lógica do flowIdNotPhrase)
  const listPhrase = await FlowCampaignModel.findAll({
    where: {
      companyId: ticket.companyId,
      status: true
    }
  });

  // Função para verificar se tem match com alguma campanha desta conexão específica
  const hasAnyPhraseMatch = (
    listPhrase: any[],
    messageBody: string,
    whatsappId: number
  ): boolean => {
    return listPhrase.some(campaign => {
      try {
        const whatsappIds = campaign.whatsappIds || [];
        if (!whatsappIds.includes(whatsappId)) {
          return false;
        }

        return campaign.matchesMessage(messageBody, whatsappId);
      } catch (error) {
        console.error(
          `[PHRASE MATCH] Erro ao verificar campanha ${campaign.id}:`,
          error
        );
        return false;
      }
    });
  };

  // *** FLUXO flowIdNotPhrase: APENAS para contatos NOVOS na primeira mensagem SEM match de campanha ***
  console.log(
    `[FLOW-DEBUG] Verificando condições para flowIdNotPhrase:`
  );
  console.log(
    `[FLOW-DEBUG] - hasAnyPhraseMatch: ${hasAnyPhraseMatch(listPhrase, body, whatsapp.id)}`
  );
  console.log(
    `[FLOW-DEBUG] - whatsapp.flowIdNotPhrase: ${whatsapp.flowIdNotPhrase}`
  );
  console.log(
    `[FLOW-DEBUG] - messageCount: ${messageCount}`
  );
  console.log(
    `[FLOW-DEBUG] - isNewContact: ${isNewContact}`
  );

  // Evitar reexecutar o fluxo de primeiro contato no mesmo ticket
  const firstContactFlagKey = `first-contact-executed:${ticket.id}`;
  const firstContactAlreadyRan = await cacheLayer.get(firstContactFlagKey);
  if (firstContactAlreadyRan) {
    console.log(`[FIRST CONTACT] ⏭️ Já executado anteriormente para ticket ${ticket.id}, ignorando.`);
  }

  // *** FLUXO flowIdWelcome: Para contatos que JÁ EXISTEM na base ***
  if (
    !hasAnyPhraseMatch(listPhrase, body, whatsapp.id) &&
    whatsapp.flowIdWelcome &&
    messageCount === 1 &&
    !isNewContact &&
    !firstContactAlreadyRan
  ) {
    console.log(
      `[WELCOME FLOW] 🚀 Iniciando flowIdWelcome (${whatsapp.flowIdWelcome}) - Contato existente na primeira mensagem`
    );

    try {
      const flow = await FlowBuilderModel.findOne({
        where: {
          id: whatsapp.flowIdWelcome,
          company_id: companyId
        }
      });

      if (!flow) {
        console.error(
          `[WELCOME FLOW] ❌ Fluxo flowIdWelcome ${whatsapp.flowIdWelcome} não encontrado`
        );
      } else {
        const nodes: INodes[] = flow.flow["nodes"];
        const connections: IConnections[] = flow.flow["connections"];

        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
          console.error(
            `[WELCOME FLOW] ❌ Fluxo flowIdWelcome ${flow.id} não possui nós válidos`
          );
        } else {
          const mountDataContact = {
            number: contact.number,
            name: contact.name,
            email: contact.email
          };

          await ActionsWebhookService(
            whatsapp.id,
            whatsapp.flowIdWelcome,
            ticket.companyId,
            nodes,
            connections,
            flow.flow["nodes"][0].id,
            null,
            "",
            "",
            null,
            ticket.id,
            mountDataContact
          );

          console.log(
            `[WELCOME FLOW] ✅ Fluxo flowIdWelcome executado com sucesso!`
          );

          // Marcar em cache para não reexecutar neste ticket
          await cacheLayer.set(firstContactFlagKey, "1", "EX", 86400);
        }
      }
    } catch (error) {
      console.error(
        "[WELCOME FLOW] ❌ Erro ao executar fluxo flowIdWelcome:",
        error
      );
    }
  } else if (
    !hasAnyPhraseMatch(listPhrase, body, whatsapp.id) &&
    whatsapp.flowIdNotPhrase &&
    messageCount === 1 &&
    isNewContact &&
    !firstContactAlreadyRan
  ) {
    console.log(
      `[FIRST CONTACT] 🚀 Iniciando flowIdNotPhrase (${whatsapp.flowIdNotPhrase}) - Contato NOVO na primeira mensagem sem match de campanha`
    );

    try {
      const flow = await FlowBuilderModel.findOne({
        where: {
          id: whatsapp.flowIdNotPhrase,
          company_id: companyId
        }
      });

      if (!flow) {
        console.error(
          `[FIRST CONTACT] ❌ Fluxo flowIdNotPhrase ${whatsapp.flowIdNotPhrase} não encontrado`
        );
      } else {
        const nodes: INodes[] = flow.flow["nodes"];
        const connections: IConnections[] = flow.flow["connections"];

        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
          console.error(
            `[FIRST CONTACT] ❌ Fluxo flowIdNotPhrase ${flow.id} não possui nós válidos`
          );
        } else {
          const mountDataContact = {
            number: contact.number,
            name: contact.name,
            email: contact.email
          };

          await ActionsWebhookService(
            whatsapp.id,
            whatsapp.flowIdNotPhrase,
            ticket.companyId,
            nodes,
            connections,
            flow.flow["nodes"][0].id,
            null,
            "",
            "",
            null,
            ticket.id,
            mountDataContact
          );

          console.log(
            `[FIRST CONTACT] ✅ Fluxo flowIdNotPhrase executado com sucesso na primeira mensagem!`
          );

          // Marcar em cache para não reexecutar neste ticket
          await cacheLayer.set(firstContactFlagKey, "1", "EX", 86400);
        }
      }
    } catch (error) {
      console.error(
        "[FIRST CONTACT] ❌ Erro ao executar fluxo flowIdNotPhrase:",
        error
      );
    }
  } else if (
    !hasAnyPhraseMatch(listPhrase, body, whatsapp.id) &&
    (whatsapp.flowIdNotPhrase || whatsapp.flowIdWelcome) &&
    messageCount > 1
  ) {
    console.log(
      `[FLOW SKIP] ℹ️ Pulando fluxos de primeiro contato - NÃO é primeira mensagem (count: ${messageCount})`
    );
    // Limpar flag caso exista, para não interferir em novos tickets
    if (firstContactAlreadyRan) {
      await cacheLayer.del(firstContactFlagKey);
    }
  }

  // *** FLUXOS WEBHOOK EXISTENTES (lógica original) ***
  logger.info(`[FLOW CHECK] ========== VERIFICANDO SE DEVE CONTINUAR FLUXO ==========`);
  logger.info(`[FLOW CHECK] Ticket ID: ${ticket.id}`);
  logger.info(`[FLOW CHECK] flowWebhook: ${ticket.flowWebhook}`);
  logger.info(`[FLOW CHECK] hashFlowId: ${ticket.hashFlowId}`);
  logger.info(`[FLOW CHECK] lastFlowId: ${ticket.lastFlowId}`);
  logger.info(`[FLOW CHECK] flowStopped: ${ticket.flowStopped}`);
  logger.info(`[FLOW CHECK] Condição (flowWebhook && hashFlowId): ${!!(ticket.flowWebhook && ticket.hashFlowId)}`);

  if (ticket.flowWebhook && ticket.hashFlowId) {
    logger.info(
      `[FLOW WEBHOOK] ========== PROCESSANDO FLUXO WEBHOOK EXISTENTE ==========`
    );
    logger.info(`[FLOW WEBHOOK] Ticket ID: ${ticket.id}`);
    logger.info(`[FLOW WEBHOOK] flowWebhook: ${ticket.flowWebhook}`);
    logger.info(`[FLOW WEBHOOK] hashFlowId: ${ticket.hashFlowId}`);

    // Validação para evitar erro de hash_id undefined
    if (!ticket.hashFlowId) {
      logger.error(
        `[FLOW WEBHOOK] ❌ Erro: ticket.hashFlowId é undefined para ticket ${ticket.id}`
      );
      return false;
    }

    try {
      const webhook = await WebhookModel.findOne({
        where: {
          company_id: ticket.companyId,
          hash_id: ticket.hashFlowId
        }
      });

      if (webhook && webhook.config["details"]) {
        // ✅ CRÍTICO: Só processar se a mensagem for do USUÁRIO, não do BOT
        if (msg && msg.key.fromMe) {
          logger.info(`[FLOW WEBHOOK] ⚠️ Mensagem é do bot (fromMe=true) - IGNORANDO para evitar loop`);
          logger.info(`[FLOW WEBHOOK] Aguardando resposta do USUÁRIO para ticket ${ticket.id}`);
          return false;
        }

        logger.info(
          `[FLOW WEBHOOK] ========== WEBHOOK ENCONTRADO ==========`
        );
        logger.info(`[FLOW WEBHOOK] Nome: ${webhook.name || "sem nome"}`);
        logger.info(`[FLOW WEBHOOK] Ticket ${ticket.id}, Mensagem: "${body}"`);

        const flow = await FlowBuilderModel.findOne({
          where: {
            id: webhook.config["details"].idFlow,
            company_id: companyId
          }
        });

        if (flow) {
          const nodes: INodes[] = flow.flow["nodes"];
          const connections: IConnections[] = flow.flow["connections"];

          await ActionsWebhookService(
            whatsapp.id,
            webhook.config["details"].idFlow,
            ticket.companyId,
            nodes,
            connections,
            ticket.lastFlowId,
            ticket.dataWebhook,
            webhook.config["details"],
            ticket.hashFlowId,
            body,
            ticket.id
          );

          logger.info("[FLOW WEBHOOK] ✅ Fluxo webhook executado!");
        } else {
          logger.error(
            `[FLOW WEBHOOK] ❌ Fluxo ${webhook.config["details"].idFlow} não encontrado`
          );
        }
      } else if (ticket.flowStopped && ticket.lastFlowId) {
        // ✅ CRÍTICO: Só processar se a mensagem for do USUÁRIO, não do BOT
        if (msg && msg.key.fromMe) {
          logger.info(`[FLOW STOPPED] ⚠️ Mensagem é do bot (fromMe=true) - IGNORANDO para evitar loop`);
          logger.info(`[FLOW STOPPED] Aguardando resposta do USUÁRIO para ticket ${ticket.id}`);
          return false;
        }

        // Fluxo interrompido
        logger.info(
          `[FLOW STOPPED] ========== CONTINUANDO FLUXO INTERROMPIDO ==========`
        );
        logger.info(`[FLOW STOPPED] Ticket ${ticket.id}, FlowId: ${ticket.flowStopped}`);
        logger.info(`[FLOW STOPPED] LastFlowId: ${ticket.lastFlowId}`);
        logger.info(`[FLOW STOPPED] Mensagem do usuário: "${body}"`);

        const flow = await FlowBuilderModel.findOne({
          where: {
            id: ticket.flowStopped,
            company_id: companyId
          }
        });

        if (flow) {
          const nodes: INodes[] = flow.flow["nodes"];
          const connections: IConnections[] = flow.flow["connections"];

          const mountDataContact = {
            number: contact.number,
            name: contact.name,
            email: contact.email
          };

          logger.info(`[FLOW STOPPED] Chamando ActionsWebhookService com pressKey: "${body}"`);

          await ActionsWebhookService(
            whatsapp.id,
            parseInt(ticket.flowStopped),
            ticket.companyId,
            nodes,
            connections,
            ticket.lastFlowId,
            null,
            "",
            "",
            body,
            ticket.id,
            mountDataContact
          );

          logger.info("[FLOW STOPPED] ✅ Fluxo interrompido continuado!");
        } else {
          logger.error(
            `[FLOW STOPPED] ❌ Fluxo interrompido ${ticket.flowStopped} não encontrado`
          );
        }
      }
    } catch (error) {
      logger.error(
        "[FLOW WEBHOOK] ❌ Erro ao processar fluxo webhook:",
        error
      );
    }
  } else {
    logger.warn(`[FLOW CHECK] ❌ CONDIÇÃO NÃO ATENDIDA - Fluxo não será continuado`);
    logger.warn(`[FLOW CHECK] Motivo: flowWebhook=${ticket.flowWebhook}, hashFlowId=${ticket.hashFlowId || 'null'}`);

    // Se tem flowStopped e lastFlowId mas não tem hashFlowId ou flowWebhook, pode ser um problema
    if (ticket.flowStopped && ticket.lastFlowId) {
      logger.error(`[FLOW CHECK] ⚠️ PROBLEMA DETECTADO: Ticket tem flowStopped=${ticket.flowStopped} e lastFlowId=${ticket.lastFlowId}`);
      logger.error(`[FLOW CHECK] mas flowWebhook=${ticket.flowWebhook} e hashFlowId=${ticket.hashFlowId || 'null'}`);
      logger.error(`[FLOW CHECK] Isso indica que o ticket não foi salvo corretamente após enviar o menu!`);
    }
  }

  logger.info(
    `[FLOW INTEGRATION] Processamento concluído para ticket ${ticket.id} - conexão ${whatsapp.id}`
  );
  return false;
};

export const handleMessageIntegration = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number,
  queueIntegration: QueueIntegrations,
  ticket: Ticket
): Promise<void> => {
  // Fallback em caso de erro na integração: notifica cliente, finaliza ticket e limpa integração
  const notifyIntegrationErrorAndReset = async (ticketReset: Ticket, companyResetId: number, bodyText?: string) => {
    const fallbackText = bodyText || "Desculpe, ocorreu um problema na integração. O atendimento seguirá pelo fluxo padrão.";
    try {
      await SendWhatsAppMessage({ body: fallbackText, ticket: ticketReset });
    } catch (sendErr) {
      logger.error(`[INTEGRATION FALLBACK] Erro ao enviar mensagem de falha: ${sendErr?.message}`);
    }

    try {
      await UpdateTicketService({
        ticketId: ticketReset.id,
        companyId: companyResetId,
        ticketData: { status: "closed", useIntegration: null, integrationId: null }
      });
      logger.info(`[INTEGRATION FALLBACK] Ticket ${ticketReset.id} finalizado e integração limpa.`);
    } catch (updateErr) {
      logger.error(`[INTEGRATION FALLBACK] Erro ao finalizar/limpar ticket ${ticketReset.id}: ${updateErr?.message}`);
    }
  };

  const msgType = getTypeMessage(msg);

  // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
  if (ticket?.contact?.disableBot) {
    return;
  }

  try {
    console.error(`queueIntegration.type: ${queueIntegration.type}`);
    // Integração SGP (via jsonContent ou type)
    try {
      console.error(`queueIntegration.type 2: ${queueIntegration.type}`);
      let cfg: any = {};
      cfg = queueIntegration?.jsonContent ? JSON.parse(queueIntegration.jsonContent) : {};
      // Fix: tipoIntegracao deve ser "SB" ou "LC" para rotear para SGP, não apenas truthy
      const tipoIntegracaoValido = cfg?.tipoIntegracao && ["SB", "LC"].includes(String(cfg.tipoIntegracao).toUpperCase());
      if (
        queueIntegration.type === "SGP" ||
        ((cfg?.sgpUrl || tipoIntegracaoValido) && queueIntegration.type !== "typebot")
      ) {
        console.error(`queueIntegration.type 3: ${queueIntegration.type}`);
        const simulatedMsg = {
          key: {
            fromMe: false,
            remoteJid: msg?.key?.remoteJid,
            id: msg?.key?.id
          },
          message: {
            conversation: getBodyMessage(msg),
            text: getBodyMessage(msg),
            timestamp: msg?.messageTimestamp
          }
        };

        await sgpListenerOficial({ msg: simulatedMsg as any, ticket, queueIntegration });
        return;
      } else {
        console.error(`queueIntegration.type 4: ${queueIntegration.type}`);
      }
    } catch { /* ignora parse e segue */ }

  if (queueIntegration.type === "n8n" || queueIntegration.type === "webhook") {
    if (queueIntegration?.urlN8N) {
      const options = {
        method: "POST",
        url: queueIntegration?.urlN8N,
        headers: {
          "Content-Type": "application/json"
        },
        json: msg
      };
      try {
        request(options, function (error, response) {
          if (error) {
            throw new Error(error);
          } else {
            console.log(response.body);
          }
        });
      } catch (error) {
        throw new Error(error);
      }
    }
  } else if (queueIntegration.type === "dialogflow") {
    let inputAudio: string | undefined;

    if (msgType === "audioMessage") {
      let filename = `${msg.messageTimestamp}.ogg`;
      readFile(
        join(
          __dirname,
          "..",
          "..",
          "..",
          "public",
          `company${companyId}`,
          filename
        ),
        "base64",
        (err, data) => {
          inputAudio = data;
          if (err) {
            logger.error(err);
          }
        }
      );
    } else {
      inputAudio = undefined;
    }

    const debouncedSentMessage = debounce(
      async () => {
        await sendDialogflowAwswer(
          wbot,
          ticket,
          msg,
          ticket.contact,
          inputAudio,
          companyId,
          queueIntegration
        );
      },
      500,
      ticket.id
    );
    debouncedSentMessage();
  } else if (queueIntegration.type === "typebot") {
    console.log("[TYPEBOT 3010] Enviando mensagem para Typebot");
    // await typebots(ticket, msg, wbot, queueIntegration);
    await typebotListener({ ticket, msg, wbot, typebot: queueIntegration });
  } else if (queueIntegration.type === "flowbuilder") {
    const contact = await ShowContactService(
      ticket.contactId,
      ticket.companyId
    );
    await flowbuilderIntegration(msg, wbot, companyId, queueIntegration, ticket, contact, null, null);
  } else if (queueIntegration.type === "SGP") {
    console.error(`SGP: Chamando integração SGP pelo handler antigo`);
  }
  } catch (error) {
    logger.error(`[INTEGRATION ERROR] Erro ao processar integração ${queueIntegration?.type} no ticket ${ticket.id}:`, error);
    await notifyIntegrationErrorAndReset(ticket, companyId);
  }
};

const flowBuilderQueue = async (
  ticket: Ticket,
  msg: proto.IWebMessageInfo,
  wbot: Session,
  whatsapp: Whatsapp,
  companyId: number,
  contact: Contact,
  isFirstMsg: Ticket
) => {
  const body = getBodyMessage(msg);

  const flow = await FlowBuilderModel.findOne({
    where: {
      id: ticket.flowStopped
    }
  });

  const mountDataContact = {
    number: contact.number,
    name: contact.name,
    email: contact.email
  };

  const nodes: INodes[] = flow.flow["nodes"];
  const connections: IConnections[] = flow.flow["connections"];

  if (!ticket.lastFlowId) {
    return;
  }

  await ActionsWebhookService(
    whatsapp.id,
    parseInt(ticket.flowStopped),
    ticket.companyId,
    nodes,
    connections,
    ticket.lastFlowId,
    null,
    "",
    "",
    body,
    ticket.id,
    mountDataContact,
    null,
    msg
  );

  //const integrations = await ShowQueueIntegrationService(whatsapp.integrationId, companyId);
  //await handleMessageIntegration(msg, wbot, companyId, integrations, ticket, contact, isFirstMsg)
};

const checkTemporaryAI = async (
  wbot: Session,
  ticket: Ticket,
  contact: Contact,
  msgContact: IMe,
  mediaSent: Message,
  ticketTraking: TicketTraking,
  msg: proto.IWebMessageInfo
) => {
  // Agente (Prompt) na conexão tem prioridade: não empilhar IA temporária do FlowBuilder no mesmo inbound.
  try {
    const waConn = await Whatsapp.findByPk(ticket.whatsappId, {
      attributes: ["id", "promptId", "agentDisabled"]
    });
    const pid = waConn?.getDataValue("promptId") as number | null | undefined;
    if (
      pid != null &&
      String(pid).trim() !== "" &&
      !Number.isNaN(Number(pid)) &&
      waConn?.getDataValue("agentDisabled") !== true
    ) {
      return false;
    }
  } catch {
    /* segue */
  }

  // Verificar se é modo temporário com flowContinuation
  const dataWebhook = normalizeTicketDataWebhook(ticket.dataWebhook) as any;
  const flowContinuation = dataWebhook?.flowContinuation;

  // ✅ CORRIGIDO: IA temporária deve parar quando ticket é aceito (status = "open" ou isBot = false)
  if ((!flowContinuation || !ticket.useIntegration || !ticket.flowStopped || !ticket.lastFlowId) && ticket.status !== "open" && ticket.isBot !== false) {
    return false;
  }

  // Verificar se é node IA em modo temporário
  const isAIMode = dataWebhook?.type === "openai" || dataWebhook?.type === "gemini";
  if (!isAIMode || dataWebhook?.mode !== "temporary") {
    return false;
  }

  try {
    const aiSettings = {
      ...dataWebhook.settings,
      provider: dataWebhook.type,
      flowScoped: true,
      topP: typeof (dataWebhook.settings?.topP) === "number" ? dataWebhook.settings.topP : 1,
      presencePenalty: typeof (dataWebhook.settings?.presencePenalty) === "number" ? dataWebhook.settings.presencePenalty : 0,
      frequencyPenalty: typeof (dataWebhook.settings?.frequencyPenalty) === "number" ? dataWebhook.settings.frequencyPenalty : 0,
      stop: Array.isArray(dataWebhook.settings?.stop) || typeof dataWebhook.settings?.stop === "string"
        ? dataWebhook.settings.stop
        : ["###", "FIM"]
    };

    // ✅ SE FOR PRIMEIRA RESPOSTA, REMOVER FLAG
    if (dataWebhook.awaitingUserResponse) {
      await ticket.update({
        dataWebhook: {
          ...dataWebhook,
          awaitingUserResponse: false
        }
      });
    }

    // ✅ PROCESSAR ATRAVÉS DA IA
    logAiCallDebug(
      "wbotMessageListener.ts:checkTemporaryAI→handleOpenAiFlow",
      ticket,
      (aiSettings as any)?.prompt ?? aiSettings
    );
    await handleOpenAiFlow(
      aiSettings,
      msg,
      wbot,
      ticket,
      contact,
      mediaSent,
      ticketTraking
    );

    return true;

  } catch (error) {
    logger.error("[AI SERVICE] Erro ao processar IA temporário:", error);
    return false;
  }
};

function applyRuntimeSingleTurnGuard(params: {
  text: string;
  ticket: Ticket;
  prompt: any;
  strictRoteiroDiscipline: boolean;
  lastUserText: string;
}): string {
  const { text, ticket, prompt, strictRoteiroDiscipline, lastUserText } = params;
  const raw = String(text || "").trim();
  if (!raw || !strictRoteiroDiscipline) return raw;
  try {
    const dw = normalizeTicketDataWebhook((ticket as any).dataWebhook) as Record<string, any>;
    const af = normalizeAttendanceFlowMemory(dw.attendanceFlow, prompt.id);
    const currentStepNumber = Number(af.lastPresentedStep || 0);
    const stepsArr = [...(((prompt as any).attendanceFlowSteps || []) as any[])];
    const currentStep = stepsArr.find((s: any) => Number(s.stepNumber) === currentStepNumber) || null;
    const fallbackVisible = stripAgentFlowScriptTrainingMarkers(
      String(currentStep?.agentPrompt || af.lastPresentedTextPreview || "")
    );
    const guardStep: any = {
      stepId: currentStep?.stepId || `s${currentStepNumber || 1}`,
      stepNumber: currentStepNumber || 1,
      title: currentStep?.title || `Etapa ${currentStepNumber || 1}`,
      objective: currentStep?.objective || "Conduzir apenas a etapa atual do roteiro.",
      expectedReply: currentStep?.expectedReply || "open",
      slotName: currentStep?.slotName || null,
      slotSchema: currentStep?.slotSchema || null,
      agentPrompt: String(currentStep?.agentPrompt || fallbackVisible || ""),
      customerVisibleText: String(currentStep?.customerVisibleText || fallbackVisible || ""),
      trainingMarkers: currentStep?.trainingMarkers || { examples: [], objections: [] },
      branchesIR: currentStep?.branchesIR || [],
      commandsIR: currentStep?.commandsIR || [],
      responseOptions: currentStep?.responseOptions || [],
      conditions: currentStep?.conditions || [],
      attachments: currentStep?.attachments || []
    };
    const guarded = postGenerationGuard(raw, {
      step: guardStep,
      previousStepVisibleText: af.lastPresentedTextPreview || null,
      lastUserText
    });
    if (guarded.truncated) {
      logger.info(
        `[SINGLE-TURN-GUARD] resposta ajustada ticket=${ticket.id} prompt=${prompt.id} reasons=${guarded.reasons.join(",")}`
      );
    }
    return guarded.text || raw;
  } catch (e) {
    try {
      logger.warn(`[SINGLE-TURN-GUARD] falhou ticket=${ticket.id}; mantendo resposta original`, e as any);
    } catch {}
    return raw;
  }
}

const handleOpenAi = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  ticket: Ticket,
  contact: Contact,
  mediaSent: Message | undefined,
  ticketTraking: TicketTraking
): Promise<boolean> => {
  (ticket as any).__connectionAgentAgentReplySent = false;

  // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
  if (contact.disableBot) {
    return false;
  }
  const bodyMessage = getBodyMessage(msg) || "";
  const hasInboundMedia = !!(
    msg.message?.audioMessage ||
    msg.message?.imageMessage ||
    msg.message?.videoMessage ||
    msg.message?.documentMessage ||
    msg.message?.stickerMessage
  );
  if (!bodyMessage.trim() && !hasInboundMedia) return false;
  if (bodyMessage.trim()) {
    try {
      await onAgentUserInboundText(ticket, bodyMessage);
    } catch {}
  }

  if (msg.messageStubType) return false;

  /**
   * Fonte única do agente: Whatsapp.promptId (OpenAI/Prompt) ou anthropicMultiAgentId (Claude).
   * Não usar ticket.dataWebhook, settings de fila/fluxo nem qualquer fallback externo para montar o system prompt.
   */
  const whatsappConn = await ShowWhatsAppService(wbot.id, ticket.companyId);

  let prompt: any = null;
  let connectionAgentRef: import("../../providers/anthropic/services/resolveConnectionAgent").ConnectionAgentRef | null =
    null;
  try {
    const resolved = await resolveConnectionAgentFromWhatsapp(whatsappConn, ticket.companyId);
    if (resolved) {
      prompt = resolved.prompt;
      connectionAgentRef = resolved.ref;
    }
  } catch (e) {
    const errMsg = String((e as Error)?.message || e);
    logger.warn(
      `[AI-CONNECTION] ticket ${ticket.id}: falha ao resolver agente (OpenAI/Claude/Gemini) — ${errMsg}`
    );
    if (msg.key.remoteJid) {
      try {
        let noticeText = "";
        if (/claude|anthropic/i.test(errMsg)) {
          noticeText =
            "O assistente Claude não está disponível no momento. Confirme a API Key em Integrações → Claude e tente novamente.";
        } else if (/gemini|google/i.test(errMsg)) {
          noticeText =
            "O assistente Gemini não está disponível no momento. Ative a integração e confirme a API Key em Integrações → Gemini, depois tente novamente.";
        } else if (/api key|apikey|missing_api_key/i.test(errMsg)) {
          noticeText =
            "O agente de IA não pôde responder: verifique a API Key do provedor (Integrações) e se o agente está vinculado à conexão.";
        }
        if (noticeText) {
          const notice = await wbot.sendMessage(resolveReplyJid(msg, contact), {
            text: `\u200e ${noticeText}`
          });
          await verifyMessage(notice!, ticket, contact, ticketTraking, true, false, true);
          markConnectionAgentReplySent(ticket);
        }
      } catch {
        /* ignore */
      }
    }
    return connectionAgentReplySent(ticket);
  }

  if (!prompt || !connectionAgentRef) {
    try {
      logger.info(
        JSON.stringify({
          evt: "handleOpenAi_aborted_no_prompt",
          ticketId: ticket.id,
          whatsappId: wbot.id,
          companyId: ticket.companyId,
          promptId: whatsappConn.getDataValue("promptId"),
          anthropicMultiAgentId: whatsappConn.getDataValue("anthropicMultiAgentId")
        })
      );
    } catch {
      /* ignore */
    }
    return false;
  }

  const { historyAnchorAt } = await syncTicketConnectionAgentContext(ticket, connectionAgentRef);
  try {
    logger.info(
      JSON.stringify({
        evt: "handleOpenAi_context",
        ticketId: ticket.id,
        whatsappId: wbot.id,
        promptId: prompt.id,
        promptName: prompt.name,
        historyAnchorAt: historyAnchorAt || undefined
      })
    );
  } catch {
    /* ignore */
  }

  if (bodyMessage.trim() && !msg.message?.audioMessage && !msg.message?.stickerMessage) {
    try {
      await updateAgentConversationalMemory({
        ticket,
        promptId: prompt.id,
        userText: bodyMessage
      });
    } catch (e) {
      logger.warn(`[CONVERSATIONAL-MEMORY] ticket ${ticket.id}: atualização LLM-first falhou —`, e as any);
    }

    await markAgentProcessingStarted({
      ticket,
      promptId: prompt.id,
      wid: msg?.key?.id || null,
      userText: bodyMessage
    });
    try {
      if (await shouldRunSmartActionTriggersForPrompt(prompt, ticket)) {
        try {
          const r = await resolvePendingIntents(ticket, contact, prompt, bodyMessage);
          if (r.handled) {
            const safeIntentMessage = sanitizeAgentCustomerVisibleText(String(r.message || ""));
            if (safeIntentMessage) {
              await sendSmartAgentTextBlocks({
                wbot,
                msg,
                ticket,
                contact,
                ticketTraking,
                prompt,
                text: safeIntentMessage,
                guardLabel: "intent pendente (pre-orquestrador)",
                userText: bodyMessage
              });
            }
            try {
              await ticket.reload();
            } catch {
              /* ignore */
            }
            await markAgentProcessingFinished({
              ticket,
              promptId: prompt.id,
              wid: msg?.key?.id || null,
              ok: true
            });
            return connectionAgentReplySent(ticket);
          }
        } catch (e) {
          logger.warn(`[INTENT-RESOLVER] ticket ${ticket.id} (pre-orquestrador LLM-first):`, e as any);
        }
      }

      let flowEarly: Awaited<ReturnType<typeof tryHandlePromptAttendanceFlowTurn>> | null = null;
      try {
        flowEarly = await tryHandlePromptAttendanceFlowTurn({
          wbot,
          msg,
          ticket,
          contact,
          ticketTraking,
          prompt,
          bodyMessage
        });
        if (attendanceFlowDeliveredOutput(flowEarly)) {
          markConnectionAgentReplySent(ticket);
          await markAgentProcessingFinished({
            ticket,
            promptId: prompt.id,
            wid: msg?.key?.id || null,
            ok: true
          });
          return true;
        }
        if (flowEarly.consumedReply && flowEarly.allowLlmFallback) {
          logger.warn(
            `[ATTENDANCE-FLOW] ticket ${ticket.id}: fluxo consumiu sem saída (${flowEarly.reason}); seguindo para orquestrador LLM-first.`
          );
        }
        try {
          await ticket.reload();
        } catch {
          /* ignore */
        }
      } catch (e) {
        logger.warn(`[ATTENDANCE-FLOW] ticket ${ticket.id} (pre-orquestrador LLM-first):`, e as any);
      }

      /**
       * Fila assíncrona só depois do roteiro visual (estado persistido). Evita corrida em que a 2ª
       * mensagem chega antes do worker processar a 1ª e o agente “trava” sem responder.
       * Nunca enfileirar quando há roteiro visual — resposta deve ser síncrona etapa a etapa.
       */
      const promptHasFlowScript = isAgentRoteiroRuntimeActive(prompt);
      if (
        isAgentInboundQueueEnabled() &&
        agentInboundQueue &&
        isAgentLlmFirstRuntimeEnabled() &&
        String(msg?.key?.id || "").trim() &&
        !flowEarly?.consumedReply &&
        !promptHasFlowScript
      ) {
        const queued = await enqueueAgentInboundJob(agentInboundQueue, {
          companyId: ticket.companyId,
          ticketId: ticket.id,
          whatsappId: wbot.id,
          promptId: prompt.id,
          wid: String(msg.key.id),
          enqueuedAt: new Date().toISOString(),
          userText: bodyMessage,
          contactId: contact.id
        });
        if (queued) {
          try {
            logger.info(
              JSON.stringify({
                evt: "agent_inbound_queued",
                ticketId: ticket.id,
                promptId: prompt.id,
                wid: msg.key.id
              })
            );
          } catch {
            /* ignore */
          }
          markConnectionAgentReplySent(ticket);
          await markAgentProcessingFinished({
            ticket,
            promptId: prompt.id,
            wid: msg?.key?.id || null,
            ok: true
          });
          return true;
        }
      }

      if (
        flowEarly &&
        (attendanceFlowDeliveredOutput(flowEarly) ||
          (flowEarly.consumedReply && !flowEarly.allowLlmFallback))
      ) {
        (ticket as any).__preOrchestratorAttendanceFlowTried = true;
      }

      const orchestrated = await runAgentOrchestrator({
        prompt,
        ticket,
        contact,
        userText: bodyMessage
      });
      if (orchestrated.handled) {
        const reply = sanitizeAgentCustomerVisibleText(String(orchestrated.reply || ""));
        if (reply) {
          if (await shouldRunSmartActionTriggersForPrompt(prompt, ticket)) {
            try {
              const cls = await classifyAgentOutbound(reply, prompt, ticket);
              const enabledIntents = await filterIntentsToEnabledSmartActions(
                cls.intents,
                prompt,
                ticket.companyId
              );
              if (enabledIntents.length) {
                await registerPendingIntents(ticket, enabledIntents);
              }
            } catch (e) {
              logger.warn(`[INTENT-CLASSIFIER] ticket ${ticket.id}: erro no LLM-first —`, e as any);
            }
          }
          await sendSmartAgentTextBlocks({
            wbot,
            msg,
            ticket,
            contact,
            ticketTraking,
            prompt,
            text: reply,
            guardLabel: "llm-first duplicado",
            userText: bodyMessage
          });
        }
        if (
          (prompt as any).__llmProvider === "gemini" &&
          orchestrated.geminiImages?.length
        ) {
          await sendGeminiImagesToWhatsapp({
            wbot,
            msg,
            ticket,
            contact,
            ticketTraking,
            companyId: ticket.companyId,
            images: orchestrated.geminiImages,
            caption: reply || undefined
          });
        }
        if (reply || orchestrated.geminiImages?.length) {
          if (!reply && orchestrated.geminiImages?.length) {
            markConnectionAgentReplySent(ticket);
          }
          await markAgentProcessingFinished({
            ticket,
            promptId: prompt.id,
            wid: msg?.key?.id || null,
            ok: true
          });
          return connectionAgentReplySent(ticket);
        }
        logger.warn(
          `[AGENT-ORCH] orquestrador sem reply ticket=${ticket.id} provider=${(prompt as any).__llmProvider || "openai"}; tentando fallback direto`
        );
      }
      if (orchestrated.fallbackReason) {
        logger.info(`[AGENT-ORCH] fallback legado ticket=${ticket.id} reason=${orchestrated.fallbackReason}`);
      }
      await markAgentProcessingFinished({
        ticket,
        promptId: prompt.id,
        wid: msg?.key?.id || null,
        ok: true
      });
    } catch (e) {
      await markAgentProcessingFinished({
        ticket,
        promptId: prompt.id,
        wid: msg?.key?.id || null,
        ok: false,
        error: e
      });
      logger.warn(`[AGENT-ORCH] erro inesperado ticket=${ticket.id}; fallback legado —`, e as any);
    }
  }

  if (bodyMessage.trim()) {
    const pastForSchedule = await Message.findAll({
      where: buildWhereForConnectionAgentHistory(ticket, prompt.id),
      order: [["createdAt", "ASC"]],
      limit: 80
    });
    const scheduleAttempt = await tryScheduleMeeting(bodyMessage, ticket, contact, pastForSchedule);
    if (scheduleAttempt.handled && scheduleAttempt.when) {
      const when = scheduleAttempt.when;
      const text = `Reunião agendada com sucesso para ${format(when, "dd/MM/yyyy")} às ${format(when, "HH:mm")}.`;
      const sentMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
        text
      });
      await verifyMessage(sentMessage!, ticket, contact, undefined, false, false, true);
      /**
       * tryScheduleMeeting roda antes do roteiro visual. Sem marcar o fluxo como concluído,
       * attendanceFlow fica em lastPresentedStep 0 e a próxima mensagem do cliente reenvia a ETAPA 1.
       */
      try {
        const flowSteps = [...(((prompt as any)?.attendanceFlowSteps || []) as any[])].filter(
          (s: any) => s && Number(s.stepNumber) > 0
        );
        let cargo: any = (prompt as any)?.cargo;
        if (typeof cargo === "string") {
          try {
            cargo = JSON.parse(cargo);
          } catch {
            cargo = {};
          }
        }
        const fluxoOff = (cargo as any)?.sectionFlags?.fluxoEnabled === false;
        if (flowSteps.length > 0 && !fluxoOff) {
          const base = normalizeTicketDataWebhook(ticket.dataWebhook) as Record<string, unknown>;
          const afPrev = normalizeAttendanceFlowMemory(base.attendanceFlow, prompt.id);
          const stepNums = flowSteps
            .map((s: any) => Number(s.stepNumber))
            .filter((x: number) => Number.isFinite(x) && x > 0);
          const maxStep = stepNums.length ? Math.max(...stepNums) : 1;
          const completed = stepNums.length
            ? [...new Set(stepNums)].sort((a, b) => a - b)
            : Array.from({ length: maxStep }, (_, i) => i + 1);
          const nextAf = normalizeAttendanceFlowMemory(
            {
              ...afPrev,
              promptId: prompt.id,
              flowPhase: "completed",
              awaitingUserReply: false,
              lastPresentedStep: maxStep,
              completedSteps: completed,
              answersByStep: {
                ...(afPrev.answersByStep || {}),
                [String(maxStep)]: String(bodyMessage || "")
                  .trim()
                  .slice(0, 220)
              }
            },
            prompt.id
          );
          const nextDw = { ...base, attendanceFlow: nextAf } as Record<string, unknown>;
          await ticket.update({ dataWebhook: nextDw as any });
          ticket.setDataValue("dataWebhook", nextDw);
        }
      } catch (e) {
        logger.warn(
          `[ATTENDANCE-FLOW] sync após tryScheduleMeeting falhou ticket ${ticket.id} prompt ${prompt.id}`,
          e
        );
      }
      markConnectionAgentReplySent(ticket);
      return true;
    }
  }

  const publicFolder: string = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "public",
    `company${ticket.companyId}`
  );

  if (bodyMessage.trim() && !msg.message?.audioMessage && !msg.message?.stickerMessage) {
    try {
      await updateAgentConversationalMemory({
        ticket,
        promptId: prompt.id,
        userText: bodyMessage
      });
    } catch (e) {
      logger.warn(`[CONVERSATIONAL-MEMORY] ticket ${ticket.id}: atualização inicial falhou —`, e as any);
    }
  }

  // PR 13: Tenta satisfazer intents pendentes (gatilho do agente em turno anterior).
  if (
    (await shouldRunSmartActionTriggersForPrompt(prompt, ticket)) &&
    bodyMessage.trim() &&
    !msg.message?.audioMessage &&
    !msg.message?.stickerMessage
  ) {
    try {
      const r = await resolvePendingIntents(ticket, contact, prompt, bodyMessage);
      if (r.handled) {
        const safeIntentMessage = sanitizeAgentCustomerVisibleText(String(r.message || ""));
        if (safeIntentMessage) {
          await sendSmartAgentTextBlocks({
            wbot,
            msg,
            ticket,
            contact,
            ticketTraking,
            prompt,
            text: safeIntentMessage,
            guardLabel: "intent duplicada",
            userText: bodyMessage
          });
        }
        return connectionAgentReplySent(ticket);
      }
    } catch (e) {
      logger.warn(`[INTENT-RESOLVER] ticket ${ticket.id}: erro —`, e as any);
    }
  }

  // Fluxo visual (roteiro) antes da LLM e antes de carregar sessão/histórico pesado.
  const skipDuplicateAttendanceFlow = !!(ticket as any).__preOrchestratorAttendanceFlowTried;
  if ((ticket as any).__preOrchestratorAttendanceFlowTried) {
    delete (ticket as any).__preOrchestratorAttendanceFlowTried;
  }
  if (
    bodyMessage.trim() &&
    !msg.message?.audioMessage &&
    !msg.message?.stickerMessage &&
    !skipDuplicateAttendanceFlow
  ) {
    try {
      const flowOutcomeEarly = await tryHandlePromptAttendanceFlowTurn({
        wbot,
        msg,
        ticket,
        contact,
        ticketTraking,
        prompt,
        bodyMessage
      });
      if (flowOutcomeEarly.handled && attendanceFlowDeliveredOutput(flowOutcomeEarly)) {
        markConnectionAgentReplySent(ticket);
        return true;
      }
      if (flowOutcomeEarly.consumedReply && flowOutcomeEarly.allowLlmFallback) {
        logger.warn(
          `[ATTENDANCE-FLOW] ticket ${ticket.id}: fluxo consumiu sem saída (${flowOutcomeEarly.reason}); fallback para LLM.`
        );
      }
    } catch (e) {
      logger.warn(`[ATTENDANCE-FLOW] ticket ${ticket.id}: fallback para LLM —`, e);
    }
  }

  if (bodyMessage.trim() && !msg.message?.audioMessage && !msg.message?.stickerMessage) {
    try {
      let dwAf = normalizeTicketDataWebhook(ticket.dataWebhook) as Record<string, unknown>;
      try {
        const snapAf = await Ticket.findByPk(ticket.id, {
          attributes: ["dataWebhook"]
        });
        if (snapAf) {
          dwAf = normalizeTicketDataWebhook(snapAf.getDataValue("dataWebhook")) as Record<
            string,
            unknown
          >;
        }
      } catch {
        /* mantém ticket em memória */
      }
      const afGate = normalizeAttendanceFlowMemory(dwAf.attendanceFlow, prompt.id);
      if (
        afGate.awaitingUserReply === true &&
        afGate.flowPhase !== "completed" &&
        Number(afGate.lastPresentedStep) > 0 &&
        Number(afGate.promptId) === Number(prompt.id) &&
        isTrivialFlowInboundNoise(bodyMessage)
      ) {
        const stepsArr = [...(((prompt as any).attendanceFlowSteps || []) as any[])];
        const curStep = stepsArr.find(
          (s: any) => Number(s.stepNumber) === Number(afGate.lastPresentedStep)
        );
        const visible = stripAgentFlowScriptTrainingMarkers(String(curStep?.agentPrompt || ""));
        const lines = visible
          .split(/\r?\n/)
          .map((l: string) => l.trim())
          .filter(Boolean);
        const qLine = [...lines].reverse().find((l: string) => /\?\s*$/.test(l));
        const hint = qLine
          ? `Claro! ${qLine}`
          : String(afGate.lastPresentedTextPreview || "").trim() ||
            "Quando puder, envie a informação que pedimos acima, por favor.";
        const safeHint = sanitizeAgentCustomerVisibleText(hint);
        if (safeHint) {
          const sentNudge = await wbot.sendMessage(resolveReplyJid(msg, contact), { text: `\u200e ${safeHint}` });
          await verifyMessage(sentNudge!, ticket, contact, ticketTraking, true, false, true);
          markConnectionAgentReplySent(ticket);
        }
        return connectionAgentReplySent(ticket);
      }
    } catch (e) {
      logger.warn(`[ATTENDANCE-FLOW] ticket ${ticket.id}: gate ruído trivial antes da LLM —`, e);
    }
  }

  if (
    (prompt as any).__llmProvider === "gemini" ||
    (prompt as any).__llmProvider === "anthropic" ||
    (prompt as any).__llmProvider === "grok"
  ) {
    try {
      const direct = await runProviderDirectReplyFallback({
        prompt,
        ticket,
        contact,
        userText: bodyMessage
      });
      if (direct.handled) {
        const reply = sanitizeAgentCustomerVisibleText(String(direct.reply || ""));
        if (reply) {
          await sendSmartAgentTextBlocks({
            wbot,
            msg,
            ticket,
            contact,
            ticketTraking,
            prompt,
            text: reply,
            guardLabel: `${(prompt as any).__llmProvider} fallback direto`,
            userText: bodyMessage
          });
        }
        if (direct.geminiImages?.length) {
          await sendGeminiImagesToWhatsapp({
            wbot,
            msg,
            ticket,
            contact,
            ticketTraking,
            companyId: ticket.companyId,
            images: direct.geminiImages,
            caption: reply || undefined
          });
          if (!reply) {
            markConnectionAgentReplySent(ticket);
          }
        }
        return connectionAgentReplySent(ticket);
      }
      logger.warn(
        `[AI-CONNECTION] ticket ${ticket.id}: ${(prompt as any).__llmProvider} sem resposta (orquestrador e fallback direto: ${direct.fallbackReason || "unknown"})`
      );
    } catch (e) {
      logger.warn(
        `[AI-CONNECTION] ticket ${ticket.id}: fallback ${(prompt as any).__llmProvider} direto falhou —`,
        e as any
      );
    }
    return false;
  }

  const openai = new OpenAI({ apiKey: prompt.apiKey });

  const messageWhere = buildWhereForConnectionAgentHistory(ticket, prompt.id);
  const messages = await Message.findAll({
    where: messageWhere,
    order: [["createdAt", "ASC"]],
    limit: prompt.maxMessages
  });
  const recentTurnsForMemory = (messages || []).slice(-6).map((m: any) => ({
    fromMe: !!m.fromMe,
    body: m.body || ""
  }));
  if (bodyMessage.trim() && !msg.message?.audioMessage && !msg.message?.stickerMessage) {
    try {
      await updateAgentConversationalMemory({
        ticket,
        promptId: prompt.id,
        userText: bodyMessage,
        recentTurns: [
          ...recentTurnsForMemory.slice(-5),
          { fromMe: false, body: bodyMessage }
        ]
      });
    } catch (e) {
      logger.warn(`[CONVERSATIONAL-MEMORY] ticket ${ticket.id}: atualização contextual falhou —`, e as any);
    }
  }

  // System prompt exclusivamente a partir do registro Prompt carregado acima (e extensões por companyId/prompt).
  const ownedBlobs = resolveOwnedPromptBlobsForRuntime(
    prompt.id,
    prompt.cargo,
    prompt.cerebro,
    prompt.produtividade
  );
  const roleBlock = await buildAgentRoleInstructionLines(ticket.companyId, ownedBlobs.cargo, {
    preferPromptOnly: true
  });
  const promptExt = await getExtensionsForWhatsappAgentPrompt(ticket.companyId, prompt);

  let companyName = "";
  try {
    const co = await ShowCompanyService(ticket.companyId);
    companyName = String(co?.name || "").trim();
  } catch {
    companyName = "";
  }
  const scriptPlaceholderCtx = {
    contactName: String(contact?.name || "").trim(),
    agentName: String(prompt?.name || "").trim(),
    companyName,
    phone: String(contact?.number || "").trim(),
    now: new Date()
  };

  const scopePreamble = buildWhatsappPromptScopePreamble(prompt);
  const roteiroRuntimeActive = isAgentRoteiroRuntimeActive(prompt);
  const attendanceFlowAnchor = roteiroRuntimeActive
    ? buildAttendanceFlowLlmAnchor(ticket, prompt.id)
    : "";
  const strictRoteiroDiscipline = roteiroRuntimeActive;
  const blockFormatRule = strictRoteiroDiscipline
    ? "Responda de forma natural e objetiva (no máximo 3–4 frases, ou uma pergunta objetiva). Não avance etapas do roteiro na mesma mensagem: interprete a etapa lógica atual pelo histórico e pelo texto do roteiro, responda só a essa etapa e aguarde o cliente. Se o cliente fez outra pergunta (FAQ, preço, horário), responda primeiro com Regras + FAQ + conhecimento e só depois retome a etapa pendente. **Faça no máximo uma pergunta principal** e, se fizer pergunta, termine a resposta nessa pergunta — não acrescente frases que pressuponham que ele já respondeu."
    : "Responda de forma natural em frases curtas. Priorize Regras gerais, FAQ e Base de conhecimento. Evite textões; o runtime separa mensagens grandes em blocos sem cortar frases.";
  const promptSystemUnexpanded = `${scopePreamble}${roteiroRuntimeActive ? "" : `\n${AGENT_CONSULTIVE_MODE_DIRECTIVE_PT}\n`}Nas respostas utilize o nome ${sanitizeName(
    contact.name || "Amigo(a)"
  )} para identificar o cliente.\nSua resposta deve usar no máximo ${prompt.maxTokens
    } tokens e cuide para não truncar o final.\nSempre que possível, mencione o nome dele para ser mais personalizado o atendimento e mais educado. Quando a resposta requer transferência real para humano, comece sua resposta com a linha exata: 'Ação: Transferir para o setor de atendimento' (o sistema executa a transferência). Se você disser que vai transferir ou encaminhar a um atendente, não acrescente na mesma mensagem informações de etapas posteriores do roteiro (ex.: cardápio, localização) — isso fica para depois que o humano assumir.\n${blockFormatRule}\n${WHATSAPP_AGENT_CONVERSATION_POLICY}${attendanceFlowAnchor ? `\n${attendanceFlowAnchor}\n` : "\n"}${roleBlock}
${promptExt.brainBlock}
${promptExt.proactiveBlock ? `${promptExt.proactiveBlock}\n` : ""}
${promptExt.actionsBlock}
${WHATSAPP_AGENT_AGGREGATED_DOCUMENT_BRIDGE}
  ${prompt.prompt}\n`;
  const promptSystem = expandAgentScriptPlaceholders(promptSystemUnexpanded, scriptPlaceholderCtx);

  let messagesOpenAi = [];

  // Texto: não exigir conversation/extended no nível raiz — mensagens efêmeras, wrappers e
  // formatos novos do Baileys podem ter o texto só em getBodyMessage, o que fazia a 2ª+ mensagem
  // cair fora deste bloco e o bot “parar de responder”. Áudio e figurinha têm ramos próprios.
  if (
    bodyMessage.trim() &&
    !msg.message?.audioMessage &&
    !msg.message?.stickerMessage
  ) {
    messagesOpenAi = [];
    {
      let systemContent = promptSystem;
      try {
        const digest = buildConversationContextDigest({
          ticket,
          promptId: prompt.id,
          promptStateKey: prompt?.updatedAt ? `${prompt.id}:${String(prompt.updatedAt)}` : undefined,
          recentTurns: [
            ...recentTurnsForMemory.slice(-5),
            { fromMe: false, body: bodyMessage }
          ],
          maxTurns: 6
        });
        if (digest) systemContent = `${systemContent}\n\n${digest}`;
      } catch {
        /* digest é best-effort */
      }
      messagesOpenAi.push({ role: "system", content: systemContent });
    }
    for (
      let i = 0;
      i < Math.min(prompt.maxMessages, messages.length);
      i++
    ) {
      const message = messages[i];
      const line = (message.body || "").trim();
      if (!line) continue;
      if (message.fromMe) {
        messagesOpenAi.push({ role: "assistant", content: message.body });
      } else {
        messagesOpenAi.push({ role: "user", content: message.body });
      }
    }
    messagesOpenAi.push({ role: "user", content: bodyMessage });

    const modelToUse = prompt.model || OPENAI_DEFAULT_CHAT_MODEL;
    const payload: any = {
      model: modelToUse,
      messages: messagesOpenAi,
      max_tokens: prompt.maxTokens,
      temperature: prompt.temperature
    };
    payload.top_p = 1;
    payload.presence_penalty = 0;
    payload.frequency_penalty = 0;
    payload.stop = ["###", "FIM"];
    logAiCallDebug("wbotMessageListener.ts:handleOpenAi:textChat", ticket, promptSystem);
    const chat = await openai.chat.completions.create(payload);

    let response = (chat?.choices?.[0]?.message?.content || "").trim();
    const raw = response.trim();
    const onlyPunctuation = raw.length > 0 && /^[\.\!\?\-\_\(\)\[\]\{\}"'`~…·•]+$/.test(raw);
    const hasAlphaNum = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(raw);
    const cleaned = raw.replace(/[^\p{L}\p{N}]+/gu, "").trim();
    if (!raw || raw.length < 2 || onlyPunctuation || !hasAlphaNum || cleaned.length < 1) {
      response = "Consigo continuar pelo contexto. Me confirma só a informação que ficou pendente para eu avançar?";
      try { logger.warn(`[AI SERVICE] Resposta vazia/irregular da IA para ticket ${ticket.id}; usando fallback.`); } catch {}
    }

    if (response?.includes("Ação: Transferir para o setor de atendimento")) {
      await applyPromptIntegrationAgentTransfer(ticket, contact, prompt.queueId, prompt);
      response = response
        .replace("Ação: Transferir para o setor de atendimento", "")
        .trim();
    } else if (
      response &&
      assistantTextImpliesTransferToHuman(response) &&
      isPromptIntegrationTransferConfigured(prompt, ticket.queueId)
    ) {
      try {
        await applyPromptIntegrationAgentTransfer(ticket, contact, prompt.queueId, prompt);
        response = truncateAssistantResponseAfterDeclaredTransfer(response);
      } catch (e) {
        try {
          logger.warn(`[AI SERVICE] Transferência heurística falhou ticket ${ticket.id}:`, e);
        } catch {}
      }
    }

    response = sanitizeAgentCustomerVisibleText(response || "");
    response = clipPrematureAssistantProgressAfterQuestion(response);
    response = applyRuntimeSingleTurnGuard({
      text: response,
      ticket,
      prompt,
      strictRoteiroDiscipline,
      lastUserText: bodyMessage
    });
    response = applyAgentOrchestratorGuardrails(response, {
      lastAssistantText: recentTurnsForMemory.slice().reverse().find((turn) => turn.fromMe)?.body || "",
      actionConfirmed: false
    });
    response = String(response || "").trim();
    if (!response) {
      logger.warn(`[AI SERVICE] Resposta vazia após sanitização para ticket ${ticket.id}; nada será enviado.`);
      return false;
    }

    // PR 12: classifica saída do agente e registra intents pendentes (behind flag).
    if ((await shouldRunSmartActionTriggersForPrompt(prompt, ticket)) && response) {
      try {
        const cls = await classifyAgentOutbound(response, prompt, ticket);
        const enabledIntents = await filterIntentsToEnabledSmartActions(
          cls.intents,
          prompt,
          ticket.companyId
        );
        if (enabledIntents.length) {
          await registerPendingIntents(ticket, enabledIntents);
        }
      } catch (e) {
        logger.warn(`[INTENT-CLASSIFIER] ticket ${ticket.id}: erro —`, e as any);
      }
    }

    if (prompt.voice === "texto") {
      try {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urlMatches = (response.match(urlRegex) || []) as string[];
        const urls: string[] = Array.from(
          new Set<string>(urlMatches.map((u: string) => u.replace(/[)\]\.,;]+$/, "")))
        );
        if (urls.length) {
          const allowed = /\.(png|jpe?g|gif|webp|mp4|mov|avi|mkv|mp3|wav|ogg|webm|pdf|docx?|xlsx?|pptx?|zip|7z|rar)$/i;
          const basePublic = path.resolve(__dirname, "..", "..", "..", "public");
          const companyFolder = path.join(basePublic, `company${ticket.companyId}`, "ai-attachments");
          if (!fs.existsSync(companyFolder)) fs.mkdirSync(companyFolder, { recursive: true });
          for (const u of urls) {
            if (!allowed.test(String(u))) continue;
            try {
              const urlObj = new URL(String(u));
              const baseName = decodeURIComponent(urlObj.pathname.split("/").filter(Boolean).pop() || `file_${Date.now()}`);
              const safeName = baseName.replace(/[^\w\.\-]+/g, "_");
              const target = path.join(companyFolder, `${Date.now()}_${safeName}`);
              const res = await axios.get(String(u), { responseType: "arraybuffer", timeout: 15000 });
              fs.writeFileSync(target, Buffer.from(res.data));
              const opts = await getMessageOptions(safeName, target, String(ticket.companyId), "");
              if (opts && Object.keys(opts).length) {
                const mediaMsg = await wbot.sendMessage(resolveReplyJid(msg, contact), { ...opts });
                await verifyMediaMessage(mediaMsg!, ticket, contact, ticketTraking, false, false, wbot, true);
                await new Promise(r => setTimeout(r, 200));
              }
            } catch (e) {
              try { logger.warn(`[AI SERVICE] Falha ao baixar/enviar mídia: ${String(u)}`); } catch {}
            }
          }
        }
      } catch {}
      const sentBlocks = await sendSmartAgentTextBlocks({
        wbot,
        msg,
        ticket,
        contact,
        ticketTraking,
        prompt,
        text: response,
        guardLabel: "duplicata",
        verifyFromMe: true,
        userText: bodyMessage
      });
      if (!sentBlocks) {
        logger.warn(`[AI SERVICE] Blocos finais vazios para ticket ${ticket.id}; nada será enviado.`);
      }
    } else {
      const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
      convertTextToSpeechAndSaveToFile(
        keepOnlySpecifiedChars(response!),
        `${publicFolder}/${fileNameWithOutExtension}`,
        prompt.voiceKey,
        prompt.voiceRegion,
        prompt.voice,
        "mp3"
      ).then(async () => {
        try {
          const sendMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
            audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
            mimetype: "audio/mpeg",
            ptt: true
          });
          await verifyMediaMessage(sendMessage!, ticket, contact, ticketTraking, false, false, wbot, true);
          deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
          deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
        } catch (error) {
          console.log(`Erro para responder com audio: ${error}`);
        }
      });
    }
  } else if (msg.message?.audioMessage) {
    const mediaUrl = mediaSent!.mediaUrl!.split("/").pop();
    let transcribedText = "";
    let transcription: any = null;
    try {
      const file = fs.createReadStream(`${publicFolder}/${mediaUrl}`) as any;
      logAiCallDebug("wbotMessageListener.ts:handleOpenAi:whisper", ticket, "(whisper-1 audio.transcriptions — sem chat system prompt)");
      transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: file,
      });
      transcribedText = String(transcription?.text || "").trim();
    } catch (e) {
      logger.warn(`[AI SERVICE] Transcrição do áudio falhou ticket=${ticket.id}; mantendo apenas a mídia para reprodução.`, e as any);
      return false;
    }
    if (transcribedText) {
      try {
        await updateAgentConversationalMemory({
          ticket,
          promptId: prompt.id,
          userText: transcribedText,
          recentTurns: [
            ...recentTurnsForMemory.slice(-5),
            { fromMe: false, body: transcribedText }
          ]
        });
      } catch (e) {
        logger.warn(`[CONVERSATIONAL-MEMORY] ticket ${ticket.id} (áudio): atualização falhou —`, e as any);
      }
      await markAgentProcessingStarted({
        ticket,
        promptId: prompt.id,
        wid: msg?.key?.id || null,
        userText: transcribedText
      });
      try {
        const orchestratedAudio = await runAgentOrchestrator({
          prompt,
          ticket,
          contact,
          userText: transcribedText,
          recentMessages: messages
        });
        if (orchestratedAudio.handled) {
          const reply = sanitizeAgentCustomerVisibleText(String(orchestratedAudio.reply || ""));
          if (reply) {
            await sendSmartAgentTextBlocks({
              wbot,
              msg,
              ticket,
              contact,
              ticketTraking,
              prompt,
              text: reply,
              guardLabel: "llm-first áudio duplicado",
              userText: transcribedText
            });
          }
          await markAgentProcessingFinished({
            ticket,
            promptId: prompt.id,
            wid: msg?.key?.id || null,
            ok: true
          });
          return connectionAgentReplySent(ticket);
        }
        if (orchestratedAudio.fallbackReason) {
          logger.info(`[AGENT-ORCH] fallback legado áudio ticket=${ticket.id} reason=${orchestratedAudio.fallbackReason}`);
        }
        await markAgentProcessingFinished({
          ticket,
          promptId: prompt.id,
          wid: msg?.key?.id || null,
          ok: true
        });
      } catch (e) {
        await markAgentProcessingFinished({
          ticket,
          promptId: prompt.id,
          wid: msg?.key?.id || null,
          ok: false,
          error: e
        });
        logger.warn(`[AGENT-ORCH] erro inesperado áudio ticket=${ticket.id}; fallback legado —`, e as any);
      }
      try {
        const flowOutcomeAudio = await tryHandlePromptAttendanceFlowTurn({
          wbot,
          msg,
          ticket,
          contact,
          ticketTraking,
          prompt,
          bodyMessage: transcribedText
        });
        if (flowOutcomeAudio.handled && (flowOutcomeAudio.sentCount > 0 || flowOutcomeAudio.actionCount > 0)) {
          markConnectionAgentReplySent(ticket);
          return true;
        }
        if (flowOutcomeAudio.consumedReply && flowOutcomeAudio.allowLlmFallback) {
          logger.warn(
            `[ATTENDANCE-FLOW] ticket ${ticket.id} (áudio): fluxo consumiu sem saída (${flowOutcomeAudio.reason}); fallback para LLM.`
          );
        }
      } catch (e) {
        logger.warn(`[ATTENDANCE-FLOW] ticket ${ticket.id} (áudio): fallback para LLM —`, e);
      }
    }

    messagesOpenAi = [];
    let audioSystemContent = promptSystem;
    try {
      const digest = buildConversationContextDigest({
        ticket,
        promptId: prompt.id,
        promptStateKey: prompt?.updatedAt ? `${prompt.id}:${String(prompt.updatedAt)}` : undefined,
        recentTurns: [
          ...recentTurnsForMemory.slice(-5),
          { fromMe: false, body: transcribedText || transcription.text }
        ],
        maxTurns: 6
      });
      if (digest) audioSystemContent = `${audioSystemContent}\n\n${digest}`;
    } catch {
      /* digest é best-effort */
    }
    messagesOpenAi.push({ role: "system", content: audioSystemContent });
    for (
      let i = 0;
      i < Math.min(prompt.maxMessages, messages.length);
      i++
    ) {
      const message = messages[i];
      if (message.mediaType === "conversation" || message.mediaType === "extendedTextMessage") {
        if (message.fromMe) {
          messagesOpenAi.push({ role: "assistant", content: message.body });
        } else {
          messagesOpenAi.push({ role: "user", content: message.body });
        }
      }
    }
    messagesOpenAi.push({ role: "user", content: transcribedText || transcription.text });
    const modelToUse2 = prompt.model || OPENAI_DEFAULT_CHAT_MODEL;
    const payload2: any = {
      model: modelToUse2,
      messages: messagesOpenAi,
      max_tokens: prompt.maxTokens,
      temperature: prompt.temperature
    };
    payload2.top_p = 1;
    payload2.presence_penalty = 0;
    payload2.frequency_penalty = 0;
    payload2.stop = ["###", "FIM"];
    logAiCallDebug("wbotMessageListener.ts:handleOpenAi:audioTranscriptChat", ticket, promptSystem);
    const chat = await openai.chat.completions.create(payload2);
    let response = (chat?.choices?.[0]?.message?.content || "").trim();
    const raw2 = response.trim();
    const onlyPunc2 = raw2.length > 0 && /^[\.\!\?\-\_\(\)\[\]\{\}"'`~…·•]+$/.test(raw2);
    const hasAlpha2 = /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(raw2);
    const cleaned2 = raw2.replace(/[^\p{L}\p{N}]+/gu, "").trim();
    if (!raw2 || raw2.length < 2 || onlyPunc2 || !hasAlpha2 || cleaned2.length < 1) {
      response = "Consigo continuar pelo contexto. Me confirma só a informação que ficou pendente para eu avançar?";
      try { logger.warn(`[AI SERVICE] Resposta vazia/irregular (áudio) da IA para ticket ${ticket.id}; usando fallback.`); } catch {}
    }

    if (response?.includes("Ação: Transferir para o setor de atendimento")) {
      await applyPromptIntegrationAgentTransfer(ticket, contact, prompt.queueId, prompt);
      response = response
        .replace("Ação: Transferir para o setor de atendimento", "")
        .trim();
    } else if (
      response &&
      assistantTextImpliesTransferToHuman(response) &&
      isPromptIntegrationTransferConfigured(prompt, ticket.queueId)
    ) {
      try {
        await applyPromptIntegrationAgentTransfer(ticket, contact, prompt.queueId, prompt);
        response = truncateAssistantResponseAfterDeclaredTransfer(response);
      } catch (e) {
        try {
          logger.warn(`[AI SERVICE] Transferência heurística (áudio) falhou ticket ${ticket.id}:`, e);
        } catch {}
      }
    }
    response = sanitizeAgentCustomerVisibleText(response || "");
    response = clipPrematureAssistantProgressAfterQuestion(response);
    response = applyRuntimeSingleTurnGuard({
      text: response,
      ticket,
      prompt,
      strictRoteiroDiscipline,
      lastUserText: transcribedText || transcription.text
    });
    response = applyAgentOrchestratorGuardrails(response, {
      lastAssistantText: recentTurnsForMemory.slice().reverse().find((turn) => turn.fromMe)?.body || "",
      actionConfirmed: false
    });
    response = String(response || "").trim();
    if (!response) {
      logger.warn(`[AI SERVICE] Resposta vazia após sanitização (áudio) para ticket ${ticket.id}; nada será enviado.`);
      return false;
    }
    if (prompt.voice === "texto") {
      await sendSmartAgentTextBlocks({
        wbot,
        msg,
        ticket,
        contact,
        ticketTraking,
        prompt,
        text: response,
        guardLabel: "áudio duplicado",
        verifyFromMe: false,
        userText: transcribedText || transcription.text
      });
    } else {
      const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
      convertTextToSpeechAndSaveToFile(
        keepOnlySpecifiedChars(response!),
        `${publicFolder}/${fileNameWithOutExtension}`,
        prompt.voiceKey,
        prompt.voiceRegion,
        prompt.voice,
        "mp3"
      ).then(async () => {
        try {
          const sendMessage = await wbot.sendMessage(resolveReplyJid(msg, contact), {
            audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
            mimetype: "audio/mpeg",
            ptt: true
          });
          await verifyMediaMessage(sendMessage!, ticket, contact, ticketTraking, false, false, wbot, true);
          deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
          deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
        } catch (error) {
          console.log(`Erro para responder com audio: ${error}`);
        }
      });
    }
  } else if (hasInboundMedia && mediaSent) {
    const roleBlockMedia = await buildAgentRoleInstructionLines(ticket.companyId, ownedBlobs.cargo, {
      preferPromptOnly: true
    });
    const promptExtMedia = await getExtensionsForWhatsappAgentPrompt(ticket.companyId, prompt);
    const systemPromptOverrideRaw = `${scopePreamble}Nas respostas utilize o nome ${sanitizeName(
      contact.name || "Amigo(a)"
    )} para identificar o cliente.\nSua resposta deve usar no máximo ${prompt.maxTokens
      } tokens e cuide para não truncar o final.\nSempre que possível, mencione o nome dele para ser mais personalizado o atendimento e mais educado. Quando a resposta requer uma transferência para o setor de atendimento, comece sua resposta com 'Ação: Transferir para o setor de atendimento'.\nResponda de forma curta, natural e contextual; se a solicitação for ambígua, use histórico, etapa atual e intenção provável antes de pedir apenas o dado faltante.\n${WHATSAPP_AGENT_CONVERSATION_POLICY}\n${roleBlockMedia}
${promptExtMedia.brainBlock}
${promptExtMedia.proactiveBlock ? `${promptExtMedia.proactiveBlock}\n` : ""}
${promptExtMedia.actionsBlock}
${WHATSAPP_AGENT_AGGREGATED_DOCUMENT_BRIDGE}
  ${prompt.prompt}\n`;
    const systemPromptOverride = expandAgentScriptPlaceholders(
      systemPromptOverrideRaw,
      scriptPlaceholderCtx
    );

    const aiSettings: any = {
      name: prompt.name,
      prompt: expandAgentScriptPlaceholders(String(prompt.prompt || ""), scriptPlaceholderCtx),
      voice: prompt.voice,
      voiceKey: prompt.voiceKey || "",
      voiceRegion: prompt.voiceRegion || "",
      maxTokens: prompt.maxTokens,
      temperature: prompt.temperature,
      apiKey: prompt.apiKey,
      queueId: prompt.queueId,
      maxMessages: prompt.maxMessages,
      model: prompt.model || OPENAI_DEFAULT_CHAT_MODEL,
      provider: "openai",
      systemPromptOverride,
      flowScoped: true,
      connectionPromptId: prompt.id,
      agentActionsScoped: getAgentActionsFromPromptProdutividade(prompt)
    };
    logAiCallDebug("wbotMessageListener.ts:handleOpenAi→handleOpenAiFlow:media", ticket, systemPromptOverride);
    await handleOpenAiFlow(aiSettings, msg, wbot, ticket, contact, mediaSent, ticketTraking);
    markConnectionAgentReplySent(ticket);
  }
  messagesOpenAi = [];

  /** Última tentativa: roteiro visual quando nada foi enviado neste turno (ex.: 2ª mensagem "Tudo"). */
  if (
    bodyMessage.trim() &&
    !msg.message?.audioMessage &&
    !msg.message?.stickerMessage &&
    !connectionAgentReplySent(ticket)
  ) {
    try {
      const flowFinal = await tryHandlePromptAttendanceFlowTurn({
        wbot,
        msg,
        ticket,
        contact,
        ticketTraking,
        prompt,
        bodyMessage
      });
      if (attendanceFlowDeliveredOutput(flowFinal)) {
        markConnectionAgentReplySent(ticket);
        return true;
      }
    } catch (e) {
      logger.warn(`[ATTENDANCE-FLOW] ticket ${ticket.id}: tentativa final do roteiro —`, e as any);
    }
  }

  return connectionAgentReplySent(ticket);
};


const handleMessage = async (
  msg: proto.IWebMessageInfo,
  wbot: Session,
  companyId: number,
  isImported: boolean = false
): Promise<void> => {

  console.log(`[DEBUG 2026] handleMessage iniciado. ID: ${msg.key.id}`);

  let campaignExecuted = false;

  console.log("[DEBUG RODRIGO] msg.key.id", JSON.stringify(msg.key));
  if (msg.key?.id) {
    // Só wid + companyId: remoteJid pode variar (LID/PN) entre eventos e fazia o "duplicado"
    // não ser encontrado — segunda execução insería/atualizava e às vezes pulava a IA inteira.
    const existingMessage = await Message.findOne({
      where: { wid: msg.key.id, companyId }
    });
    if (existingMessage) {
      console.log(
        `[DEBUG 2026] Mensagem já existe no banco (ID: ${msg.key.id}). Ignorando.`
      );
      return;
    }
  }
  if (isImported) {
    addLogs({
      fileName: `processImportMessagesWppId${wbot.id}.txt`,
      text: `Importando Mensagem: ${JSON.stringify(
        msg,
        null,
        2
      )}>>>>>>>>>>>>>>>>>>>`
    });

    let wid = msg.key.id;
    let existMessage = await Message.findOne({
      where: { wid }
    });
    if (existMessage) {
      await new Promise(r => setTimeout(r, 150));
      console.log("Esta mensagem já existe");
      return;
    } else {
      await new Promise(r =>
        setTimeout(r, parseInt(process.env.TIMEOUT_TO_IMPORT_MESSAGE) || 330)
      );
    }
  }
  //  else {
  //   await new Promise(r => setTimeout(r, i * 150));
  //   i++
  // }

  if (!isValidMsg(msg)) {
    console.log(`[DEBUG 2026] Mensagem inválida (isValidMsg returned false) para ID: ${msg.key.id}`);
    return;
  }

  // ✅ CORREÇÃO: Ignorar eventos de grupo (messageStubType)
  if (msg.messageStubType) {
    console.log(`[DEBUG 2026] Ignorando stub message: ${msg.messageStubType}`);
    if (ENABLE_LID_DEBUG) {
      logger.info(
        `[RDS-LID] HandleMessage - Ignorando evento de grupo: ${msg.messageStubType}`
      );
    }
    return;
  }

  console.log(`[DEBUG 2026] Mensagem válida e nova, iniciando processamento do contato e ticket...`);



  try {
    let msgContact: IMe;
    let groupContact: Contact | undefined;
    let queueId: number = null;
    let tagsId: number = null;
    let userId: number = null;

    let bodyMessage = getBodyMessage(msg);
    const msgType = getTypeMessage(msg);
    //if (msgType === "protocolMessage") return; // Tratar isso no futuro para excluir msgs se vor REVOKE

    const hasMedia =
      msg.message?.imageMessage ||
      msg.message?.audioMessage ||
      msg.message?.videoMessage ||
      msg.message?.stickerMessage ||
      msg.message?.documentMessage ||
      msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
      // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
      // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ||
      // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage ||
      msg.message?.ephemeralMessage?.message?.audioMessage ||
      msg.message?.ephemeralMessage?.message?.documentMessage ||
      msg.message?.ephemeralMessage?.message?.videoMessage ||
      msg.message?.ephemeralMessage?.message?.stickerMessage ||
      msg.message?.ephemeralMessage?.message?.imageMessage ||
      msg.message?.viewOnceMessage?.message?.imageMessage ||
      msg.message?.viewOnceMessage?.message?.videoMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
        ?.imageMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
        ?.videoMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
        ?.audioMessage ||
      msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message
        ?.documentMessage ||
      msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
      msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
      msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
      msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
      msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
      msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
      msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
      msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
      msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
      msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
      msg.message?.interactiveMessage?.header?.imageMessage ||
      msg.message?.interactiveMessage?.header?.documentMessage ||
      msg.message?.interactiveMessage?.header?.videoMessage ||
      msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
        ?.documentMessage ||
      msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
        ?.videoMessage ||
      msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
        ?.imageMessage ||
      msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate
        ?.locationMessage;
    // const isPrivate = /\u200d/.test(bodyMessage);

    // if (isPrivate) return;

    if (msg.key.fromMe) {
      if (/\u200e/.test(bodyMessage)) return;

      if (
        !hasMedia &&
        msgType !== "conversation" &&
        msgType !== "extendedTextMessage" &&
        msgType !== "contactMessage" &&
        msgType !== "reactionMessage" &&
        msgType !== "ephemeralMessage" &&
        msgType !== "protocolMessage" &&
        msgType !== "viewOnceMessage" &&
        msgType !== "editedMessage" &&
        msgType !== "hydratedContentText"
      ) {
        console.log(`[DEBUG 2026] Ignorando mensagem fromMe de tipo inválido: ${msgType}`);
        return;
      }
      msgContact = await getContactMessage(msg, wbot);
    } else {
      msgContact = await getContactMessage(msg, wbot);
    }

    console.log("[DEBUG RODRIGO] msgContact", JSON.stringify(msgContact, null, 2))
    const isGroup = msg.key.remoteJid?.endsWith("@g.us");

    // IGNORAR MENSAGENS DE GRUPO
    // const msgIsGroupBlock = await Settings.findOne({
    //   where: { key: "CheckMsgIsGroup", companyId }
    // });
    // console.log("GETTING WHATSAPP SHOW WHATSAPP 2384", wbot.id, companyId)
    const whatsapp = await ShowWhatsAppService(wbot.id!, companyId);

    if (!whatsapp.allowGroup && isGroup) {
      console.log(`[DEBUG 2026] Grupo ignorado (allowGroup=false): ${msg.key.remoteJid}`);
      return;
    }

    if (isGroup) {
      let grupoMeta = null;

      try {
        grupoMeta = await getGroupMetadataCache(whatsapp.id, msg.key.remoteJid);
      } catch (error) {
        logger.error(`Erro ao obter metadados do grupo: ${JSON.stringify(error)}`);
      }

      if (!grupoMeta) {
        try {
          await updateGroupMetadataCache(whatsapp.id, msg.key.remoteJid);
          grupoMeta = await getGroupMetadataCache(whatsapp.id, msg.key.remoteJid);
        } catch (error) {
          logger.error(`Erro ao atualizar cache do grupo: ${JSON.stringify(error)}`);
        }
      }


      if (grupoMeta === undefined || grupoMeta === null || !grupoMeta?.id) {
        try {
          grupoMeta = await wbot.groupMetadata(msg.key.remoteJid!)
        } catch (error) {
          logger.error(`Erro ao obter metadados do grupo: ${JSON.stringify(error)}`);
          console.log(`[DEBUG 2026] Falha ao obter metadados do grupo. Ignorando.`);
          return;
        }
      }

      const msgGroupContact = {
        id: grupoMeta.id,
        name: grupoMeta.subject
      };

      groupContact = await verifyContact(msgGroupContact, wbot, companyId);

      if (!groupContact) {
        logger.info("Grupo não encontrado, buscando novamente no banco de dados...")
        groupContact = await Contact.findOne({
          where: {
            companyId,
            [Op.or]: [
              { number: msg.key.remoteJid.replace(/\D/g, '') },
              { number: msg.key.remoteJid.replace('@g.us', '') },
              { lid: msg.key.remoteJid.replace('@s.whatsapp.net', '') }
            ]
          }
        })
        if (!groupContact) {
          logger.info("Grupo não encontrado, descarta a mensagem para não abrir como contato...")
          console.log(`[DEBUG 2026] Grupo não encontrado no DB. Ignorando.`);
          return;
        }
      }
    }

    const contact = await verifyContact(msgContact, wbot, companyId);

    let unreadMessages = 0;

    if (msg.key.fromMe) {
      await cacheLayer.set(`contacts:${contact.id}:unreads`, "0");
    } else {
      const unreads = await cacheLayer.get(`contacts:${contact.id}:unreads`);
      unreadMessages = +unreads + 1;
      await cacheLayer.set(
        `contacts:${contact.id}:unreads`,
        `${unreadMessages}`
      );
    }

    const settings = await CompaniesSettings.findOne({
      where: { companyId }
    });
    const enableLGPD = settings.enableLGPD === "enabled";

    // contador
    // if (msg.key.fromMe && count?.unreadCount > 0) {
    //   let remoteJid = msg.key.remoteJid;
    //   SendAckBYRemoteJid({ remoteJid, companyId });
    // }

    const isFirstMsg = await Ticket.findOne({
      where: {
        contactId: groupContact ? groupContact.id : contact.id,
        companyId,
        whatsappId: whatsapp.id
      },
      order: [["id", "DESC"]]
    });

    const mutex = new Mutex();
    // Inclui a busca de ticket aqui, se realmente não achar um ticket, então vai para o findorcreate
    const ticket = await mutex.runExclusive(async () => {
      console.log(`[DEBUG 2026] Chamando FindOrCreateTicketService para contato ${contact.id}`);
      const result = await FindOrCreateTicketService(
        contact,
        whatsapp,
        unreadMessages,
        companyId,
        queueId,
        userId,
        groupContact,
        "whatsapp",
        isImported,
        false,
        settings
      );
      console.log(`[DEBUG 2026] Ticket obtido/criado: ${result?.id}, Status: ${result?.status}`);
      return result;
    });

    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId,
      userId,
      whatsappId: whatsapp?.id
    });

    let bodyRollbackTag = "";
    let bodyNextTag = "";
    let rollbackTag;
    let nextTag;
    let ticketTag = undefined;
    // console.log(ticket.id)
    if (ticket?.company?.plan?.useKanban) {
      ticketTag = await TicketTag.findOne({
        where: {
          ticketId: ticket.id
        }
      });

      if (ticketTag) {
        const tag = await Tag.findByPk(ticketTag.tagId);

        if (tag.nextLaneId) {
          nextTag = await Tag.findByPk(tag.nextLaneId);

          bodyNextTag = nextTag.greetingMessageLane;
        }
        if (tag.rollbackLaneId) {
          rollbackTag = await Tag.findByPk(tag.rollbackLaneId);

          bodyRollbackTag = rollbackTag.greetingMessageLane;
        }
      }
    }

    if (
      ticket.status === "closed" ||
      (unreadMessages === 0 &&
        whatsapp.complationMessage &&
        formatBody(whatsapp.complationMessage, ticket) === bodyMessage)
    ) {
      console.log(`[DEBUG 2026] Ticket fechado ou mensagem de conclusão. Ignorando mensagem. Ticket Status: ${ticket.status}, Body: ${bodyMessage}`);
      return;
    }

    if (
      rollbackTag &&
      formatBody(bodyNextTag, ticket) !== bodyMessage &&
      formatBody(bodyRollbackTag, ticket) !== bodyMessage
    ) {
      await TicketTag.destroy({
        where: { ticketId: ticket.id, tagId: ticketTag.tagId }
      });
      await TicketTag.create({ ticketId: ticket.id, tagId: rollbackTag.id });
    }

    if (isImported) {
      await ticket.update({
        queueId: whatsapp.queueIdImportMessages
      });
    }

    if (msgType === "editedMessage" || msgType === "protocolMessage") {
      const msgKeyIdEdited =
        msgType === "editedMessage"
          ? msg.message.editedMessage.message.protocolMessage.key.id
          : msg.message?.protocolMessage.key.id;
      let bodyEdited = findCaption(msg.message);

      // console.log("bodyEdited", bodyEdited)
      const io = getIO();
      try {
        const messageToUpdate = await Message.findOne({
          where: {
            wid: msgKeyIdEdited,
            companyId,
            ticketId: ticket.id
          }
        });

        if (!messageToUpdate) return;

        await messageToUpdate.update({ isEdited: true, body: bodyEdited });

        await ticket.update({ lastMessage: bodyEdited });

        io.of(String(companyId))
          // .to(String(ticket.id))
          .emit(`company-${companyId}-appMessage`, {
            action: "update",
            message: messageToUpdate
          });

        io.of(String(companyId))
          // .to(ticket.status)
          // .to("notification")
          // .to(String(ticket.id))
          .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket
          });
      } catch (err) {
        Sentry.captureException(err);
        logger.error(`Error handling message ack. Err: ${err}`);
      }
      return;
    }

    //const ticketTraking = await FindOrCreateATicketTrakingService({
    //  ticketId: ticket.id,
    //  companyId,
    //  userId,
    //  whatsappId: whatsapp?.id
    //});

    let useLGPD = false;

    try {
      if (!msg.key.fromMe) {
        //MENSAGEM DE FÉRIAS COLETIVAS

        if (!isNil(whatsapp.collectiveVacationMessage && !isGroup)) {
          const currentDate = moment();

          if (
            currentDate.isBetween(
              moment(whatsapp.collectiveVacationStart),
              moment(whatsapp.collectiveVacationEnd)
            )
          ) {
            if (hasMedia) {
              await verifyMediaMessage(
                msg,
                ticket,
                contact,
                ticketTraking,
                false,
                false,
                wbot
              );
            } else {
              await verifyMessage(msg, ticket, contact, ticketTraking);
            }

            wbot.sendMessage(getJidOf(ticket.contact), {
              text: whatsapp.collectiveVacationMessage
            });

            return;
          }
        }

        /**
         * Tratamento para avaliação do atendente
         */
        if (
          ticket.status === "nps" &&
          ticketTraking !== null &&
          verifyRating(ticketTraking)
        ) {
          if (hasMedia) {
            await verifyMediaMessage(
              msg,
              ticket,
              contact,
              ticketTraking,
              false,
              false,
              wbot
            );
          } else {
            await verifyMessage(msg, ticket, contact, ticketTraking);
          }

          if (!isNaN(parseFloat(bodyMessage))) {
            handleRating(parseFloat(bodyMessage), ticket, ticketTraking);

            await ticketTraking.update({
              ratingAt: moment().toDate(),
              finishedAt: moment().toDate(),
              rated: true
            });

            return;
          } else {
            if (ticket.amountUsedBotQueuesNPS < whatsapp.maxUseBotQueuesNPS) {
              let bodyErrorRating = `\u200eOpção inválida, tente novamente.\n`;
              const sentMessage = await wbot.sendMessage(getJidOf(ticket),
                {
                  text: bodyErrorRating
                }
              );

              await verifyMessage(sentMessage, ticket, contact, ticketTraking, false, false, true);

              await delay(1000);

              let bodyRatingMessage = `\u200e${whatsapp.ratingMessage}\n`;

              const msg = await SendWhatsAppMessage({
                body: bodyRatingMessage,
                ticket
              });

              await verifyMessage(msg, ticket, ticket.contact, ticketTraking, false, false, true);

              await ticket.update({
                amountUsedBotQueuesNPS: ticket.amountUsedBotQueuesNPS + 1
              });
            }

            return;
          }
        }

        //TRATAMENTO LGPD
        if (
          enableLGPD &&
          ticket.status === "lgpd" &&
          !isImported &&
          !msg.key.fromMe
        ) {
          if (hasMedia) {
            await verifyMediaMessage(
              msg,
              ticket,
              contact,
              ticketTraking,
              false,
              false,
              wbot
            );
          } else {
            await verifyMessage(msg, ticket, contact, ticketTraking);
          }

          useLGPD = true;

          if (
            isNil(ticket.lgpdAcceptedAt) &&
            !isNil(ticket.lgpdSendMessageAt)
          ) {
            let choosenOption = parseFloat(bodyMessage);

            //Se digitou opção numérica
            if (
              !Number.isNaN(choosenOption) &&
              Number.isInteger(choosenOption) &&
              !isNull(choosenOption) &&
              choosenOption > 0
            ) {
              //Se digitou 1, aceitou o termo e vai pro bot
              if (choosenOption === 1) {
                await contact.update({
                  lgpdAcceptedAt: moment().toDate()
                });
                await ticket.update({
                  lgpdAcceptedAt: moment().toDate(),
                  amountUsedBotQueues: 0,
                  isBot: true
                  // status: "pending"
                });
                //Se digitou 2, recusou o bot e encerra chamado
              } else if (choosenOption === 2) {
                if (
                  whatsapp.complationMessage !== "" &&
                  whatsapp.complationMessage !== undefined
                ) {
                  const sentMessage = await wbot.sendMessage(getJidOf(ticket),
                    {
                      text: `\u200e ${whatsapp.complationMessage}`
                    }
                  );

                  await verifyMessage(
                    sentMessage,
                    ticket,
                    contact,
                    ticketTraking,
                    false,
                    false,
                    true
                  );
                }

                await ticket.update({
                  status: "closed",
                  amountUsedBotQueues: 0
                });

                await ticketTraking.destroy;

                return;
                //se digitou qualquer opção que não seja 1 ou 2 limpa o lgpdSendMessageAt para
                //enviar de novo o bot respeitando o numero máximo de vezes que o bot é pra ser enviado
              } else {
                if (
                  ticket.amountUsedBotQueues < whatsapp.maxUseBotQueues &&
                  whatsapp.maxUseBotQueues > 0
                ) {
                  await ticket.update({
                    amountUsedBotQueues: ticket.amountUsedBotQueues + 1,
                    lgpdSendMessageAt: null
                  });
                }
              }
              //se digitou qualquer opção que não número o lgpdSendMessageAt para
              //enviar de novo o bot respeitando o numero máximo de vezes que o bot é pra ser enviado
            } else {
              if (
                (ticket.amountUsedBotQueues < whatsapp.maxUseBotQueues &&
                  whatsapp.maxUseBotQueues > 0) ||
                whatsapp.maxUseBotQueues === 0
              ) {
                await ticket.update({
                  amountUsedBotQueues: ticket.amountUsedBotQueues + 1,
                  lgpdSendMessageAt: null
                });
              }
            }
          }

          if (
            (contact.lgpdAcceptedAt === null ||
              settings?.lgpdConsent === "enabled") &&
            !contact.isGroup &&
            isNil(ticket.lgpdSendMessageAt) &&
            (whatsapp.maxUseBotQueues === 0 ||
              ticket.amountUsedBotQueues <= whatsapp.maxUseBotQueues) &&
            !isNil(settings?.lgpdMessage)
          ) {
            if (!isNil(settings?.lgpdMessage) && settings.lgpdMessage !== "") {
              const bodyMessageLGPD = formatBody(
                `\u200e ${settings?.lgpdMessage}`,
                ticket
              );

              const sentMessage = await wbot.sendMessage(getJidOf(ticket),
                {
                  text: bodyMessageLGPD
                }
              );

              wbot.store(sentMessage);

              await verifyMessage(sentMessage, ticket, contact, ticketTraking, false, false, true);
            }
            await delay(1000);

            if (!isNil(settings?.lgpdLink) && settings?.lgpdLink !== "") {
              const bodyLink = formatBody(
                `\u200e ${settings?.lgpdLink}`,
                ticket
              );
              const sentMessage = await wbot.sendMessage(getJidOf(ticket),
                {
                  text: bodyLink
                }
              );

              wbot.store(sentMessage);

              await verifyMessage(sentMessage, ticket, contact, ticketTraking, false, false, true);
            }

            await delay(1000);

            const bodyBot = formatBody(
              `\u200e Estou ciente sobre o tratamento dos meus dados pessoais. \n\n*[1]* Sim\n*[2]* Não`,
              ticket
            );

            const sentMessageBot = await wbot.sendMessage(getJidOf(ticket),
              {
                text: bodyBot
              }
            );

            wbot.store(sentMessageBot);

            await verifyMessage(sentMessageBot, ticket, contact, ticketTraking, false, false, true);

            await ticket.update({
              lgpdSendMessageAt: moment().toDate(),
              amountUsedBotQueues: ticket.amountUsedBotQueues + 1
            });

            await ticket.reload();

            return;
          }

          if (!isNil(ticket.lgpdSendMessageAt) && isNil(ticket.lgpdAcceptedAt))
            return;
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }
    const isMsgForwarded =
      msg.message?.extendedTextMessage?.contextInfo?.isForwarded ||
      msg.message?.imageMessage?.contextInfo?.isForwarded ||
      msg.message?.audioMessage?.contextInfo?.isForwarded ||
      msg.message?.videoMessage?.contextInfo?.isForwarded ||
      msg.message?.documentMessage?.contextInfo?.isForwarded;

    let mediaSent: Message | undefined;

    if (!useLGPD) {
      if (hasMedia) {
        mediaSent = await verifyMediaMessage(
          msg,
          ticket,
          contact,
          ticketTraking,
          isMsgForwarded,
          false,
          wbot
        );
        // Transferência automática para o agente ao receber imagem/foto
        const msgType = getTypeMessage(msg);
        // if (
        //   (msgType === "imageMessage" ||
        //     msgType === "videoMessage" ||
        //     msgType === "documentMessage" ||
        //     msgType === "documentWithCaptionMessage" ||
        //     // msgType === "audioMessage" ||
        //     msgType === "stickerMessage") &&
        //   whatsapp.prompt &&
        //   whatsapp.prompt.queueId
        // ) {
        //   await transferQueue(whatsapp.prompt.queueId, ticket, contact);
        // }
      } else {
        // console.log("antes do verifyMessage")
        await verifyMessage(
          msg,
          ticket,
          contact,
          ticketTraking,
          false,
          isMsgForwarded
        );
      }
    }

    // Atualiza o ticket se a ultima mensagem foi enviada por mim, para que possa ser finalizado.
    try {
      await ticket.update({
        fromMe: msg.key.fromMe
      });
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    /**
     * PRIORIDADE MÁXIMA: agente da conexão (GPT ou Claude) antes de fila/campanha/fluxo.
     * Evita "Você está na fila..." quando há agente vinculado em Conexões → Agente IA.
     */
    if (
      !(ticket as any).__connectionAgentInboundHandled &&
      !msg.key.fromMe &&
      !ticket.imported &&
      !isGroup &&
      ticket.isBot !== false &&
      (ticket.status === "pending" || ticket.status === "open") &&
      whatsappHasConnectionAgent(whatsapp)
    ) {
      const earlyBody = getBodyMessage(msg) || "";
      const earlyHasMedia = !!(
        msg.message?.audioMessage ||
        msg.message?.imageMessage ||
        msg.message?.videoMessage ||
        msg.message?.documentMessage
      );
      if (earlyBody.trim() || earlyHasMedia) {
        try {
          await ensureConnectionAgentTicketState(ticket, whatsapp, companyId);
          await ticket.reload();
          logger.info(
            `[AI-CONNECTION] early handleOpenAi ticket=${ticket.id} promptId=${whatsapp.getDataValue("promptId")} anthropic=${whatsapp.getDataValue("anthropicMultiAgentId")}`
          );
          const agentReplied = await handleOpenAi(msg, wbot, ticket, contact, mediaSent, ticketTraking);
          if (agentReplied) {
            (ticket as any).__connectionAgentInboundHandled = true;
            try {
              const io = getIO();
              const refreshed = await ShowTicketService(ticket.id, companyId);
              io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
                action: "update",
                ticket: refreshed,
                ticketId: refreshed.id
              });
            } catch {
              /* ignore */
            }
            return;
          }
        } catch (e) {
          logger.error(
            `[AI-CONNECTION] early handleOpenAi falhou ticket=${ticket.id}:`,
            e as any
          );
        }
      }
    }

    let currentSchedule;

    if (settings.scheduleType === "company") {
      currentSchedule = await VerifyCurrentSchedule(companyId, 0, 0);
    } else if (settings.scheduleType === "connection") {
      currentSchedule = await VerifyCurrentSchedule(companyId, 0, whatsapp.id);
    }

    try {
      if (
        !msg.key.fromMe &&
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
            // await UpdateTicketService({
            //   ticketData: { queueId: queues[0].id },
            //   ticketId: ticket.id
            // });

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

            //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
            let dataLimite = new Date();
            let Agora = new Date();

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
            // console.log("entrei");
            const body = formatBody(`${whatsapp.outOfHoursMessage}`, ticket);

            const debouncedSentMessage = debounce(
              async () => {
                const sentMessage = await wbot.sendMessage(getJidOf(ticket),
                  {
                    text: body
                  }
                );

                wbot.store(sentMessage);
              },
              1000,
              ticket.id
            );
            debouncedSentMessage();
          }

          //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
          await ticket.update({
            isOutOfHour: true,
            amountUsedBotQueues: ticket.amountUsedBotQueues + 1
          });

          return;
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    if (!msg.key.fromMe && !ticket.imported && !isGroup && ticket.isBot !== false) {
      // Verificar se ticket.integrationId existe antes de continuar
      if (!ticket.integrationId) {
        logger.info("[HANDLE MESSAGE] Ticket sem integração, pulando verificação de campanhas");
      } else {
        console.log("[HANDLE MESSAGE] Verificando campanhas de fluxo...");

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
          campaignExecuted = await flowbuilderIntegration(
            msg,
            wbot,
            companyId,
            queueIntegrations,
            ticket,
            contactForCampaign,
            null,
            null
          );

          if (campaignExecuted) {
            console.log("[RDS-4121 - HANDLE MESSAGE] ✅ Campanha executada, parando outros fluxos");
            return;
          }
        } catch (error) {
          console.error("[RDS-4125 HANDLE MESSAGE] Erro ao verificar campanhas:", error);
        }
      }
    }


    // ✅ PRIORIDADE 1: Modo IA via dataWebhook (fila/integração OpenAI ou Gemini)
    // NÃO exigir status !== "open": após a 1ª resposta processResponse define status "open" + isBot true;
    // a condição antiga bloqueava todas as mensagens seguintes do cliente (sem IA e possível inconsistência na UI).
    // Parar IA só quando humano assume: isBot === false ou useIntegration desligado.
    if (
      !msg.key.fromMe &&
      (ticket.useIntegration === true || !isNil(ticket.integrationId))
    ) {
      // Estado fresco do banco após verifyMessage / FindOrCreate (evita ticket em memória desatualizado na 2ª+ mensagem).
      try {
        const aiSnap = await Ticket.findOne({
          where: { id: ticket.id, companyId },
          attributes: ["dataWebhook", "useIntegration", "isBot", "userId", "status"]
        });
        if (aiSnap) {
          ticket.setDataValue("dataWebhook", aiSnap.dataWebhook);
          ticket.setDataValue("useIntegration", aiSnap.useIntegration);
          ticket.setDataValue("isBot", aiSnap.isBot);
          ticket.setDataValue("userId", aiSnap.userId);
          ticket.setDataValue("status", aiSnap.status);
        }
      } catch (e) {
        logger.warn(`[AI MODE] Falha ao recarregar ticket ${ticket.id} para gate IA:`, e);
      }
    }

    const waReceiver = await ShowWhatsAppService(wbot.id!, companyId);
    const receiverPromptId = waReceiver.getDataValue("promptId") as number | null | undefined;
    const receiverAnthropicAgentId = waReceiver.getDataValue("anthropicMultiAgentId") as
      | number
      | null
      | undefined;
    /** Mesma validação que connectionHasAgent: Prompt OpenAI/Claude ou multi-agente Claude na conexão. */
    const connectionPromptOwnsInboundAi = whatsappHasConnectionAgent(waReceiver);

    try {
      logger.info(`[DEBUG-AGENT] wbot.id=${wbot.id} companyId=${companyId}`);
      logger.info(`[DEBUG-AGENT] receiverPromptId=${JSON.stringify(receiverPromptId)}`);
      logger.info(`[DEBUG-AGENT] agentDisabled=${waReceiver.getDataValue("agentDisabled")}`);
      logger.info(`[DEBUG-AGENT] connectionPromptOwnsInboundAi=${connectionPromptOwnsInboundAi}`);
      logger.info(`[DEBUG-AGENT] ticket.useIntegration=${ticket.useIntegration}`);
      logger.info(
        `[DEBUG-AGENT] dataWebhook.type=${(JSON.parse(JSON.stringify(ticket.dataWebhook || {})) as { type?: string })?.type}`
      );
      logger.info(
        `[DEBUG-AGENT] dataWebhook.settings.prompt (primeiros 100 chars)=${JSON.stringify((ticket.dataWebhook as any)?.settings?.prompt || "").slice(0, 100)}`
      );
    } catch (e) {
      logger.warn(`[DEBUG-AGENT] falha ao logar snapshot dataWebhook ticket=${ticket.id}`, e);
    }

    if (!msg.key.fromMe && ticket.useIntegration && ticket.isBot !== false && !ticket.userId) {
      const dataWebhookNorm = normalizeTicketDataWebhook(ticket.dataWebhook) as any;
      const isAIMode =
        dataWebhookNorm?.type === "openai" || dataWebhookNorm?.type === "gemini";

      /**
       * Conexão com agente ativo + ticket em modo integração: único caminho é handleOpenAi.
       * Return obrigatório — não chama handleOpenAiFlow neste turno (evita dupla execução / texto errado).
       */
      if (connectionPromptOwnsInboundAi && !(ticket as any).__connectionAgentInboundHandled) {
        if (
          !ticket.imported &&
          !isGroup &&
          (ticket.status === "pending" || ticket.status === "open")
        ) {
          await ensureConnectionAgentTicketState(ticket, waReceiver, companyId);
          await ticket.reload();
          if (isAIMode && dataWebhookNorm?.settings && dataWebhookNorm.awaitingUserResponse) {
            try {
              const cleared = { ...dataWebhookNorm, awaitingUserResponse: false };
              await ticket.update({ dataWebhook: cleared });
              ticket.setDataValue("dataWebhook", cleared);
            } catch (e) {
              logger.warn(`[AI PRIORITY] ticket ${ticket.id}: falha ao limpar awaitingUserResponse —`, e);
            }
          }
          if (
            ticket.queueId !== null ||
            ticket.userId !== null ||
            (ticket.status !== "pending" && ticket.status !== "open")
          ) {
            await UpdateTicketService({
              ticketData: {
                status: ticket.status === "open" ? "open" : "pending",
                queueId: null,
                userId: null,
                isBot: true
              },
              ticketId: ticket.id,
              companyId
            });
            await ticket.reload();
          }
          logger.info(
            `[AI-CONNECTION] integration gate → handleOpenAi ticket ${ticket.id} (conexão com agente; sem handleOpenAiFlow)`
          );
          const agentReplied = await handleOpenAi(msg, wbot, ticket, contact, mediaSent, ticketTraking);
          if (agentReplied) {
            (ticket as any).__connectionAgentInboundHandled = true;
            try {
              const io = getIO();
              const refreshed = await ShowTicketService(ticket.id, companyId);
              io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
                action: "update",
                ticket: refreshed,
                ticketId: refreshed.id
              });
            } catch {}
            return;
          }
        }
      }

      /**
       * Sem agente na conexão: modo IA serializado em dataWebhook (fila/fluxo) usa handleOpenAiFlow.
       * Com agente na conexão mas ticket importado/grupo/etc.: apenas limpa flags; fluxo segue abaixo.
       */
      if (isAIMode && dataWebhookNorm?.settings) {
        const waFresh = await ShowWhatsAppService(wbot.id!, companyId);
        const freshPid = waFresh.getDataValue("promptId") as number | null | undefined;
        const freshAnthropicId = waFresh.getDataValue("anthropicMultiAgentId") as number | null | undefined;
        const connectionHasAgent = whatsappHasConnectionAgent(waFresh);

        if (connectionHasAgent) {
          logger.info(
            `[AI PRIORITY] ticket ${ticket.id}: ignorando dataWebhook.settings — agente da conexão (promptId=${freshPid} anthropic=${freshAnthropicId}) é a única fonte; segue para handleOpenAi.`
          );
          if (dataWebhookNorm.awaitingUserResponse) {
            try {
              const cleared = { ...dataWebhookNorm, awaitingUserResponse: false };
              await ticket.update({ dataWebhook: cleared });
              ticket.setDataValue("dataWebhook", cleared);
            } catch (e) {
              logger.warn(`[AI PRIORITY] ticket ${ticket.id}: falha ao limpar awaitingUserResponse —`, e);
            }
          }
        } else {
          logger.info(`[AI MODE] Processando mensagem em modo ${dataWebhookNorm.type} - ticket ${ticket.id}`);

          try {
            const aiSettings = {
              ...dataWebhookNorm.settings,
              provider: dataWebhookNorm.type,
              flowScoped: true
            };

            if (dataWebhookNorm.awaitingUserResponse) {
              logger.info(
                `[AI SERVICE] Primeira resposta do usuário para ${dataWebhookNorm.type} - iniciando conversa - ticket ${ticket.id}`
              );

              await ticket.update({
                dataWebhook: {
                  ...dataWebhookNorm,
                  awaitingUserResponse: false
                }
              });
            }

            logAiCallDebug(
              "wbotMessageListener.ts:integrationQueue→handleOpenAiFlow",
              ticket,
              (aiSettings as any)?.prompt ?? dataWebhookNorm?.settings
            );
            await handleOpenAiFlow(
              aiSettings,
              msg,
              wbot,
              ticket,
              contact,
              mediaSent,
              ticketTraking
            );

            return;
          } catch (error) {
            logger.error("[AI MODE] Erro ao processar modo IA:", error);
            return;
          }
        }
      }
    }

    const wasProcessedByTemporaryAI = await checkTemporaryAI(wbot, ticket, contact, msgContact, null, ticketTraking, msg);
    if (wasProcessedByTemporaryAI) {
      return;
    }

    if (
      !msg.key.fromMe &&
      (
        // Caminho padrão: aguardando input explicitamente
        ((ticket.dataWebhook as any)?.waitingInput === true &&
          (ticket.dataWebhook as any)?.inputVariableName)
        ||
        // Fallback resiliente: houve perda do flag, mas temos ponteiro de próximo nó e variável
        ((ticket.dataWebhook as any)?.nextNodeId &&
          (ticket.dataWebhook as any)?.inputVariableName)
      )
    ) {
      logger.info(`[INPUT NODE] Processando resposta para nó de input - ticket ${ticket.id}`);
      try {
        console.log("[inputNode] Processando resposta para nó de input");
        const body = getBodyMessage(msg);
        // @ts-ignore
        const inputVariableName = (ticket.dataWebhook as any).inputVariableName;
        // @ts-ignore
        const inputIdentifier =
          (ticket.dataWebhook as any).inputIdentifier ||
          `${ticket.id}_${inputVariableName}`;

        global.flowVariables = global.flowVariables || {};
        global.flowVariables[inputVariableName] = body;
        global.flowVariables[inputIdentifier] = body; // Salvar com o identificador também

        const nextNode = global.flowVariables[`${inputIdentifier}_next`];
        // Fallback: se o ponteiro em memória não existir, usa o salvo no ticket
        // @ts-ignore
        const fallbackNextNode = (ticket.dataWebhook as any)?.nextNodeId;
        const resolvedNextNode = nextNode || fallbackNextNode;
        // delete global.flowVariables[`${inputIdentifier}_next`];

        await ticket.update({
          dataWebhook: {
            ...normalizeTicketDataWebhook(ticket.dataWebhook),
            waitingInput: false,
            inputProcessed: true,
            inputVariableName: null,
            inputIdentifier: null,
            lastInputValue: body
          }
        });

        // Fallback de flowId: se flowStopped estiver ausente, tenta pegar de dataWebhook.flowId
        // @ts-ignore
        const resolvedFlowId = ticket.flowStopped || (ticket.dataWebhook as any)?.flowId;

        if (resolvedNextNode && resolvedFlowId) {
          const flow = await FlowBuilderModel.findOne({
            where: { id: resolvedFlowId }
          });

          if (flow) {
            const nodes: INodes[] = flow.flow["nodes"];
            const connections: IConnections[] = flow.flow["connections"];

            const mountDataContact = {
              number: contact.number,
              name: contact.name,
              email: contact.email
            };

            await ActionsWebhookService(
              whatsapp.id,
              parseInt(String(resolvedFlowId)),
              ticket.companyId,
              nodes,
              connections,
              resolvedNextNode,
              null,
              "",
              ticket.hashFlowId || "",
              null,
              ticket.id,
              mountDataContact,
              true // inputResponded true somete para node  input
            );

            return;
          }
        }
      } catch (error) {
        console.error(
          "[inputNode] Erro ao processar resposta do nó de input:",
          error
        );
      }
    }

    if (ticket.flowStopped && ticket.lastFlowId) {
      const dwFlow = ticket.dataWebhook as any;
      const isTicketOpenAiGemini =
        ticket.useIntegration === true &&
        (dwFlow?.type === "openai" || dwFlow?.type === "gemini");
      // Ticket em modo IA (fila/integração): não desviar mensagens para FlowBuilder — senão a 2ª msg
      // do cliente some do pipeline da IA e pode falhar sync/UI mesmo com verifyMessage já executado.
      if (isTicketOpenAiGemini) {
        logger.info(
          `[FLOW STOPPED] Ticket ${ticket.id}: flowStopped presente, mas modo IA (dataWebhook ${dwFlow?.type}) ativo — pulando retomada FlowBuilder`
        );
      } else {
        // ✅ CRÍTICO: Não processar mensagens do próprio bot
        if (msg && msg.key.fromMe) {
          logger.info(`[FLOW STOPPED] ⚠️ Mensagem do bot (fromMe=true) - IGNORANDO para ticket ${ticket.id}`);
          return;
        }

        logger.info(`[FLOW STOPPED] ========== CONTINUANDO FLUXO (SEGUNDA VERIFICAÇÃO) ==========`);
        logger.info(`[FLOW STOPPED] Ticket ${ticket.id}, Mensagem do usuário: "${getBodyMessage(msg)}"`);
        await flowBuilderQueue(ticket, msg, wbot, whatsapp, companyId, contact, ticket);
        return;
      }
    }

    if (
      ticket.status !== "open" &&
      !isGroup &&
      !msg.key.fromMe &&
      !ticket.fromMe &&
      ticket.flowStopped &&
      ticket.flowWebhook &&
      !isNaN(parseInt(ticket.lastMessage))
    ) {
      await flowBuilderQueue(
        ticket,
        msg,
        wbot,
        whatsapp,
        companyId,
        contact,
        isFirstMsg
      );
    }


    // openai na conexão: usar o mesmo waReceiver (sessão = número que recebeu o evento)
    logger.info(
      `[AI-CONNECTION] evaluating: ticket=${ticket.id} status=${ticket.status} imported=${!!ticket.imported} isGroup=${isGroup} fromMe=${msg.key.fromMe} promptId=${receiverPromptId} agentDisabled=${waReceiver.getDataValue("agentDisabled") === true}`
    );
    if (
      !(ticket as any).__connectionAgentInboundHandled &&
      !ticket.imported &&
      !isGroup &&
      !msg.key.fromMe &&
      connectionPromptOwnsInboundAi &&
      // Permitir IA tanto em pending quanto em open.
      // Mesmo que o ticket tenha sido auto-atribuído (wallet/roteador), se ainda está em modo bot
      // (isBot !== false) a IA deve assumir e limpar user/queue antes de responder.
      (ticket.isBot !== false) &&
      (ticket.status === "pending" || ticket.status === "open")
    ) {
      await ensureConnectionAgentTicketState(ticket, waReceiver, companyId);
      await ticket.reload();
      // Desabilita fila e atendimento humano enquanto a IA estiver ativa
      if (ticket.queueId !== null || ticket.userId !== null || (ticket.status !== "pending" && ticket.status !== "open")) {
        await UpdateTicketService({
          ticketData: {
            status: ticket.status === "open" ? "open" : "pending",
            queueId: null,
            userId: null,
            isBot: true
          },
          ticketId: ticket.id,
          companyId
        });
        await ticket.reload();
      }
      logger.info(`[AI-CONNECTION] triggering handleOpenAi for ticket ${ticket.id}`);
      const agentReplied = await handleOpenAi(msg, wbot, ticket, contact, mediaSent, ticketTraking);
      if (agentReplied) {
        (ticket as any).__connectionAgentInboundHandled = true;
        // Garantir que a mensagem da IA apareça: fallback de emissão quando não houver update imediato
        try {
          const io = getIO();
          const refreshed = await ShowTicketService(ticket.id, companyId);
          io.of(String(companyId)).emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket: refreshed,
            ticketId: refreshed.id
          });
        } catch {}
        /** Return sempre após handleOpenAi neste ramo — evita continuar o pipeline e reentrar em outro caminho de IA. */
        return;
      }
    }

    //integração na conexão: iniciar APENAS apos CPF no caso de SGP
    if (
      !ticket.imported &&
      !msg.key.fromMe &&
      !ticket.isGroup &&
      // Permitir integração tanto em pending quanto em open, desde que não haja atendente humano
      !ticket.queue &&
      !ticket.user &&
      !isNil(whatsapp.integrationId) &&
      (!ticket.userId) &&
      (ticket.status === "pending" || ticket.status === "open")
      //ticket.isBot &&
      //!isNil(whatsapp.integrationId) &&
      //ticket.useIntegration
    ) {
      const integrations = await ShowQueueIntegrationService(
        whatsapp.integrationId,
        companyId
      );

      if (String(integrations.type).toUpperCase() === "SGP") {
        // Não iniciar integração agora; apenas marcar integração no ticket
        if (msg.key.fromMe) {
          await ticket.update({
            typebotSessionTime: moment().toDate(),
            useIntegration: true,
            integrationId: integrations.id
          });
        } else {
          await ticket.update({
            useIntegration: true,
            integrationId: integrations.id
          });
        }
        // Não retorna; segue fluxo padrão (saudação etc.)
      } else {
        await handleMessageIntegration(
          msg,
          wbot,
          companyId,
          integrations,
          ticket
        );

        if (msg.key.fromMe) {
          await ticket.update({
            typebotSessionTime: moment().toDate(),
            useIntegration: true,
            integrationId: integrations.id
          });
        } else {
          await ticket.update({
            useIntegration: true,
            integrationId: integrations.id
          });
        }

        return;
      }
    }

    if (
      !ticket.imported &&
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !ticket.userId &&
      ticket.integrationId &&
      ticket.useIntegration
    ) {
      const integrations = await ShowQueueIntegrationService(
        ticket.integrationId,
        companyId
      );

      await handleMessageIntegration(
        msg,
        wbot,
        companyId,
        integrations,
        ticket
      );
      if (msg.key.fromMe) {
        await ticket.update({
          typebotSessionTime: moment().toDate()
        });
      }
    }

    if (
      !ticket.imported &&
      !ticket.queue &&
      (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
      !msg.key.fromMe &&
      !ticket.userId &&
      whatsapp.queues.length >= 1 &&
      // Encaminhar para fila quando IA na conexão NÃO está ativa (sem agente vinculado ou IA desligada).
      (
        ((whatsapp as any)?.agentDisabled === true) ||
        !whatsappHasConnectionAgent(whatsapp)
      ) &&
      !ticket.useIntegration
    ) {
      // console.log("antes do verifyqueue")
      await verifyQueue(wbot, msg, ticket, contact, settings, ticketTraking);

      if (ticketTraking.chatbotAt === null) {
        await ticketTraking.update({
          chatbotAt: moment().toDate()
        });
      }
    }

    if (
      !msg.key.fromMe &&
      !ticket.isGroup &&
      !ticket.userId &&
      !ticket.imported &&
      (ticket.integrationId || !isNil(whatsapp.integrationId)) &&
      !ticket.useIntegration
    ) {
      const integrationId = ticket.integrationId || whatsapp.integrationId;
      try {
        const integrations = await ShowQueueIntegrationService(
          integrationId,
          companyId
        );
        await handleMessageIntegration(
          msg,
          wbot,
          companyId,
          integrations,
          ticket
        );
        await ticket.update({
          useIntegration: true,
          integrationId
        });
      } catch (err) {
        logger.error(`[INTEGRATION FALLBACK] Erro ao acionar integração fallback: ${err?.message}`);
      }
    }

    if (ticket.queueId > 0) {
      await ticketTraking.update({
        queueId: ticket.queueId
      });
    }

    // Verificação se aceita audio do contato
    if (
      getTypeMessage(msg) === "audioMessage" &&
      !msg.key.fromMe &&
      (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
      (!contact?.acceptAudioMessage ||
        settings?.acceptAudioMessageContact === "disabled")
    ) {
      const sentMessage = await wbot.sendMessage(
        getJidOf(ticket.contact),
        {
          text: `\u200e*Assistente Virtual*:\nInfelizmente não conseguimos escutar nem enviar áudios por este canal de atendimento, por favor, envie uma mensagem de *texto*.`
        },
        {
          quoted: {
            key: msg.key,
            message: {
              extendedTextMessage: msg.message.extendedTextMessage
            }
          }
        }
      );

      wbot.store(sentMessage);

      await verifyMessage(sentMessage, ticket, contact, ticketTraking, false, false, true);
    }

    try {
      if (
        !msg.key.fromMe &&
        settings?.scheduleType &&
        ticket.queueId !== null &&
        (!ticket.isGroup || whatsapp.groupAsTicket === "enabled") &&
        ticket.status !== "open"
      ) {
        /**
         * Tratamento para envio de mensagem quando a empresa/fila está fora do expediente
         */
        const queue = await Queue.findByPk(ticket.queueId);

        if (settings?.scheduleType === "queue") {
          currentSchedule = await VerifyCurrentSchedule(companyId, queue.id, 0);
        }

        if (
          settings?.scheduleType === "queue" &&
          !isNil(currentSchedule) &&
          ticket.amountUsedBotQueues < whatsapp.maxUseBotQueues &&
          (!currentSchedule || currentSchedule.inActivity === false) &&
          !ticket.imported
        ) {
          if (Number(whatsapp.timeUseBotQueues) > 0) {
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

            //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
            let dataLimite = new Date();
            let Agora = new Date();

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

          const outOfHoursMessage = queue.outOfHoursMessage;

          if (outOfHoursMessage !== "") {
            // console.log("entrei2");
            const body = formatBody(`${outOfHoursMessage}`, ticket);

            const debouncedSentMessage = debounce(
              async () => {
                const sentMessage = await wbot.sendMessage(
                  getJidOf(ticket),
                  {
                    text: body
                  }
                );

                wbot.store(sentMessage);
              },
              1000,
              ticket.id
            );
            debouncedSentMessage();
          }
          //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
          await ticket.update({
            isOutOfHour: true,
            amountUsedBotQueues: ticket.amountUsedBotQueues + 1
          });
          return;
        }
      }
    } catch (e) {
      Sentry.captureException(e);
      console.log(e);
    }

    if (
      ticket.queue &&
      ticket.queueId &&
      !msg.key.fromMe &&
      !ticket.useIntegration &&
      !ticket.integrationId
    ) {
      // ✅ CORRIGIDO: Executar ChatBot apenas se ticket não estiver "open" (aceito por atendente)
      if (ticket.status !== "open" && ticket.queue?.chatbots?.length > 0) {
        await sayChatbot(
          ticket.queueId,
          wbot,
          ticket,
          contact,
          msg,
          ticketTraking
        );
      }

      //atualiza mensagem para indicar que houve atividade e aí contar o tempo novamente para enviar mensagem de inatividade
      await ticket.update({
        sendInactiveMessage: false
      });
    }

    if (
      !campaignExecuted && // ✅ NOVA CONDIÇÃO
      !msg.key.fromMe &&
      !ticket.imported &&
      !isGroup &&
      ticket.status === "pending"
    ) {
      // Aguardar um pouco para garantir que outros processamentos terminaram
      setTimeout(async () => {
        try {
          logger.info(`[TICKET RELOAD] ========== ANTES DO RELOAD ==========`);
          logger.info(`[TICKET RELOAD] Ticket ${ticket.id} - flowWebhook: ${ticket.flowWebhook}, lastFlowId: ${ticket.lastFlowId}, hashFlowId: ${ticket.hashFlowId}`);

          await ticket.reload({
            include: [{ model: Contact, as: "contact" }]
          });

          logger.info(`[TICKET RELOAD] ========== DEPOIS DO RELOAD ==========`);
          logger.info(`[TICKET RELOAD] Ticket ${ticket.id} - flowWebhook: ${ticket.flowWebhook}, lastFlowId: ${ticket.lastFlowId}, hashFlowId: ${ticket.hashFlowId}`);

          // Só verificar se não entrou em fluxo
          if (!ticket.flowWebhook || !ticket.lastFlowId) {
            logger.info(`[TICKET RELOAD] Condição (!flowWebhook || !lastFlowId) = TRUE - vai executar flowbuilderIntegration`);
          } else {
            logger.info(`[TICKET RELOAD] Condição (!flowWebhook || !lastFlowId) = FALSE - NÃO vai executar flowbuilderIntegration`);
            logger.info(`[TICKET RELOAD] Ticket já está em fluxo - ignorando`);
            return;
          }

          if (!ticket.flowWebhook || !ticket.lastFlowId) {
            const contactForCampaign = await ShowContactService(
              ticket.contactId,
              ticket.companyId
            );

            // Verificar se existe integrationId antes de prosseguir
            try {
              if (!whatsapp.integrationId) {
                logger.info("[RDS-4573 - DEBUG] whatsapp.integrationId não está definido para a conexão WhatsApp ID: " + whatsapp.id);
                return; // Encerrar execução se não houver integrationId
              }

              const queueIntegrations = await ShowQueueIntegrationService(
                whatsapp.integrationId,
                companyId
              );

              // DEBUG - Verificar tipo de integração para diagnóstico
              logger.info(`[RDS-FLOW-DEBUG] Iniciando flowbuilder para ticket ${ticket.id}, integração tipo: ${queueIntegrations?.type || 'indefinido'}`);

              // ✅ VERIFICAÇÃO FINAL APENAS SE NECESSÁRIO
              await flowbuilderIntegration(
                msg,
                wbot,
                companyId,
                queueIntegrations,
                ticket,
                contactForCampaign
              );

              // DEBUG - Verificar se flowbuilder foi executado com sucesso
              logger.info(`[RDS-FLOW-DEBUG] flowbuilderIntegration executado para ticket ${ticket.id}`);
            } catch (integrationError) {
              logger.error("[RDS-4573 - INTEGRATION ERROR] Erro ao processar integração:", integrationError);
            }
          }
        } catch (error) {
          logger.error("[RDS-4573 - CAMPAIGN MESSAGE] Erro ao verificar campanhas:", error);
        }
      }, 1000);
    }

    await ticket.reload();

  } catch (err) {
    Sentry.captureException(err);
    console.log(err);
    logger.error(`Error handling whatsapp message: Err: ${err}`);
  }
};

const handleMsgAck = async (
  msg: WAMessage,
  chat: number | null | undefined
) => {
  await new Promise(r => setTimeout(r, 500));
  const io = getIO();

  try {
    const messageToUpdate = await Message.findOne({
      where: {
        wid: msg.key.id,
        fromMe: msg.key.fromMe
      },
      include: [
        "contact",
        {
          model: Ticket,
          as: "ticket",
          include: [
            {
              model: Contact,
              attributes: [
                "id",
                "name",
                "number",
                "email",
                "profilePicUrl",
                "acceptAudioMessage",
                "active",
                "urlPicture",
                "companyId"
              ],
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
    if (!messageToUpdate || messageToUpdate.ack >= chat) return;

    // console.log("messageToUpdate", messageToUpdate.body, messageToUpdate.ack, chat)
    await messageToUpdate.update({ ack: chat });
    io.of(messageToUpdate.companyId.toString())
      // .to(messageToUpdate.ticketId.toString())
      .emit(`company-${messageToUpdate.companyId}-appMessage`, {
        action: "update",
        message: messageToUpdate
      });
  } catch (err) {
    Sentry.captureException(err);
    logger.error(`Error handling message ack. Err: ${err}`);
  }
};

/** Mesmo contato com/sem DDI ou máscara — evita não achar o CampaignShipping na confirmação. */
const campaignInboundDigitsMatchStored = (storedNumber: string, jidDigits: string): boolean => {
  const a = String(storedNumber || "").replace(/\D/g, "");
  const b = String(jidDigits || "").replace(/\D/g, "");
  if (!a || !b) return false;
  if (a === b) return true;
  const short = a.length <= b.length ? a : b;
  const long = a.length > b.length ? a : b;
  if (short.length < 8) return false;
  return long.endsWith(short);
};

const verifyRecentCampaign = async (
  message: proto.IWebMessageInfo,
  companyId: number
) => {
  if (!isValidMsg(message)) {
    return;
  }
  if (!message.key.fromMe) {
    const jidDigits = message.key.remoteJid.replace(/\D/g, "");
    const campaigns = await Campaign.findAll({
      where: { companyId, status: "EM_ANDAMENTO", confirmation: true }
    });
    if (campaigns?.length) {
      const ids = campaigns.map(c => c.id);
      // Fluxo real: 1º disparo manda confirmação e seta confirmationRequestedAt; deliveredAt fica null
      // até a mensagem principal. Exigir deliveredAt aqui impedia o 2º disparo para todos.
      const pending = await CampaignShipping.findAll({
        where: {
          campaignId: { [Op.in]: ids },
          confirmationRequestedAt: { [Op.ne]: null },
          deliveredAt: null,
          [Op.or]: [{ confirmation: null }, { confirmation: false }]
        }
      });

      const campaignShipping = pending.find(row =>
        campaignInboundDigitsMatchStored(row.number, jidDigits)
      );

      if (campaignShipping) {
        await campaignShipping.update({
          confirmedAt: moment(),
          confirmation: true
        });
        await campaignQueue.add(
          "DispatchCampaign",
          {
            campaignShippingId: campaignShipping.id,
            campaignId: campaignShipping.campaignId
          },
          {
            delay: parseToMilliseconds(randomValue(0, 10))
          }
        );
      }
    }
  }
};

const verifyCampaignMessageAndCloseTicket = async (
  message: proto.IWebMessageInfo,
  companyId: number,
  wbot: Session
) => {
  if (!isValidMsg(message)) {
    return;
  }

  const io = getIO();
  const body = await getBodyMessage(message);
  const isCampaign = /\u200c/.test(body);

  if (message.key.fromMe && isCampaign) {
    let msgContact: IMe;
    msgContact = await getContactMessage(message, wbot);
    const contact = await verifyContact(msgContact, wbot, companyId);

    const messageRecord = await Message.findOne({
      where: {
        [Op.or]: [{ wid: message.key.id! }, { contactId: contact.id }],
        companyId
      }
    });

    if (
      !isNull(messageRecord) ||
      !isNil(messageRecord) ||
      messageRecord !== null
    ) {
      const ticket = await Ticket.findByPk(messageRecord.ticketId);
      await ticket.update({ status: "closed", amountUsedBotQueues: 0 });

      io.of(String(companyId))
        // .to("open")
        .emit(`company-${companyId}-ticket`, {
          action: "delete",
          ticket,
          ticketId: ticket.id
        });

      io.of(String(companyId))
        // .to(ticket.status)
        // .to(ticket.id.toString())
        .emit(`company-${companyId}-ticket`, {
          action: "update",
          ticket,
          ticketId: ticket.id
        });
    }
  }
};

const filterMessages = (msg: WAMessage): boolean => {
  // msgDB.save(msg);

  if (msg.message?.protocolMessage?.editedMessage) return true;
  if (msg.message?.protocolMessage) return false;

  if (
    [
      WAMessageStubType.REVOKE,
      WAMessageStubType.E2E_DEVICE_CHANGED,
      WAMessageStubType.E2E_IDENTITY_CHANGED,
      WAMessageStubType.CIPHERTEXT
    ].includes(msg.messageStubType)
  )
    return false;

  return true;
};

// Logs de debug de eventos Baileys removidos para produção
const wbotMessageListener = (wbot: Session, companyId: number): void => {
  wbot.ev.on("messages.upsert", async (messageUpsert: ImessageUpsert) => {
    console.log(`[DEBUG 2026] messages.upsert recebido. Tipo: ${messageUpsert.type}. Qtd: ${messageUpsert.messages.length}`);
    const messages = messageUpsert.messages
      .filter(filterMessages)
      .map(msg => msg);

    if (!messages) return;

    // console.log("CIAAAAAAA WBOT " , companyId)
    messages.forEach(async (message: proto.IWebMessageInfo) => {
      console.log(`[DEBUG 2026] Processando msg ID: ${message.key.id}, RemoteJid: ${message.key.remoteJid}`);
      
      // Log para verificar se passa pelo filtro de stub
      if (
        message?.messageStubParameters?.length &&
        message.messageStubParameters[0].includes("absent")
      ) {
        console.log(`[DEBUG 2026] Mensagem ignorada (stub/absent): ${message.key.id}`);
        const msg = {
          companyId: companyId,
          whatsappId: wbot.id,
          message: message
        };
        logger.warn("MENSAGEM PERDIDA", JSON.stringify(msg));
      }
      const messageExists = await Message.count({
        where: { wid: message.key.id!, companyId }
      });

      console.log(`[DEBUG 2026] Message exists? ${messageExists} - ID: ${message.key.id}`);

      if (!messageExists) {
        let isCampaign = false;
        let body = await getBodyMessage(message);
        const fromMe = message?.key?.fromMe;
        if (fromMe) {
          isCampaign = /\u200c/.test(body);
          if (!isCampaign && body) {
            const normBody = body.replace(/\u200c/g, "").trim();
            if (normBody) {
              const recentDup = await Message.findOne({
                where: {
                  companyId,
                  fromMe: true,
                  wid: { [Op.ne]: message.key.id! },
                  createdAt: {
                    [Op.gte]: moment().subtract(3, "minutes").toDate()
                  },
                  [Op.or]: [{ body: normBody }, { body: `\u200c ${normBody}` }]
                },
                include: [
                  {
                    model: Ticket,
                    as: "ticket",
                    required: true,
                    where: { whatsappId: wbot.id }
                  }
                ],
                order: [["id", "ASC"]]
              });
              if (recentDup) {
                const msgContact = await getContactMessage(message, wbot);
                const dupContact = await verifyContact(
                  msgContact,
                  wbot,
                  companyId
                );
                const dupTicket = await Ticket.findOne({
                  where: {
                    companyId,
                    contactId: dupContact.id,
                    whatsappId: wbot.id
                  },
                  order: [["updatedAt", "DESC"]]
                });
                if (
                  dupTicket &&
                  recentDup.ticketId === dupTicket.id
                ) {
                  isCampaign = true;
                }
              }
            }
          }
        } else {
          if (/\u200c/.test(body)) body = body.replace(/\u200c/, "");
          logger.debug(
            "Validação de mensagem de campanha enviada por terceiros: " + body
          );
        }

        if (!isCampaign) {
          if (REDIS_URI_MSG_CONN !== "") {
            // console.log(`[DEBUG 2026] Adicionando msg ID ${message.key.id} para fila Redis: ${process.env.DB_NAME}-handleMessage`);
            //} && (!message.key.fromMe || (message.key.fromMe && !message.key.id.startsWith('BAE')))) {
            try {
              await BullQueues.add(
                `${process.env.DB_NAME}-handleMessage`,
                { message, wbot: wbot.id, companyId },
                {
                  priority: 1,
                  jobId: `${wbot.id}-handleMessage-${message.key.id}`
                }
              );
              // console.log(`[DEBUG 2026] Msg ID ${message.key.id} adicionada ao Redis com sucesso.`);
            } catch (e) {
              console.error(`[DEBUG 2026] ERRO ao adicionar msg ID ${message.key.id} ao Redis:`, e);
              Sentry.captureException(e);
              // Fallback: se a fila Redis falhar, processa a mensagem no fluxo direto
              // para não perder criação/atualização do ticket.
              await handleMessage(message, wbot, companyId);
            }
          } else {
            // console.log(`[DEBUG 2026] Processando msg ID ${message.key.id} diretamente (sem Redis).`);
            await handleMessage(message, wbot, companyId);
            // console.log(`[DEBUG 2026] handleMessage finalizado para msg ID ${message.key.id}.`);
          }
        } else {
            console.log(`[DEBUG 2026] Mensagem de campanha ignorada: ${message.key.id}`);
        }

        await verifyRecentCampaign(message, companyId);
        await verifyCampaignMessageAndCloseTicket(message, companyId, wbot);
      }

      if (message.key.remoteJid?.endsWith("@g.us")) {
        if (REDIS_URI_MSG_CONN !== "") {
          try {
            await BullQueues.add(
              `${process.env.DB_NAME}-handleMessageAck`,
              { msg: message, chat: 2 },
              {
                priority: 1,
                jobId: `${wbot.id}-handleMessageAck-${message.key.id}`
              }
            );
          } catch (error) {
            logger.error(`[ACK-FALLBACK] Falha ao enfileirar ack de grupo (${message.key.id}). Processando direto.`);
            await handleMsgAck(message, 2);
          }
        } else {
          await handleMsgAck(message, 2);
        }
      }
    });

    // messages.forEach(async (message: proto.IWebMessageInfo) => {
    //   const messageExists = await Message.count({
    //     where: { id: message.key.id!, companyId }
    //   });

    //   if (!messageExists) {
    //     await handleMessage(message, wbot, companyId);
    //     await verifyRecentCampaign(message, companyId);
    //     await verifyCampaignMessageAndCloseTicket(message, companyId);
    //   }
    // });
  });

  wbot.ev.on("messages.update", (messageUpdate: WAMessageUpdate[]) => {
    if (messageUpdate.length === 0) return;
    messageUpdate.forEach(async (message: WAMessageUpdate) => {
      (wbot as WASocket)!.readMessages([message.key]);

      const msgUp = { ...messageUpdate };

      if (
        msgUp["0"]?.update.messageStubType === 1 &&
        msgUp["0"]?.key.remoteJid !== "status@broadcast"
      ) {
        MarkDeleteWhatsAppMessage(
          msgUp["0"]?.key.remoteJid,
          null,
          msgUp["0"]?.key.id,
          companyId
        );
      }

      let ack: number = message.update.status || 1;

      if (REDIS_URI_MSG_CONN !== "") {
        try {
          await BullQueues.add(
            `${process.env.DB_NAME}-handleMessageAck`,
            { msg: message, chat: ack },
            {
              priority: 1,
              jobId: `${wbot.id}-handleMessageAck-${message.key.id}`
            }
          );
        } catch (error) {
          logger.error(`[ACK-FALLBACK] Falha ao enfileirar ack (${message.key.id}). Processando direto.`);
          await handleMsgAck(message, ack);
        }
      } else {
        await handleMsgAck(message, ack);
      }
    });
  });

  // wbot.ev.on('message-receipt.update', (events: any) => {
  //   events.forEach(async (msg: any) => {
  //     const ack = msg?.receipt?.receiptTimestamp ? 3 : msg?.receipt?.readTimestamp ? 4 : 0;
  //     if (!ack) return;
  //     await handleMsgAck(msg, ack);
  //   });
  // })
  // wbot.ev.on("presence.update", (events: any) => {
  //   console.log(events)
  // })

  // NÃO criar automaticamente contatos da agenda do aparelho ao apenas conectar.
  // Este handler agora só ATUALIZA contatos que já existem, evitando que grupos/lista inteira
  // da conexão apareçam sozinhos em /contacts sem o usuário clicar em "Importar do aparelho padrão".
  wbot.ev.on("contacts.update", (contacts: any) => {
    contacts.forEach(async (contact: any) => {
      if (!contact?.id) return;

      if (!contact.id.includes("@s.whatsapp.net") && !contact.id.includes("@g.us")) {
        return;
      }

      const isGroup = contact.id.includes("@g.us");
      const number = isGroup
        ? contact.id.replace("@g.us", "")
        : contact.id.replace("@s.whatsapp.net", "");

      if (!/^\d{10,15}$/.test(number)) {
        return;
      }

      // Só atualiza se o contato já existir; não cria novos automaticamente
      const existing = await Contact.findOne({
        where: { number, companyId }
      });
      if (!existing) {
        return;
      }

      const profilePicUrl = contact.imgUrl === ""
        ? ""
        : await wbot.profilePictureUrl(contact.id).catch(() => null);

      const contactData = {
        name: existing.name || number,
        number,
        isGroup,
        companyId,
        remoteJid: contact.id,
        profilePicUrl,
        whatsappId: wbot.id,
        wbot
      };

      await CreateOrUpdateContactService(contactData);
    });
  });


  // Handlers extras removidos para produção

  wbot.ev.on('group-participants.update', async (event) => {
    console.log("group-participants.update.listener", JSON.stringify(event, null, 2))
    const { id, participants, action, author } = event
    // console.log("group-participants.update.listener", id, participants, action, author)
    const metadata = await getGroupMetadataCache(wbot.id, id)

    if (!Array.isArray(metadata?.participants)) {
      return
    }

    if (action === 'add') {
      logger.info(`Adicionando participantes ao grupo ${id}, atualizando cache`)
      metadata.participants.push(...participants.map(p => ({
        id: p,
        admin: null
      })))
    } else if (action === 'demote' || action === 'promote') {
      logger.info(`Atualizando ${action === 'promote' ? 'admin' : 'participante'} do grupo ${id}, atualizando cache`)
      metadata.participants = metadata.participants.map(p => participants.includes(p.id) ? ({
        id: p.id,
        admin: action === 'promote' ? 'admin' : null
      }) : p)
    } else if (action === 'remove') {
      logger.info(`Removendo participante do grupo ${id}, atualizando cache`)
      metadata.participants = metadata.participants.filter(p => !participants.includes(p.id))
    } else if (action === 'modify') {
      logger.info(`Modificando participante do grupo ${id}, atualizando cache`)
      metadata.participants = metadata.participants.filter(p => p.id !== author)
      metadata.participants.push(...participants.map(p => ({
        id: p,
        admin: null
      })))
    }

    await groupMetadataCache.set(id, wbot.id, {
      timestamp: metadata.timestamp,
      data: metadata,
    })
  })

  wbot.ev.on("groups.update", (groupUpdate: GroupMetadata[]) => {
    // Logs de debug de grupos removidos para produção

    if (!groupUpdate[0]?.id) return;
    if (groupUpdate.length === 0) return;
    groupUpdate.forEach(async (group: GroupMetadata) => {
      const number = group.id.substr(0, group.id.indexOf("@"));
      const nameGroup = group.subject || number;

      let profilePicUrl: string = "";
      // try {
      //   profilePicUrl = await wbot.profilePictureUrl(group.id, "image");
      // } catch (e) {
      //   Sentry.captureException(e);
      //   profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
      // }
      const contactData = {
        name: nameGroup,
        number: number,
        isGroup: true,
        companyId: companyId,
        remoteJid: group.id,
        profilePicUrl,
        whatsappId: wbot.id,
        wbot: wbot
      };

      const contact = await CreateOrUpdateContactService(contactData);
    });
  });
};

export {
  wbotMessageListener,
  handleMessage,
  isValidMsg,
  getTypeMessage,
  handleMsgAck
};

// Função helper para mapear corretamente o mediaType baseado no MIME type completo
const getMediaTypeFromMimeType = (mimetype: string): string => {
  // Mapeamento específico para tipos de documento que devem ser tratados como "document"
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
    "application/vnd.apple.pages"
  ];

  // Mapeamento para tipos de arquivo compactado
  const archiveMimeTypes = [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/gzip",
    "application/x-bzip2"
  ];

  if (documentMimeTypes.includes(mimetype)) {
    return "document";
  }

  if (archiveMimeTypes.includes(mimetype)) {
    return "document"; // Tratar como documento para download
  }

  // Para outros tipos, usar a lógica padrão
  return mimetype.split("/")[0];
};
