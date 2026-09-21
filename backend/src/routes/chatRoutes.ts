/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import multer from "multer";
const upload = multer(uploadConfig);

import * as ChatController from "../controllers/ChatController";

const routes = express.Router();

routes.get("/chats", isAuth, ChatController.index);
routes.get("/chats/:id", isAuth, ChatController.show);
routes.get("/chats/:id/messages", isAuth, ChatController.messages);
routes.post(
  "/chats/:id/messages",
  isAuth,
  upload.array("medias"),
  ChatController.saveMessage
);
routes.post("/chats/:id/read", isAuth, ChatController.checkAsRead);
routes.post("/chats", isAuth, ChatController.store);
routes.put("/chats/:id", isAuth, ChatController.update);
routes.delete("/chats/:id", isAuth, ChatController.remove);

// Middleware para upload de imagem de grupo
const setGroupImageUploadType = (req: any, res: any, next: any) => {
  req.body.typeArch = "groups";
  next();
};

// Rota para upload de imagem de grupo
routes.post(
  "/chats/upload",
  isAuth,
  setGroupImageUploadType,
  upload.single("file"),
  ChatController.uploadGroupImage
);

routes.put("/chats/messages/:messageId", isAuth, ChatController.editMessage);

routes.delete(
  "/chats/messages/:messageId",
  isAuth,
  ChatController.deleteMessage
);

routes.post(
  "/chats/messages/:messageId/forward",
  isAuth,
  ChatController.forwardMessage
);

export default routes;
