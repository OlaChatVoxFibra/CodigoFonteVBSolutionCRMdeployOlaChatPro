/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import AppError from "../../errors/AppError";
import BrainGithubConnection from "../../models/BrainGithubConnection";
import {
  getGithubOAuthClientConfig,
  GITHUB_OAUTH_SCOPES,
  resolveGithubOAuthRedirectUri,
  resolveGithubOAuthFrontendUrl
} from "./githubOAuthConfig";
import { signGithubOAuthState, verifyGithubOAuthState } from "./githubOAuthState";
import { saveGithubOrgOAuthConnection } from "./GithubIntegrationService";

export function buildGithubAuthorizeUrl(params: {
  companyId: number;
  userId: number;
  mode?: "org" | "user";
  redirectUri?: string;
  frontendUrl?: string;
}): string {
  const { clientId } = getGithubOAuthClientConfig();
  const state = signGithubOAuthState({
    companyId: params.companyId,
    userId: params.userId,
    ts: Date.now(),
    mode: params.mode || "user",
    redirectUri: params.redirectUri,
    frontendUrl: params.frontendUrl
  });
  const redirectUri = resolveGithubOAuthRedirectUri(params.redirectUri);
  const scope = GITHUB_OAUTH_SCOPES.join(" ");
  const qs = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state
  });
  return `https://github.com/login/oauth/authorize?${qs.toString()}`;
}

export async function handleGithubOAuthCallback(params: {
  code: string;
  state: string;
}): Promise<BrainGithubConnection> {
  const parsed = verifyGithubOAuthState(params.state);
  if (!parsed) {
    throw new AppError("Estado OAuth inválido ou expirado.", 400);
  }

  const { clientId, clientSecret } = getGithubOAuthClientConfig();
  const redirectUri = resolveGithubOAuthRedirectUri(parsed.redirectUri);

  let tokenRes;
  try {
    tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: clientId,
        client_secret: clientSecret,
        code: params.code,
        redirect_uri: redirectUri
      },
      {
        headers: { Accept: "application/json" },
        timeout: 20000
      }
    );
  } catch (e: any) {
    throw new AppError(
      e?.response?.data?.error_description ||
        e?.response?.data?.error ||
        "Falha ao trocar código OAuth do GitHub.",
      400
    );
  }

  const accessToken = String(tokenRes.data?.access_token || "").trim();
  const scope = String(tokenRes.data?.scope || "").trim();
  if (!accessToken) {
    throw new AppError("GitHub não retornou token de acesso.", 400);
  }

  const headers = githubApiHeaders(accessToken);
  const meRes = await axios.get("https://api.github.com/user", {
    headers,
    timeout: 20000
  });
  const githubLogin = String(meRes.data?.login || "").trim();
  const githubName = String(meRes.data?.name || githubLogin).trim();
  const avatarUrl = String(meRes.data?.avatar_url || "").trim();

  if (!githubLogin) {
    throw new AppError("Não foi possível obter o usuário GitHub.", 400);
  }

  const { companyId, userId } = parsed;

  if (parsed.mode === "org") {
    await saveGithubOrgOAuthConnection({
      workspaceId: companyId,
      accessToken,
      githubLogin,
      githubName,
      avatarUrl,
      scope
    });
    return {
      githubLogin,
      githubName,
      avatarUrl,
      scope,
      getAccessToken: () => accessToken
    } as BrainGithubConnection;
  }

  let connection = await BrainGithubConnection.findOne({
    where: { companyId, userId }
  });

  if (!connection) {
    connection = BrainGithubConnection.build({
      companyId,
      userId,
      githubLogin,
      githubName,
      avatarUrl,
      scope,
      accessTokenEnc: ""
    } as any);
  }

  connection.githubLogin = githubLogin;
  connection.githubName = githubName;
  connection.avatarUrl = avatarUrl;
  connection.scope = scope;
  connection.setAccessToken(accessToken);
  await connection.save();

  return connection;
}

export function githubApiHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

