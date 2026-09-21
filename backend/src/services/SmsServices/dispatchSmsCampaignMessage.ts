/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path from "path";
import fs from "fs";
import moment from "moment";
import Whatsapp from "../../models/Whatsapp";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import CampaignShipping from "../../models/CampaignShipping";
import Campaign from "../../models/Campaign";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { sendSmsMessage } from "./sendSmsMessage";
import { verifyOutboundSmsMessage } from "./verifySmsMessage";
import logger from "../../utils/logger";
import { getIO } from "../../libs/socket";

/**
 * Dispara mensagem de campanha via SMS (Twilio).
 * Retorna true se enviou (ou tentou enviar) com sucesso.
 */
export async function dispatchSmsCampaignMessage({
  campaign,
  campaignShipping,
  whatsapp,
  ticket,
  contact,
  messageText,
  isConfirmation = false
}: {
  campaign: Campaign;
  campaignShipping: CampaignShipping;
  whatsapp: Whatsapp;
  ticket?: Ticket | null;
  contact?: Contact | null;
  messageText: string;
  isConfirmation?: boolean;
}): Promise<boolean> {
  const toNumber =
    campaignShipping.number ||
    contact?.number ||
    campaignShipping.contact?.number;

  if (!toNumber) {
    return false;
  }

  const sendResult = await sendSmsMessage(
    whatsapp,
    toNumber,
    messageText,
    ticket || undefined
  );

  if (ticket && contact) {
    await verifyOutboundSmsMessage(sendResult, ticket, contact, messageText);
  }

  return true;
}

export async function dispatchSmsCampaignMedia({
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
    await dispatchSmsCampaignMessage({
      campaign,
      campaignShipping,
      whatsapp,
      ticket,
      contact,
      messageText: text
    });
    return;
  }

  const text = `${campaignShipping.message}\n[Mídia anexada na campanha — envio SMS apenas texto na v1]`;
  await dispatchSmsCampaignMessage({
    campaign,
    campaignShipping,
    whatsapp,
    ticket,
    contact,
    messageText: text
  });
}

/** Fluxo de campanha para conexões channel=sms (Twilio). */
export async function runSmsCampaignDispatch(
  campaign: Campaign,
  campaignShipping: CampaignShipping
): Promise<void> {
  const whatsapp = await Whatsapp.findByPk(campaign.whatsappId);
  if (!whatsapp || whatsapp.channel !== "sms") {
    throw new Error("Conexão SMS não encontrada para campanha.");
  }

  if (whatsapp.status !== "CONNECTED") {
    logger.warn(
      `[CAMPAIGN][SMS] Conexão ${whatsapp.id} status=${whatsapp.status} — disparo ${campaignShipping.id}`
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
        name:
          campaignShipping.contact?.name ||
          "Contato da Campanha",
        number: campaignShipping.number,
        email: campaignShipping.contact?.email || "",
        whatsappId: campaign.whatsappId,
        channel: "sms",
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
        channel: "sms"
      });
    }

    ticket = await ShowTicketService(ticket.id, campaign.companyId);
  }

  const sendConfirmation =
    campaign.confirmation && campaignShipping.confirmation === null;
  const sendMain =
    !campaign.confirmation || campaignShipping.confirmation !== null;

  if (sendConfirmation) {
    await dispatchSmsCampaignMessage({
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
      await dispatchSmsCampaignMessage({
        campaign,
        campaignShipping,
        whatsapp,
        ticket,
        contact,
        messageText: campaignShipping.message
      });
    } else {
      await dispatchSmsCampaignMedia({
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
        defaults: { color: "#6366f1", kanban: 0 }
      });
      await ContactTag.findOrCreate({
        where: { contactId: contact.id, tagId: campTag.id }
      });
    } catch (markErr) {
      logger.warn(`[CAMPAIGN][SMS] Tag campanha: ${markErr}`);
    }
  }

  if (ticket) {
    try {
      const prevDw = ticket.dataWebhook as Record<string, unknown> | null;
      const dw =
        prevDw && typeof prevDw === "object" && !Array.isArray(prevDw)
          ? { ...prevDw }
          : {};
      (dw as Record<string, unknown>).sourceCampaignId = campaign.id;
      await Ticket.update(
        { dataWebhook: dw as any },
        { where: { id: ticket.id, companyId: campaign.companyId } }
      );
    } catch {}
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
