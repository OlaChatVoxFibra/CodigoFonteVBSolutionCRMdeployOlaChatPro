/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { buildDefaultAgentV2 } from "./defaultAgentV2";

export function buildDefaultAnthropicAgentV2(integrationState = {}) {
  const base = buildDefaultAgentV2({
    apiKey: "",
    model: integrationState?.defaultModel || "claude-3-7-sonnet-latest",
    temperature: integrationState?.temperature ?? 1,
    topP: integrationState?.topP ?? 1
  });
  base.schemaVersion = 2;
  base.integration = {
    ...base.integration,
    apiKey: "",
    responderGrupo: false,
    model: integrationState?.defaultModel || "claude-3-7-sonnet-latest",
    temperature: integrationState?.temperature ?? 1,
    topP: integrationState?.topP ?? 1,
    maxTokens: 4096
  };
  base.agent.name = "Novo agente Claude";
  return base;
}

export function multiAgentRowToV2(row, integrationDefaults = {}) {
  if (!row) return buildDefaultAnthropicAgentV2(integrationDefaults);
  const profile = row.profileJson;
  if (profile && Number(profile.schemaVersion) === 2) {
    const v2 = JSON.parse(JSON.stringify(profile));
    v2.schemaVersion = 2;
    v2.agent = { ...v2.agent, name: row.name || v2.agent?.name || "Agente" };
    v2.integration = {
      ...v2.integration,
      model: row.model || v2.integration?.model || "claude-3-7-sonnet-latest",
      temperature: row.temperature ?? v2.integration?.temperature ?? 1,
      topP: row.topP ?? v2.integration?.topP ?? 1
    };
    return v2;
  }
  const v2 = buildDefaultAnthropicAgentV2({
    defaultModel: row.model,
    temperature: row.temperature,
    topP: row.topP
  });
  v2.agent.name = row.name || v2.agent.name;
  v2.generalRules = row.systemPrompt || "";
  return v2;
}

export function v2ToMultiAgentPayload(v2) {
  const name = String(v2?.agent?.name || "").trim() || "Agente";
  const model = String(v2?.integration?.model || "claude-3-7-sonnet-latest").trim();
  const temperature = Number(v2?.integration?.temperature ?? 1);
  const topP = Number(v2?.integration?.topP ?? 1);
  const generalRules = String(v2?.generalRules || "").trim();
  const script = String(v2?.attendance?.script || "").trim();
  const parts = [generalRules, script && `ROTEIRO:\n${script}`].filter(Boolean);
  return {
    name,
    model,
    temperature,
    topP,
    profileJson: { ...v2, schemaVersion: 2 },
    systemPrompt: parts.join("\n\n").trim()
  };
}
