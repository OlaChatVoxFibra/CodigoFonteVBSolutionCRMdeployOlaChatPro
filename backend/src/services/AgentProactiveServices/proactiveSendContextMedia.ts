/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Message from "../../models/Message";
import logger from "../../utils/logger";
import { AgentProactiveSettings, ProactiveContextType } from "../../types/agentProactiveSettings";
import { getBulkDelayMs, sleep } from "./agentProactiveEnv";
import { sendImage, sendDocument, sendVideo } from "../AgentMedia/AgentMediaSender";

const TEXT_ONLY_MEDIA_TYPES = new Set([
  "",
  "conversation",
  "extendedTextMessage",
  "text",
  "reactionMessage"
]);

async function hadRecentOutboundMedia(ticketId: number, hours = 48): Promise<boolean> {
  const since = new Date(Date.now() - hours * 3600000);
  const rows = await Message.findAll({
    where: {
      ticketId,
      fromMe: true,
      createdAt: { [Op.gte]: since }
    },
    attributes: ["mediaType"],
    limit: 40,
    order: [["createdAt", "DESC"]]
  });
  return rows.some(r => {
    const t = (r.mediaType || "").toLowerCase();
    if (!t) return false;
    return !TEXT_ONLY_MEDIA_TYPES.has(t);
  });
}

export async function sendProactiveContextMediaAfterText(
  contactId: number,
  context: ProactiveContextType,
  settings: AgentProactiveSettings,
  ticketId?: number
): Promise<void> {
  const pack = settings.mediaByContext?.[context];
  if (!pack) return;

  const mediaCount =
    (pack.imageUrls?.filter(Boolean).length || 0) +
    (pack.documentUrls?.filter(Boolean).length || 0) +
    (pack.videoUrls?.filter(Boolean).length || 0);
  if (mediaCount === 0) return;

  const pauseSec = Math.max(0, Math.min(180, Number(pack.delayAfterTextSec) || 0));
  if (pauseSec > 0) {
    await sleep(pauseSec * 1000);
  }

  if (pack.skipIfRecentOutboundMedia && ticketId) {
    const skip = await hadRecentOutboundMedia(ticketId);
    if (skip) {
      logger.info(
        `[PROACTIVE-MEDIA] Pulando anexos ctx=${context} ticket=${ticketId} (mídia outbound recente)`
      );
      return;
    }
  }

  const delayMs = Math.max(800, Math.floor(getBulkDelayMs() / 2));

  for (const url of pack.imageUrls || []) {
    if (!url?.trim()) continue;
    try {
      await sendImage(contactId, url.trim());
    } catch (e) {
      logger.error(`[PROACTIVE-MEDIA] Falha imagem contact=${contactId} ctx=${context}:`, e);
    }
    await sleep(delayMs);
  }

  for (const url of pack.documentUrls || []) {
    if (!url?.trim()) continue;
    try {
      await sendDocument(contactId, url.trim());
    } catch (e) {
      logger.error(`[PROACTIVE-MEDIA] Falha documento contact=${contactId} ctx=${context}:`, e);
    }
    await sleep(delayMs);
  }

  for (const url of pack.videoUrls || []) {
    if (!url?.trim()) continue;
    try {
      await sendVideo(contactId, url.trim());
    } catch (e) {
      logger.error(`[PROACTIVE-MEDIA] Falha vídeo contact=${contactId} ctx=${context}:`, e);
    }
    await sleep(delayMs);
  }
}
