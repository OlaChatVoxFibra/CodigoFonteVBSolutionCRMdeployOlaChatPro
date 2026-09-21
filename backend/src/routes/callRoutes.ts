/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";

import * as CallController from "../controllers/CallController";

const callRoutes = express.Router();

callRoutes.get("/historical", isAuth, CallController.getHistoric)
callRoutes.post("/historical/wavoip", isAuth, CallController.createCallHistoric);
callRoutes.get("/historical/user/whatsapp", isAuth, CallController.getWhatsappUserId);

export default callRoutes;

