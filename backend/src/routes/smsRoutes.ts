/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import { enforceConnectionQuota } from "../middleware/planQuota";
import * as SmsController from "../controllers/SmsController";
import * as SmsWebhookController from "../controllers/SmsWebhookController";

const smsRoutes = express.Router();

smsRoutes.post("/sms/connection", isAuth, enforceConnectionQuota, SmsController.store);
smsRoutes.put("/sms/connection", isAuth, SmsController.store);
smsRoutes.post("/sms/test", isAuth, SmsController.test);
smsRoutes.get("/sms/connection/:id", isAuth, SmsController.show);
smsRoutes.delete("/sms/:whatsappId", isAuth, SmsController.remove);

export const smsWebhookRoutes = express.Router();
smsWebhookRoutes.post(
  "/sms/webhook/:companyId/:connectionId",
  SmsWebhookController.webhook
);

export default smsRoutes;
