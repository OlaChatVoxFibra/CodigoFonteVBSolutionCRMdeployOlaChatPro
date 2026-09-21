/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import ApiCredential from "../models/ApiCredential";
import CreateApiCredentialService from "../services/ApiCredentialServices/CreateApiCredentialService";
import ListApiCredentialsService from "../services/ApiCredentialServices/ListApiCredentialsService";
import RevokeApiCredentialService from "../services/ApiCredentialServices/RevokeApiCredentialService";
import {
  ALL_API_SCOPES,
  API_SCOPE_LABELS
} from "../helpers/apiKeyScopes";
import {
  decryptApiKeySecret,
  maskApiKey
} from "../helpers/apiKeyCrypto";
import { resolvePublicBackendUrl } from "../utils/appUrlUtils";
import AppError from "../errors/AppError";

function getUserCompanyId(req: Request): number {
  const raw =
    req.user?.companyId ?? (req.user as { company?: { id?: number } })?.company?.id;
  const companyId = Number(raw);
  if (!Number.isFinite(companyId) || companyId <= 0) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 403);
  }
  return companyId;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = getUserCompanyId(req);
  const credentials = await ListApiCredentialsService({ companyId });

  return res.json(
    credentials.map(c => ({
      id: c.id,
      name: c.name,
      companyId: c.companyId,
      companyName: c.company?.name || null,
      keyPrefix: c.keyPrefix,
      maskedKey: maskApiKey(c.keyPrefix),
      canReveal: Boolean(c.keyEncrypted),
      scopes: c.scopes,
      lastUsedAt: c.lastUsedAt,
      expiresAt: c.expiresAt,
      createdAt: c.createdAt
    }))
  );
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const companyId = getUserCompanyId(req);
  const { name, scopes, expiresAt } = req.body;

  const { credential, key } = await CreateApiCredentialService({
    name,
    companyId,
    scopes,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    createdByUserId: Number(req.user.id)
  });

  return res.status(201).json({
    key,
    credential: {
      id: credential.id,
      name: credential.name,
      companyId: credential.companyId,
      keyPrefix: credential.keyPrefix,
      maskedKey: maskApiKey(credential.keyPrefix),
      canReveal: Boolean(credential.keyEncrypted),
      scopes: credential.scopes,
      expiresAt: credential.expiresAt,
      createdAt: credential.createdAt
    },
    message:
      "Guarde esta chave agora. Por segurança, ela não será exibida novamente."
  });
};

export const reveal = async (req: Request, res: Response): Promise<Response> => {
  const companyId = getUserCompanyId(req);
  const credential = await ApiCredential.findOne({
    where: {
      id: Number(req.params.id),
      companyId
    }
  });

  if (credential?.revokedAt) {
    throw new AppError("ERR_API_CREDENTIAL_NOT_FOUND", 404);
  }

  if (!credential || !credential.keyEncrypted) {
    throw new AppError("ERR_API_CREDENTIAL_NOT_FOUND", 404);
  }

  const key = decryptApiKeySecret(credential.keyEncrypted);
  if (!key) {
    throw new AppError("ERR_API_CREDENTIAL_REVEAL_FAILED", 500);
  }

  return res.json({ key });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const companyId = getUserCompanyId(req);
  await RevokeApiCredentialService(Number(req.params.id), companyId);
  return res.status(200).json({ message: "Credencial revogada com sucesso." });
};

