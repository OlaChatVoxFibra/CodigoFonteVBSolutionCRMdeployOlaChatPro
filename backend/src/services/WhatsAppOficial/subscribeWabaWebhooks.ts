/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { resolveBackendBaseUrl } from "./FinalizeWhatsAppOficialConnection";
import { getMetaAccessToken } from "./metaWhatsAppAuth";

export interface SubscribeWabaResult {
  success: boolean;
  alreadySubscribed?: boolean;
  error?: string;
  webhookUrl?: string;
}

/**
 * Inscreve o app Meta nos webhooks da WABA do cliente.
 * Sem isso, subscribed_apps fica vazio e NENHUMA mensagem chega ao CRM.
 * @see https://developers.facebook.com/docs/whatsapp/embedded-signup/webhooks/
 */
export const subscribeWabaWebhooks = async (
  whatsapp: Whatsapp
): Promise<SubscribeWabaResult> => {
  const token = getMetaAccessToken(whatsapp);
  const wabaId = whatsapp.waba_id;

  if (!token || !wabaId) {
    return { success: false, error: "Token ou waba_id ausente na conexão" };
  }

  const base = resolveBackendBaseUrl().replace(/\/$/, "");
  const webhookUrl = `${base}/v1/webhook/waba`;
  const verifyToken = (process.env.VERIFY_TOKEN || "vbsolution").trim();

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
  const postUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`;
  const usePublicOverride =
    /^https:\/\//i.test(webhookUrl) && !/localhost|127\.0\.0\.1/i.test(webhookUrl);

  try {
    // 1) Inscrever app na WABA (obrigatório — sem isso subscribed_apps fica vazio)
    await axios.post(postUrl, {}, { headers, timeout: 20000 });

    // 2) Opcional: apontar callback desta WABA para nosso servidor
    if (usePublicOverride) {
      try {
        await axios.post(
          postUrl,
          {
            override_callback_uri: webhookUrl,
            verify_token: verifyToken
          },
          { headers, timeout: 20000 }
        );
      } catch (overrideErr: any) {
        const oMsg = overrideErr?.response?.data?.error?.message;
        logger.warn(
          `[WABA Subscribe] Inscrito na WABA ${wabaId}, override URL falhou: ${oMsg}. ` +
            `Configure o webhook global do app Meta para ${webhookUrl}`
        );
      }
    }

    logger.info(
      `[WABA Subscribe] App inscrito nos webhooks da WABA ${wabaId} (callback ${webhookUrl})`
    );
    return { success: true, webhookUrl };
  } catch (error: any) {
    const metaError = error?.response?.data?.error;
    const msg = metaError?.message || error?.message || "Falha ao inscrever webhooks";

    if (/already subscribed|já inscrit/i.test(String(msg))) {
      return { success: true, alreadySubscribed: true, webhookUrl };
    }

    logger.error(
      `[WABA Subscribe] WABA ${wabaId} conexão ${whatsapp.id}: ${msg} (code=${metaError?.code})`
    );
    return { success: false, error: msg, webhookUrl };
  }
};

export const listWabaSubscribedApps = async (
  whatsapp: Whatsapp
): Promise<{ data: unknown[]; error?: string }> => {
  const token = getMetaAccessToken(whatsapp);
  if (!token || !whatsapp.waba_id) {
    return { data: [], error: "Token ou waba_id ausente" };
  }

  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v21.0/${whatsapp.waba_id}/subscribed_apps`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
      }
    );
    return { data: data?.data || [] };
  } catch (error: any) {
    const msg = error?.response?.data?.error?.message || error?.message;
    return { data: [], error: msg };
  }
};
