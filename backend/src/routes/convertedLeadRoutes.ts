/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as ConvertedLeadController from "../controllers/ConvertedLeadController";

const routes = express.Router();

routes.get("/converted-leads", isAuth, ConvertedLeadController.index);
routes.get("/converted-leads/:id", isAuth, ConvertedLeadController.show);
routes.post("/converted-leads", isAuth, ConvertedLeadController.store);
routes.put("/converted-leads/:id", isAuth, ConvertedLeadController.update);
routes.delete("/converted-leads/:id", isAuth, ConvertedLeadController.remove);

export default routes;
