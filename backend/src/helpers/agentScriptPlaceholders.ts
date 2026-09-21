/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type AgentScriptPlaceholderContext = {
  contactName: string;
  agentName: string;
  companyName: string;
  phone: string;
  now: Date;
};

/**
 * Substitui placeholders do roteiro/regras no texto enviado ao modelo (valores reais por atendimento).
 * Chaves estáveis em `{snake_case}`; aliases legados entre parênteses nos comentários.
 */
export function expandAgentScriptPlaceholders(
  text: string,
  ctx: AgentScriptPlaceholderContext
): string {
  if (!text || typeof text !== "string") return "";
  const { contactName, agentName, companyName, phone, now } = ctx;
  const safe = (s: string) => String(s ?? "").trim();

  const map: Record<string, string> = {
    nome_contato: safe(contactName) || "—",
    nome_cliente: safe(contactName) || "—",
    nome_agente: safe(agentName) || "—",
    nome_empresa: safe(companyName) || "—",
    data_hora: format(now, "dd/MM/yyyy HH:mm", { locale: ptBR }),
    ano: format(now, "yyyy", { locale: ptBR }),
    mes_atual: format(now, "MMMM", { locale: ptBR }),
    telefone: safe(phone) || "—",
    data_completa: format(now, "dd/MM/yyyy", { locale: ptBR })
  };

  let out = text;
  for (const [key, val] of Object.entries(map)) {
    const re = new RegExp(`\\{${key}\\}`, "gi");
    out = out.replace(re, val);
  }
  return out;
}
