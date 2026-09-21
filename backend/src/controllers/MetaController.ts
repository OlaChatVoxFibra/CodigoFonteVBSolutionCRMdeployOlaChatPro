/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import logger from "../utils/logger";
import { processWhatsAppOficialWebhookPayload } from "../services/WhatsAppOficial/ProcessWhatsAppOficialWebhook";

export const verify = async (req: Request, res: Response): Promise<Response> => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const { connectionId } = req.params;

  const verifyTokenFromEnv = process.env.VERIFY_TOKEN;
  const legacyTokens = ["vbsolution", "vbsolution", "vbsolution-token-bypass"].filter(Boolean);
  const allowedTokens = [verifyTokenFromEnv, ...legacyTokens].filter(
    (t) => typeof t === "string" && t.length > 0
  );

  if (mode === "subscribe" && allowedTokens.includes(String(token))) {
    return res.status(200).send(challenge);
  }

  const whatsapp = await Whatsapp.findByPk(connectionId);
  if (mode === "subscribe" && whatsapp && token === whatsapp.token) {
    return res.status(200).send(challenge);
  }

  logger.warn(
    `[WABA Webhook] Falha na verificação connection=${connectionId} token=${token}`
  );
  return res.status(403).json({ message: "Forbidden" });
};

const parseRouteId = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Webhook WABA — sempre responde 200 para a Meta não parar de enviar eventos. */
export const handleMessage = async (req: Request, res: Response): Promise<Response> => {
  const body = req.body;
  const companyId = parseRouteId(req.params.companyId);
  const connectionId = parseRouteId(req.params.connectionId);

  logger.info(
    `[WABA Webhook] POST company=${companyId ?? "auto"} connection=${connectionId ?? "auto"} object=${body?.object}`
  );

  res.status(200).send("EVENT_RECEIVED");

  processWhatsAppOficialWebhookPayload({
    companyId,
    connectionId,
    body
  }).catch(error => {
    logger.error(`[WABA Webhook] Erro ao processar payload: ${error}`);
  });

  return res;
};
