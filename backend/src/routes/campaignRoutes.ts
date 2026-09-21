/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";

import * as CampaignController from "../controllers/CampaignController";
import multer from "multer";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const routes = express.Router();
routes.get("/campaigns/:id/recurrence-preview", isAuth, CampaignController.previewRecurrence);
routes.post("/campaigns/:id/stop-recurrence", isAuth, CampaignController.stopRecurrence);
routes.post("/campaigns/:id/send-now", isAuth, CampaignController.sendNow);
routes.get("/campaigns/list", isAuth, CampaignController.findList);
routes.get("/campaigns/metrics", isAuth, CampaignController.metrics);
routes.get("/campaigns", isAuth, CampaignController.index);
routes.get("/campaigns/:id", isAuth, CampaignController.show);
routes.get("/campaigns/:id/recipients-count", isAuth, CampaignController.getRecipientsCount);
routes.get("/campaigns/:id/shipping", isAuth, CampaignController.getShipping);
routes.get("/campaigns/:id/stats", isAuth, CampaignController.getStats);
routes.post("/campaigns", isAuth, CampaignController.store);
routes.put("/campaigns/:id", isAuth, CampaignController.update);
routes.delete("/campaigns/:id", isAuth, CampaignController.remove);
routes.post("/campaigns/:id/cancel", isAuth, CampaignController.cancel);
routes.post("/campaigns/:id/restart", isAuth, CampaignController.restart);
routes.post("/campaigns/:id/media-upload", isAuth, upload.array("file"), CampaignController.mediaUpload);
routes.delete("/campaigns/:id/media-upload", isAuth, CampaignController.deleteMedia);

export default routes;
