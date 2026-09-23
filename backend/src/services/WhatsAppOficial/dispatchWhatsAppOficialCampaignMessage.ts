/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { clearCampaignTicketAgentFlags } from "../../helpers/ticketAiAgentPreview";
import moment from "moment";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import Whatsapp from "../../models/Whatsapp";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";
import ShowTicketService from "../TicketServices/ShowTicketService";
import ShowService from "../QuickMessageService/ShowService";
import SendWhatsAppOficialMessage from "./SendWhatsAppOficialMessage";
import { sendMetaCloudMessageDirect } from "./sendMetaCloudMessageDirect";
import {
  buildMetaTemplatePayload,
  MetaTemplateVariablesInput
} from "./buildMetaTemplatePayload";
import logger from "../../utils/logger";
import { getIO } from "../../libs/socket";
import formatBody from "../../helpers/Mustache";

const processTemplateVariablesForContact = (
  raw: string | null,
  contact: Contact | null,
  campaign: Campaign
): MetaTemplateVariablesInput => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as MetaTemplateVariablesInput;
    const ticketStub = {
      contact: contact || { name: "", number: "", email: "" },
      id: 0
    } as Ticket;

    const walk = (obj: any): any => {
      if (obj == null) return obj;
      if (typeof obj === "string") {
        return formatBody(obj, ticketStub);
      }
      if (Array.isArray(obj)) {
        return obj.map(walk);
      }
      if (typeof obj === "object") {
        const next: Record<string, unknown> = {};
        Object.keys(obj).forEach(k => {
          next[k] = walk(obj[k]);
        });
        return next;
      }
      return obj;
    };

    return walk(parsed);
  } catch {
    return {};
  }
};

export async function runWhatsAppOficialCampaignDispatch(
  campaign: Campaign,
  campaignShipping: CampaignShipping
): Promise<void> {
  const whatsapp = await Whatsapp.findByPk(campaign.whatsappId);
  if (!whatsapp || whatsapp.channel !== "whatsapp_oficial") {
    throw new Error("Conexão WhatsApp API Oficial não encontrada para campanha.");
  }

  if (whatsapp.status !== "CONNECTED") {
    logger.warn(
      `[CAMPAIGN][WABA] Conexão ${whatsapp.id} status=${whatsapp.status} — disparo ${campaignShipping.id}`
    );
    return;
  }

  if (!campaign.metaTemplateQuickMessageId) {
    logger.error(
      `[CAMPAIGN][WABA] Campanha ${campaign.id} sem template Meta — campanhas oficiais exigem template aprovado.`
    );
    return;
  }

  const template = await ShowService(
    campaign.metaTemplateQuickMessageId,
    campaign.companyId
  );

  if (!template || template.status !== "APPROVED") {
    logger.error(
      `[CAMPAIGN][WABA] Template ${campaign.metaTemplateQuickMessageId} indisponível ou não aprovado.`
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
        channel: "whatsapp_oficial",
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
        channel: "whatsapp_oficial",
        isBot: false,
        useIntegration: false
      });
    } else {
      await clearCampaignTicketAgentFlags(ticket);
    }

    ticket = await ShowTicketService(ticket.id, campaign.companyId);
  } else {
    contact = await Contact.findOne({
      where: {
        number: campaignShipping.number,
        companyId: campaign.companyId
      }
    });
  }

  const variables = processTemplateVariablesForContact(
    campaign.metaTemplateVariables,
    contact,
    campaign
  );

  const templatePayload = buildMetaTemplatePayload(template, variables);

  if (ticket) {
    const bodyPreview =
      template.message ||
      `📋 Template: ${template.shortcode}`;

    await SendWhatsAppOficialMessage({
      body: bodyPreview,
      ticket,
      quotedMsg: null,
      type: "template",
      media: null,
      template: templatePayload
    });
  } else {
    await sendMetaCloudMessageDirect({
      whatsapp,
      toNumber: campaignShipping.number,
      type: "template",
      template: templatePayload
    });
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
      logger.warn(`[CAMPAIGN][WABA] Tag campanha: ${markErr}`);
    }
  }

  if (ticket && campaign.openTicket === "enabled") {
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
    } catch {
      /* optional */
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
    } catch {
      /* optional */
    }
  }
}
