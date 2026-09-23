/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import * as Sentry from "@sentry/node";
import { config as dotenvConfig } from "dotenv";
import bodyParser from 'body-parser';

import "./database";
import uploadConfig from "./config/upload";
import AppError from "./errors/AppError";
import routes from "./routes";
import logger from "./utils/logger";
import BullBoard from 'bull-board';
import basicAuth from 'basic-auth';
import { registerMcpHttpRoutes } from "./routes/mcpHttpRoutes";
import { registerMcpBrandRoutes } from "./services/McpHttpServices/mcpBrandAssets";
import { getCorsAllowedOrigins } from "./utils/appUrlUtils";

// Função de middleware para autenticação básica
export const isBullAuth = (req, res, next) => {
  const user = basicAuth(req);

  if (!user || user.name !== process.env.BULL_USER || user.pass !== process.env.BULL_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="example"');
    return res.status(401).send('Authentication required.');
  }
  next();
};

// Carregar variáveis de ambiente
dotenvConfig();

// Inicializar Sentry
Sentry.init({ dsn: process.env.SENTRY_DSN });

const app = express();

// -----------------------------------------------------------------------------
// CORS MANUAL — PRIMEIRO MIDDLEWARE DO APP (antes de TUDO).
// NÃO depende do pacote "cors" do Express, do compression, do bodyParser ou de nenhum outro middleware.
// Isso garante que OPTIONS (preflight) e TODAS as respostas (incluindo erro 4xx/5xx)
// sempre incluirão os headers de CORS.
//
// Regras seguindo especificação W3C Fetch:
//   • Access-Control-Allow-Origin = "*" é INCOMPATÍVEL com Access-Control-Allow-Credentials = "true".
//     → NÃO enviamos credentials quando Allow-Origin é wildcard.
//   • Sempre echoamos Origin apenas se ela estiver na lista permitida.
//   • Se não houver Origin (ex.: requisição server-to-server), permitimos wildcard sem credentials.
// -----------------------------------------------------------------------------
const applyCorsHeaders = (req: Request, res: Response) => {
  const origin = (req.header("Origin") || "").trim();
  const allowed = new Set<string>(
    (getCorsAllowedOrigins() || []).map(o => o.toLowerCase())
  );
  // Sempre permitir origins locais/dinamicas — fallback permissivo para dev + ambientes Railway/preview
  const allowAnyOrigin = String(process.env.CORS_ALLOW_ANY || "true").toLowerCase() !== "false";

  let originAccepted: string | null = null;
  if (origin) {
    const o = origin.toLowerCase();
    if (allowed.has(o) || allowAnyOrigin) {
      originAccepted = origin;
    }
  }

  if (originAccepted) {
    res.setHeader("Access-Control-Allow-Origin", originAccepted);
    res.setHeader("Vary", "Origin");
    // Credentials só permitidos com origin específica (NÃO com wildcard)
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else if (!res.getHeader("Access-Control-Allow-Origin")) {
    // Sem origin ou origin não permitido: wildcard (apenas para requisições simples)
    res.setHeader("Access-Control-Allow-Origin", "*");
    // Nunca enviamos credentials com wildcard → incompatibilidade bloqueada no Chrome/Firefox/Safari
  }

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept, X-Requested-With, token, companyid, companyId, userid, userId, env-token, x-csrf-token, Origin, X-JWT-Token, X-Socket-Id, x-refresh-token, apollo-require-preflight"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-Total-Count, Content-Disposition, Content-Length, X-JWT-Token"
  );
  res.setHeader("Access-Control-Max-Age", "7200");
};

// Rotas OPTIONS no topo: intercepta QUALQUER OPTIONS antes de passar pela cadeia inteira
app.options("/*", (req: Request, res: Response) => {
  applyCorsHeaders(req, res);
  res.statusCode = 204;
  return res.end();
});

// Middleware CORS em TODAS as requisições (GET/POST/PUT etc.)
app.use((req: Request, res: Response, next: NextFunction) => {
  applyCorsHeaders(req, res);
  return next();
});

