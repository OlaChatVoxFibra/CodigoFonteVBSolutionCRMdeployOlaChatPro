/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as AnnouncementController from "../controllers/AnnouncementController";
import multer from "multer";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const announcementRoutes = express.Router();
announcementRoutes.get("/announcements/for-company", isAuth, AnnouncementController.getAnnouncementsForCompany);
announcementRoutes.get("/announcements/list", isAuth, AnnouncementController.findList);
announcementRoutes.get("/announcements", isAuth, AnnouncementController.index);
announcementRoutes.get("/announcements/:id", isAuth, AnnouncementController.show);
announcementRoutes.post("/announcements", isAuth, AnnouncementController.store);
announcementRoutes.put("/announcements/:id", isAuth,  upload.array("file"), AnnouncementController.update);
announcementRoutes.delete("/announcements/:id", isAuth, AnnouncementController.remove);
announcementRoutes.post("/announcements/:id/media-upload", isAuth, upload.array("file"), AnnouncementController.mediaUpload);
announcementRoutes.delete("/announcements/:id/media-upload", isAuth, AnnouncementController.deleteMedia);
announcementRoutes.post("/announcements/:id/ack", isAuth, AnnouncementController.acknowledge);
announcementRoutes.delete("/announcements/:id/ack", isAuth, AnnouncementController.unacknowledge);

export default announcementRoutes;
