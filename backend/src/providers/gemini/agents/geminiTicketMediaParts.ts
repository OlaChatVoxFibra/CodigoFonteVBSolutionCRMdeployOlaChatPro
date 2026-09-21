/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Part } from "@google/generative-ai";
import Message from "../../../models/Message";
import {
  readFileAsInlinePart,
  resolveRelativeMediaPath
} from "../utils/geminiMediaFiles";

const IMAGE_TYPES = new Set(["image", "sticker"]);
const AUDIO_TYPES = new Set(["audio", "ptt"]);
const VIDEO_TYPES = new Set(["video"]);

/**
 * Carrega mídia da última mensagem inbound do ticket para o turno Gemini (visão/áudio/vídeo).
 */
export async function loadGeminiInboundMediaParts(params: {
  companyId: number;
  ticketId: number;
  userText: string;
}): Promise<Part[]> {
  const lastInbound = await Message.findOne({
    where: { ticketId: params.ticketId, fromMe: false },
    order: [["createdAt", "DESC"]],
    attributes: ["id", "mediaType", "mediaUrl", "body"]
  });
  if (!lastInbound) return [];

  const mediaType = String(lastInbound.mediaType || "").toLowerCase();
  const rel = lastInbound.getDataValue("mediaUrl") as string | null;
  if (!rel) return [];

  const full = resolveRelativeMediaPath(params.companyId, rel);
  if (!full) return [];

  if (
    !IMAGE_TYPES.has(mediaType) &&
    !AUDIO_TYPES.has(mediaType) &&
    !VIDEO_TYPES.has(mediaType)
  ) {
    return [];
  }

  const part = readFileAsInlinePart(full);
  if (!part) return [];

  const hint =
    IMAGE_TYPES.has(mediaType)
      ? "O cliente enviou uma imagem. Analise e responda em português do Brasil."
      : AUDIO_TYPES.has(mediaType)
        ? "O cliente enviou um áudio (use a mídia se o modelo suportar)."
        : "O cliente enviou um vídeo.";

  return [part, { text: `${hint}\n\nMensagem: ${params.userText || lastInbound.body || ""}` }];
}
