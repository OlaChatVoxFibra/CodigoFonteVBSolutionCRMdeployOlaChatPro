/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import { enforceConnectionQuota } from "../middleware/planQuota";
import * as TelegramUserController from "../controllers/TelegramUserController";

const telegramUserRoutes = express.Router();

telegramUserRoutes.post(
  "/telegram-user/connection",
  isAuth,
  enforceConnectionQuota,
  TelegramUserController.store
);
telegramUserRoutes.put("/telegram-user/connection", isAuth, TelegramUserController.store);
telegramUserRoutes.get(
  "/telegram-user/connection/:id",
  isAuth,
  TelegramUserController.show
);
telegramUserRoutes.post(
  "/telegram-user/connection/:id/send-code",
  isAuth,
  TelegramUserController.sendCode
);
telegramUserRoutes.post(
  "/telegram-user/connection/:id/sign-in",
  isAuth,
  TelegramUserController.signIn
);
telegramUserRoutes.post(
  "/telegram-user/connection/:id/reconnect",
  isAuth,
  TelegramUserController.reconnect
);
telegramUserRoutes.delete(
  "/telegram-user/:whatsappId",
  isAuth,
  TelegramUserController.remove
);

export default telegramUserRoutes;
