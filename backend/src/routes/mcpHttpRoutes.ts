/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Router, Request, Response, Express } from "express";
import { randomUUID } from "crypto";
import {
  mcpAuthRouter,
  createOAuthMetadata,
  getOAuthProtectedResourceMetadataUrl
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { VbSolutionMcpOAuthProvider } from "../services/McpHttpServices/mcpOAuthProvider";
import { createMcpCrmServer } from "../services/McpHttpServices/createMcpCrmServer";
import {
  MCP_HTTP_PATH,
  MCP_OAUTH_SCOPES,
  resolveMcpIssuerUrl,
  resolveMcpServerUrl
} from "../services/McpHttpServices/mcpHttpConfig";
import { resolveMcpLogoUrl } from "../services/McpHttpServices/mcpBrandAssets";
import logger from "../utils/logger";

const oauthProvider = new VbSolutionMcpOAuthProvider();

type TransportEntry = {
  transport: StreamableHTTPServerTransport;
};

const transports = new Map<string, TransportEntry>();

let oauthMounted = false;

async function mcpPostHandler(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    let entry: TransportEntry | undefined;

    if (sessionId) {
      entry = transports.get(sessionId);
    }

    if (!entry && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid) => {
          if (transport.sessionId) {
            transports.set(sid, { transport });
          }
        }
      });

      entry = { transport };
      const server = createMcpCrmServer(req.auth);
      await server.connect(transport);

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) transports.delete(sid);
      };

      if (transport.sessionId) {
        transports.set(transport.sessionId, entry);
      }

      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (!entry) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided"
        },
        id: null
      });
      return;
    }

    await entry.transport.handleRequest(req, res, req.body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.error({ err, message, stack }, "[MCP HTTP] POST error");
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null
      });
    }
  }
}

async function mcpGetHandler(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const entry = sessionId ? transports.get(sessionId) : undefined;

  if (!entry) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  await entry.transport.handleRequest(req, res);
}

async function mcpDeleteHandler(req: Request, res: Response): Promise<void> {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const entry = sessionId ? transports.get(sessionId) : undefined;

  if (!entry) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  await entry.transport.handleRequest(req, res);
  if (sessionId) transports.delete(sessionId);
}

export function registerMcpHttpRoutes(app: Express, reqForUrls?: Request): void {
  const issuer = resolveMcpIssuerUrl(reqForUrls);
  const mcpUrl = resolveMcpServerUrl(reqForUrls);
  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(mcpUrl);

  if (!oauthMounted) {
    const logoUrl = resolveMcpLogoUrl(reqForUrls);
    const oauthOptions = {
      provider: oauthProvider,
      issuerUrl: issuer,
      baseUrl: issuer,
      resourceServerUrl: mcpUrl,
      resourceName: "VBSolution CRM",
      scopesSupported: MCP_OAUTH_SCOPES,
      serviceDocumentationUrl: new URL(`${issuer.origin}/platform-api`)
    };
    const oauthMetadata = {
      ...createOAuthMetadata(oauthOptions),
      logo_uri: logoUrl
    };

    // Sobrescreve discovery com logo_uri (Claude / clientes que leem RFC 8414)
    app.get("/.well-known/oauth-authorization-server", (_req, res) => {
      res.status(200).json(oauthMetadata);
    });

    app.use(mcpAuthRouter(oauthOptions));
    oauthMounted = true;
    logger.info(`[MCP HTTP] OAuth AS at ${issuer.href} logo=${logoUrl}`);
  }

  const authMiddleware = requireBearerAuth({
    verifier: oauthProvider,
    requiredScopes: [],
    resourceMetadataUrl
  });

  const router = Router();
  router.post(MCP_HTTP_PATH, authMiddleware, mcpPostHandler);
  router.get(MCP_HTTP_PATH, authMiddleware, mcpGetHandler);
  router.delete(MCP_HTTP_PATH, authMiddleware, mcpDeleteHandler);
  app.use(router);

  logger.info(`[MCP HTTP] Endpoint ${mcpUrl.href}`);
}
