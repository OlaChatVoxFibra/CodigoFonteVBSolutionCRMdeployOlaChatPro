/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import { Api, TelegramClient } from "telegram";
import { EntityLike } from "telegram/define";
import Whatsapp from "../../models/Whatsapp";
import logger from "../../utils/logger";
import { callTelegramApi } from "./telegramApi";
import { getBotToken } from "./sendTelegramMessage";
import { getActiveTelegramUserClient } from "../TelegramUserServices/telegramUserClientManager";

function asEntityLike(entity: unknown): EntityLike {
  return entity as EntityLike;
}

export interface TelegramProfilePicDownload {
  url?: string;
  buffer?: Buffer;
}

export interface TelegramProfilePicParams {
  connection: Whatsapp;
  chatId: string;
  userId?: number;
  isGroup?: boolean;
  /** Entidade GramJS da mensagem (sender/chat) — evita falha de accessHash */
  gramJsEntity?: unknown;
}

async function getTelegramBotProfilePicDownload(
  params: TelegramProfilePicParams
): Promise<TelegramProfilePicDownload | null> {
  const token = getBotToken(params.connection);
  const chatId = params.chatId;
  let fileId: string | undefined;

  try {
    if (params.isGroup) {
      const chat = await callTelegramApi<{
        photo?: { small_file_id?: string; big_file_id?: string };
      }>(token, "getChat", { chat_id: chatId });
      fileId = chat?.photo?.big_file_id || chat?.photo?.small_file_id;
    } else {
      const userId = params.userId ?? Number(chatId);
      if (!userId || Number.isNaN(userId)) return null;
      const photos = await callTelegramApi<{
        photos?: Array<Array<{ file_id: string }>>;
      }>(token, "getUserProfilePhotos", { user_id: userId, limit: 1 });
      const sizes = photos?.photos?.[0];
      fileId = sizes?.length ? sizes[sizes.length - 1]?.file_id : undefined;
    }

    if (!fileId) return null;

    const file = await callTelegramApi<{ file_path?: string }>(token, "getFile", {
      file_id: fileId
    });
    if (!file?.file_path) return null;

    return {
      url: `https://api.telegram.org/file/bot${token}/${file.file_path}`
    };
  } catch (err: any) {
    logger.warn(
      `[TELEGRAM] Bot API foto de perfil: ${err?.message || err}`
    );
    return null;
  }
}

async function resolveGramJsEntity(
  client: TelegramClient,
  params: TelegramProfilePicParams
): Promise<unknown | null> {
  if (params.gramJsEntity) {
    return params.gramJsEntity;
  }

  const ids = new Set<number>();
  const push = (v: unknown) => {
    const n = Number(v);
    if (!Number.isNaN(n) && n !== 0) ids.add(n);
  };
  push(params.userId);
  push(params.chatId);

  for (const id of ids) {
    try {
      return await client.getInputEntity(id);
    } catch {
      /* próximo */
    }
  }

  try {
    return await client.getEntity(params.chatId);
  } catch {
    try {
      return await client.getEntity(Number(params.chatId));
    } catch {
      return null;
    }
  }
}

async function downloadProfilePhotoBuffer(
  client: TelegramClient,
  entity: EntityLike
): Promise<Buffer | null> {
  for (const isBig of [false, true]) {
    try {
      const downloaded = await client.downloadProfilePhoto(entity, { isBig });
      if (Buffer.isBuffer(downloaded) && downloaded.length > 0) {
        return downloaded;
      }
      if (typeof downloaded === "string" && downloaded) {
        if (fs.existsSync(downloaded)) {
          return fs.readFileSync(downloaded);
        }
      }
    } catch {
      /* tenta tamanho maior */
    }
  }
  return null;
}

async function downloadViaGetFullUser(
  client: TelegramClient,
  entity: EntityLike
): Promise<Buffer | null> {
  try {
    const inputUser = await client.getInputEntity(entity);
    const result = await client.invoke(
      new Api.users.GetFullUser({
        id: inputUser as unknown as Api.TypeInputUser
      })
    );
    const photo = result?.fullUser?.profilePhoto;
    const photoClass = (photo as { className?: string })?.className || "";
    if (!photo || photoClass === "UserProfilePhotoEmpty") {
      return null;
    }
    return downloadProfilePhotoBuffer(client, entity);
  } catch {
    return null;
  }
}

async function getTelegramUserProfilePicDownload(
  params: TelegramProfilePicParams
): Promise<TelegramProfilePicDownload | null> {
  const client = getActiveTelegramUserClient(params.connection.id);
  if (!client) {
    logger.warn(
      `[TELEGRAM_USER] Sessão inativa (connection=${params.connection.id}) — foto não baixada`
    );
    return null;
  }

  try {
    const resolved = await resolveGramJsEntity(client, params);
    if (!resolved) {
      logger.warn(
        `[TELEGRAM_USER] Peer não resolvido chatId=${params.chatId} userId=${params.userId}`
      );
      return null;
    }

    const entity = asEntityLike(resolved);
    let buffer = await downloadProfilePhotoBuffer(client, entity);
    if (!buffer && !params.isGroup) {
      buffer = await downloadViaGetFullUser(client, entity);
    }

    if (buffer) {
      return { buffer };
    }

    return null;
  } catch (err: any) {
    logger.warn(
      `[TELEGRAM_USER] foto perfil chatId=${params.chatId}: ${err?.message || err}`
    );
    return null;
  }
}

export async function getTelegramProfilePicDownload(
  params: TelegramProfilePicParams
): Promise<TelegramProfilePicDownload | null> {
  if (params.connection.channel === "telegram_oficial") {
    return getTelegramUserProfilePicDownload(params);
  }
  if (params.connection.channel === "telegram") {
    return getTelegramBotProfilePicDownload(params);
  }
  return null;
}
