/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import formatBody from "../../helpers/Mustache";
import { getActiveTelegramUserClient } from "./telegramUserClientManager";
import { getTelegramUserCredentials } from "./telegramUserCredentials";

export interface SendTelegramUserResult {
  messageId: string;
  chatId: string;
  body: string;
}

export function resolveTelegramUserChatId(contactNumber: string): string {
  const raw = String(contactNumber || "").trim();
  if (!raw) {
    throw new AppError("Contato sem identificador Telegram.", 400);
  }
  if (raw.includes("@telegram_user")) {
    return raw.replace(/@telegram_user$/i, "").trim();
  }
  if (raw.includes("@telegram")) {
    return raw.replace(/@telegram$/i, "").trim();
  }
  return raw.replace(/\D/g, "") || raw;
}

export async function sendTelegramUserMessage(
  connection: Whatsapp,
  chatIdRaw: string,
  body: string,
  ticket?: Ticket
): Promise<SendTelegramUserResult> {
  const client = getActiveTelegramUserClient(connection.id);
  if (!client) {
    getTelegramUserCredentials(connection);
    throw new AppError(
      "Sessão Telegram Oficial inativa. Reabra Conexões e conecte novamente.",
      400
    );
  }

  const text = ticket ? formatBody(body, ticket) : body;
  const chatId = resolveTelegramUserChatId(chatIdRaw);

  const sent = await client.sendMessage(chatId, { message: text });
  const messageId = String(sent?.id || Date.now());

  return {
    messageId: `${connection.id}_${messageId}`,
    chatId,
    body: text
  };
}
