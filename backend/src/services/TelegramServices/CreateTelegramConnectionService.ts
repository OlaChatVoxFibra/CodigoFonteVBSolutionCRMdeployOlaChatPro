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
import { tryConfigureTelegramWebhook } from "./configureTelegramWebhook";
import { buildTelegramWebhookUrl, getTelegramBotInfo } from "./telegramApi";
import { sendTelegramMessage } from "./sendTelegramMessage";
interface Request {
  name: string;
  companyId: number;
  botToken: string;
  queueIds?: number[];
  greetingMessage?: string;
  color?: string;
  id?: number;
  webhookSecret?: string;
  promptId?: number | null;
  agentDisabled?: boolean;
}

export type TelegramConnectionSaveResult = {
  whatsapp: Whatsapp;
  webhookConfigured: boolean;
  webhookError?: string;
};

const CreateTelegramConnectionService = async ({
  name,
  companyId,
  botToken,
  queueIds = [],
  greetingMessage = "",
  color = "",
  id,
  webhookSecret,
  promptId,
  agentDisabled
}: Request): Promise<TelegramConnectionSaveResult> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2)
  });

  try {
    await schema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  if (id) {
    const existing = await Whatsapp.findOne({
      where: { id, companyId, channel: "telegram" }
    });
    if (!existing) {
      throw new AppError("Conexão Telegram não encontrada.", 404);
    }

    const tokenToSave =
      botToken && botToken.length > 0 ? botToken.trim() : existing.token;

    if (!tokenToSave || tokenToSave.length < 20) {
      throw new AppError("Bot Token inválido.", 400);
    }

    const bot = await getTelegramBotInfo(tokenToSave);
    const botLabel = bot.username
      ? `@${bot.username}`
      : bot.first_name || String(bot.id);

    await existing.update({
      name,
      status: "CONNECTED",
      channel: "telegram",
      provider: "telegram",
      token: tokenToSave,
      facebookUserId: String(bot.id),
      phone_number_id: String(bot.id),
      number: botLabel,
      phone_number: botLabel,
      greetingMessage: greetingMessage || "",
      color: color || "",
      ...(webhookSecret ? { send_token: webhookSecret } : {}),
      ...(promptId !== undefined ? { promptId: promptId ?? null } : {}),
      ...(agentDisabled !== undefined ? { agentDisabled } : {})
    });

    await AssociateWhatsappQueue(existing, queueIds);
    const webhook = await tryConfigureTelegramWebhook(await existing.reload());
    return {
      whatsapp: webhook.connection,
      webhookConfigured: webhook.configured,
      webhookError: webhook.error
    };
  }

  if (!botToken || botToken.trim().length < 20) {
    throw new AppError("Informe o Bot Token do Telegram.", 400);
  }

  const bot = await getTelegramBotInfo(botToken.trim());
  const botLabel = bot.username
    ? `@${bot.username}`
    : bot.first_name || String(bot.id);

  const { whatsapp } = await CreateWhatsAppService({
    name,
    status: "CONNECTED",
    isDefault: false,
    companyId,
    channel: "telegram",
    provider: "telegram",
    token: botToken.trim(),
    facebookUserId: String(bot.id),
    phone_number_id: String(bot.id),
    number: botLabel,
    phone_number: botLabel,
    greetingMessage,
    color,
    queueIds,
    allowGroup: true,
    send_token: webhookSecret || undefined,
    promptId: promptId ?? undefined,
    agentDisabled: agentDisabled ?? false
  });

  const webhook = await tryConfigureTelegramWebhook(whatsapp);
  return {
    whatsapp: webhook.connection,
    webhookConfigured: webhook.configured,
    webhookError: webhook.error
  };
};

export async function testTelegramConnection({
  botToken,
  testChatId
}: {
  botToken: string;
  testChatId?: string;
}): Promise<{ ok: boolean; message: string; botUsername?: string }> {
  const bot = await getTelegramBotInfo(botToken.trim());
  const username = bot.username ? `@${bot.username}` : undefined;

  if (testChatId) {
    const temp = {
      channel: "telegram",
      provider: "telegram",
      token: botToken.trim(),
      number: username || String(bot.id)
    } as Whatsapp;

    await sendTelegramMessage(
      temp,
      testChatId,
      "Teste de conexão Telegram - VBSolution"
    );
    return {
      ok: true,
      message: "Mensagem de teste enviada.",
      botUsername: username
    };
  }

  return {
    ok: true,
    message: `Bot válido: ${username || bot.first_name || bot.id}`,
    botUsername: username
  };
}

export default CreateTelegramConnectionService;
