/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import moment from "moment";
import { Op } from "sequelize";
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
import { normalizeSmsNumber, smsNumbersMatch } from "./normalizeSmsNumber";
import { verifyInboundSmsMessage } from "./verifySmsMessage";
import { parseSmsInboundPayload } from "./parseSmsInboundPayload";

async function verifyRecentCampaignSms(
  fromNumber: string,
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
    smsNumbersMatch(row.number, fromNumber)
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

export async function handleSmsInbound(
  connection: Whatsapp,
  rawPayload: Record<string, unknown>
): Promise<void> {
  const inbound = parseSmsInboundPayload(
    rawPayload,
    connection.provider || "vonage"
  );

  if (!inbound) {
    logger.warn("[SMS] Webhook sem dados de mensagem inbound reconhecidos.");
    return;
  }

  const { from, body, messageId } = inbound;

  const companyId = connection.companyId;
  const contactNumber = normalizeSmsNumber(from).replace(/\D/g, "");

  await verifyRecentCampaignSms(from, companyId);

  const contact = await CreateOrUpdateContactService({
    name: contactNumber,
    number: contactNumber,
    isGroup: false,
    companyId,
    channel: "sms",
    whatsappId: connection.id
  });

  const settings = await CompaniesSettings.findOne({
    where: { companyId }
  });
  const listSettings = await ListSettingsService({ companyId });
  const settingsMerged = { ...listSettings, ...settings?.toJSON() };

  const ticket = await FindOrCreateTicketService(
    contact,
    connection,
    1,
    companyId,
    null,
    null,
    null,
    "sms",
    false,
    false,
    settingsMerged,
    false,
    false
  );

  const fullTicket = await ShowTicketService(ticket.id, companyId);
  await verifyInboundSmsMessage(messageId, body, fullTicket, contact);
}
