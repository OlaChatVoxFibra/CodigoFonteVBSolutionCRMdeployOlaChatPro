/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export type GeminiParsedImage = {
  mimeType: string;
  data: string;
};

export type GeminiParsedResponse = {
  text: string;
  images: GeminiParsedImage[];
};

function collectParts(payload: any): any[] {
  const candidates = payload?.candidates || payload?.response?.candidates || [];
  const parts: any[] = [];
  for (const c of candidates) {
    const p = c?.content?.parts;
    if (Array.isArray(p)) parts.push(...p);
  }
  if (Array.isArray(payload?.parts)) parts.push(...payload.parts);
  return parts;
}

/** Extrai texto e imagens inline da resposta Gemini (SDK ou REST). */
export function parseGeminiResponsePayload(payload: any): GeminiParsedResponse {
  const parts = collectParts(payload);
  const textChunks: string[] = [];
  const images: GeminiParsedImage[] = [];

  for (const part of parts) {
    if (typeof part?.text === "string" && part.text.trim()) {
      textChunks.push(part.text.trim());
    }
    const inline = part?.inlineData || part?.inline_data;
    if (inline?.data) {
      images.push({
        mimeType: String(inline.mimeType || inline.mime_type || "image/png"),
        data: String(inline.data)
      });
    }
  }

  return {
    text: textChunks.join("\n\n").trim(),
    images
  };
}
