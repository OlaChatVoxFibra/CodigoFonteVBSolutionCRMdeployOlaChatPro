/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";
import * as WebHooksController from "../controllers/WebHookController";
import * as MetaController from "../controllers/MetaController";

const metaRoutes = Router();

// URL única recomendada no painel Meta (resolve conexão pelo phone_number_id)
metaRoutes.get("/webhook/waba", WebHooksController.index as any);
metaRoutes.post("/webhook/waba", WebHooksController.webHook as any);

// URL por conexão (ex.: /v1/webhook/1/228)
metaRoutes.get(
  "/webhook/:companyId/:connectionId",
  MetaController.verify as any
);
metaRoutes.post(
  "/webhook/:companyId/:connectionId",
  WebHooksController.webHook as any
);

export default metaRoutes;
