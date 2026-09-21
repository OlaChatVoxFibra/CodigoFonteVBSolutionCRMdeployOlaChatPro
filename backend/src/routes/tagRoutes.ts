/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";

import * as TagController from "../controllers/TagController";

const tagRoutes = express.Router();

tagRoutes.get("/tags/list", isAuth, TagController.list);
tagRoutes.get("/tags", isAuth, TagController.index);
tagRoutes.get("/tags/:tagId", isAuth, TagController.show);
tagRoutes.get("/tag/kanban", isAuth, TagController.kanban);

tagRoutes.post("/tags", isAuth, TagController.uploadMiddleware, TagController.store);
tagRoutes.post("/tags/sync", isAuth, TagController.syncTags);

tagRoutes.put("/tags/:tagId", isAuth, TagController.uploadMiddleware, TagController.update);

tagRoutes.delete("/tags/:tagId", isAuth, TagController.remove);
tagRoutes.delete("/tags-contacts/:tagId/:contactId", isAuth, TagController.removeContactTag);

export default tagRoutes;
