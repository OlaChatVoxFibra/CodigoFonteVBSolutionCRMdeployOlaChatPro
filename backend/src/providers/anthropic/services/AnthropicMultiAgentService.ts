/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AnthropicMultiAgent from "../../../models/AnthropicMultiAgent";
import AppError from "../../../errors/AppError";
import { ANTHROPIC_ALLOWED_MODEL_IDS, AnthropicAllowedModelId } from "../utils/isClaudeModel";
import { compileAnthropicAgentFromProfile } from "../utils/anthropicAgentProfile";

export async function listMultiAgents(companyId: number) {
  return AnthropicMultiAgent.findAll({
    where: { companyId },
    order: [["updatedAt", "DESC"]],
    attributes: ["id", "name", "model", "temperature", "topP", "enabled", "updatedAt", "createdAt"]
  });
}

export async function getMultiAgent(companyId: number, id: number) {
  const row = await AnthropicMultiAgent.findOne({ where: { id, companyId } });
  if (!row) throw new AppError("Agente não encontrado.", 404);
  return row;
}

export async function createMultiAgent(params: {
  companyId: number;
  name: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  topP: number;
  enabled?: boolean;
  profileJson?: Record<string, unknown> | null;
}) {
  if (!ANTHROPIC_ALLOWED_MODEL_IDS.includes(params.model as AnthropicAllowedModelId)) {
    throw new AppError("Modelo Anthropic inválido.", 422);
  }
  const compiled = compileAnthropicAgentFromProfile(params.profileJson, {
    name: params.name.trim(),
    systemPrompt: params.systemPrompt || "",
    model: params.model,
    temperature: params.temperature,
    topP: params.topP
  });
  return AnthropicMultiAgent.create({
    companyId: params.companyId,
    name: compiled.name,
    systemPrompt: compiled.systemPrompt,
    model: compiled.model,
    temperature: compiled.temperature,
    topP: compiled.topP,
    enabled: params.enabled !== false,
    profileJson: params.profileJson ?? null
  });
}

export async function updateMultiAgent(
  companyId: number,
  id: number,
  patch: Partial<{
    name: string;
    systemPrompt: string;
    model: string;
    temperature: number;
    topP: number;
    enabled: boolean;
    profileJson: Record<string, unknown> | null;
  }>
) {
  const row = await getMultiAgent(companyId, id);
  if (patch.profileJson !== undefined) {
    row.profileJson = patch.profileJson;
    const compiled = compileAnthropicAgentFromProfile(row.profileJson, {
      name: patch.name != null ? patch.name.trim() : row.name,
      systemPrompt: patch.systemPrompt != null ? patch.systemPrompt : row.systemPrompt,
      model: patch.model != null ? patch.model : row.model,
      temperature: patch.temperature != null ? patch.temperature : row.temperature,
      topP: patch.topP != null ? patch.topP : row.topP
    });
    row.name = compiled.name;
    row.systemPrompt = compiled.systemPrompt;
    row.model = compiled.model;
    row.temperature = compiled.temperature;
    row.topP = compiled.topP;
  } else {
    if (patch.model != null) {
      if (!ANTHROPIC_ALLOWED_MODEL_IDS.includes(patch.model as AnthropicAllowedModelId)) {
        throw new AppError("Modelo Anthropic inválido.", 422);
      }
      row.model = patch.model;
    }
    if (patch.name != null) row.name = patch.name.trim();
    if (patch.systemPrompt != null) row.systemPrompt = patch.systemPrompt;
    if (patch.temperature != null) row.temperature = patch.temperature;
    if (patch.topP != null) row.topP = patch.topP;
  }
  if (patch.enabled != null) row.enabled = patch.enabled;
  await row.save();
  return row;
}

export async function deleteMultiAgent(companyId: number, id: number) {
  const row = await AnthropicMultiAgent.findOne({ where: { id, companyId } });
  if (!row) throw new AppError("Agente não encontrado.", 404);
  await row.destroy();
  return { success: true };
}
