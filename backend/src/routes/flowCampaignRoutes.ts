/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import multer from "multer";
import uploadConfig from "../config/uploadExt";

import * as FlowCampaignController from "../controllers/FlowCampaignController";


const flowCampaignRoutes = express.Router();

flowCampaignRoutes.post("/flowcampaign", isAuth, FlowCampaignController.createFlowCampaign);

flowCampaignRoutes.get("/flowcampaign", isAuth, FlowCampaignController.flowCampaigns);

flowCampaignRoutes.get("/flowcampaign/:idFlow", isAuth, FlowCampaignController.flowCampaign);

flowCampaignRoutes.put("/flowcampaign", isAuth, FlowCampaignController.updateFlowCampaign);

flowCampaignRoutes.delete("/flowcampaign/:idFlow", isAuth, FlowCampaignController.deleteFlowCampaign);

export default flowCampaignRoutes;
