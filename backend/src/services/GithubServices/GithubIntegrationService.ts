/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import GithubIntegration, {
  GithubIntegrationStatus
} from "../../models/GithubIntegration";
import AppError from "../../errors/AppError";
import {
  githubApiHeaders,
  type GithubRepoSummary
} from "./githubOAuthService";

export type GithubIntegrationPublic = {
  status: GithubIntegrationStatus;
  authType: "pat" | "oauth" | "none";
  credential: { hasKey: boolean; last4: string };
  githubAccount?: { login?: string; name?: string; avatarUrl?: string };
  enableBrainAi: boolean;
  enablePublish: boolean;
  enableReposRead: boolean;
  lastSyncAt: string | null;
  platformOAuthConfigured: boolean;
};

function maskToken(plain: string): { hasKey: boolean; last4: string } {
  const t = String(plain || "").trim();
  if (!t) return { hasKey: false, last4: "" };
  return { hasKey: true, last4: t.length <= 4 ? "****" : t.slice(-4) };
}

async function findOrCreate(workspaceId: number): Promise<GithubIntegration> {
  const existing = await GithubIntegration.findOne({ where: { workspaceId } });
  if (existing) return existing;
  return GithubIntegration.create({
    workspaceId,
    authType: "pat",
    patEnc: "",
    oauthTokenEnc: "",
    enableBrainAi: true,
    enablePublish: true,
    enableReposRead: true,
    status: "disconnected"
  } as any);
}

function platformOAuthConfigured(): boolean {
  try {
    const id = (process.env.GITHUB_OAUTH_CLIENT_ID || "").trim();
    const secret = (process.env.GITHUB_OAUTH_CLIENT_SECRET || "").trim();
    return Boolean(id && secret);
  } catch {
    return false;
  }
}

function rowToPublic(row: GithubIntegration | null): GithubIntegrationPublic {
  if (!row) {
    return {
      status: "disconnected",
      authType: "none",
      credential: { hasKey: false, last4: "" },
      enableBrainAi: true,
      enablePublish: true,
      enableReposRead: true,
      lastSyncAt: null,
      platformOAuthConfigured: platformOAuthConfigured()
    };
  }

  const pat = row.getPat() || "";
  const oauth = row.getOauthToken() || "";
  const activeToken = pat || oauth;

  return {
    status: row.status,
    authType: pat ? "pat" : oauth ? "oauth" : "none",
    credential: maskToken(activeToken),
    githubAccount: row.githubLogin
      ? {
          login: row.githubLogin,
          name: row.githubName || row.githubLogin,
          avatarUrl: row.avatarUrl || undefined
        }
      : undefined,
    enableBrainAi: Boolean(row.enableBrainAi),
    enablePublish: Boolean(row.enablePublish),
    enableReposRead: Boolean(row.enableReposRead),
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    platformOAuthConfigured: platformOAuthConfigured()
  };
}

export async function getGithubIntegrationPublic(
  workspaceId: number
): Promise<GithubIntegrationPublic> {
  const row = await GithubIntegration.findOne({ where: { workspaceId } });
  return rowToPublic(row);
}

/** Mesmo critério usado em Integrações (ConnectionsHub / IntegrationConfigManage). */
export function isGithubOrgConnected(org: GithubIntegrationPublic): boolean {
  return (
    org.status === "connected" &&
    Boolean(org.credential?.hasKey || org.githubAccount?.login)
  );
}

export async function saveGithubIntegration(params: {
  workspaceId: number;
  pat?: string;
  enableBrainAi?: boolean;
  enablePublish?: boolean;
  enableReposRead?: boolean;
  status?: GithubIntegrationStatus;
}): Promise<GithubIntegrationPublic> {
  const row = await findOrCreate(params.workspaceId);

  const incomingPat = params.pat != null ? String(params.pat).trim() : "";
  if (incomingPat.length > 0) {
    row.setPat(incomingPat);
    row.authType = "pat";
    row.status = "connected";
    row.lastSyncAt = new Date();
  }

  if (params.enableBrainAi !== undefined) row.enableBrainAi = Boolean(params.enableBrainAi);
  if (params.enablePublish !== undefined) row.enablePublish = Boolean(params.enablePublish);
  if (params.enableReposRead !== undefined) row.enableReposRead = Boolean(params.enableReposRead);
  if (params.status) row.status = params.status;

  await row.save();
  return rowToPublic(row);
}

