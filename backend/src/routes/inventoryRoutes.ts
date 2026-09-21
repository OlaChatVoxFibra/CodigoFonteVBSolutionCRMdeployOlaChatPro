/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as InventoryController from "../controllers/InventoryController";
import multer from "multer";
import uploadConfig from "../config/upload";

const routes = express.Router();
const upload = multer(uploadConfig);

routes.get("/inventory", isAuth, InventoryController.index);
routes.put("/inventory/bulk-reply-settings", isAuth, InventoryController.bulkReplySettings);
routes.get("/inventory/:id", isAuth, InventoryController.show);
routes.post("/inventory", isAuth, InventoryController.store);
routes.put("/inventory/:id", isAuth, InventoryController.update);
routes.delete("/inventory/:id", isAuth, InventoryController.remove);
routes.post("/inventory/import", isAuth, upload.single("file"), InventoryController.importFile);

export default routes;
