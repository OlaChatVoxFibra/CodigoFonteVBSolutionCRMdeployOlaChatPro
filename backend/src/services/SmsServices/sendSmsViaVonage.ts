/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Vonage } from "@vonage/server-sdk";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import formatBody from "../../helpers/Mustache";
import { getVonageCredentials } from "./smsCredentials";
import { normalizeSmsNumber } from "./normalizeSmsNumber";
import { SendSmsResult } from "./sendSmsMessage";

function toVonageDigits(raw: string): string {
  return normalizeSmsNumber(raw).replace(/\D/g, "");
}

function formatVonageFrom(from: string): string {
  const trimmed = from.trim();
  if (/^[a-zA-Z]/.test(trimmed)) {
    return trimmed.slice(0, 11);
  }
  return toVonageDigits(trimmed);
}

export async function sendSmsViaVonage(
  connection: Whatsapp,
  toRaw: string,
  body: string,
  ticket?: Ticket
): Promise<SendSmsResult> {
  const { apiKey, apiSecret, from } = getVonageCredentials(connection);
  const to = toVonageDigits(toRaw);
  const fromFormatted = formatVonageFrom(from);
  const text = ticket ? formatBody(body, ticket) : body;

  if (!to || to.length < 10) {
    throw new AppError("Número de destino SMS inválido.", 400);
  }

  const vonage = new Vonage({
    apiKey,
    apiSecret
  });

  try {
    const resp = await vonage.sms.send({
      to,
      from: fromFormatted,
      text
    });

    const message = resp?.messages?.[0];
    if (String(message?.status) !== "0") {
      const errText =
        message?.["error-text"] ||
        message?.errorText ||
        `status ${message?.status}`;
      throw new AppError(`Vonage: ${errText}`, 400);
    }

    return {
      sid: String(message?.["message-id"] || message?.messageId || ""),
      status: "sent",
      to,
      from: fromFormatted,
      body: text
    };
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      `Vonage: ${err?.message || "Erro ao enviar SMS"}`,
      400
    );
  }
}

export async function validateVonageCredentials(
  apiKey: string,
  apiSecret: string
): Promise<void> {
  const axios = (await import("axios")).default;
  const { data } = await axios.get(
    "https://rest.nexmo.com/account/get-balance",
    {
      params: { api_key: apiKey, api_secret: apiSecret },
      timeout: 15000
    }
  );
  if (data?.["error-code"] && data["error-code"] !== "200") {
    throw new Error(data["error-text"] || "Credenciais Vonage inválidas");
  }
}
