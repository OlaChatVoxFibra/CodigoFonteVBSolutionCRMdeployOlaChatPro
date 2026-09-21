/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import { handleTelegramInbound } from "../services/TelegramServices/telegramInboundListener";

export const webhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, connectionId } = req.params;

  try {
    const connection = await Whatsapp.findOne({
      where: {
        id: connectionId,
        companyId,
        channel: "telegram"
      }
    });

    if (!connection) {
      logger.warn(
        `[TELEGRAM] Webhook conexão inexistente company=${companyId} id=${connectionId}`
      );
      return res.status(200).json({ ok: true });
    }

    const secret = connection.send_token?.trim();
    if (secret) {
      const headerSecret = String(
        req.headers["x-telegram-bot-api-secret-token"] || ""
      );
      if (headerSecret !== secret) {
        logger.warn(
          `[TELEGRAM] Secret token inválido connection=${connectionId} — mensagem ignorada. Reconfigure o webhook em Conexões.`
        );
        return res.status(403).json({ ok: false });
      }
    }

    const update = req.body;
    if (update && typeof update === "object") {
      logger.info(
        `[TELEGRAM] Webhook inbound connection=${connectionId} update_id=${update.update_id ?? "?"}`
      );
      await handleTelegramInbound(connection, update);
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    logger.error(`[TELEGRAM] Erro no webhook: ${err.message}`);
    return res.status(200).json({ ok: true });
  }
};
