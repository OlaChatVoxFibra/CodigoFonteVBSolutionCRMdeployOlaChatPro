/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  AgentProactiveSettings,
  defaultHotLeadKeywords
} from "../../types/agentProactiveSettings";

export function textMatchesHotLead(text: string, settings: AgentProactiveSettings): boolean {
  const t = (text || "").toLowerCase().trim();
  if (!t) return false;
  const keys = (
    settings.hotLeadKeywords?.length ? settings.hotLeadKeywords : defaultHotLeadKeywords
  ).map(k => k.toLowerCase().trim()).filter(Boolean);
  return keys.some(k => t.includes(k));
}
