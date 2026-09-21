/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";
import { webhook as caktoWebhook } from "../controllers/CaktoPaymentsController";

const router = Router();

router.post("/webhook", caktoWebhook);

export default router;
