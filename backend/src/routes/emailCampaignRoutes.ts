/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as EmailCampaignController from "../controllers/EmailCampaignController";

const routes = express.Router();

routes.get("/email/campaigns", isAuth, EmailCampaignController.index);
routes.post("/email/campaigns", isAuth, EmailCampaignController.store);
routes.put("/email/campaigns/:id", isAuth, EmailCampaignController.update);
routes.delete("/email/campaigns/:id", isAuth, EmailCampaignController.remove);
routes.post("/email/campaigns/:id/schedule", isAuth, EmailCampaignController.scheduleContacts);

export default routes;

