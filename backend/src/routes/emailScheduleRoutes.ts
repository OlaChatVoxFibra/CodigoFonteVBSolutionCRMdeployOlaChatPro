/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as EmailScheduleController from "../controllers/EmailScheduleController";

const routes = express.Router();

routes.get("/email/schedules", isAuth, EmailScheduleController.index);
routes.post("/email/schedules/:id/cancel", isAuth, EmailScheduleController.cancel);
routes.post("/email/schedules/cancel-all", isAuth, EmailScheduleController.cancelAll);

export default routes;