export const config = async (req: Request, res: Response): Promise<Response> => {
  const backendUrl = resolvePublicBackendUrl(req);

  return res.json({
    apiBaseUrl: `${backendUrl}/api/v1/crm`,
    backendUrl,
    mcpPackage: "@vbsolution/crm-mcp",
    mcpTransport: "stdio",
    mcpHttpUrl: `${backendUrl}/mcp`,
    mcpHttpTransport: "streamable-http",
    mcpApiUrl: `${backendUrl}/api/v1/crm`,
    mcpEnvExample: {
      VBSOLUTION_API_KEY: "<sua_api_key>",
      VBSOLUTION_API_URL: `${backendUrl}/api/v1/crm`
    },
    mcpNote:
      "Para Claude Web e outros clientes remotos, use a URL MCP HTTP (/mcp) com OAuth — ao vincular, cole sua API Key na tela de autorização. Para Claude Desktop, Cursor e VS Code, use o pacote stdio (JSON abaixo).",
    credentialScope: "organization",
    credentialNote:
      "Cada organização gera suas próprias credenciais. A API Key acessa apenas os dados da sua conta.",
    scopes: ALL_API_SCOPES.map(scope => ({
      id: scope,
      label: API_SCOPE_LABELS[scope]
    })),
    authHeader: "Authorization: Bearer <sua_api_key>",
    altAuthHeader: "X-API-Key: <sua_api_key>",
    integrations: [
      {
        name: "Zapier",
        description: "Automatize fluxos com webhooks e REST API",
        docs: "https://zapier.com/apps/webhook/integrations"
      },
      {
        name: "Make (Integromat)",
        description: "Conecte módulos HTTP com a API REST do CRM",
        docs: "https://www.make.com/en/integrations"
      },
      {
        name: "Claude Desktop / Claude Code",
        description:
          "Adicione o servidor MCP nas configurações do assistente. Ele consulta leads, contatos e tickets da sua organização.",
        docs: "https://docs.anthropic.com/en/docs/build-with-claude/mcp"
      },
      {
        name: "Claude Web (claude.ai)",
        description:
          "Conector personalizado com URL MCP HTTP. Use a URL /mcp (não /api/v1/crm). Ao vincular, informe sua API Key na tela de autorização OAuth.",
        docs: "https://docs.anthropic.com/en/docs/build-with-claude/mcp"
      },
      {
        name: "Cursor / VS Code",
        description:
          "Registre o pacote @vbsolution/crm-mcp nas configurações MCP do editor. O assistente passa a usar dados reais do CRM.",
        docs: "https://docs.cursor.com/context/mcp"
      },
      {
        name: "Brain.AI (VBSolution)",
        description:
          "O Brain já acessa leads, contatos e atividades do CRM nativamente. O conector MCP manual do Brain é para servidores HTTP externos — não para o pacote @vbsolution/crm-mcp.",
        docs: null
      },
      {
        name: "n8n",
        description: "Workflows open-source com HTTP Request nodes",
        docs: "https://n8n.io/integrations"
      }
    ],
    endpoints: [
      { method: "GET", path: "/health", scope: null },
      { method: "GET", path: "/me", scope: "organization:read" },
      { method: "GET", path: "/contacts", scope: "contacts:read" },
      { method: "POST", path: "/contacts", scope: "contacts:write" },
      { method: "GET", path: "/activities", scope: "activities:read" },
      { method: "POST", path: "/activities", scope: "activities:write" },
      { method: "GET", path: "/leads-sales", scope: "leads:read" },
      { method: "POST", path: "/leads-sales", scope: "leads:write" },
      { method: "GET", path: "/converted-leads", scope: "leads:read" },
      { method: "GET", path: "/tickets", scope: "tickets:read" },
      { method: "GET", path: "/pipelines", scope: "leads:read" },
      { method: "GET", path: "/dashboard", scope: "dashboard:read" },
      { method: "GET", path: "/tools", scope: "tools:execute" },
      { method: "POST", path: "/tools/:toolName", scope: "tools:execute" }
    ],
    mcpConfigExample: {
      mcpServers: {
        "vbsolution-crm": {
          command: "npx",
          args: ["-y", "@vbsolution/crm-mcp@latest"],
          env: {
            VBSOLUTION_API_KEY: "<sua_api_key>",
            VBSOLUTION_API_URL: `${backendUrl}/api/v1/crm`
          }
        }
      }
    }
  });
};
