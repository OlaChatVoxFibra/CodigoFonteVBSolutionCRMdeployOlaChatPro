/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../../../middleware/isAuth";
import * as C from "../controllers/AnthropicIntegrationController";

const r = express.Router();

r.get("/anthropic/connection-agent-options", isAuth, C.connectionAgentOptions);
r.get("/anthropic/integration", isAuth, C.showIntegration);
r.put("/anthropic/integration", isAuth, C.updateIntegration);
r.post("/anthropic/test", isAuth, C.postTest);
r.get("/anthropic/multi-agents", isAuth, C.indexMultiAgents);
r.post("/anthropic/multi-agents/test", isAuth, C.postMultiAgentTest);
r.post("/anthropic/multi-agents", isAuth, C.createMultiAgentCtl);
r.get("/anthropic/multi-agents/:id", isAuth, C.showMultiAgentCtl);
r.patch("/anthropic/multi-agents/:id", isAuth, C.patchMultiAgentCtl);
r.delete("/anthropic/multi-agents/:id", isAuth, C.removeMultiAgentCtl);
r.get("/anthropic/multi-agents/:id/smart-actions", isAuth, C.listAnthropicSmartActions);
r.post("/anthropic/multi-agents/:id/smart-actions", isAuth, C.createAnthropicSmartAction);
r.patch(
  "/anthropic/multi-agents/:id/smart-actions/:actionId",
  isAuth,
  C.patchAnthropicSmartAction
);

export default r;
