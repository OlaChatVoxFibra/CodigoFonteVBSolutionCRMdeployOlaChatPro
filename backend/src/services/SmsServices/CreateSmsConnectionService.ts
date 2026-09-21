/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import CreateWhatsAppService from "../WhatsappService/CreateWhatsAppService";
import AssociateWhatsappQueue from "../WhatsappService/AssociateWhatsappQueue";
import { configureTwilioPhoneWebhook } from "./configureTwilioPhoneWebhook";
import { normalizeSmsNumber } from "./normalizeSmsNumber";
import { sendSmsMessage } from "./sendSmsMessage";
import { validateVonageCredentials } from "./sendSmsViaVonage";
import { buildSmsWebhookUrl, SmsProviderId } from "./smsCredentials";
import logger from "../../utils/logger";

interface Request {
  name: string;
  companyId: number;
  provider?: SmsProviderId;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  queueIds?: number[];
  greetingMessage?: string;
  color?: string;
  id?: number;
}

async function afterSaveConnection(
  whatsapp: Whatsapp,
  smsProvider: SmsProviderId
): Promise<Whatsapp> {
  const webhookUrl = buildSmsWebhookUrl(whatsapp.companyId, whatsapp.id);
  await whatsapp.update({ waba_webhook: webhookUrl });

  if (smsProvider === "twilio") {
    try {
      await configureTwilioPhoneWebhook(whatsapp);
    } catch (err: any) {
      logger.warn(
        `[SMS][Twilio] Webhook automático falhou: ${err.message}`
      );
    }
  } else {
    logger.info(`[SMS][Vonage] Webhook inbound: ${webhookUrl}`);
  }

  return whatsapp.reload();
}

const CreateSmsConnectionService = async ({
  name,
  companyId,
  provider = "vonage",
  accountSid,
  authToken,
  fromNumber,
  queueIds = [],
  greetingMessage = "",
  color = "",
  id
}: Request): Promise<Whatsapp> => {
  const smsProvider: SmsProviderId =
    provider === "twilio" ? "twilio" : "vonage";

  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    accountSid: Yup.string().required().min(4),
    fromNumber: Yup.string().required().min(3)
  });

  try {
    await schema.validate({ name, accountSid, fromNumber });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  if (!id && (!authToken || authToken.length < 4)) {
    throw new AppError("Informe API Secret / Auth Token.", 400);
  }

  const normalizedFrom = /^[a-zA-Z]/.test(fromNumber.trim())
    ? fromNumber.trim().slice(0, 11)
    : normalizeSmsNumber(fromNumber);

  if (id) {
    const existing = await Whatsapp.findOne({
      where: { id, companyId, channel: "sms" }
    });
    if (!existing) {
      throw new AppError("Conexão SMS não encontrada.", 404);
    }

    const tokenToSave =
      authToken && authToken.length > 0 ? authToken : existing.token;

    await existing.update({
      name,
      status: "CONNECTED",
      channel: "sms",
      provider: smsProvider,
      token: tokenToSave,
      facebookUserId: accountSid,
      number: normalizedFrom,
      phone_number: normalizedFrom,
      greetingMessage: greetingMessage || "",
      color: color || ""
    });

    await AssociateWhatsappQueue(existing, queueIds);
    return afterSaveConnection(existing, smsProvider);
  }

  const { whatsapp } = await CreateWhatsAppService({
    name,
    status: "CONNECTED",
    isDefault: false,
    companyId,
    channel: "sms",
    provider: smsProvider,
    token: authToken,
    facebookUserId: accountSid,
    number: normalizedFrom,
    phone_number: normalizedFrom,
    greetingMessage,
    color,
    queueIds,
    allowGroup: false
  });

  return afterSaveConnection(whatsapp, smsProvider);
};

export async function testSmsConnection({
  provider = "vonage",
  accountSid,
  authToken,
  fromNumber,
  testToNumber
}: {
  provider?: SmsProviderId;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  testToNumber?: string;
}): Promise<{ ok: boolean; message: string }> {
  const smsProvider: SmsProviderId =
    provider === "twilio" ? "twilio" : "vonage";

  const temp = {
    provider: smsProvider,
    facebookUserId: accountSid,
    token: authToken,
    number: fromNumber,
    phone_number: fromNumber
  } as Whatsapp;

  if (testToNumber) {
    await sendSmsMessage(
      temp,
      testToNumber,
      "Teste de conexão SMS - VBSolution"
    );
    return { ok: true, message: "SMS de teste enviado com sucesso." };
  }

  if (smsProvider === "vonage") {
    await validateVonageCredentials(accountSid, authToken);
    return { ok: true, message: "Credenciais Vonage válidas." };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
  const axios = (await import("axios")).default;
  await axios.get(url, {
    auth: { username: accountSid, password: authToken },
    timeout: 15000
  });
  return { ok: true, message: "Credenciais Twilio válidas." };
}

export default CreateSmsConnectionService;
