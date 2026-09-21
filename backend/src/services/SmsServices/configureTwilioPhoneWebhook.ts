/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { buildSmsWebhookUrl, getTwilioCredentials } from "./smsCredentials";
import { normalizeSmsNumber } from "./normalizeSmsNumber";

/**
 * Configura webhook de SMS/MMS na Incoming Phone Number da Twilio.
 */
export async function configureTwilioPhoneWebhook(
  connection: Whatsapp
): Promise<void> {
  const { accountSid, authToken, fromNumber } = getTwilioCredentials(connection);
  const webhookUrl = buildSmsWebhookUrl(connection.companyId, connection.id);
  const from = normalizeSmsNumber(fromNumber);

  const listUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
  const { data: listData } = await axios.get(listUrl, {
    auth: { username: accountSid, password: authToken },
    params: { PhoneNumber: from },
    timeout: 20000
  });

  const phone = listData?.incoming_phone_numbers?.[0];
  if (!phone?.sid) {
    logger.warn(
      `[SMS] Número ${from} não encontrado na conta Twilio ${accountSid}. Configure o webhook manualmente: ${webhookUrl}`
    );
    await connection.update({ waba_webhook: webhookUrl });
    return;
  }

  const updateUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers/${phone.sid}.json`;
  const params = new URLSearchParams();
  params.append("SmsUrl", webhookUrl);
  params.append("SmsMethod", "POST");
  params.append("StatusCallback", webhookUrl);
  params.append("StatusCallbackMethod", "POST");

  await axios.post(updateUrl, params.toString(), {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000
  });

  await connection.update({ waba_webhook: webhookUrl, status: "CONNECTED" });
  logger.info(`[SMS] Webhook Twilio configurado: ${webhookUrl}`);
}
