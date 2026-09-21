/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as PresetWebhookController from "../controllers/PresetWebhookController";

const presetWebhookRoutes = express.Router();

presetWebhookRoutes.get("/preset-webhooks", isAuth, PresetWebhookController.list);
presetWebhookRoutes.get("/preset-webhooks/:id", isAuth, PresetWebhookController.show);
presetWebhookRoutes.post("/preset-webhooks", isAuth, PresetWebhookController.create);
presetWebhookRoutes.put("/preset-webhooks/:id", isAuth, PresetWebhookController.update);
presetWebhookRoutes.delete("/preset-webhooks/:id", isAuth, PresetWebhookController.remove);

export default presetWebhookRoutes;