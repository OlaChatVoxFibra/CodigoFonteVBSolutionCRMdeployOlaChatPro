/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import { getMetaAccessToken } from "./metaWhatsAppAuth";
import logger from "../../utils/logger";

export interface MetaPhoneProfileSnapshot {
  status?: string;
  verified_name?: string;
  quality_rating?: string;
  messaging_limit_tier?: string;
  display_phone_number?: string;
}

export const fetchMetaPhoneProfile = async (
  whatsapp: Whatsapp
): Promise<MetaPhoneProfileSnapshot | null> => {
  const token = getMetaAccessToken(whatsapp);
  if (!token || !whatsapp.phone_number_id) {
    return null;
  }

  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fields:
            "status,display_phone_number,verified_name,quality_rating,messaging_limit_tier,name_status"
        },
        timeout: 15000
      }
    );
    return data;
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message;
    logger.warn(`[WABA] fetch phone profile ${whatsapp.id}: ${msg}`);
    return null;
  }
};

/**
 * Sincroniza quality_rating, limite de mensagens e status do número na conexão.
 */
export const syncWhatsAppMetaPhoneProfile = async (
  whatsapp: Whatsapp
): Promise<Whatsapp> => {
  const data = await fetchMetaPhoneProfile(whatsapp);
  if (!data) {
    return whatsapp;
  }

  const updates: Partial<Whatsapp> = {
    meta_phone_status: data.status || null,
    meta_verified_name: data.verified_name || null,
    meta_quality_rating: data.quality_rating || null,
    meta_messaging_limit: data.messaging_limit_tier || null,
    meta_health_synced_at: new Date()
  } as Partial<Whatsapp>;

  if (data.display_phone_number && !whatsapp.phone_number) {
    updates.phone_number = String(data.display_phone_number).replace(/\D/g, "");
  }

  await whatsapp.update(updates);
  await whatsapp.reload();
  return whatsapp;
};
