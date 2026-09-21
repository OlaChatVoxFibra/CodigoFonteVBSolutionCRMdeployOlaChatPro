/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Gatilhos e autorização para ações internas de CRM (lead, atividade).
 * Usa os padrões configurados em cada ação inteligente do agente.
 */

import { triggerPatternMatches } from "./assistantScheduleIntent";

export function userMessageMatchesActionTriggers(
  text: string,
  userTriggerPatterns: string[]
): boolean {
  if (!Array.isArray(userTriggerPatterns) || !userTriggerPatterns.length) return false;
  const raw = String(text || "");
  return userTriggerPatterns.some((p) => triggerPatternMatches(raw, String(p || "")));
}

export function assistantTextMatchesActionTriggers(
  text: string,
  agentTriggerPatterns: string[]
): boolean {
  if (!Array.isArray(agentTriggerPatterns) || !agentTriggerPatterns.length) return false;
  const raw = String(text || "");
  return agentTriggerPatterns.some((p) => triggerPatternMatches(raw, String(p || "")));
}

/** Cliente enviou dados úteis para cadastro de lead (e-mail, telefone, nome explícito). */
export function userProvidesLeadContactData(text: string): boolean {
  const raw = String(text || "").trim();
  if (!raw || raw.length < 3) return false;
  if (/@[a-z0-9.-]+\.[a-z]{2,}/i.test(raw)) return true;
  const digits = raw.replace(/\D/g, "");
  if (digits.length >= 10) return true;
  if (/\b(meu\s+)?nome\s*(é|:)/i.test(raw)) return true;
  if (/\b(nome|telefone|whats|celular|e-?mail)\s*:/i.test(raw)) return true;
  return false;
}

export function leadExecutionAuthorized(params: {
  userText: string;
  lastAssistantText: string;
  agentReply?: string;
  userTriggerPatterns: string[];
  agentTriggerPatterns: string[];
}): boolean {
  const userHit = userMessageMatchesActionTriggers(params.userText, params.userTriggerPatterns);
  if (userHit) return true;

  const agentPatterns = params.agentTriggerPatterns;
  if (!agentPatterns.length) return false;

  const agentCollecting =
    assistantTextMatchesActionTriggers(params.lastAssistantText, agentPatterns) ||
    assistantTextMatchesActionTriggers(String(params.agentReply || ""), agentPatterns);

  return agentCollecting && userProvidesLeadContactData(params.userText);
}

export function activityExecutionAuthorized(params: {
  userText: string;
  lastAssistantText: string;
  agentReply?: string;
  userTriggerPatterns: string[];
  agentTriggerPatterns: string[];
}): boolean {
  const userHit = userMessageMatchesActionTriggers(params.userText, params.userTriggerPatterns);
  if (userHit) return true;

  const agentPatterns = params.agentTriggerPatterns;
  if (!agentPatterns.length) return false;

  return (
    assistantTextMatchesActionTriggers(params.lastAssistantText, agentPatterns) ||
    assistantTextMatchesActionTriggers(String(params.agentReply || ""), agentPatterns)
  );
}

export function isSilentCustomerSmartActionSlug(slug: string): boolean {
  const s = String(slug || "").toLowerCase().replace(/_/g, "");
  return (
    s === "criarlead" ||
    s.includes("criarlead") ||
    s === "criaratividade" ||
    s.includes("criaratividade") ||
    s === "criarcontato" ||
    s.includes("criarcontato")
  );
}
