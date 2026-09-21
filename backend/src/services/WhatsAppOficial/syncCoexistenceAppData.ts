/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";

/**
 * Inicia sincronização de contatos/histórico após coexistência (app + API).
 * Não bloqueia a conexão se falhar.
 */
export const syncCoexistenceAppData = async (
  whatsapp: Whatsapp,
  accessToken: string
): Promise<{ contactsSync?: boolean; historySync?: boolean }> => {
  if (!whatsapp.phone_number_id || !accessToken) {
    return {};
  }

  const url = `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}/smb_app_data`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
  const body = { messaging_product: "whatsapp" as const };
  const result: { contactsSync?: boolean; historySync?: boolean } = {};

  try {
    await axios.post(
      url,
      { ...body, sync_type: "smb_app_state_sync" },
      { headers, timeout: 25000 }
    );
    result.contactsSync = true;
  } catch (error: any) {
    logger.warn(
      `[WABA Coexistence] smb_app_state_sync falhou conexão ${whatsapp.id}: ${
        error?.response?.data?.error?.message || error?.message
      }`
    );
  }

  try {
    await axios.post(
      url,
      { ...body, sync_type: "history" },
      { headers, timeout: 25000 }
    );
    result.historySync = true;
  } catch (error: any) {
    logger.warn(
      `[WABA Coexistence] history sync falhou conexão ${whatsapp.id}: ${
        error?.response?.data?.error?.message || error?.message
      }`
    );
  }

  return result;
};
