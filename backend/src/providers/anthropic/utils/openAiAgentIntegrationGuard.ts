/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ListSettingsServiceOne from "../../../services/SettingServices/ListSettingsServiceOne";

export type ParsedAgentIntegration = Record<string, unknown>;

export function parseAgentIntegrationJson(raw: unknown): ParsedAgentIntegration {
  if (!raw) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : (raw as ParsedAgentIntegration);
  } catch {
    return {};
  }
}

/** GPT e Claude podem coexistir — mantido por compatibilidade de API (sempre false). */
export function isOpenAiIntegrationBlockingAnthropic(_v: ParsedAgentIntegration): boolean {
  return false;
}

export async function getOpenAiBlockingAnthropic(
  companyId: number
): Promise<{ blocking: boolean; parsed: ParsedAgentIntegration }> {
  const row = await ListSettingsServiceOne({ companyId, key: "agent_integration" });
  const parsed = parseAgentIntegrationJson(row?.value);
  return { blocking: false, parsed };
}
