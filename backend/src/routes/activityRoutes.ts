/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as ActivityController from "../controllers/ActivityController";

const routes = express.Router();

routes.get("/activities", isAuth, ActivityController.index);
routes.get("/activities/:id", isAuth, ActivityController.show);
routes.post("/activities", isAuth, ActivityController.store);
routes.put("/activities/:id", isAuth, ActivityController.update);
routes.delete("/activities/:id", isAuth, ActivityController.remove);

export default routes;

