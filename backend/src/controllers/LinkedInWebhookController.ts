/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import { handleLinkedInInbound } from "../services/LinkedInServices/linkedinInboundListener";

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
        channel: "linkedin"
      }
    });

    if (!connection) {
      logger.warn(
        `[LINKEDIN] Webhook conexão inexistente company=${companyId} id=${connectionId}`
      );
      return res.status(200).json({ ok: true });
    }

    const secret = connection.send_token?.trim();
    if (secret) {
      const headerSecret = String(
        req.headers["x-linkedin-webhook-secret"] ||
          req.headers["x-hub-signature"] ||
          req.query.secret ||
          ""
      );
      if (headerSecret && headerSecret !== secret) {
        logger.warn(
          `[LINKEDIN] Secret inválido connection=${connectionId} — mensagem ignorada.`
        );
        return res.status(403).json({ ok: false });
      }
    }

    const payload = req.body;
    if (payload && typeof payload === "object") {
      logger.info(
        `[LINKEDIN] Webhook inbound connection=${connectionId}`
      );
      await handleLinkedInInbound(connection, payload);
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    logger.error(`[LINKEDIN] Erro no webhook: ${err.message}`);
    return res.status(200).json({ ok: true });
  }
};
