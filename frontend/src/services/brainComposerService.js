/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

export async function listBrainDriveFiles(query = "") {
  const { data } = await api.get("/ai-brain/google-drive/files", {
    params: query ? { q: query } : {},
  });
  return data;
}

export async function downloadBrainDriveFile(fileId) {
  const { data } = await api.get(`/ai-brain/google-drive/files/${fileId}/download`);
  return data;
}

export async function learnBrainFromUrl(url) {
  const { data } = await api.post("/ai-brain/learn-url", { url });
  return data;
}

export function driveFileToBrowserFile(payload) {
  if (!payload?.name) return null;
  if (payload.contentBase64) {
    const binary = atob(payload.contentBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: payload.mimeType || "application/octet-stream" });
    return new File([blob], payload.name, { type: payload.mimeType || "application/octet-stream" });
  }
  if (payload.textContent != null) {
    const mime = payload.mimeType || "text/plain";
    const blob = new Blob([payload.textContent], { type: mime });
    return new File([blob], payload.name, { type: mime });
  }
  return null;
}
