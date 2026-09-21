/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import AppError from "../errors/AppError";
import BrainGithubConnection from "../models/BrainGithubConnection";
import {
  buildGithubAuthorizeUrl,
  getBrainGithubConnection,
  handleGithubOAuthCallback,
  listGithubReposForConnection
} from "../services/GithubServices/githubOAuthService";
import { getGithubOAuthClientConfig, resolveGithubOAuthRedirectUriForRequest } from "../services/GithubServices/githubOAuthConfig";
import { verifyGithubOAuthState } from "../services/GithubServices/githubOAuthState";
import {
  getGithubIntegrationPublic,
  isGithubOrgConnected,
  listOrgGithubRepos
} from "../services/GithubServices/GithubIntegrationService";
import { pickValidRedirectOrigin, sanitizeAppBaseUrl, resolveOAuthReturnOrigin } from "../utils/appUrlUtils";

function frontendBaseFromState(state?: string): string {
  if (state) {
    const parsed = verifyGithubOAuthState(state);
    if (parsed?.frontendUrl) {
      return resolveOAuthReturnOrigin(parsed.frontendUrl);
    }
  }
  return pickValidRedirectOrigin();
}

export const oauthStatus = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    getGithubOAuthClientConfig();
    return res.json({ configured: true });
  } catch (e: any) {
    return res.json({ configured: false, message: e?.message });
  }
};

export const authorize = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  const backendUrl = sanitizeAppBaseUrl(
    String(req.query.backendUrl || req.body?.backendUrl || "").trim()
  );
  const originHeader = String(req.headers.origin || "").trim();
  const queryFront = String(req.query.frontendUrl || req.body?.frontendUrl || "").trim();
  const frontendUrl = pickValidRedirectOrigin(queryFront || originHeader || undefined);
  const redirectUri = resolveGithubOAuthRedirectUriForRequest(backendUrl);

  const url = buildGithubAuthorizeUrl({
    companyId,
    userId: Number(userId),
    mode: "user",
    redirectUri,
    frontendUrl
  });
  return res.json({ authorizeUrl: url });
};

function userSafeGithubOAuthError(err: any): string {
  const msg = String(err?.message || err?.response?.data?.error || "").trim();
  if (!msg || /GITHUB_OAUTH|\.env|CLIENT_SECRET|redirect_uri|not associated/i.test(msg)) {
    return "Não foi possível concluir a conexão com o GitHub.";
  }
  return msg.slice(0, 200);
}

export const callback = async (req: Request, res: Response): Promise<void> => {
  const { code, state, error } = req.query;
  const stateStr = String(state || "");
  const base = pickValidRedirectOrigin(frontendBaseFromState(stateStr));

  if (error) {
    res.redirect(
      `${base}/connections/github-oauth/callback?status=error&message=${encodeURIComponent(
        String(error)
      )}`
    );
    return;
  }

  try {
    const connection = await handleGithubOAuthCallback({
      code: String(code || ""),
      state: stateStr
    });
    res.redirect(
      `${base}/connections/github-oauth/callback?status=success&login=${encodeURIComponent(
        connection.githubLogin
      )}&name=${encodeURIComponent(connection.githubName || connection.githubLogin)}`
    );
  } catch (err: any) {
    res.redirect(
      `${base}/connections/github-oauth/callback?status=error&message=${encodeURIComponent(
        userSafeGithubOAuthError(err)
      )}`
    );
  }
};

export const connectionStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, id: userId } = req.user;

  const org = await getGithubIntegrationPublic(companyId);
  if (isGithubOrgConnected(org)) {
    return res.json({
      connected: true,
      source: "organization",
      login: org.githubAccount?.login,
      name: org.githubAccount?.name,
      avatarUrl: org.githubAccount?.avatarUrl,
      authType: org.authType,
      enablePublish: org.enablePublish,
      enableReposRead: org.enableReposRead
    });
  }

  const connection = await getBrainGithubConnection(companyId, Number(userId));
  if (!connection) {
    return res.json({ connected: false });
  }
  return res.json({
    connected: true,
    source: "user",
    login: connection.githubLogin,
    name: connection.githubName,
    avatarUrl: connection.avatarUrl,
    connectedAt: connection.updatedAt
  });
};

export const listRepos = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;

  const org = await getGithubIntegrationPublic(companyId);
  if (isGithubOrgConnected(org) && org.enableReposRead !== false) {
    const repos = await listOrgGithubRepos(companyId);
    return res.json({ items: repos, source: "organization" });
  }

  const connection = await getBrainGithubConnection(companyId, Number(userId));
  if (!connection) {
    throw new AppError(
      "Configure GitHub em Integrações → GitHub ou conecte sua conta.",
      401
    );
  }
  const repos = await listGithubReposForConnection(connection);
  return res.json({ items: repos, source: "user" });
};

export const disconnect = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, id: userId } = req.user;
  await BrainGithubConnection.destroy({
    where: { companyId, userId: Number(userId) }
  });
  return res.json({ success: true });
};
