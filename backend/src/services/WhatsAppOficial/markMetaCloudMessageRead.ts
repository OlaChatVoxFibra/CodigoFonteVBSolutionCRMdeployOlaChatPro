/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import { getMetaAccessToken, sanitizeMetaToken } from "./metaWhatsAppAuth";
import logger from "../../utils/logger";

/**
 * Marca mensagem como lida na Meta (Cloud API direta).
 */
export const markMetaCloudMessageRead = async (
  whatsapp: Whatsapp,
  messageId: string
): Promise<void> => {
  const token = sanitizeMetaToken(getMetaAccessToken(whatsapp));
  const phoneNumberId = whatsapp.phone_number_id;

  if (!token || !phoneNumberId || !messageId) {
    return;
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message;
    logger.warn(`[WABA] mark read ${messageId}: ${msg}`);
  }
};
