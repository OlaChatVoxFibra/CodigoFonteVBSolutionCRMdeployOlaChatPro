/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { CRM_TOOLS, executeAiBrainCrmTool } from "../AiBrainServices/AiBrainCrmTools";
import { hasApiScope } from "../../helpers/apiKeyScopes";
import type { ApiCredentialScope } from "../../models/ApiCredential";
import { resolveMcpLogoUrl } from "./mcpBrandAssets";
import logger from "../../utils/logger";

export type McpAuthContext = {
  companyId: number;
  userId: number;
  scopes: string[];
};

function authFromInfo(auth?: AuthInfo): McpAuthContext | null {
  if (!auth?.extra) return null;
  const companyId = Number(auth.extra.companyId);
  const userId = Number(auth.extra.userId);
  if (!companyId || !userId) return null;
  return {
    companyId,
    userId,
    scopes: Array.isArray(auth.scopes) ? auth.scopes : []
  };
}

function scopeAllowed(ctx: McpAuthContext, scope: ApiCredentialScope): boolean {
  return hasApiScope(ctx.scopes, scope);
}

function jsonSchemaToZodShape(
  parameters?: Record<string, unknown>
): Record<string, z.ZodTypeAny> {
  const props =
    parameters && typeof parameters === "object"
      ? ((parameters.properties as Record<string, { type?: string }>) || {})
      : {};
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, def] of Object.entries(props)) {
    if (def?.type === "number" || def?.type === "integer") {
      shape[key] = z.number().optional();
    } else if (def?.type === "boolean") {
      shape[key] = z.boolean().optional();
    } else {
      shape[key] = z.string().optional();
    }
  }
  return shape;
}

export function createMcpCrmServer(auth?: AuthInfo): McpServer {
  const ctx = authFromInfo(auth);
  const logoUrl = resolveMcpLogoUrl();
  const server = new McpServer(
    {
      name: "vbsolution-crm",
      version: "1.0.0",
      websiteUrl: "https://vbsolution.com.br",
      icons: [
        { src: logoUrl, mimeType: "image/png", sizes: ["192x192"] }
      ]
    } as any,
    {
      capabilities: { tools: {} }
    }
  );

  const registerBuiltin = (
    name: string,
    description: string,
    requiredScope: ApiCredentialScope,
    inputSchema: Record<string, z.ZodTypeAny>,
    handler: (args: Record<string, unknown>) => Promise<unknown>
  ) => {
    server.registerTool(
      name,
      { description, inputSchema },
      async (args) => {
        if (!ctx) {
          return {
            content: [{ type: "text" as const, text: "Não autenticado." }],
            isError: true
          };
        }
        if (!scopeAllowed(ctx, requiredScope) && !scopeAllowed(ctx, "full")) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Escopo insuficiente: ${requiredScope}`
              }
            ],
            isError: true
          };
        }
        try {
          const result = await handler(
            args && typeof args === "object" ? (args as Record<string, unknown>) : {}
          );
          return {
            content: [
              {
                type: "text" as const,
                text:
                  typeof result === "string"
                    ? result
                    : JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: "text" as const, text: `Erro: ${message}` }],
            isError: true
          };
        }
      }
    );
  };

  registerBuiltin(
    "crm_health",
    "Verifica conectividade com a API do CRM",
    "organization:read",
    {},
    async () => ({
      ok: true,
      service: "VBSolution CRM MCP",
      companyId: ctx?.companyId
    })
  );

  registerBuiltin(
    "crm_get_organization",
    "Dados da organização e estatísticas",
    "organization:read",
    {},
    async () => {
      const raw = await executeAiBrainCrmTool(
        "get_organization_info",
        {},
        ctx!.companyId,
        ctx!.userId
      );
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
  );

  registerBuiltin(
    "crm_list_contacts",
    "Lista contatos do CRM",
    "contacts:read",
    {
      search: z.string().optional(),
      limit: z.number().optional()
    },
    async (args) => {
      const raw = await executeAiBrainCrmTool(
        "list_contacts",
        args,
        ctx!.companyId,
        ctx!.userId
      );
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
  );

  registerBuiltin(
    "crm_list_leads_sales",
    "Lista oportunidades de venda",
    "leads:read",
    {
      search: z.string().optional(),
      status: z.string().optional()
    },
    async (args) => {
      const raw = await executeAiBrainCrmTool(
        "list_lead_sales",
        args,
        ctx!.companyId,
        ctx!.userId
      );
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
  );

  registerBuiltin(
    "crm_list_activities",
    "Lista atividades",
    "activities:read",
    { search: z.string().optional() },
    async (args) => {
      const raw = await executeAiBrainCrmTool(
        "list_activities",
        args,
        ctx!.companyId,
        ctx!.userId
      );
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
  );

  registerBuiltin(
    "crm_list_tickets",
    "Lista tickets de atendimento",
    "tickets:read",
    {
      status: z.string().optional(),
      limit: z.number().optional()
    },
    async (args) => {
      const raw = await executeAiBrainCrmTool(
        "list_tickets",
        args,
        ctx!.companyId,
        ctx!.userId
      );
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
  );

  registerBuiltin(
    "crm_dashboard",
    "Métricas do dashboard",
    "dashboard:read",
    { days: z.number().optional() },
    async (args) => {
      const raw = await executeAiBrainCrmTool(
        "get_dashboard_data",
        args,
        ctx!.companyId,
        ctx!.userId
      );
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
  );

  if (ctx && scopeAllowed(ctx, "tools:execute")) {
    for (const tool of CRM_TOOLS) {
      const fn = tool.type === "function" ? tool.function : null;
      if (!fn?.name) continue;
      if (
        fn.name.startsWith("crm_") ||
        ["crm_health", "crm_get_organization"].includes(fn.name)
      ) {
        continue;
      }

      try {
        const inputSchema = jsonSchemaToZodShape(
          fn.parameters as Record<string, unknown> | undefined
        );
        server.registerTool(
          fn.name,
          {
            description: fn.description || fn.name,
            inputSchema
          },
          async (args) => {
            const raw = await executeAiBrainCrmTool(
              fn.name,
              args && typeof args === "object" ? args : {},
              ctx.companyId,
              ctx.userId
            );
            return {
              content: [{ type: "text" as const, text: raw }]
            };
          }
        );
      } catch (err) {
        logger.warn(
          { err, tool: fn.name },
          "[MCP] Ignorando tool com schema inválido"
        );
      }
    }
  }

  return server;
}
