/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";

import * as MessageController from "../../controllers/api/MessageController";
import isAuthCompany from "../../middleware/isAuthCompany";

const apiMessageRoutes = express.Router();

apiMessageRoutes.get("/messagesRange", isAuthCompany, MessageController.show);

export default apiMessageRoutes;