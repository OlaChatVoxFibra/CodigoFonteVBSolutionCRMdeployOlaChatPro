/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";

import * as VerssionController from "../controllers/VersionController";

const versionRouter = Router();

versionRouter.get("/version", VerssionController.index);
versionRouter.post("/version", VerssionController.store);

export default versionRouter;
