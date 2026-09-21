/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";
import isAuth from "../middleware/isAuth";
import { enforceIntegrationQuota } from "../middleware/planQuota";

import * as QueueIntegrationController from "../controllers/QueueIntegrationController";

const queueIntegrationRoutes = Router();

queueIntegrationRoutes.get("/queueIntegration", isAuth, QueueIntegrationController.index);

queueIntegrationRoutes.post("/queueIntegration", isAuth, enforceIntegrationQuota, QueueIntegrationController.store);

queueIntegrationRoutes.get("/queueIntegration/:integrationId", isAuth, QueueIntegrationController.show);

queueIntegrationRoutes.put("/queueIntegration/:integrationId", isAuth, QueueIntegrationController.update);

queueIntegrationRoutes.delete("/queueIntegration/:integrationId", isAuth, QueueIntegrationController.remove);

queueIntegrationRoutes.post("/queueIntegration/testsession", isAuth, QueueIntegrationController.testSession);

export default queueIntegrationRoutes;
