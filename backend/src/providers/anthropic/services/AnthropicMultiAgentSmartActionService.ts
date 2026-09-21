/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import PromptSmartAction from "../../../models/PromptSmartAction";
import AnthropicMultiAgent from "../../../models/AnthropicMultiAgent";
import AppError from "../../../errors/AppError";
import { ACTION_PRESET_DEFS } from "../../../services/PromptServices/ActionPresetDefs";
import { formatSmartActionRowForApi } from "../../../services/PromptServices/formatSmartActionRow";

async function assertAnthropicAgent(companyId: number, agentId: number) {
  const agent = await AnthropicMultiAgent.findOne({
    where: { id: agentId, companyId }
  });
  if (!agent) {
    throw new AppError("Agente Claude não encontrado.", 404);
  }
  return agent;
}

export async function listAnthropicMultiAgentSmartActions(
  companyId: number,
  agentId: number
) {
  await assertAnthropicAgent(companyId, agentId);
  const actions = await PromptSmartAction.findAll({
    where: { companyId, anthropicMultiAgentId: agentId },
    order: [["id", "ASC"]]
  });
  return actions.map((a) => formatSmartActionRowForApi(a.toJSON() as any));
}

export async function createAnthropicMultiAgentSmartActionFromPreset(
  companyId: number,
  agentId: number,
  slugRaw: string
) {
  await assertAnthropicAgent(companyId, agentId);
  const slug = String(slugRaw || "")
    .trim()
    .toLowerCase();
  if (!slug) {
    throw new AppError("slug do preset é obrigatório.", 400);
  }
  const preset = ACTION_PRESET_DEFS.find((p) => p.slug.toLowerCase() === slug);
  if (!preset) {
    throw new AppError("preset não encontrado.", 400);
  }
  const existing = await PromptSmartAction.findOne({
    where: { companyId, anthropicMultiAgentId: agentId, slug: preset.slug }
  });
  if (existing) {
    return { action: formatSmartActionRowForApi(existing.toJSON() as any), created: false };
  }
  const defaultVars =
    preset.agentSpeechPrompt && String(preset.agentSpeechPrompt).trim()
      ? { agentSpeechPrompt: String(preset.agentSpeechPrompt).trim() }
      : null;
  const row = await PromptSmartAction.create({
    companyId,
    promptId: null,
    anthropicMultiAgentId: agentId,
    name: preset.name,
    slug: preset.slug,
    type: preset.type,
    description: preset.description || null,
    enabled: true,
    agentTriggerPatterns: preset.agentTriggerPatterns,
    userTriggerPatterns: preset.userTriggerPatterns,
    intentSlotSchema: preset.intentSlotSchema || [],
    variables: defaultVars,
    confirm: false,
    autoExecute: false,
    responseMessage: null
  } as any);
  return { action: formatSmartActionRowForApi(row.toJSON() as any), created: true };
}

export async function updateAnthropicMultiAgentSmartAction(
  companyId: number,
  agentId: number,
  actionId: number,
  body: Record<string, unknown>
) {
  await assertAnthropicAgent(companyId, agentId);
  const action = await PromptSmartAction.findOne({
    where: { id: actionId, companyId, anthropicMultiAgentId: agentId }
  });
  if (!action) {
    throw new AppError("ação não encontrada.", 404);
  }
  const patch: Record<string, unknown> = {};
  if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled);
  if (body.agentTriggerPatterns !== undefined) {
    patch.agentTriggerPatterns = body.agentTriggerPatterns;
  }
  if (body.userTriggerPatterns !== undefined) {
    patch.userTriggerPatterns = body.userTriggerPatterns;
  }
  if (body.variables !== undefined) patch.variables = body.variables;
  if (body.description !== undefined) patch.description = body.description;
  if (Object.keys(patch).length) {
    await action.update(patch as any);
  }
  const fresh = await PromptSmartAction.findByPk(action.id);
  return fresh ? formatSmartActionRowForApi(fresh.toJSON() as any) : null;
}