export async function saveGithubOrgOAuthConnection(params: {
  workspaceId: number;
  accessToken: string;
  githubLogin: string;
  githubName: string;
  avatarUrl?: string;
  scope?: string;
}): Promise<GithubIntegrationPublic> {
  const row = await findOrCreate(params.workspaceId);
  row.setOauthToken(params.accessToken);
  row.authType = "oauth";
  row.githubLogin = params.githubLogin;
  row.githubName = params.githubName;
  row.avatarUrl = params.avatarUrl || "";
  row.oauthScope = params.scope || "";
  row.status = "connected";
  row.lastSyncAt = new Date();
  await row.save();
  return rowToPublic(row);
}

export async function clearGithubIntegration(
  workspaceId: number
): Promise<GithubIntegrationPublic> {
  const row = await GithubIntegration.findOne({ where: { workspaceId } });
  if (!row) return rowToPublic(null);
  row.patEnc = "";
  row.oauthTokenEnc = "";
  row.githubLogin = "";
  row.githubName = "";
  row.avatarUrl = "";
  row.oauthScope = "";
  row.authType = "pat";
  row.status = "disconnected";
  await row.save();
  return rowToPublic(row);
}

export async function getOrgGithubAccessToken(
  workspaceId: number
): Promise<string | null> {
  const row = await GithubIntegration.findOne({ where: { workspaceId } });
  if (!row || row.status !== "connected") return null;
  const pat = row.getPat();
  if (pat) return pat;
  return row.getOauthToken();
}

export async function testGithubIntegration(params: {
  workspaceId: number;
  patOverride?: string;
}): Promise<{ ok: boolean; login?: string; message?: string }> {
  const token =
    String(params.patOverride || "").trim() ||
    (await getOrgGithubAccessToken(params.workspaceId));
  if (!token) {
    return { ok: false, message: "Informe um Personal Access Token ou conecte via OAuth." };
  }

  try {
    const res = await axios.get("https://api.github.com/user", {
      headers: githubApiHeaders(token),
      timeout: 20000
    });
    const login = String(res.data?.login || "").trim();
    if (!login) return { ok: false, message: "Resposta inválida do GitHub." };

    const row = await findOrCreate(params.workspaceId);
    if (params.patOverride) {
      row.setPat(params.patOverride);
      row.authType = "pat";
      row.githubLogin = login;
      row.githubName = String(res.data?.name || login);
      row.avatarUrl = String(res.data?.avatar_url || "");
    }
    row.status = "connected";
    row.lastSyncAt = new Date();
    await row.save();

    return { ok: true, login };
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || "Falha ao validar token.";
    return { ok: false, message: msg };
  }
}

export async function listOrgGithubRepos(
  workspaceId: number
): Promise<GithubRepoSummary[]> {
  const token = await getOrgGithubAccessToken(workspaceId);
  if (!token) {
    throw new AppError("Configure GitHub em Integrações → GitHub.", 401);
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

export async function readGithubRepoFile(params: {
  workspaceId: number;
  repoFullName: string;
  path: string;
  ref?: string;
}): Promise<{ path: string; content: string; sha?: string }> {
  const token = await getOrgGithubAccessToken(params.workspaceId);
  if (!token) {
    throw new AppError("Configure GitHub em Integrações → GitHub.", 401);
  }

  const full = String(params.repoFullName || "").trim();
  const slash = full.indexOf("/");
  if (slash <= 0) throw new AppError("Repositório inválido.", 400);
  const owner = full.slice(0, slash);
  const repo = full.slice(slash + 1);
  const filePath = String(params.path || "").replace(/^\/+/, "");
  if (!filePath) throw new AppError("Informe o caminho do arquivo.", 400);

  const headers = githubApiHeaders(token);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}`;
  const res = await axios.get(url, {
    headers,
    params: params.ref ? { ref: params.ref } : undefined,
    timeout: 25000
  });

  const encoding = String(res.data?.encoding || "");
  const raw = String(res.data?.content || "").replace(/\n/g, "");
  const content =
    encoding === "base64" ? Buffer.from(raw, "base64").toString("utf8") : raw;

  return {
    path: filePath,
    content,
    sha: res.data?.sha
  };
}

/** Wrapper for listGithubReposForConnection-style API using org token */
export async function listGithubReposForOrg(
  workspaceId: number
): Promise<GithubRepoSummary[]> {
  return listOrgGithubRepos(workspaceId);
}
