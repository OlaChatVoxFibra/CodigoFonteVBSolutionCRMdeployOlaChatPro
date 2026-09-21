/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Normaliza URLs de app (FRONTEND_URL, BACKEND_URL) vindas de env vars.
 * Corrige valores com vários domínios colados (ex.: vercel.app.https://dominio.com.br).
 */
export function sanitizeAppBaseUrl(
  raw: string | undefined | null
): string {
  const input = String(raw || "").trim();
  if (!input) return "";

  const candidates: string[] = [];

  const httpMatches = input.match(/https?:\/\/[^\s,;]+/gi);
  if (httpMatches?.length) {
    candidates.push(...httpMatches);
  }

  input
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => candidates.push(part));

  if (!candidates.length) candidates.push(input);

  for (const candidate of candidates) {
    const normalized = normalizeOneAppUrl(candidate);
    if (normalized) return normalized;
  }

  return "";
}

function normalizeOneAppUrl(raw: string): string {
  let s = String(raw || "").trim().replace(/\/+$/, "");
  if (!s) return "";

  if (/\.https?:\/\//i.test(s)) {
    const match = s.match(/https?:\/\/[^/\s,;]+/i);
    s = match ? match[0] : "";
    if (!s) return "";
  }

  if (/^https?:\/\//i.test(s)) {
    try {
      return new URL(s).origin;
    } catch {
      return "";
    }
  }

  if (/^[\w.-]+(?::\d+)?$/i.test(s)) {
    const proto =
      /^(localhost|127\.)/i.test(s) ? "http" : "https";
    try {
      return new URL(`${proto}://${s}`).origin;
    } catch {
      return "";
    }
  }

  return "";
}

/** Preserva path completo quando já é URI de callback OAuth. */
export function normalizeOAuthCallbackUri(raw: string): string {
  const input = String(raw || "").trim().replace(/\/+$/, "");
  if (!input) return "";

  if (/^https?:\/\/.+\/github\/oauth\/callback$/i.test(input)) {
    try {
      const u = new URL(input);
      return `${u.origin}/github/oauth/callback`;
    } catch {
      return "";
    }
  }

  const base = sanitizeAppBaseUrl(input);
  if (!base) return "";
  return `${base}/github/oauth/callback`;
}

export function splitEnvList(raw: string | undefined): string[] {
  return String(raw || "")
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getAllowedFrontendOrigins(): string[] {
  const set = new Set<string>();

  const push = (raw?: string) => {
    const clean = sanitizeAppBaseUrl(raw);
    if (clean) set.add(clean);
  };

  push(process.env.FRONTEND_URL);
  splitEnvList(process.env.WEB_ORIGIN).forEach((u) => push(u));
  splitEnvList(process.env.APP_URL).forEach((u) => push(u));
  splitEnvList(process.env.FRONTEND_URLS).forEach((u) => push(u));

  push("http://localhost:5174");
  push("http://127.0.0.1:5174");

  return [...set];
}

/** Normaliza envs de frontend no boot — WEB_ORIGIN pode ter vários domínios separados por vírgula. */
export function bootstrapFrontendEnvUrls(): void {
  const origins = getAllowedFrontendOrigins().filter(
    (o) => !/^http:\/\/127\.0\.0\.1:5174$/i.test(o) && !/^http:\/\/localhost:5174$/i.test(o)
  );

  const primary =
    sanitizeAppBaseUrl(process.env.FRONTEND_URL) ||
    origins[0] ||
    sanitizeAppBaseUrl(splitEnvList(process.env.WEB_ORIGIN)[0]);

  if (primary) {
    process.env.FRONTEND_URL = primary;
  }

  const merged = new Set(origins);
  if (primary) merged.add(primary);
  splitEnvList(process.env.FRONTEND_URLS).forEach((u) => {
    const clean = sanitizeAppBaseUrl(u);
    if (clean) merged.add(clean);
  });

  if (merged.size > 0) {
    process.env.FRONTEND_URLS = [...merged].join(",");
  }

  if (process.env.BACKEND_URL) {
    const cleanBackend = sanitizeAppBaseUrl(process.env.BACKEND_URL);
    if (cleanBackend) process.env.BACKEND_URL = cleanBackend;
  }
}

export function getCorsAllowedOrigins(): string[] {
  const set = new Set<string>();

  const add = (raw?: string) => {
    splitEnvList(raw).forEach((part) => {
      const clean = sanitizeAppBaseUrl(part);
      if (clean) set.add(clean);
    });
  };

  add(process.env.FRONTEND_URL);
  add(process.env.WEB_ORIGIN);
  add(process.env.APP_URL);
  add(process.env.FRONTEND_URLS);
  add("http://localhost:3000");
  add("http://localhost:3001");
  add("http://localhost:8081");
  add("http://localhost:5173");
  add("http://localhost:5174");

  return [...set];
}

export function resolveSafeFrontendOrigin(override?: string): string {
  return pickValidRedirectOrigin(override);
}

export function resolveOAuthReturnOrigin(frontendUrlFromState?: string): string {
  return pickValidRedirectOrigin(frontendUrlFromState);
}

/** Nunca retorna string com vírgula — evita redirect DNS inválido pós-OAuth. */
export function pickValidRedirectOrigin(raw?: string): string {
  const clean = sanitizeAppBaseUrl(raw);
  if (clean && isValidHttpOrigin(clean)) {
    return clean;
  }

  const allowed = getAllowedFrontendOrigins();
  for (const origin of allowed) {
    if (isValidHttpOrigin(origin)) return origin;
  }

  const fromEnv = sanitizeAppBaseUrl(process.env.FRONTEND_URL);
  if (isValidHttpOrigin(fromEnv)) return fromEnv;

  return "http://localhost:5174";
}

function isValidHttpOrigin(value: string): boolean {
  const s = String(value || "").trim();
  if (!s || s.includes(",") || s.includes(";")) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** URL pública padrão do backend em produção (Railway). */
export const DEFAULT_PUBLIC_BACKEND_URL =
  "http://localhost:3000";

function isLocalBackendUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * URL pública do backend para webhooks, OAuth e documentação API/MCP.
 * Prioridade: PUBLIC_BACKEND_URL → BACKEND_URL (se não local) → Railway → host da requisição → DEFAULT_PUBLIC_BACKEND_URL.
 * Nunca retorna localhost — integrações externas precisam de URL pública.
 */
export function resolvePublicBackendUrl(req?: {
  protocol?: string;
  get?: (name: string) => string | undefined;
  headers?: Record<string, string | string[] | undefined>;
}): string {
  const publicEnv = sanitizeAppBaseUrl(process.env.PUBLIC_BACKEND_URL);
  if (publicEnv) return publicEnv;

  const backendEnv = sanitizeAppBaseUrl(process.env.BACKEND_URL);
  if (backendEnv && !isLocalBackendUrl(backendEnv)) return backendEnv;

  const railwayEnv =
    sanitizeAppBaseUrl(process.env.RAILWAY_STATIC_URL) ||
    sanitizeAppBaseUrl(
      process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : ""
    );
  if (railwayEnv) return railwayEnv;

  if (req) {
    const protoHeader = req.headers?.["x-forwarded-proto"];
    const proto =
      (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) ||
      req.protocol ||
      "https";
    const hostHeader = req.headers?.["x-forwarded-host"] || req.headers?.host;
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    if (host) {
      const fromReq = sanitizeAppBaseUrl(`${proto}://${host}`);
      if (fromReq && !isLocalBackendUrl(fromReq)) {
        return fromReq;
      }
    }
  }

  return DEFAULT_PUBLIC_BACKEND_URL;
}
