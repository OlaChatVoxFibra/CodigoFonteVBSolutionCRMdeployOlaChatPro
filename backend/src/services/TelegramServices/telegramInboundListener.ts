/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import moment from "moment";
import { Op } from "sequelize";
import Message from "../../models/Message";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import Whatsapp from "../../models/Whatsapp";
import CompaniesSettings from "../../models/CompaniesSettings";
import ListSettingsService from "../SettingServices/ListSettingsService";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import {
  campaignQueue,
  parseToMilliseconds,
  randomValue
} from "../../queues";
import logger from "../../utils/logger";
import { smsNumbersMatch } from "../SmsServices/normalizeSmsNumber";
import { extractTelegramMessageBody } from "./extractTelegramMessageBody";
import { verifyInboundTelegramMessage } from "./verifyTelegramMessage";
import { processTelegramAgentInbound } from "./processTelegramAgentInbound";
import { sendTelegramMessage } from "./sendTelegramMessage";
import { verifyOutboundTelegramMessage } from "./verifyTelegramMessage";
import { syncTelegramContactProfilePic } from "./syncTelegramContactProfilePic";

interface TelegramMessage {
  message_id: number;
  from?: { id: number; first_name?: string; last_name?: string; username?: string };
  chat: { id: number | string; type?: string; title?: string; first_name?: string };
  text?: string;
  caption?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

async function verifyRecentCampaignTelegram(
  chatId: string,
  companyId: number
): Promise<void> {
  const campaigns = await Campaign.findAll({
    where: { companyId, status: "EM_ANDAMENTO", confirmation: true }
  });
  if (!campaigns?.length) return;

  const ids = campaigns.map(c => c.id);
  const pending = await CampaignShipping.findAll({
    where: {
      campaignId: { [Op.in]: ids },
      confirmationRequestedAt: { [Op.ne]: null },
      deliveredAt: null,
      [Op.or]: [{ confirmation: null }, { confirmation: false }]
    }
  });

  const campaignShipping = pending.find(row =>
    smsNumbersMatch(row.number, chatId)
  );

  if (!campaignShipping) return;

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
    { delay: parseToMilliseconds(randomValue(0, 10)) }
  );
}

function extractMessage(update: TelegramUpdate): TelegramMessage | null {
  return update.message || update.edited_message || null;
}

export interface TelegramInboundOptions {
  /** Remetente/chat GramJS com accessHash (Telegram Oficial) */
  gramJsEntity?: unknown;
}

export async function handleTelegramInbound(
  connection: Whatsapp,
  update: TelegramUpdate,
  options?: TelegramInboundOptions
): Promise<void> {
  const msg = extractMessage(update);
  if (!msg?.chat?.id) {
    return;
  }

  const body = extractTelegramMessageBody(msg);
  if (!body) {
    return;
  }

  const chatId = String(msg.chat.id);
  const messageId = `${connection.id}_${msg.message_id}`;

  const fromUser = msg.from;
  const displayName =
    [fromUser?.first_name, fromUser?.last_name].filter(Boolean).join(" ") ||
    msg.chat.title ||
    msg.chat.first_name ||
    fromUser?.username ||
    chatId;

  const companyId = connection.companyId;
  const ticketChannel =
    connection.channel === "telegram_oficial" ? "telegram_oficial" : "telegram";

  await verifyRecentCampaignTelegram(chatId, companyId);

  const isGroup =
    msg.chat.type === "group" || msg.chat.type === "supergroup";

  let contact = await CreateOrUpdateContactService({
    name: displayName,
    number: chatId,
    isGroup,
    companyId,
    channel: ticketChannel,
    whatsappId: connection.id,
    remoteJid: `${chatId}@${ticketChannel === "telegram_oficial" ? "telegram_user" : "telegram"}`
  });

  const isOficial =
    connection.channel === "telegram_oficial" || ticketChannel === "telegram_oficial";

  try {
    contact = await syncTelegramContactProfilePic({
      connection,
      contact,
      chatId,
      userId: fromUser?.id,
      isGroup,
      gramJsEntity: options?.gramJsEntity,
      force: isOficial
    });
  } catch (picErr: any) {
    logger.warn(`[TELEGRAM] foto de perfil: ${picErr?.message || picErr}`);
  }

  const settings = await CompaniesSettings.findOne({ where: { companyId } });
  const listSettings = await ListSettingsService({ companyId });
  const settingsMerged = { ...listSettings, ...settings?.toJSON() };

  const ticket = await FindOrCreateTicketService(
    contact,
    connection,
    1,
    companyId,
    null,
    null,
    msg.chat.type === "group" || msg.chat.type === "supergroup"
      ? contact
      : null,
    ticketChannel,
    false,
    false,
    settingsMerged,
    false,
    false
  );

  const fullTicket = await ShowTicketService(ticket.id, companyId);
  await verifyInboundTelegramMessage(messageId, body, fullTicket, contact);

  const inboundCount = await Message.count({
    where: { ticketId: ticket.id, fromMe: false, companyId }
  });

  if (
    connection.greetingMessage?.trim() &&
    inboundCount === 1
  ) {
    try {
      const greeting = connection.greetingMessage.trim();
      const sendResult = await sendTelegramMessage(
        connection,
        chatId,
        greeting,
        fullTicket
      );
      await verifyOutboundTelegramMessage(
        sendResult,
        fullTicket,
        contact,
        greeting
      );
    } catch (greetErr: any) {
      logger.warn(`[TELEGRAM] greeting: ${greetErr.message}`);
    }
  }

  try {
    await processTelegramAgentInbound({
      connection,
      ticket: fullTicket,
      contact,
      body,
      messageWid: messageId
    });
  } catch (agentErr: any) {
    logger.warn(`[TELEGRAM] agente IA: ${agentErr.message}`);
  }

  logger.info(
    `[TELEGRAM] Inbound chat=${chatId} ticket=${ticket.id} connection=${connection.id}`
  );
}
