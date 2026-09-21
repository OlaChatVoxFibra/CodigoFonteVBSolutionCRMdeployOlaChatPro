/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";

import * as CampaignSettingController from "../controllers/CampaignSettingController";
import multer from "multer";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const routes = express.Router();

routes.get("/campaign-settings", isAuth, CampaignSettingController.index);

routes.post("/campaign-settings", isAuth, CampaignSettingController.store);
// routes.put("/campaign-settings/:id", isAuth, CampaignSettingController.update);


export default routes;
