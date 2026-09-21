/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import crypto from "crypto";

type GoogleLoginOAuthStatePayload = {
  purpose: "login";
  ts: number;
};

function stateSecret(): string {
  return (
    process.env.JWT_SECRET ||
    process.env.GOOGLE_WORKSPACE_ENCRYPTION_SECRET ||
    "google-login-oauth-state"
  );
}

export function signGoogleLoginOAuthState(): string {
  const payload: GoogleLoginOAuthStatePayload = {
    purpose: "login",
    ts: Date.now()
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", stateSecret())
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyGoogleLoginOAuthState(
  state: string
): GoogleLoginOAuthStatePayload | null {
  const raw = String(state || "").trim();
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = crypto
    .createHmac("sha256", stateSecret())
    .update(body)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    const json = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!json || json.purpose !== "login") return null;
    if (Date.now() - Number(json.ts || 0) > 15 * 60 * 1000) return null;
    return json as GoogleLoginOAuthStatePayload;
  } catch {
    return null;
  }
}
