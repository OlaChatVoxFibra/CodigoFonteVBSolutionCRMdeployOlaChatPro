/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";
import isAuth from "../middleware/isAuth";
import LeadPipelineController from "../controllers/LeadPipelineController";

const leadPipelineRoutes = Router();

leadPipelineRoutes.get("/lead-pipelines", isAuth, LeadPipelineController.list);
leadPipelineRoutes.put("/lead-pipelines/bulk", isAuth, LeadPipelineController.bulkSave);
/** Alguns ambientes/proxies tratam PUT de forma inconsistente; o front usa POST por padrão */
leadPipelineRoutes.post("/lead-pipelines/bulk", isAuth, LeadPipelineController.bulkSave);

export default leadPipelineRoutes;
