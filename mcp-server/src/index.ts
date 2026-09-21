#!/usr/bin/env node
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const API_KEY = process.env.VBSOLUTION_API_KEY || process.env.VB_CRM_API_KEY || "";
const API_URL = (
  process.env.VBSOLUTION_API_URL ||
  process.env.VB_CRM_API_URL ||
  "http://localhost:3000/api/v1/crm"
).replace(/\/+$/, "");

if (!API_KEY) {
  console.error(
    "VBSOLUTION_API_KEY is required. Set it in your MCP config env block."
  );
  process.exit(1);
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // keep text
  }

  if (!res.ok) {
    throw new Error(
      `API ${res.status}: ${typeof body === "object" ? JSON.stringify(body) : text}`
    );
  }

  return body;
}

let cachedTools: Array<{
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}> = [];

async function loadTools() {
  const data = (await apiFetch("/tools")) as {
    tools?: Array<{
      name: string;
      description?: string;
      parameters?: Record<string, unknown>;
    }>;
  };

  cachedTools = (data.tools || []).map(t => ({
    name: t.name,
    description: t.description,
    inputSchema: t.parameters || { type: "object", properties: {} }
  }));

  cachedTools.unshift(
    {
      name: "crm_health",
      description: "Check CRM API connectivity and status",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "crm_get_organization",
      description: "Get organization/company info and stats",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "crm_list_contacts",
      description: "List CRM contacts with optional search",
      inputSchema: {
        type: "object",
        properties: {
          searchParam: { type: "string" },
          pageNumber: { type: "string" }
        }
      }
    },
    {
      name: "crm_list_leads_sales",
      description: "List sales leads/opportunities",
      inputSchema: {
        type: "object",
        properties: {
          searchParam: { type: "string" },
          status: { type: "string" },
          pageNumber: { type: "string" }
        }
      }
    },
    {
      name: "crm_list_activities",
      description: "List CRM activities/tasks",
      inputSchema: {
        type: "object",
        properties: {
          searchParam: { type: "string" },
          pageNumber: { type: "string" }
        }
      }
    },
    {
      name: "crm_list_tickets",
      description: "List support tickets",
      inputSchema: {
        type: "object",
        properties: {
          status: { type: "string" },
          limit: { type: "number" }
        }
      }
    },
    {
      name: "crm_dashboard",
      description: "Get CRM dashboard metrics",
      inputSchema: {
        type: "object",
        properties: {
          days: { type: "number" }
        }
      }
    }
  );
}

const server = new Server(
  {
    name: "vbsolution-crm",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  if (!cachedTools.length) {
    await loadTools();
  }
  return { tools: cachedTools };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;
  const payload = (args && typeof args === "object" ? args : {}) as Record<
    string,
    unknown
  >;

  try {
    let result: unknown;

    switch (name) {
      case "crm_health":
        result = await apiFetch("/health");
        break;
      case "crm_get_organization":
        result = await apiFetch("/me");
        break;
      case "crm_list_contacts": {
        const qs = new URLSearchParams();
        if (payload.searchParam) qs.set("searchParam", String(payload.searchParam));
        if (payload.pageNumber) qs.set("pageNumber", String(payload.pageNumber));
        result = await apiFetch(`/contacts?${qs}`);
        break;
      }
      case "crm_list_leads_sales": {
        const qs = new URLSearchParams();
        if (payload.searchParam) qs.set("searchParam", String(payload.searchParam));
        if (payload.status) qs.set("status", String(payload.status));
        if (payload.pageNumber) qs.set("pageNumber", String(payload.pageNumber));
        result = await apiFetch(`/leads-sales?${qs}`);
        break;
      }
      case "crm_list_activities": {
        const qs = new URLSearchParams();
        if (payload.searchParam) qs.set("searchParam", String(payload.searchParam));
        if (payload.pageNumber) qs.set("pageNumber", String(payload.pageNumber));
        result = await apiFetch(`/activities?${qs}`);
        break;
      }
      case "crm_list_tickets": {
        const qs = new URLSearchParams();
        if (payload.status) qs.set("status", String(payload.status));
        if (payload.limit) qs.set("limit", String(payload.limit));
        result = await apiFetch(`/tickets?${qs}`);
        break;
      }
      case "crm_dashboard": {
        const qs = new URLSearchParams();
        if (payload.days) qs.set("days", String(payload.days));
        result = await apiFetch(`/dashboard?${qs}`);
        break;
      }
      default:
        result = await apiFetch(`/tools/${encodeURIComponent(name)}`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
    }

    return {
      content: [
        {
          type: "text",
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
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true
    };
  }
});

async function main() {
  await loadTools();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
