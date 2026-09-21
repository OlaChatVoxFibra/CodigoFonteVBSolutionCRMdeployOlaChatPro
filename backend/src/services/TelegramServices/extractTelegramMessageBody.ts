/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

interface TelegramMessageLike {
  text?: string;
  caption?: string;
  sticker?: unknown;
  photo?: unknown[];
  document?: { file_name?: string };
  voice?: unknown;
  video?: unknown;
  contact?: unknown;
  location?: unknown;
}

/** Texto exibido no ticket quando a mensagem não traz body (evita ignorar inbound). */
export function extractTelegramMessageBody(
  msg: TelegramMessageLike | null | undefined
): string {
  if (!msg) return "";
  const text = (msg.text || msg.caption || "").trim();
  if (text) return text;
  if (msg.sticker) return "[Sticker]";
  if (msg.photo?.length) return "[Foto]";
  if (msg.document) return `[Arquivo: ${msg.document.file_name || "documento"}]`;
  if (msg.voice) return "[Áudio]";
  if (msg.video) return "[Vídeo]";
  if (msg.contact) return "[Contato compartilhado]";
  if (msg.location) return "[Localização]";
  return "[Mensagem Telegram]";
}
