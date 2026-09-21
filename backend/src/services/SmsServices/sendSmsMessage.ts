/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import formatBody from "../../helpers/Mustache";
import { getSmsProvider, getTwilioCredentials } from "./smsCredentials";
import { normalizeSmsNumber } from "./normalizeSmsNumber";
import { sendSmsViaVonage } from "./sendSmsViaVonage";

export interface SendSmsResult {
  sid: string;
  status?: string;
  to: string;
  from: string;
  body: string;
}

export async function sendSmsViaTwilio(
  connection: Whatsapp,
  toRaw: string,
  body: string,
  ticket?: Ticket
): Promise<SendSmsResult> {
  const { accountSid, authToken, fromNumber } =
    getTwilioCredentials(connection);

  const to = normalizeSmsNumber(toRaw);
  const from = normalizeSmsNumber(fromNumber);
  const text = ticket ? formatBody(body, ticket) : body;

  if (!to || to.length < 12) {
    throw new AppError("Número de destino SMS inválido.", 400);
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const params = new URLSearchParams();
  params.append("To", to);
  params.append("From", from);
  params.append("Body", text);

  try {
    const { data } = await axios.post(url, params.toString(), {
      auth: { username: accountSid, password: authToken },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 30000
    });

    return {
      sid: data.sid,
      status: data.status,
      to,
      from,
      body: text
    };
  } catch (err: any) {
    const twilioMsg =
      err?.response?.data?.message || err?.message || "Erro ao enviar SMS";
    throw new AppError(`Twilio: ${twilioMsg}`, 400);
  }
}

/** Envia SMS conforme provider da conexão (Vonage ou Twilio). */
export async function sendSmsMessage(
  connection: Whatsapp,
  toRaw: string,
  body: string,
  ticket?: Ticket
): Promise<SendSmsResult> {
  const provider = getSmsProvider(connection);
  if (provider === "twilio") {
    return sendSmsViaTwilio(connection, toRaw, body, ticket);
  }
  return sendSmsViaVonage(connection, toRaw, body, ticket);
}
