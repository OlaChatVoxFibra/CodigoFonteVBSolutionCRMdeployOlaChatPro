/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path from "path";
import fs from "fs";
import moment from "moment";
import { clearCampaignTicketAgentFlags } from "../../helpers/ticketAiAgentPreview";
import Whatsapp from "../../models/Whatsapp";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import CampaignShipping from "../../models/CampaignShipping";
import Campaign from "../../models/Campaign";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { sendTelegramMessage } from "./sendTelegramMessage";
import { verifyOutboundTelegramMessage } from "./verifyTelegramMessage";
import logger from "../../utils/logger";
import { getIO } from "../../libs/socket";

export async function dispatchTelegramCampaignMessage({
  campaign,
  campaignShipping,
  whatsapp,
  ticket,
  contact,
  messageText
}: {
  campaign: Campaign;
  campaignShipping: CampaignShipping;
  whatsapp: Whatsapp;
  ticket?: Ticket | null;
  contact?: Contact | null;
  messageText: string;
}): Promise<boolean> {
  const chatId =
    campaignShipping.number ||
    contact?.number ||
    campaignShipping.contact?.number;

  if (!chatId) {
    return false;
  }

  const sendResult = await sendTelegramMessage(
    whatsapp,
    chatId,
    messageText,
    ticket || undefined
  );

  if (ticket && contact) {
    await verifyOutboundTelegramMessage(
      sendResult,
      ticket,
      contact,
      messageText
    );
  }

  return true;
}

export async function dispatchTelegramCampaignMedia({
  whatsapp,
  campaign,
  campaignShipping,
  ticket,
  contact
}: {
  whatsapp: Whatsapp;
  campaign: Campaign;
  campaignShipping: CampaignShipping;
  ticket?: Ticket | null;
  contact?: Contact | null;
}): Promise<void> {
  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const filePath = path.join(
    publicFolder,
    `company${campaign.companyId}`,
    campaign.mediaPath
  );

  if (!fs.existsSync(filePath)) {
    const text = `${campaignShipping.message}\n[Mídia: ${campaign.mediaName}]`;
    await dispatchTelegramCampaignMessage({
      campaign,
      campaignShipping,
      whatsapp,
      ticket,
      contact,
      messageText: text
    });
    return;
  }

  const text = `${campaignShipping.message}\n[Mídia anexada na campanha — envio Telegram apenas texto na v1]`;
  await dispatchTelegramCampaignMessage({
    campaign,
    campaignShipping,
    whatsapp,
    ticket,
    contact,
    messageText: text
  });
}

export async function runTelegramCampaignDispatch(
  campaign: Campaign,
  campaignShipping: CampaignShipping
): Promise<void> {
  const whatsapp = await Whatsapp.findByPk(campaign.whatsappId);
  if (!whatsapp || whatsapp.channel !== "telegram") {
    throw new Error("Conexão Telegram não encontrada para campanha.");
  }

  if (whatsapp.status !== "CONNECTED") {
    logger.warn(
      `[CAMPAIGN][TELEGRAM] Conexão ${whatsapp.id} status=${whatsapp.status}`
    );
    return;
  }

  let ticket: Ticket | null = null;
  let contact: Contact | null = null;

  if (campaign.openTicket === "enabled") {
    const [c] = await Contact.findOrCreate({
      where: {
        number: campaignShipping.number,
        companyId: campaign.companyId
      },
      defaults: {
        companyId: campaign.companyId,
        name: campaignShipping.contact?.name || "Contato da Campanha",
        number: campaignShipping.number,
        email: campaignShipping.contact?.email || "",
        whatsappId: campaign.whatsappId,
        channel: "telegram",
        profilePicUrl: ""
      }
    });
    contact = c;

    ticket = await Ticket.findOne({
      where: {
        contactId: contact.id,
        companyId: campaign.companyId,
        whatsappId: whatsapp.id,
        status: ["open", "pending"]
      }
    });

    if (!ticket) {
      ticket = await Ticket.create({
        companyId: campaign.companyId,
        contactId: contact.id,
        whatsappId: whatsapp.id,
        queueId: campaign?.queueId,
        userId: campaign?.userId,
        status: campaign?.statusTicket || "pending",
        channel: "telegram",
        isBot: false,
        useIntegration: false
      });
    } else {
      await clearCampaignTicketAgentFlags(ticket);
    }

    ticket = await ShowTicketService(ticket.id, campaign.companyId);
  }

  const sendConfirmation =
    campaign.confirmation && campaignShipping.confirmation === null;
  const sendMain =
    !campaign.confirmation || campaignShipping.confirmation !== null;

  if (sendConfirmation) {
    await dispatchTelegramCampaignMessage({
      campaign,
      campaignShipping,
      whatsapp,
      ticket,
      contact,
      messageText: campaignShipping.confirmationMessage
    });
    await campaignShipping.update({ confirmationRequestedAt: moment() });
  } else if (sendMain) {
    if (!campaign.mediaPath) {
      await dispatchTelegramCampaignMessage({
        campaign,
        campaignShipping,
        whatsapp,
        ticket,
        contact,
        messageText: campaignShipping.message
      });
    } else {
      await dispatchTelegramCampaignMedia({
        whatsapp,
        campaign,
        campaignShipping,
        ticket,
        contact
      });
    }
  }

  if (contact) {
    try {
      const [campTag] = await Tag.findOrCreate({
        where: {
          name: `Campanha #${campaign.id}`,
          companyId: campaign.companyId
        },
        defaults: { color: "#0088cc", kanban: 0 }
      });
      await ContactTag.findOrCreate({
        where: { contactId: contact.id, tagId: campTag.id }
      });
    } catch (markErr) {
      logger.warn(`[CAMPAIGN][TELEGRAM] Tag: ${markErr}`);
    }
  }

  const shouldMarkDelivered =
    !campaign.confirmation || campaignShipping.confirmation !== null;
  if (shouldMarkDelivered) {
    await campaignShipping.update({ deliveredAt: moment() });
    try {
      const io = getIO();
      io.of(`/${campaign.companyId}`).emit(
        `company-${campaign.companyId}-campaign-shipping`,
        {
          action: "delivered",
          campaignId: campaign.id,
          shippingId: campaignShipping.id,
          number: campaignShipping.number,
          contactName: campaignShipping?.contact?.name || null,
          deliveredAt: campaignShipping.deliveredAt
        }
      );
    } catch {}
  }
}
