/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../../../middleware/isAuth";
import * as C from "../controllers/GeminiIntegrationController";

const r = express.Router();

r.get("/gemini/integration", isAuth, C.showIntegration);
r.put("/gemini/integration", isAuth, C.updateIntegration);
r.post("/gemini/test", isAuth, C.postTest);
r.post("/gemini/multimodal-test", isAuth, C.postMultimodalTest);

export default r;
