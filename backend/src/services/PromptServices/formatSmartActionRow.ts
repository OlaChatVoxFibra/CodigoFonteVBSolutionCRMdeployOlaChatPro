/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { ACTION_PRESET_DEFS } from "./ActionPresetDefs";

const normalizePatternList = (value: unknown): string[] => {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index);
};

const mergePatternLists = (...lists: unknown[]): string[] =>
  lists
    .flatMap((list) => normalizePatternList(list))
    .filter((item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index);

const findActionPresetForRow = (row: Record<string, any>) => {
  const slug = String(row.slug || "").toLowerCase();
  const type = String(row.type || "").toLowerCase();
  const name = String(row.name || "").toLowerCase();
  return (
    ACTION_PRESET_DEFS.find(
      (preset) =>
        preset.slug.toLowerCase() === slug ||
        preset.type.toLowerCase() === type ||
        preset.name.toLowerCase() === name
    ) || null
  );
};

/** Formato API compartilhado entre Prompt OpenAI e multi-agente Claude. */
export function formatSmartActionRowForApi(row: Record<string, any>) {
  const preset = findActionPresetForRow(row);
  const savedAgentPatterns = normalizePatternList(row.agentTriggerPatterns);
  const savedUserPatterns = normalizePatternList(row.userTriggerPatterns);
  const presetAgentPatterns = normalizePatternList(preset?.agentTriggerPatterns || []);
  const presetUserPatterns = normalizePatternList(preset?.userTriggerPatterns || []);
  const hasSavedAgentPatterns = Array.isArray(row.agentTriggerPatterns);
  const hasSavedUserPatterns = Array.isArray(row.userTriggerPatterns);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    description: row.description,
    enabled: row.enabled !== false,
    agentTriggerPatterns: hasSavedAgentPatterns ? savedAgentPatterns : presetAgentPatterns,
    userTriggerPatterns: hasSavedUserPatterns ? savedUserPatterns : presetUserPatterns,
    availableAgentTriggerPatterns: mergePatternLists(presetAgentPatterns, savedAgentPatterns),
    availableUserTriggerPatterns: mergePatternLists(presetUserPatterns, savedUserPatterns),
    intentSlotSchema: Array.isArray(row.intentSlotSchema)
      ? row.intentSlotSchema
      : preset?.intentSlotSchema || [],
    variables: row.variables && typeof row.variables === "object" ? row.variables : {},
    apiUrl: row.apiUrl,
    responseMessage: row.responseMessage,
    autoExecute: !!row.autoExecute
  };
}
