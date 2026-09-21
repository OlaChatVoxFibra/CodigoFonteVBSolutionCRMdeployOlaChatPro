/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import User from "../models/User";
import AppError from "../errors/AppError";
import { GithubIntegrationStatus } from "../models/GithubIntegration";
import {
  clearGithubIntegration,
  getGithubIntegrationPublic,
  listOrgGithubRepos,
  saveGithubIntegration,
  testGithubIntegration
} from "../services/GithubServices/GithubIntegrationService";
import {
  buildGithubAuthorizeUrl
} from "../services/GithubServices/githubOAuthService";
import { getGithubOAuthClientConfig } from "../services/GithubServices/githubOAuthConfig";
import {
  getAllowedGithubOAuthRedirectUris,
  resolveGithubOAuthRedirectUri,
  resolveGithubOAuthRedirectUriForRequest,
  resolveGithubOAuthFrontendUrl
} from "../services/GithubServices/githubOAuthConfig";
import { pickValidRedirectOrigin, sanitizeAppBaseUrl } from "../utils/appUrlUtils";

async function assertAdmin(req: Request) {
  const authUser = await User.findByPk(req.user.id);
  if (!authUser) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }
  if (authUser.profile !== "admin" && !authUser.super) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
}

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = await getGithubIntegrationPublic(companyId);
  return res.status(200).json(data);
};

export const create = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const data = await saveGithubIntegration({
    workspaceId: companyId,
    pat: b.pat != null ? String(b.pat) : undefined,
    enableBrainAi: b.enableBrainAi !== false,
    enablePublish: b.enablePublish !== false,
    enableReposRead: b.enableReposRead !== false,
    status: "disconnected"
  });
  return res.status(201).json(data);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const data = await saveGithubIntegration({
    workspaceId: companyId,
    pat: b.pat !== undefined ? String(b.pat) : undefined,
    enableBrainAi:
      b.enableBrainAi !== undefined ? Boolean(b.enableBrainAi) : undefined,
    enablePublish:
      b.enablePublish !== undefined ? Boolean(b.enablePublish) : undefined,
    enableReposRead:
      b.enableReposRead !== undefined ? Boolean(b.enableReposRead) : undefined,
    status: b.status ? (String(b.status) as GithubIntegrationStatus) : undefined
  });
  return res.status(200).json(data);
};

export const postTest = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const result = await testGithubIntegration({
    workspaceId: companyId,
    patOverride: b.pat != null ? String(b.pat) : undefined
  });
  if (!result.ok) {
    return res.status(422).json(result);
  }
  return res.status(200).json(result);
};

export const destroy = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const data = await clearGithubIntegration(companyId);
  return res.status(200).json(data);
};

export const listRepos = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const items = await listOrgGithubRepos(companyId);
  return res.json({ items });
};

export const oauthMeta = async (_req: Request, res: Response): Promise<Response> => {
  let configured = false;
  try {
    getGithubOAuthClientConfig();
    configured = true;
  } catch {
    configured = false;
  }
  return res.json({
    configured,
    redirectUris: getAllowedGithubOAuthRedirectUris(),
    defaultRedirectUri: resolveGithubOAuthRedirectUri(),
    defaultFrontendUrl: resolveGithubOAuthFrontendUrl()
  });
};

export const orgAuthorize = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId, id: userId } = req.user;
  const backendUrl = sanitizeAppBaseUrl(
    String(req.query.backendUrl || req.body?.backendUrl || "").trim()
  );
  const frontendUrl = pickValidRedirectOrigin(
    String(req.query.frontendUrl || req.body?.frontendUrl || "").trim() ||
      String(req.headers.origin || "").trim() ||
      undefined
  );
  const redirectUri = resolveGithubOAuthRedirectUriForRequest(backendUrl);

  const url = buildGithubAuthorizeUrl({
    companyId,
    userId: Number(userId),
    mode: "org",
    redirectUri,
    frontendUrl
  });
  return res.json({ authorizeUrl: url });
};
