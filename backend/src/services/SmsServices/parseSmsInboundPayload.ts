/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Normaliza webhooks Twilio e Vonage para o fluxo de inbound.
 * Vonage: https://developer.vonage.com/en/messaging/sms/guides/inbound-sms
 */
export interface NormalizedSmsInbound {
  from: string;
  body: string;
  messageId: string;
  provider: "vonage" | "twilio";
}

export function parseSmsInboundPayload(
  payload: Record<string, unknown>,
  connectionProvider?: string
): NormalizedSmsInbound | null {
  const p = connectionProvider?.toLowerCase() || "";

  // Vonage (POST/GET): msisdn, text, messageId
  const vonageFrom =
    payload.msisdn || payload.msisdn_number || payload.from;
  const vonageText = payload.text || payload.body;
  const vonageId = payload.messageId || payload["message-id"];

  if (vonageFrom && vonageText && vonageId) {
    return {
      from: String(vonageFrom),
      body: String(vonageText).trim(),
      messageId: String(vonageId),
      provider: "vonage"
    };
  }

  // Twilio
  const twilioFrom = payload.From;
  const twilioBody = payload.Body;
  const twilioId = payload.MessageSid || payload.SmsSid;
  const twilioStatus = payload.SmsStatus || payload.MessageStatus;

  if (twilioFrom && twilioId) {
    if (
      twilioStatus &&
      !["received", "delivered", "sent", "queued", "receiving", ""].includes(
        String(twilioStatus).toLowerCase()
      )
    ) {
      return null;
    }
    const body = String(twilioBody || "").trim();
    if (!body) return null;
    return {
      from: String(twilioFrom),
      body,
      messageId: String(twilioId),
      provider: "twilio"
    };
  }

  // Auto-detect when provider unknown
  if (p === "vonage" && vonageFrom) {
    return parseSmsInboundPayload({
      msisdn: vonageFrom,
      text: vonageText,
      messageId: vonageId
    });
  }

  return null;
}
