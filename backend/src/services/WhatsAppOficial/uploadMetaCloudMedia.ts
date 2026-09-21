/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import FormData from "form-data";
import axios from "axios";
import Whatsapp from "../../models/Whatsapp";
import { getMetaAccessToken } from "./metaWhatsAppAuth";

export interface UploadedMetaMedia {
  id: string;
}

/**
 * Upload de mídia para a Graph API (Cloud API direta).
 */
export const uploadMetaCloudMedia = async (
  whatsapp: Whatsapp,
  filePath: string,
  mimeType: string
): Promise<UploadedMetaMedia> => {
  const token = getMetaAccessToken(whatsapp);
  const phoneNumberId = whatsapp.phone_number_id;

  if (!token || !phoneNumberId) {
    throw new Error("Token ou phone_number_id ausente na conexão oficial.");
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", fs.createReadStream(filePath), {
    contentType: mimeType
  });

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/media`;
  const response = await axios.post(url, form, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders()
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });

  const mediaId = response.data?.id;
  if (!mediaId) {
    throw new Error("Meta não retornou id de mídia.");
  }

  return { id: mediaId };
};
