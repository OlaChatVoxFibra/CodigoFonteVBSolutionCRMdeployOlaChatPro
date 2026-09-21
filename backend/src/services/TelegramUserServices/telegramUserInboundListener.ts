/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { extractTelegramMessageBody } from "../TelegramServices/extractTelegramMessageBody";
import {
  handleTelegramInbound,
  TelegramInboundOptions
} from "../TelegramServices/telegramInboundListener";
import { resolveGramJsProfileEntity } from "./resolveGramJsProfileEntity";

/** Adapta update GramJS para o pipeline existente do Bot API. */
export async function handleTelegramUserGramJsUpdate(
  connection: Whatsapp,
  update: {
    update_id?: number;
    message?: Record<string, unknown>;
    edited_message?: Record<string, unknown>;
  },
  options?: TelegramInboundOptions
): Promise<void> {
  await handleTelegramInbound(connection, update as any, options);
}

export function gramJsMessageToUpdate(
  message: any,
  updateId: number
): {
  update_id: number;
  message?: Record<string, unknown>;
} {
  const rawText = String(message?.message || message?.text || "");
  const text =
    extractTelegramMessageBody({
      text: rawText,
      caption: message?.caption,
      sticker: message?.sticker,
      photo: message?.photo,
      document: message?.document,
      voice: message?.voice,
      video: message?.video
    }) || "";

  const fromId = message?.senderId?.toString?.() || "";
  const chatId = message?.chatId?.toString?.() || fromId;

  const fromUser = message?.sender
    ? {
        id: Number(message.sender.id) || 0,
        first_name: message.sender.firstName || message.sender.username,
        last_name: message.sender.lastName,
        username: message.sender.username
      }
    : { id: Number(fromId) || 0, first_name: "Telegram" };

  return {
    update_id: updateId,
    message: {
      message_id: Number(message?.id) || updateId,
      from: fromUser,
      chat: {
        id: chatId,
        type: message?.isGroup ? "group" : "private",
        title: message?.chat?.title,
        first_name: message?.chat?.firstName
      },
      text: text.startsWith("[") ? undefined : text,
      caption: message?.message && text !== message?.message ? text : undefined,
      sticker: message?.sticker ? {} : undefined,
      photo: message?.photo ? [{}] : undefined,
      document: message?.document
        ? { file_name: message.document?.fileName }
        : undefined,
      voice: message?.voice ? {} : undefined,
      video: message?.video ? {} : undefined
    }
  };
}

export async function processGramJsNewMessage(
  connection: Whatsapp,
  event: { message: any },
  updateCounter: { value: number }
): Promise<void> {
  const message = event?.message;
  if (!message || message.out) return;

  updateCounter.value += 1;
  const payload = gramJsMessageToUpdate(message, updateCounter.value);
  const gramJsEntity = resolveGramJsProfileEntity(message);

  try {
    await handleTelegramUserGramJsUpdate(connection, payload, { gramJsEntity });
  } catch (err: any) {
    logger.warn(
      `[TELEGRAM_USER] Erro ao processar inbound connection=${connection.id}: ${err?.message || err}`
    );
  }
}
