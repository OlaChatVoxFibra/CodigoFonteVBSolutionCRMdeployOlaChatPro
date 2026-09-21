/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as SmtpConfigController from "../controllers/SmtpConfigController";

const routes = express.Router();

routes.get("/smtp-configs", isAuth, SmtpConfigController.index);
routes.get("/smtp-configs/relay-settings", isAuth, SmtpConfigController.getRelaySettings);
routes.put("/smtp-configs/relay-settings", isAuth, SmtpConfigController.putRelaySettings);
routes.post("/smtp-configs", isAuth, SmtpConfigController.store);
routes.post("/smtp-configs/verify", isAuth, SmtpConfigController.verifyConnection);
routes.put("/smtp-configs/:id", isAuth, SmtpConfigController.update);
routes.delete("/smtp-configs/:id", isAuth, SmtpConfigController.remove);
routes.post("/smtp-configs/:id/default", isAuth, SmtpConfigController.setDefault);

export default routes;

