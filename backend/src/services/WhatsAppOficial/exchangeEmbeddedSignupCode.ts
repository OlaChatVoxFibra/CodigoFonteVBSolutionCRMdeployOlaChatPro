/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import logger from "../../utils/logger";

export interface ExchangeEmbeddedSignupResult {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
}

/**
 * Troca o authorization code do Embedded Signup por access token.
 * @see https://developers.facebook.com/docs/whatsapp/embedded-signup/
 */
export const exchangeEmbeddedSignupCode = async (
  code: string,
  credentials?: { clientId?: string; clientSecret?: string }
): Promise<ExchangeEmbeddedSignupResult> => {
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

  if (!clientId || !clientSecret) {
    throw new Error(
      "FACEBOOK_APP_ID e FACEBOOK_APP_SECRET são obrigatórios no servidor para Embedded Signup."
    );
  }

  const cleanCode = String(code || "").trim();
  if (!cleanCode) {
    throw new Error("Código de autorização vazio.");
  }

  try {
    const { data } = await axios.get(
      "https://graph.facebook.com/v21.0/oauth/access_token",
      {
        params: {
          client_id: clientId,
          client_secret: clientSecret,
          code: cleanCode
        },
        timeout: 20000
      }
    );

    const accessToken = String(data?.access_token || "").trim();
    if (!accessToken) {
      throw new Error("Meta não retornou access_token após Embedded Signup.");
    }

    return {
      accessToken,
      tokenType: data?.token_type,
      expiresIn: data?.expires_in
    };
  } catch (error: any) {
    const metaError = error?.response?.data?.error;
    const msg =
      metaError?.message ||
      error?.message ||
      "Falha ao trocar código Embedded Signup por token.";
    logger.error(`[WABA Embedded Signup] Exchange code: ${msg}`);
    throw new Error(msg);
  }
};
