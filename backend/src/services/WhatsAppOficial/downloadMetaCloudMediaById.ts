/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import { getMetaAccessToken, sanitizeMetaToken } from "./metaWhatsAppAuth";

export interface DownloadedMetaCloudMedia {
  buffer: Buffer;
  mimeType: string;
  fileSize?: number;
}

/**
 * Baixa mídia inbound via media_id (Graph API Cloud).
 */
export const downloadMetaCloudMediaById = async (
  whatsapp: Whatsapp,
  mediaId: string
): Promise<DownloadedMetaCloudMedia> => {
  const token = sanitizeMetaToken(getMetaAccessToken(whatsapp));
  if (!token || !mediaId) {
    throw new Error("Token ou media_id ausente para download Meta.");
  }

  const metaUrl = `https://graph.facebook.com/v21.0/${mediaId}`;
  const { data: meta } = await axios.get(metaUrl, {
    headers: { Authorization: `Bearer ${token}` },
    params: { fields: "url,mime_type,file_size" },
    timeout: 30000
  });

  const downloadUrl = meta?.url;
  if (!downloadUrl) {
    throw new Error("Meta não retornou URL de download da mídia.");
  }

  const response = await axios.get(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: 100 * 1024 * 1024
  });

  return {
    buffer: Buffer.from(response.data),
    mimeType: meta?.mime_type || "application/octet-stream",
    fileSize: meta?.file_size
  };
};
