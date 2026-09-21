/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  sanitizeAppBaseUrl,
  resolveSafeFrontendOrigin,
  normalizeOAuthCallbackUri,
  splitEnvList
} from "../../utils/appUrlUtils";

export function getGithubOAuthClientConfig(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = (process.env.GITHUB_OAUTH_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GITHUB_OAUTH_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "GITHUB_OAUTH_CLIENT_ID e GITHUB_OAUTH_CLIENT_SECRET não configurados no servidor."
    );
  }
  return { clientId, clientSecret };
}

function normalizeBaseUrl(url: string): string {
  return sanitizeAppBaseUrl(url) || String(url || "").trim().replace(/\/$/, "");
}

/** URIs de callback permitidas (local + Railway/produção). */
export function getAllowedGithubOAuthRedirectUris(): string[] {
  const set = new Set<string>();

  const pushBase = (base: string) => {
    const uri = normalizeOAuthCallbackUri(base);
    if (uri) set.add(uri);
  };

  pushBase(process.env.BACKEND_URL || "http://localhost:3000");
  pushBase("http://localhost:3000");
  pushBase("http://127.0.0.1:3000");
  pushBase(process.env.GITHUB_OAUTH_CALLBACK_BACKEND_URL || "");

  const explicit = normalizeOAuthCallbackUri(
    process.env.GITHUB_OAUTH_REDIRECT_URI || ""
  );
  if (explicit) set.add(explicit);

  splitEnvList(process.env.GITHUB_OAUTH_REDIRECT_URIS).forEach((u) => {
    const uri = normalizeOAuthCallbackUri(u);
    if (uri) set.add(uri);
  });

  return [...set];
}

export function resolveGithubOAuthRedirectUri(override?: string): string {
  const allowed = getAllowedGithubOAuthRedirectUris();
  const candidate = normalizeOAuthCallbackUri(override || "");
  if (candidate && allowed.includes(candidate)) {
    return candidate;
  }
  if (process.env.GITHUB_OAUTH_REDIRECT_URI) {
    const explicit = normalizeOAuthCallbackUri(process.env.GITHUB_OAUTH_REDIRECT_URI);
    if (explicit) return explicit;
  }
  const backend = normalizeBaseUrl(process.env.BACKEND_URL || "http://localhost:3000");
  const defaultUri = `${backend}/github/oauth/callback`;
  if (allowed.includes(defaultUri)) return defaultUri;
  return allowed[0] || defaultUri;
}

function isLocalBackendHost(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * Dev local: prefere callback no backend local (token salvo no mesmo DB do `npm run dev`).
 * Só usa GITHUB_OAUTH_CALLBACK_BACKEND_URL (Railway) se localhost não estiver nas URIs permitidas
 * — ex.: GitHub OAuth App cadastrado apenas com callback de produção.
 */
export function resolveGithubOAuthRedirectUriForRequest(
  requestBackendUrl?: string
): string {
  const allowed = getAllowedGithubOAuthRedirectUris();
  const reqBase = sanitizeAppBaseUrl(requestBackendUrl || "");
  const runningLocal = isLocalBackendHost(
    reqBase || process.env.BACKEND_URL || "http://localhost:3000"
  );

  if (runningLocal) {
    const localCandidates = [
      reqBase ? normalizeOAuthCallbackUri(reqBase) : "",
      normalizeOAuthCallbackUri("http://localhost:3000"),
      normalizeOAuthCallbackUri("http://127.0.0.1:3000")
    ].filter(Boolean);

    for (const uri of localCandidates) {
      if (allowed.includes(uri)) {
        return uri;
      }
    }
  }

  if (reqBase) {
    const fromReq = normalizeOAuthCallbackUri(reqBase);
    if (fromReq && allowed.includes(fromReq)) {
      return fromReq;
    }
  }

  const proxyBase = sanitizeAppBaseUrl(
    process.env.GITHUB_OAUTH_CALLBACK_BACKEND_URL || ""
  );
  if (proxyBase && runningLocal) {
    const proxyUri = normalizeOAuthCallbackUri(proxyBase);
    if (proxyUri && allowed.includes(proxyUri)) {
      return proxyUri;
    }
  }

  return resolveGithubOAuthRedirectUri();
}

export function resolveGithubOAuthFrontendUrl(override?: string): string {
  return resolveSafeFrontendOrigin(override);
}

export const GITHUB_OAUTH_SCOPES = ["read:user", "repo"];
