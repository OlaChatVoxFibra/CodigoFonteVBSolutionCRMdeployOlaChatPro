/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import { enforceConnectionQuota } from "../middleware/planQuota";

import * as WhatsAppController from "../controllers/WhatsAppController";

import multer from "multer";
import uploadConfig from "../config/upload";
import { mediaUpload } from "../services/WhatsappService/uploadMediaAttachment";
import { deleteMedia } from "../services/WhatsappService/uploadMediaAttachment";

const upload = multer(uploadConfig);


const whatsappRoutes = express.Router();

whatsappRoutes.get("/whatsapp/", isAuth, WhatsAppController.index);
whatsappRoutes.get("/whatsapp/filter", isAuth, WhatsAppController.indexFilter);
whatsappRoutes.get("/whatsapp/all", isAuth, WhatsAppController.listAll);
whatsappRoutes.get("/whatsapp/sync-templates/:whatsappId", isAuth, WhatsAppController.syncTemplatesOficial);
whatsappRoutes.get("/whatsapp/:whatsappId/meta-health", isAuth, WhatsAppController.metaHealth);
whatsappRoutes.post("/whatsapp/:whatsappId/repair-oficial", isAuth, WhatsAppController.repairOficial);

whatsappRoutes.post("/whatsapp/", isAuth, enforceConnectionQuota, WhatsAppController.store);
whatsappRoutes.get("/whatsapp/embedded-signup/config", isAuth, WhatsAppController.getEmbeddedSignupConfig);
whatsappRoutes.put("/whatsapp/embedded-signup/config", isAuth, WhatsAppController.updateEmbeddedSignupConfig);
whatsappRoutes.post(
  "/whatsapp/embedded-signup",
  isAuth,
  enforceConnectionQuota,
  WhatsAppController.completeEmbeddedSignup
);
whatsappRoutes.post("/facebook/", isAuth, enforceConnectionQuota, WhatsAppController.storeFacebook);
whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, WhatsAppController.show);
whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, WhatsAppController.update);
whatsappRoutes.delete("/whatsapp/:whatsappId", isAuth, WhatsAppController.remove);
whatsappRoutes.post("/closedimported/:whatsappId", isAuth, WhatsAppController.closedTickets);

//restart
whatsappRoutes.post("/whatsapp-restart/", isAuth, WhatsAppController.restart);
whatsappRoutes.post("/whatsapp/:whatsappId/media-upload", isAuth, upload.array("file"), mediaUpload);

whatsappRoutes.delete("/whatsapp/:whatsappId/media-upload", isAuth, deleteMedia);


whatsappRoutes.delete("/whatsapp-admin/:whatsappId", isAuth, WhatsAppController.removeAdmin);

whatsappRoutes.put("/whatsapp-admin/:whatsappId", isAuth, WhatsAppController.updateAdmin);

whatsappRoutes.get("/whatsapp-admin/:whatsappId", isAuth, WhatsAppController.showAdmin);

export default whatsappRoutes;
