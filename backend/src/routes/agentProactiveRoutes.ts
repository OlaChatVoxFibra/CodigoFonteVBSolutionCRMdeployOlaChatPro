/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import uploadAgentProactiveMedia from "../middleware/uploadAgentProactiveMedia";
import * as AgentProactiveController from "../controllers/AgentProactiveController";

const agentProactiveRoutes = express.Router();

agentProactiveRoutes.post(
  "/agent-proactive/cold-outreach",
  isAuth,
  AgentProactiveController.postColdOutreach
);

agentProactiveRoutes.post(
  "/agent-proactive/upload-media",
  isAuth,
  uploadAgentProactiveMedia,
  AgentProactiveController.postUploadProactiveMedia
);

export default agentProactiveRoutes;
