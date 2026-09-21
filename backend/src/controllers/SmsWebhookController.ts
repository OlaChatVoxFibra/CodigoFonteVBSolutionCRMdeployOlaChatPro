/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import { handleSmsInbound } from "../services/SmsServices/smsInboundListener";
import { getSmsProvider } from "../services/SmsServices/smsCredentials";

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
        channel: "sms"
      }
    });

    if (!connection) {
      logger.warn(
        `[SMS] Webhook conexão inexistente company=${companyId} id=${connectionId}`
      );
      return res.status(200).send("");
    }

    const payload = {
      ...(req.query || {}),
      ...(req.body || {})
    } as Record<string, unknown>;

    await handleSmsInbound(connection, payload);

    if (getSmsProvider(connection) === "twilio") {
      return res.status(200).type("text/xml").send("<Response></Response>");
    }

    return res.status(200).send("");
  } catch (err: any) {
    logger.error(`[SMS] Erro no webhook: ${err.message}`);
    return res.status(200).send("");
  }
};
