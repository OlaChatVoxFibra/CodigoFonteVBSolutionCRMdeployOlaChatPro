/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";

export const sanitizeMetaToken = (raw?: string | null): string =>
  String(raw || "")
    .replace(/\s+/g, "")
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
    .trim();

/** Candidatos de token (ordem de preferência), sem duplicata. */
export const getMetaAccessTokenCandidates = (whatsapp: Whatsapp): string[] => {
  const raw = [
    process.env[`WABA_TOKEN_${whatsapp.id}`],
    process.env[`META_TOKEN_WHATSAPP_${whatsapp.id}`],
    whatsapp.send_token,
    whatsapp.facebookUserToken,
    whatsapp.token,
    process.env.WABA_ACCESS_TOKEN,
    process.env.META_WHATSAPP_ACCESS_TOKEN,
    process.env.META_SYSTEM_USER_TOKEN
  ];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const clean = sanitizeMetaToken(item);
    if (!clean || seen.has(clean)) continue;
    // token interno "oficial-..." não é Meta
    if (clean.startsWith("oficial-")) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
};

/** Token da conexão (DB) com fallback opcional por env (Railway). */
export const getMetaAccessToken = (whatsapp: Whatsapp): string => {
  return getMetaAccessTokenCandidates(whatsapp)[0] || "";
};

export interface MetaTokenValidation {
  valid: boolean;
  error?: string;
  code?: number;
  phoneNumberId?: string;
}

export const validateMetaAccessToken = async (
  token: string,
  phoneNumberId?: string
): Promise<MetaTokenValidation> => {
  const clean = sanitizeMetaToken(token);
  if (!clean) {
    return { valid: false, error: "Token de acesso vazio" };
  }

  try {
    const target = phoneNumberId
      ? `https://graph.facebook.com/v21.0/${phoneNumberId}`
      : "https://graph.facebook.com/v21.0/me";

    await axios.get(target, {
      headers: { Authorization: `Bearer ${clean}` },
      params: { fields: "id" },
      timeout: 15000
    });

    return { valid: true, phoneNumberId };
  } catch (error: any) {
    const metaError = error?.response?.data?.error;
    const code = metaError?.code;
    let message =
      metaError?.message || error?.message || "Falha ao validar token na Meta";

    if (code === 190) {
      message =
        "Token Meta expirado ou revogado. Gere um token permanente no Meta Business (System User) e atualize na conexão.";
    }

    logger.warn(`[WABA Auth] Token inválido: ${message} (code=${code})`);
    return { valid: false, error: message, code };
  }
};

export const assertMetaTokenForWhatsapp = async (
  whatsapp: Whatsapp
): Promise<string> => {
  const token = getMetaAccessToken(whatsapp);
  if (!token) {
    throw new Error(
      "Token de acesso Meta não configurado. Informe o token permanente na conexão."
    );
  }

  const validation = await validateMetaAccessToken(
    token,
    whatsapp.phone_number_id
  );
  if (!validation.valid) {
    throw new Error(validation.error || "Token Meta inválido");
  }

  return token;
};
