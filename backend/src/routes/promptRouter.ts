/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router } from "express";
import * as PromptController from "../controllers/PromptController";
import isAuth from "../middleware/isAuth";
import uploadAttendanceFlowMedia from "../middleware/uploadAttendanceFlowMedia";
import uploadPromptExtract from "../middleware/uploadPromptExtract";

const promptRoutes = Router();

promptRoutes.get("/prompt", isAuth, PromptController.index);

promptRoutes.post("/prompt", isAuth, PromptController.store);

promptRoutes.post(
  "/prompt/attendance-flow/upload",
  isAuth,
  uploadAttendanceFlowMedia,
  PromptController.uploadAttendanceFlowAttachment
);

promptRoutes.post(
  "/prompt/extract-document",
  isAuth,
  uploadPromptExtract,
  PromptController.extractDocumentText
);

promptRoutes.post("/prompt/composer-assist", isAuth, PromptController.composerAssist);

promptRoutes.get("/prompt/:promptId", isAuth, PromptController.show);

promptRoutes.get(
  "/prompt/:promptId/flow-understanding",
  isAuth,
  PromptController.showFlowUnderstanding
);

promptRoutes.get(
  "/prompt/:promptId/flow-timeline",
  isAuth,
  PromptController.showFlowTimeline
);

promptRoutes.get(
  "/prompt-action-presets",
  isAuth,
  PromptController.getAvailableActionPresets
);

promptRoutes.post(
  "/prompt/:promptId/smart-actions",
  isAuth,
  PromptController.createPromptSmartActionFromPreset
);

promptRoutes.get(
  "/prompt/:promptId/smart-actions",
  isAuth,
  PromptController.listPromptSmartActions
);

promptRoutes.patch(
  "/prompt/:promptId/smart-actions/:actionId",
  isAuth,
  PromptController.updatePromptSmartAction
);

promptRoutes.put("/prompt/:promptId", isAuth, PromptController.update);

promptRoutes.delete("/prompt/:promptId", isAuth, PromptController.remove);

export default promptRoutes;
