/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import formatBody from "../../helpers/Mustache";
import { callTelegramApi } from "./telegramApi";

export interface SendTelegramResult {
  messageId: string;
  chatId: string;
  body: string;
}

export function getBotToken(connection: Whatsapp): string {
  const token = (connection.token || "").trim();
  if (!token) {
    throw new AppError("Conexão Telegram sem Bot Token.", 400);
  }
  return token;
}

export function resolveTelegramChatId(contactNumber: string): string {
  const raw = String(contactNumber || "").trim();
  if (!raw) {
    throw new AppError("Contato sem Chat ID do Telegram.", 400);
  }
  if (raw.includes("@telegram")) {
    return raw.replace(/@telegram$/i, "").trim();
  }
  return raw.replace(/\D/g, "") || raw;
}

export async function sendTelegramMessage(
  connection: Whatsapp,
  chatIdRaw: string,
  body: string,
  ticket?: Ticket
): Promise<SendTelegramResult> {
  const token = getBotToken(connection);
  const chatId = resolveTelegramChatId(chatIdRaw);
  const text = ticket ? formatBody(body, ticket) : body;

  if (!text?.trim()) {
    throw new AppError("Mensagem vazia.", 400);
  }

  const result = await callTelegramApi<{ message_id: number }>(token, "sendMessage", {
    chat_id: chatId,
    text: text.slice(0, 4096)
  });

  return {
    messageId: String(result.message_id),
    chatId: String(chatId),
    body: text
  };
}
