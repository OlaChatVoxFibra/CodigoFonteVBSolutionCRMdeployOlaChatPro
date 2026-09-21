/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type { ApiCredentialScope } from "../models/ApiCredential";

export const ALL_API_SCOPES: ApiCredentialScope[] = [
  "contacts:read",
  "contacts:write",
  "activities:read",
  "activities:write",
  "leads:read",
  "leads:write",
  "tickets:read",
  "dashboard:read",
  "organization:read",
  "tools:execute",
  "full"
];

export const API_SCOPE_LABELS: Record<ApiCredentialScope, string> = {
  "contacts:read": "Ler contatos",
  "contacts:write": "Criar/editar contatos",
  "activities:read": "Ler atividades",
  "activities:write": "Criar/editar atividades",
  "leads:read": "Ler leads e oportunidades",
  "leads:write": "Criar/editar leads",
  "tickets:read": "Ler tickets/atendimentos",
  "dashboard:read": "Ler métricas e dashboard",
  "organization:read": "Ler dados da organização",
  "tools:execute": "Executar ferramentas CRM (MCP/IA)",
  full: "Acesso completo"
};

export function hasApiScope(
  scopes: string[] | null | undefined,
  required: ApiCredentialScope
): boolean {
  const list = Array.isArray(scopes) ? scopes : [];
  if (list.includes("full") || list.includes("*")) return true;
  return list.includes(required);
}

export function normalizeScopes(input: unknown): ApiCredentialScope[] {
  if (!Array.isArray(input)) return ["full"];
  const valid = input.filter(
    (s): s is ApiCredentialScope =>
      typeof s === "string" && ALL_API_SCOPES.includes(s as ApiCredentialScope)
  );
  return valid.length > 0 ? valid : ["full"];
}
