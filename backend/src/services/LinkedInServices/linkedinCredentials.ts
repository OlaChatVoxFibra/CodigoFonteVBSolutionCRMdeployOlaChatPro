/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

export function resolveLinkedInWebhookBaseUrl(): string {
  const base =
    process.env.LINKEDIN_WEBHOOK_URL ||
    process.env.BACKEND_URL ||
    process.env.APP_URL ||
    `http://localhost:${process.env.PORT || 3000}`;
  return base.replace(/\/$/, "");
}

export function buildLinkedInWebhookUrl(
  companyId: number,
  connectionId: number
): string {
  return `${resolveLinkedInWebhookBaseUrl()}/v1/linkedin/webhook/${companyId}/${connectionId}`;
}

/** Client ID (App) */
export function getLinkedInClientId(connection: Whatsapp): string {
  return (connection.facebookUserId || "").trim();
}

/** Client Secret */
export function getLinkedInClientSecret(connection: Whatsapp): string {
  return (connection.facebookUserToken || "").trim();
}

/** OAuth access token */
export function getLinkedInAccessToken(connection: Whatsapp): string {
  const token = (connection.token || "").trim();
  if (!token) {
    throw new AppError("Conexão LinkedIn sem Access Token.", 400);
  }
  return token;
}

/** URN do remetente (pessoa ou organização) */
export function getLinkedInSenderUrn(connection: Whatsapp): string {
  const urn = (connection.phone_number_id || "").trim();
  if (!urn) {
    throw new AppError(
      "Conexão LinkedIn incompleta: informe o URN do remetente (pessoa ou organização).",
      400
    );
  }
  return urn;
}

export function getLinkedInCredentials(connection: Whatsapp) {
  return {
    clientId: getLinkedInClientId(connection),
    clientSecret: getLinkedInClientSecret(connection),
    accessToken: getLinkedInAccessToken(connection),
    senderUrn: getLinkedInSenderUrn(connection),
    senderLabel:
      (connection.number || connection.phone_number || "LinkedIn").trim() ||
      "LinkedIn"
  };
}