// Filas: placeholders — carregadas depois do listen (evita 502 no Railway por Redis no boot)
app.set("queues", {
  messageQueue: null,
  sendScheduledMessages: null
});

const allowedOrigins = getCorsAllowedOrigins();

// BullBoard opcional — só após Redis (lazy)
void (async () => {
  try {
    if (
      String(process.env.BULL_BOARD || "").toLowerCase() !== "true" ||
      !String(process.env.REDIS_URI_ACK || process.env.REDIS_URI || process.env.REDIS_URL || "").trim()
    ) {
      return;
    }
    const BullQueue = (await import("./libs/queue")).default;
    BullBoard.setQueues(BullQueue.queues.map(queue => queue && queue.bull));
    app.use("/admin/queues", isBullAuth, BullBoard.UI);
  } catch (err: any) {
    logger.warn({ msg: "BullBoard não montado", error: err?.message || String(err) });
  }
})();

// Middlewares
// Helmet desativado por CSP customizada; reativar quando necessário

app.use(compression()); // Compressão HTTP

// Captura o corpo bruto para validação de assinatura de webhooks (Meta)
app.use(
  bodyParser.json({
    limit: '12mb',
    verify: (req: any, _res, buf) => {
      try {
        req.rawBody = buf?.toString?.('utf8');
      } catch {
        // ignora caso não consiga converter
        req.rawBody = undefined;
      }
    }
  })
); // Aumentar o limite de carga para 5 MB
app.use(bodyParser.urlencoded({ limit: '12mb', extended: true }));

app.use(cookieParser());
// Não usar express.json() aqui: o body já é parseado por bodyParser.json acima;
// um segundo parser pode esvaziar/duplicar o corpo e quebrar PUT/POST com JSON grande (ex.: agente IA).
app.use(Sentry.Handlers.requestHandler());

/** Rotas JSON em /public/* (não são arquivos estáticos). */
const isPublicApiRoute = (path: string) =>
  path === "/plans" || path.startsWith("/stripe/");

// Servir arquivos estáticos em /public SEM auth (logo, foto de perfil, etc.)
app.use("/public", (req, res, next) => {
  if (isPublicApiRoute(req.path)) {
    return next();
  }
  express.static(uploadConfig.directory)(req, res, () => {
    // Se static não enviou resposta (arquivo não encontrado), devolve 404 em vez de passar às rotas (evita 401)
    if (!res.headersSent) {
      res.status(404).send("Not found");
    }
  });
});

app.get("/", (_req, res) => res.json({ ok: true }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Favicon / branding VBSolution (Claude, OAuth authorize, browsers)
registerMcpBrandRoutes(app);

// MCP HTTP remoto (Claude Web, etc.) — OAuth + /mcp antes das rotas JWT
try {
  registerMcpHttpRoutes(app);
  app.get("/mcp/status", (_req, res) =>
    res.json({
      ok: true,
      mcp: true,
      oauthDiscovery: "/.well-known/oauth-authorization-server",
      endpoint: "/mcp"
    })
  );
  logger.info("[MCP HTTP] Rotas OAuth e /mcp montadas");
} catch (err) {
  logger.error({ err }, "[MCP HTTP] Falha ao montar rotas OAuth/MCP");
  app.get("/mcp/status", (_req, res) =>
    res.status(503).json({
      ok: false,
      mcp: false,
      error: "MCP_HTTP_MOUNT_FAILED"
    })
  );
}

// Rotas
app.use(routes);

// Manipulador de erros do Sentry
app.use(Sentry.Handlers.errorHandler());

// Middleware de tratamento de erros
app.use(async (err: Error, req: Request, res: Response, _: NextFunction) => {
  // Garante que respostas de ERRO também sempre incluem CORS
  applyCorsHeaders(req, res);

  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

// Fallback 404 final: qualquer rota não reconhecida volta JSON com CORS
app.use((req: Request, res: Response) => {
  applyCorsHeaders(req, res);
  if (!res.headersSent) {
    res.status(404).json({ error: "Not found" });
  }
});

export default app;
