/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import {
  buildTelegramWebhookUrl,
  callTelegramApi,
  shouldUseTelegramPolling
} from "./telegramApi";
import { getBotToken } from "./sendTelegramMessage";
import {
  ensureTelegramPollingReady,
  restartTelegramPolling,
  stopTelegramPolling
} from "./telegramPollingService";

export type TelegramDeliveryMode = "webhook" | "polling";

export type TryConfigureTelegramWebhookResult = {
  connection: Whatsapp;
  configured: boolean;
  deliveryMode?: TelegramDeliveryMode;
  syncedUpdates?: number;
  botLabel?: string;
  error?: string;
};

export async function tryConfigureTelegramWebhook(
  connection: Whatsapp
): Promise<TryConfigureTelegramWebhookResult> {
  const webhookUrl = buildTelegramWebhookUrl(
    connection.companyId,
    connection.id
  );

  if (shouldUseTelegramPolling()) {
    const botLabel =
      connection.number ||
      connection.name ||
      "seu bot no Telegram";
    try {
      const syncedUpdates = await restartTelegramPolling(connection);
      await connection.update({
        status: "CONNECTED",
        waba_webhook: webhookUrl
      });
      return {
        connection: await connection.reload(),
        configured: true,
        deliveryMode: "polling",
        syncedUpdates,
        botLabel
      };
    } catch (err: any) {
      const message = err?.message || String(err);
      logger.warn(`[TELEGRAM] polling: ${message}`);
      await connection.update({
        status: "CONNECTED",
        waba_webhook: webhookUrl
      });
      return {
        connection: await connection.reload(),
        configured: false,
        deliveryMode: "polling",
        botLabel,
        error: message
      };
    }
  }

  try {
    const updated = await configureTelegramWebhook(connection);
    stopTelegramPolling(connection.id);
    return {
      connection: updated,
      configured: true,
      deliveryMode: "webhook"
    };
  } catch (err: any) {
    const message = err?.message || String(err);
    logger.warn(`[TELEGRAM] setWebhook: ${message}`);
    await connection.update({
      status: "CONNECTED",
      waba_webhook: webhookUrl
    });
    return {
      connection: await connection.reload(),
      configured: false,
      deliveryMode: "webhook",
      error: message
    };
  }
}

export async function configureTelegramWebhook(
  connection: Whatsapp
): Promise<Whatsapp> {
  const token = getBotToken(connection);
  const webhookUrl = buildTelegramWebhookUrl(
    connection.companyId,
    connection.id
  );

  const secret =
    connection.send_token?.trim() ||
    `vbs-${connection.companyId}-${connection.id}`;

  await callTelegramApi(token, "setWebhook", {
    url: webhookUrl,
    allowed_updates: [
      "message",
      "edited_message",
      "callback_query"
    ],
    drop_pending_updates: false,
    secret_token: secret
  });

  await connection.update({
    waba_webhook: webhookUrl,
    send_token: secret,
    status: "CONNECTED"
  });

  logger.info(`[TELEGRAM] Webhook configurado: ${webhookUrl}`);
  return connection.reload();
}

export async function removeTelegramWebhook(connection: Whatsapp): Promise<void> {
  try {
    const token = getBotToken(connection);
    await callTelegramApi(token, "deleteWebhook", { drop_pending_updates: false });
  } catch (err: any) {
    logger.warn(`[TELEGRAM] deleteWebhook: ${err.message}`);
  }
}
