/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { randomUUID, createHash } from "crypto";
import type { Response } from "express";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type {
  AuthorizationParams,
  OAuthServerProvider
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  InvalidRequestError,
  InvalidTokenError,
  InvalidGrantError
} from "@modelcontextprotocol/sdk/server/auth/errors.js";
import ApiCredential from "../../models/ApiCredential";
import User from "../../models/User";
import { verifyApiKey, extractApiKeyPrefix } from "../../helpers/apiKeyUtils";
import { McpOAuthClientsStore } from "./mcpOAuthClientsStore";
import {
  mcpOAuthStoreDel,
  mcpOAuthStoreGet,
  mcpOAuthStoreSet
} from "./mcpOAuthStore";

type PendingCode = {
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
  credentialId: number;
  companyId: number;
  userId: number;
  scopes: string[];
  expiresAt: number;
};

type TokenRecord = {
  token: string;
  clientId: string;
  credentialId: number;
  companyId: number;
  userId: number;
  scopes: string[];
  resource?: string;
  expiresAt: number;
};

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const CODE_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_SEC = Math.floor(TOKEN_TTL_MS / 1000);
const CODE_TTL_SEC = Math.floor(CODE_TTL_MS / 1000);

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function resolveCredentialFromApiKey(
  rawKey: string
): Promise<{ credential: ApiCredential; userId: number } | null> {
  const keyPrefix = extractApiKeyPrefix(rawKey);
  if (!keyPrefix) return null;

  const credential = await ApiCredential.findOne({
    where: { keyPrefix, revokedAt: null }
  });
  if (!credential) return null;

  if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
    return null;
  }

  const valid = await verifyApiKey(rawKey, credential.keyHash);
  if (!valid) return null;

  const adminUser = await User.findOne({
    where: { companyId: credential.companyId, profile: "admin" },
    order: [["id", "ASC"]]
  });
  if (!adminUser) return null;

  return { credential, userId: adminUser.id };
}

