/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import multer from "multer";
import uploadConfig from "../config/upload";
import * as AiBrainController from "../controllers/AiBrainController";
import * as BrainCreditsController from "../controllers/BrainCreditsController";

const upload = multer(uploadConfig);
const aiBrainRoutes = express.Router();

aiBrainRoutes.get("/ai-brain/credits", isAuth, BrainCreditsController.creditsStatus);
aiBrainRoutes.post("/ai-brain/credits/confirm-payment", isAuth, BrainCreditsController.confirmPayment);
aiBrainRoutes.get("/ai-brain/credits/plans", isAuth, BrainCreditsController.creditsPlans);
aiBrainRoutes.get("/ai-brain/credits/logs/platform", isAuth, BrainCreditsController.tokenLogsPlatform);
aiBrainRoutes.get("/ai-brain/credits/logs", isAuth, BrainCreditsController.tokenLogs);
aiBrainRoutes.post("/ai-brain/chat", isAuth, upload.array("medias"), AiBrainController.chat);
aiBrainRoutes.post(
  "/ai-brain/transcribe-audio",
  isAuth,
  upload.single("audio"),
  AiBrainController.transcribeAudio
);
aiBrainRoutes.post("/ai-brain/synthesize-speech", isAuth, AiBrainController.synthesizeSpeech);
aiBrainRoutes.get("/ai-brain/conversations", isAuth, AiBrainController.index);
aiBrainRoutes.get("/ai-brain/conversations/:id", isAuth, AiBrainController.show);
aiBrainRoutes.delete("/ai-brain/conversations/:id", isAuth, AiBrainController.remove);
aiBrainRoutes.put("/ai-brain/conversations/:id", isAuth, AiBrainController.rename);
aiBrainRoutes.get("/ai-brain/code-terminal/info", isAuth, AiBrainController.codeTerminalInfo);
aiBrainRoutes.post("/ai-brain/code-workspace/sync", isAuth, AiBrainController.codeWorkspaceSync);
aiBrainRoutes.post("/ai-brain/code-terminal/exec", isAuth, AiBrainController.codeTerminalExec);
aiBrainRoutes.post("/ai-brain/code-github/publish", isAuth, AiBrainController.codeGithubPublish);
aiBrainRoutes.get("/ai-brain/projects", isAuth, AiBrainController.listProjects);
aiBrainRoutes.post("/ai-brain/projects/ensure", isAuth, AiBrainController.ensureProject);
aiBrainRoutes.post("/ai-brain/projects", isAuth, AiBrainController.createProject);
aiBrainRoutes.get("/ai-brain/projects/:id", isAuth, AiBrainController.showProject);
aiBrainRoutes.put("/ai-brain/projects/:id", isAuth, AiBrainController.updateProjectMeta);
aiBrainRoutes.put("/ai-brain/projects/:id/code", isAuth, AiBrainController.saveProjectCode);
aiBrainRoutes.get(
  "/ai-brain/projects/:id/code-workspaces",
  isAuth,
  AiBrainController.listProjectCodeWorkspaces
);
aiBrainRoutes.post(
  "/ai-brain/projects/:id/code-workspaces",
  isAuth,
  AiBrainController.createProjectCodeWorkspace
);
aiBrainRoutes.get(
  "/ai-brain/projects/:id/code-workspaces/:workspaceId",
  isAuth,
  AiBrainController.showProjectCodeWorkspace
);
aiBrainRoutes.put(
  "/ai-brain/projects/:id/code-workspaces/:workspaceId",
  isAuth,
  AiBrainController.saveProjectCodeWorkspace
);
aiBrainRoutes.delete(
  "/ai-brain/projects/:id/code-workspaces/:workspaceId",
  isAuth,
  AiBrainController.removeProjectCodeWorkspace
);
aiBrainRoutes.delete("/ai-brain/projects/:id", isAuth, AiBrainController.removeProject);
aiBrainRoutes.get(
  "/ai-brain/google-drive/files",
  isAuth,
  AiBrainController.listGoogleDriveFiles
);
aiBrainRoutes.get(
  "/ai-brain/google-drive/files/:fileId/download",
  isAuth,
  AiBrainController.downloadGoogleDriveFile
);
aiBrainRoutes.post("/ai-brain/learn-url", isAuth, AiBrainController.learnFromUrl);

export default aiBrainRoutes;
