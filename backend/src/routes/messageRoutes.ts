/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

import * as MessageController from "../controllers/MessageController";

const messageRoutes = Router();

const upload = multer(uploadConfig);

messageRoutes.get("/messages/:ticketId", isAuth, MessageController.index);
messageRoutes.get("/messages/:messageId/media", isAuth, MessageController.showMedia);
messageRoutes.post("/messages/:ticketId", isAuth, upload.array("medias"), MessageController.store);
messageRoutes.post("/messages-template/:ticketId", isAuth, upload.array("medias"), MessageController.storeTemplate);
messageRoutes.post("/messages-interactive/:ticketId", isAuth, MessageController.storeInteractive);
messageRoutes.post("/message/transcribeAudio", isAuth, MessageController.transcribeAudioMessage);

// messageRoutes.post("/forwardmessage",isAuth,MessageController.forwardmessage);
messageRoutes.delete("/messages/:messageId", isAuth, MessageController.remove);
messageRoutes.post("/messages/edit/:messageId", isAuth, MessageController.edit);

messageRoutes.get("/messages-allMe", isAuth, MessageController.allMe);
messageRoutes.post('/message/forward', isAuth, MessageController.forwardMessage)

export default messageRoutes;
