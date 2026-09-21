/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import logger from "../../utils/logger";
import { sanitizeMetaToken } from "./metaWhatsAppAuth";

/**
 * Troca token curto (Embedded Signup / user token) por long-lived (~60 dias).
 * @see https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived
 */
export const exchangeMetaTokenToLongLived = async (
  shortLivedToken: string,
  credentials?: { clientId?: string; clientSecret?: string }
): Promise<{ accessToken: string; expiresIn?: number } | null> => {
  const clientId = (
    credentials?.clientId ||
    process.env.FACEBOOK_APP_ID ||
    ""
  ).trim();
  const clientSecret = (
    credentials?.clientSecret ||
    process.env.FACEBOOK_APP_SECRET ||
    ""
  ).trim();
  const token = sanitizeMetaToken(shortLivedToken);

  if (!clientId || !clientSecret || !token) {
    return null;
  }

  try {
    const { data } = await axios.get(
      "https://graph.facebook.com/v21.0/oauth/access_token",
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: clientId,
          client_secret: clientSecret,
          fb_exchange_token: token
        },
        timeout: 20000
      }
    );

    const accessToken = sanitizeMetaToken(data?.access_token);
    if (!accessToken) {
      return null;
    }

    return {
      accessToken,
      expiresIn:
        data?.expires_in != null ? Number(data.expires_in) : undefined
    };
  } catch (error: any) {
    const metaError = error?.response?.data?.error;
    logger.warn(
      `[WABA Auth] Falha ao trocar token para long-lived: ${
        metaError?.message || error?.message
      }`
    );
    return null;
  }
};
