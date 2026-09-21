/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import multer from "multer";
import uploadConfig from "../config/upload";
import * as EmailTemplateController from "../controllers/EmailTemplateController";

const routes = express.Router();

const ensureEmailTemplateFolder = (req: any, _res: any, next: any) => {
  try {
    if (!req.body) req.body = {};
    req.body.typeArch = "emailTemplates";
    req.body.userId = req.params?.id;
  } catch {}
  next();
};

routes.get("/email/templates", isAuth, EmailTemplateController.index);
routes.post("/email/templates", isAuth, EmailTemplateController.store);
routes.put("/email/templates/:id", isAuth, EmailTemplateController.update);
routes.delete("/email/templates/:id", isAuth, EmailTemplateController.remove);
routes.get("/email/templates/:id/attachments", isAuth, EmailTemplateController.listAttachments);
routes.delete("/email/templates/:id/attachments/:attachmentId", isAuth, EmailTemplateController.removeAttachment);

const upload = multer(uploadConfig);
routes.post("/email/templates/:id/attachments", isAuth, ensureEmailTemplateFolder, upload.array("files"), EmailTemplateController.uploadAttachments);
routes.post("/email/templates/:id/signature-image", isAuth, ensureEmailTemplateFolder, upload.array("file"), EmailTemplateController.uploadSignatureImage);
routes.delete("/email/templates/:id/signature-image", isAuth, EmailTemplateController.clearSignatureImage);
routes.get("/email/templates/:id/signature-image/view", isAuth, EmailTemplateController.viewSignatureImage);
// Rota pública para preview da assinatura (não requer Authorization header)
routes.get("/email/templates/:id/signature-image/public", EmailTemplateController.viewSignatureImagePublic);

export default routes;