function renderAuthorizePage(params: {
  clientName: string;
  redirectUri: string;
  hiddenFields: Record<string, string>;
  error?: string;
}): string {
  const hidden = Object.entries(params.hiddenFields)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, "&quot;")}" />`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Conectar Visão Business</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      background: linear-gradient(145deg, #eff6ff, #f8fafc);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: #0f172a;
    }
    .card {
      width: 100%;
      max-width: 420px;
      background: #fff;
      border: 1px solid #dbeafe;
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 8px 30px rgba(29, 78, 216, 0.08);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .brand img {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      object-fit: cover;
      background: #1d4ed8;
    }
    .badge {
      display: inline-block;
      background: #1d4ed8;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 5px 10px;
      border-radius: 999px;
    }
    h1 { font-size: 22px; margin-bottom: 8px; }
    p { font-size: 14px; line-height: 1.5; color: #475569; margin-bottom: 16px; }
    label { display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px; }
    input[type="password"], input[type="text"] {
      width: 100%;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 11px 12px;
      font-size: 13px;
      margin-bottom: 14px;
      font-family: Consolas, monospace;
    }
    button {
      width: 100%;
      border: none;
      border-radius: 10px;
      padding: 12px 16px;
      background: #1d4ed8;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #1e40af; }
    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #b91c1c;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      margin-bottom: 14px;
    }
    .meta { font-size: 11px; color: #94a3b8; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <img src="/favicon.png" alt="Visão Business" width="40" height="40" />
      <div class="badge">Visão Business</div>
    </div>
    <h1>Autorizar ${params.clientName}</h1>
    <p>Cole sua <strong>API Key</strong> gerada em Mais → API &amp; MCP no painel Visão Business para permitir que este assistente acesse os dados da sua organização.</p>
    ${params.error ? `<div class="error">${params.error}</div>` : ""}
    <form method="POST" action="/authorize">
      ${hidden}
      <label for="api_key">API Key (vb_live_...)</label>
      <input id="api_key" name="api_key" type="password" placeholder="vb_live_xxxxxxxx_..." required autocomplete="off" />
      <button type="submit">Autorizar conexão</button>
    </form>
    <p class="meta">Cliente: ${params.clientName} · Apenas dados da sua organização</p>
  </div>
</body>
</html>`;
}

export class VbSolutionMcpOAuthProvider implements OAuthServerProvider {
  readonly clientsStore = new McpOAuthClientsStore();

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    const req = res.req as any;
    const apiKeyRaw =
      (req.method === "POST" ? req.body?.api_key : req.query?.api_key) || "";

    if (!apiKeyRaw) {
      const hiddenFields: Record<string, string> = {
        client_id: client.client_id,
        redirect_uri: params.redirectUri,
        response_type: "code",
        code_challenge: params.codeChallenge,
        code_challenge_method: "S256"
      };
      if (params.state) hiddenFields.state = params.state;
      if (params.scopes?.length) hiddenFields.scope = params.scopes.join(" ");
      if (params.resource) hiddenFields.resource = params.resource.toString();

      res.status(200).send(
        renderAuthorizePage({
          clientName: client.client_name || "Assistente de IA",
          redirectUri: params.redirectUri,
          hiddenFields
        })
      );
      return;
    }

    const resolved = await resolveCredentialFromApiKey(String(apiKeyRaw).trim());
    if (!resolved) {
      const hiddenFields: Record<string, string> = {
        client_id: client.client_id,
        redirect_uri: params.redirectUri,
        response_type: "code",
        code_challenge: params.codeChallenge,
        code_challenge_method: "S256"
      };
      if (params.state) hiddenFields.state = params.state;
      if (params.scopes?.length) hiddenFields.scope = params.scopes.join(" ");
      if (params.resource) hiddenFields.resource = params.resource.toString();

      res.status(400).send(
        renderAuthorizePage({
          clientName: client.client_name || "Assistente de IA",
          redirectUri: params.redirectUri,
          hiddenFields,
          error:
            "API Key inválida, expirada ou revogada. Gere uma nova em API &amp; MCP."
        })
      );
      return;
    }

    if (!client.redirect_uris.includes(params.redirectUri)) {
      throw new InvalidRequestError("Unregistered redirect_uri");
    }

    const code = randomUUID();
    const scopes = (resolved.credential.scopes || []).map(String);
    const pending: PendingCode = {
      client,
      params,
      credentialId: resolved.credential.id,
      companyId: resolved.credential.companyId,
      userId: resolved.userId,
      scopes,
      expiresAt: Date.now() + CODE_TTL_MS
    };
    await mcpOAuthStoreSet(`code:${code}`, JSON.stringify(pending), CODE_TTL_SEC);

    resolved.credential.update({ lastUsedAt: new Date() }).catch(() => undefined);

    const target = new URL(params.redirectUri);
    target.searchParams.set("code", code);
    if (params.state) target.searchParams.set("state", params.state);
    res.redirect(302, target.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const raw = await mcpOAuthStoreGet(`code:${authorizationCode}`);
    if (!raw) throw new InvalidGrantError("Invalid authorization code");
    const data = JSON.parse(raw) as PendingCode;
    if (data.expiresAt < Date.now()) {
      await mcpOAuthStoreDel(`code:${authorizationCode}`);
      throw new InvalidGrantError("Authorization code expired");
    }
    return data.params.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    _redirectUri?: string,
    resource?: URL
  ): Promise<OAuthTokens> {
    const raw = await mcpOAuthStoreGet(`code:${authorizationCode}`);
    if (!raw) throw new InvalidGrantError("Invalid authorization code");
    const data = JSON.parse(raw) as PendingCode;
    if (data.expiresAt < Date.now()) {
      await mcpOAuthStoreDel(`code:${authorizationCode}`);
      throw new InvalidGrantError("Authorization code expired");
    }
    if (data.client.client_id !== client.client_id) {
      throw new InvalidGrantError(
        "Authorization code was not issued to this client"
      );
    }
    await mcpOAuthStoreDel(`code:${authorizationCode}`);

    const token = randomUUID();
    const expiresAt = Date.now() + TOKEN_TTL_MS;
    const record: TokenRecord = {
      token,
      clientId: client.client_id,
      credentialId: data.credentialId,
      companyId: data.companyId,
      userId: data.userId,
      scopes: data.scopes,
      resource: (resource || data.params.resource)?.toString(),
      expiresAt
    };
    await mcpOAuthStoreSet(
      `token:${hashToken(token)}`,
      JSON.stringify(record),
      TOKEN_TTL_SEC
    );

    return {
      access_token: token,
      token_type: "bearer",
      expires_in: TOKEN_TTL_SEC,
      scope: data.scopes.join(" ")
    };
  }

  async exchangeRefreshToken(): Promise<OAuthTokens> {
    throw new InvalidGrantError("Refresh token not supported");
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const raw = await mcpOAuthStoreGet(`token:${hashToken(token)}`);
    if (!raw) {
      throw new InvalidTokenError("Invalid or expired token");
    }
    const record = JSON.parse(raw) as TokenRecord;
    if (record.expiresAt < Date.now()) {
      await mcpOAuthStoreDel(`token:${hashToken(token)}`);
      throw new InvalidTokenError("Invalid or expired token");
    }
    return {
      token,
      clientId: record.clientId,
      scopes: record.scopes,
      expiresAt: Math.floor(record.expiresAt / 1000),
      resource: record.resource ? new URL(record.resource) : undefined,
      extra: {
        companyId: record.companyId,
        userId: record.userId,
        credentialId: record.credentialId
      }
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ): Promise<void> {
    if (request.token) {
      await mcpOAuthStoreDel(`token:${hashToken(request.token)}`);
    }
  }
}
