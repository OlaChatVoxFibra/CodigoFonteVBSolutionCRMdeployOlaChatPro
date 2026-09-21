/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Setting from "../models/Setting";
import { decryptRelaySecret } from "./RelayCrypto";

export const SMTP_RELAY_SETTING_URL = "smtpRelayUrl";
export const SMTP_RELAY_SETTING_SECRET_ENC = "smtpRelaySecretEnc";

export type SmtpRelayResolution = {
  url: string;
  secret: string;
  source: "environment" | "database";
};

/**
 * Relay HTTP → worker (ex.: Vercel) que abre SMTP. Prioridade: variáveis de ambiente da API, depois Settings no banco.
 */
export async function resolveSmtpRelayForCompany(companyId: number): Promise<SmtpRelayResolution | null> {
  const envUrl = String(process.env.EMAIL_SMTP_RELAY_URL || "").trim();
  const envSecret = String(process.env.EMAIL_SMTP_RELAY_SECRET || "").trim();
  if (envUrl && envSecret) {
    return { url: envUrl, secret: envSecret, source: "environment" };
  }

  const urlRow = await Setting.findOne({ where: { companyId, key: SMTP_RELAY_SETTING_URL } });
  const secRow = await Setting.findOne({ where: { companyId, key: SMTP_RELAY_SETTING_SECRET_ENC } });
  const url = String(urlRow?.value || "").trim();
  if (!url || !secRow?.value) {
    return null;
  }
  const secret = decryptRelaySecret(secRow.value);
  if (!secret) {
    return null;
  }
  return { url, secret, source: "database" };
}
