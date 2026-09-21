/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";

import isAuth from "../middleware/isAuth";
import * as UserController from "../controllers/UserController";
import multer from "multer";
import uploadConfig from "../config/upload";
import { enforceUserQuota } from "../middleware/planQuota";

const upload = multer(uploadConfig);

const userRoutes = Router();

userRoutes.get("/users", isAuth, UserController.index);

userRoutes.get("/users/list", isAuth, UserController.list);

userRoutes.post("/users", isAuth, enforceUserQuota, UserController.store);

userRoutes.put("/users/:userId", isAuth, UserController.update);

userRoutes.get("/users/:userId", isAuth, UserController.show);

userRoutes.delete("/users/:userId", isAuth, UserController.remove);

userRoutes.post(
  "/users/:userId/media-upload",
  isAuth,
  upload.array("profileImage"),
  UserController.mediaUpload
);

userRoutes.put(
  "/users/toggleChangeWidht/:userId",
  isAuth,
  UserController.toggleChangeWidht
);

userRoutes.put(
  "/users/:userId/online",
  isAuth,
  UserController.updateOnlineStatus
);

userRoutes.get("/users/online", isAuth, UserController.getOnlineUsers);

export default userRoutes;
