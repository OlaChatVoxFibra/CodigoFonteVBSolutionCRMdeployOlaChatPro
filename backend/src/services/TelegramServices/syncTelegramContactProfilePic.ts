/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import path, { join } from "path";
import fs from "fs";
import axios from "axios";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";
import { getTelegramProfilePicDownload } from "./getTelegramProfilePicDownload";

interface Params {
  connection: Whatsapp;
  contact: Contact;
  chatId: string;
  userId?: number;
  isGroup?: boolean;
  gramJsEntity?: unknown;
  /** Telegram Oficial: tenta baixar em toda mensagem / refresh */
  force?: boolean;
}

export async function syncTelegramContactProfilePic(
  params: Params
): Promise<Contact> {
  const { connection, contact, chatId, userId, isGroup, gramJsEntity, force } =
    params;

  if (!force) {
    const rawPicture = contact.getDataValue("urlPicture");
    if (rawPicture && rawPicture !== "nopicture.png" && contact.pictureUpdated) {
      const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
      const filePath = join(
        publicFolder,
        `company${contact.companyId}`,
        "contacts",
        rawPicture
      );
      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
        return contact;
      }
    }
  }

  const download = await getTelegramProfilePicDownload({
    connection,
    chatId,
    userId,
    isGroup,
    gramJsEntity
  });

  if (!download?.url && !download?.buffer) {
    return contact;
  }

  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const folder = path.resolve(
    publicFolder,
    `company${contact.companyId}`,
    "contacts"
  );

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    fs.chmodSync(folder, 0o777);
  }

  const filename = `${contact.id}.jpeg`;
  const filePath = join(folder, filename);

  if (download.buffer) {
    fs.writeFileSync(filePath, download.buffer);
  } else if (download.url && !download.url.startsWith("file://")) {
    const response = await axios.get(download.url, {
      responseType: "arraybuffer",
      timeout: 20000
    });
    fs.writeFileSync(filePath, response.data);
  } else if (download.url?.startsWith("file://")) {
    const localPath = download.url.replace(/^file:\/\//i, "");
    if (fs.existsSync(localPath)) {
      fs.copyFileSync(localPath, filePath);
    } else {
      return contact;
    }
  } else {
    return contact;
  }

  const profilePicUrl =
    download.url && !download.url.startsWith("file://")
      ? download.url
      : contact.profilePicUrl;

  await contact.update({
    urlPicture: filename,
    profilePicUrl: profilePicUrl || contact.profilePicUrl,
    pictureUpdated: true
  });

  const reloaded = await contact.reload();

  try {
    const io = getIO();
    io.of(String(contact.companyId)).emit(
      `company-${contact.companyId}-contact`,
      {
        action: "update",
        contact: reloaded.get({ plain: true })
      }
    );
  } catch {
    /* socket opcional */
  }

  return reloaded;
}
