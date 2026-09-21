/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../../../middleware/isAuth";
import * as C from "../controllers/GrokIntegrationController";

const r = express.Router();

r.get("/grok/integration", isAuth, C.showIntegration);
r.put("/grok/integration", isAuth, C.updateIntegration);
r.post("/grok/test", isAuth, C.postTest);

export default r;
