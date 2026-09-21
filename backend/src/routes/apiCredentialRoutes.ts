/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ApiCredentialController from "../controllers/ApiCredentialController";

const apiCredentialRoutes = Router();

apiCredentialRoutes.get(
  "/platform-api-credentials",
  isAuth,
  ApiCredentialController.index
);

apiCredentialRoutes.get(
  "/platform-api-credentials/config",
  isAuth,
  ApiCredentialController.config
);

apiCredentialRoutes.post(
  "/platform-api-credentials",
  isAuth,
  ApiCredentialController.store
);

apiCredentialRoutes.delete(
  "/platform-api-credentials/:id",
  isAuth,
  ApiCredentialController.remove
);

apiCredentialRoutes.get(
  "/platform-api-credentials/:id/reveal",
  isAuth,
  ApiCredentialController.reveal
);

export default apiCredentialRoutes;
