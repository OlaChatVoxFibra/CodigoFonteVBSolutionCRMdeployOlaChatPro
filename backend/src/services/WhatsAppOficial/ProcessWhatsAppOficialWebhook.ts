/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { ReceibedWhatsAppService } from "./ReceivedWhatsApp";

export const normalizeWhatsAppInboundNumber = (raw: string): string =>
  String(raw || "").replace(/\D/g, "");

export const resolveWhatsAppOficialConnection = async (params: {
  whatsappId?: number | string;
  token?: string;
  phoneNumberId?: string;
  companyId?: number;
}): Promise<Whatsapp | null> => {
  const id = params.whatsappId ? Number(params.whatsappId) : null;

  if (id && !Number.isNaN(id)) {
    const byId = await Whatsapp.findOne({
      where: {
        id,
        channel: "whatsapp_oficial",
        ...(params.companyId ? { companyId: params.companyId } : {})
      }
    });
    if (byId) return byId;
  }

  if (params.phoneNumberId) {
    const byPhone = await Whatsapp.findOne({
      where: {
        phone_number_id: params.phoneNumberId,
        channel: "whatsapp_oficial",
        ...(params.companyId ? { companyId: params.companyId } : {})
      }
    });
    if (byPhone) return byPhone;
  }

  if (params.token) {
    const byToken = await Whatsapp.findOne({
      where: {
        token: params.token,
        channel: "whatsapp_oficial",
        ...(params.companyId ? { companyId: params.companyId } : {})
      }
    });
    if (byToken) return byToken;
  }

  return null;
};

const safePositiveInt = (value: unknown): number | undefined => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export const processWhatsAppOficialWebhookPayload = async (params: {
  companyId?: number;
  connectionId?: number;
  body: any;
}): Promise<void> => {
  const companyId = safePositiveInt(params.companyId);
  const connectionId = safePositiveInt(params.connectionId);
  const { body } = params;

  if (body?.object !== "whatsapp_business_account" || !Array.isArray(body.entry)) {
    return;
  }

  const receivedService = new ReceibedWhatsAppService();

  for (const entry of body.entry) {
    for (const change of entry.changes || []) {
      if (change.field && change.field !== "messages") continue;

      const value = change.value;
      if (!value) continue;

      const phoneNumberId = value.metadata?.phone_number_id;

      const whatsapp = await resolveWhatsAppOficialConnection({
        whatsappId: connectionId,
        phoneNumberId,
        companyId
      });

      if (!whatsapp) {
        logger.error(
          `[WABA Webhook] Conexão não encontrada company=${companyId} connection=${connectionId} phone_number_id=${phoneNumberId}`
        );
        continue;
      }

      const effectiveCompanyId = whatsapp.companyId;

      if (Array.isArray(value.statuses) && value.statuses.length > 0) {
        await receivedService.processStatuses({
          statuses: value.statuses,
          companyId: effectiveCompanyId,
          whatsapp
        });
      }

      if (!Array.isArray(value.messages) || value.messages.length === 0) {
        continue;
      }

      for (const message of value.messages) {
        const contact = Array.isArray(value.contacts)
          ? value.contacts.find((c: any) => c.wa_id === message.from) || value.contacts[0]
          : null;

        const convertedMessage = buildConvertedMessage(message, whatsapp);

        logger.info(
          `[WABA Webhook] Mensagem ${message.id} de ${message.from} -> conexão ${whatsapp.id} (company ${effectiveCompanyId})`
        );

        await receivedService.getMessage({
          whatsappId: whatsapp.id,
          token: whatsapp.token,
          fromNumber: normalizeWhatsAppInboundNumber(message.from),
          nameContact: contact?.profile?.name || message.from,
          companyId: effectiveCompanyId,
          message: convertedMessage
        });
      }
    }
  }
};

function buildConvertedMessage(message: any, whatsapp: Whatsapp) {
  const messageType = message.type;
  const converted: any = {
    type: messageType,
    timestamp: Number(message.timestamp) || Math.floor(Date.now() / 1000),
    idMessage: message.id,
    quoteMessageId: message.context?.id || undefined
  };

  if (messageType === "text") {
    converted.text = message.text?.body || "";
  } else if (
    ["image", "video", "audio", "document", "sticker"].includes(messageType)
  ) {
    const media = message[messageType];
    converted.idFile = media?.id;
    converted.mimeType = media?.mime_type;
    converted.text = media?.caption || "";
  } else if (messageType === "interactive") {
    const buttonReply = message.interactive?.button_reply;
    const listReply = message.interactive?.list_reply;
    const title = String(
      buttonReply?.title || listReply?.title || ""
    ).trim();
    const replyId = String(buttonReply?.id || listReply?.id || "").trim();
    // Ticket/UI devem mostrar o rótulo ("Opção A"), não o id técnico (row_1 / opt_1)
    converted.text = title || replyId;
    converted.interactiveReplyId = replyId || undefined;
    converted.interactiveReplyTitle = title || undefined;
  } else if (messageType === "button") {
    converted.text = message.button?.text || message.button?.payload || "";
  } else if (messageType === "contacts") {
    converted.text = { contacts: message.contacts || [] };
  }

  return converted;
}
