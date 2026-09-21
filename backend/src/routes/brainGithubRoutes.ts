/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import express from "express";
import isAuth from "../middleware/isAuth";
import * as BrainGithubController from "../controllers/BrainGithubController";

const brainGithubRoutes = express.Router();

brainGithubRoutes.get(
  "/ai-brain/github/oauth/status",
  isAuth,
  BrainGithubController.oauthStatus
);
brainGithubRoutes.get(
  "/ai-brain/github/oauth/authorize",
  isAuth,
  BrainGithubController.authorize
);
brainGithubRoutes.get(
  "/ai-brain/github/connection",
  isAuth,
  BrainGithubController.connectionStatus
);
brainGithubRoutes.get(
  "/ai-brain/github/repos",
  isAuth,
  BrainGithubController.listRepos
);
brainGithubRoutes.delete(
  "/ai-brain/github/connection",
  isAuth,
  BrainGithubController.disconnect
);

export const githubOAuthCallbackRoutes = express.Router();
githubOAuthCallbackRoutes.get(
  "/github/oauth/callback",
  BrainGithubController.callback
);

export default brainGithubRoutes;