export async function getBrainGithubConnection(
  companyId: number,
  userId: number
): Promise<BrainGithubConnection | null> {
  const row = await BrainGithubConnection.findOne({
    where: { companyId, userId }
  });
  if (!row) return null;
  if (!row.getAccessToken()) return null;
  return row;
}

export type GithubRepoSummary = {
  id: number;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  updatedAt: string;
};

export async function listGithubReposForConnection(
  connection: BrainGithubConnection
): Promise<GithubRepoSummary[]> {
  const token = connection.getAccessToken();
  if (!token) {
    throw new AppError("Conexão GitHub sem token válido.", 401);
  }

  const headers = githubApiHeaders(token);
  const repos: GithubRepoSummary[] = [];
  let page = 1;

  while (page <= 5) {
    const res = await axios.get("https://api.github.com/user/repos", {
      headers,
      params: {
        per_page: 100,
        page,
        sort: "updated",
        affiliation: "owner,collaborator,organization_member"
      },
      timeout: 25000
    });
    const batch = Array.isArray(res.data) ? res.data : [];
    if (!batch.length) break;

    for (const r of batch) {
      repos.push({
        id: Number(r.id),
        name: String(r.name || ""),
        fullName: String(r.full_name || ""),
        private: Boolean(r.private),
        htmlUrl: String(r.html_url || ""),
        defaultBranch: String(r.default_branch || "main"),
        updatedAt: String(r.updated_at || "")
      });
    }

    if (batch.length < 100) break;
    page += 1;
  }

  return repos.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function createGithubRepo(params: {
  token: string;
  repoName: string;
  description?: string;
  isPrivate?: boolean;
}): Promise<{ owner: string; repoName: string; htmlUrl: string }> {
  const headers = githubApiHeaders(params.token);
  const meRes = await axios.get("https://api.github.com/user", { headers, timeout: 20000 });
  const owner = String(meRes.data?.login || "").trim();
  if (!owner) throw new AppError("Token GitHub inválido.", 401);

  const repoName = String(params.repoName || "")
    .trim()
    .replace(/[^\w.-]/g, "-")
    .slice(0, 100);
  if (!repoName) throw new AppError("Nome do repositório inválido.", 400);

  try {
    await axios.post(
      "https://api.github.com/user/repos",
      {
        name: repoName,
        description: params.description || "Projeto gerado no Brain.AI · VB Solution",
        private: params.isPrivate !== false,
        auto_init: false
      },
      { headers, timeout: 20000 }
    );
  } catch (createErr: any) {
    const msg = createErr?.response?.data?.message || "";
    if (!String(msg).toLowerCase().includes("already exists")) {
      throw new AppError(msg || createErr?.message || "Falha ao criar repositório.", 400);
    }
  }

  return {
    owner,
    repoName,
    htmlUrl: `https://github.com/${owner}/${repoName}`
  };
}

export async function uploadFilesToGithubRepo(params: {
  token: string;
  owner: string;
  repoName: string;
  files: Record<string, string>;
  commitPrefix?: string;
}): Promise<number> {
  const headers = githubApiHeaders(params.token);
  const owner = params.owner;
  const repoName = params.repoName;
  const files = params.files || {};
  const prefix = params.commitPrefix || "Brain AI";

  let uploaded = 0;
  const paths = Object.keys(files).sort();

  for (const relPath of paths) {
    const safe = relPath.replace(/^\/+/, "").replace(/\.\./g, "");
    if (!safe) continue;

    const apiPath = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(safe).replace(/%2F/g, "/")}`;
    let sha: string | undefined;

    try {
      const existing = await axios.get(apiPath, { headers, timeout: 20000 });
      sha = existing.data?.sha;
    } catch (e: any) {
      if (e?.response?.status !== 404) throw e;
    }

    const content = Buffer.from(String(files[relPath] ?? ""), "utf8").toString("base64");
    await axios.put(
      apiPath,
      {
        message: `${prefix}: ${sha ? "update" : "add"} ${safe}`,
        content,
        ...(sha ? { sha } : {})
      },
      { headers, timeout: 30000 }
    );
    uploaded += 1;
  }

  return uploaded;
}
