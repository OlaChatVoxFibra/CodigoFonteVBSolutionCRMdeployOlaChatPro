/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import { proto } from "baileys";
import { Session } from "../../../libs/wbot";
import Ticket from "../../../models/Ticket";
import Contact from "../../../models/Contact";
import { verifyMessage } from "../../../services/WbotServices/wbotMessageListener";
import logger from "../../../utils/logger";
import { GeminiParsedImage } from "../utils/parseGeminiResponse";
import { saveGeminiImageBase64 } from "../utils/geminiMediaFiles";
import { resolveReplyJid } from "../../../services/WbotServices/getJidOf";

export async function sendGeminiImagesToWhatsapp(params: {
  wbot: Session;
  msg: proto.IWebMessageInfo;
  ticket: Ticket;
  contact: Contact;
  ticketTraking?: unknown;
  companyId: number;
  images: GeminiParsedImage[];
  caption?: string;
}): Promise<number> {
  if (!params.images?.length) return 0;
  let sent = 0;
  const subfolder = `gemini-agent/ticket-${params.ticket.id}`;

  for (const img of params.images.slice(0, 3)) {
    try {
      const saved = saveGeminiImageBase64({
        companyId: params.companyId,
        subfolder,
        base64: img.data,
        mimeType: img.mimeType,
        prefix: "out"
      });
      const buffer = fs.readFileSync(saved.absolutePath);
      const sentMessage = await params.wbot.sendMessage(
        resolveReplyJid(params.msg, params.contact),
        {
        image: buffer,
        caption: sent === 0 && params.caption ? params.caption.slice(0, 900) : undefined
      }
      );      await verifyMessage(
        sentMessage!,
        params.ticket,
        params.contact,
        params.ticketTraking as any,
        true,
        false,
        true
      );
      sent += 1;
    } catch (e) {
      logger.warn(
        `[GEMINI-WA] falha ao enviar imagem ticket=${params.ticket.id}: ${(e as Error)?.message || e}`
      );
    }
  }
  return sent;
}
