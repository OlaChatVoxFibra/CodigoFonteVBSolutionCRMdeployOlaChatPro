/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import { enforceConnectionQuota } from "../middleware/planQuota";
import * as TelegramController from "../controllers/TelegramController";
import * as TelegramWebhookController from "../controllers/TelegramWebhookController";

const telegramRoutes = express.Router();

telegramRoutes.post(
  "/telegram/connection",
  isAuth,
  enforceConnectionQuota,
  TelegramController.store
);
telegramRoutes.put("/telegram/connection", isAuth, TelegramController.store);
telegramRoutes.post("/telegram/test", isAuth, TelegramController.test);
telegramRoutes.get(
  "/telegram/connection/:id",
  isAuth,
  TelegramController.show
);
telegramRoutes.post(
  "/telegram/connection/:id/webhook",
  isAuth,
  TelegramController.configureWebhook
);
telegramRoutes.delete(
  "/telegram/:whatsappId",
  isAuth,
  TelegramController.remove
);

export const telegramWebhookRoutes = express.Router();
telegramWebhookRoutes.post(
  "/telegram/webhook/:companyId/:connectionId",
  TelegramWebhookController.webhook
);

export default telegramRoutes;
