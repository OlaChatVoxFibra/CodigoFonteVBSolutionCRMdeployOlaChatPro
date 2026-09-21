/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

export type SmsProviderId = "vonage" | "twilio";

export function getSmsProvider(connection: Whatsapp): SmsProviderId {
  const p = (connection.provider || "vonage").toLowerCase();
  if (p === "twilio") return "twilio";
  return "vonage";
}

/** Twilio: Account SID + Auth Token */
export function getTwilioCredentials(connection: Whatsapp) {
  const accountSid = (connection.facebookUserId || "").trim();
  const authToken = (connection.token || "").trim();
  const fromNumber = (connection.number || connection.phone_number || "").trim();
  if (!accountSid || !authToken || !fromNumber) {
    throw new AppError(
      "Conexão Twilio incompleta: Account SID, Auth Token e número From.",
      400
    );
  }
  return { accountSid, authToken, fromNumber };
}

/** Vonage: API Key + API Secret — https://github.com/Vonage/vonage-node-sdk */
export function getVonageCredentials(connection: Whatsapp) {
  const apiKey = (connection.facebookUserId || "").trim();
  const apiSecret = (connection.token || "").trim();
  const from = (connection.number || connection.phone_number || "").trim();
  if (!apiKey || !apiSecret || !from) {
    throw new AppError(
      "Conexão Vonage incompleta: API Key, API Secret e remetente (From).",
      400
    );
  }
  return { apiKey, apiSecret, from };
}

export function buildSmsWebhookUrl(companyId: number, connectionId: number): string {
  const base =
    process.env.BACKEND_URL ||
    process.env.APP_URL ||
    `http://localhost:${process.env.PORT || 3000}`;
  const trimmed = base.replace(/\/$/, "");
  return `${trimmed}/v1/sms/webhook/${companyId}/${connectionId}`;
}
