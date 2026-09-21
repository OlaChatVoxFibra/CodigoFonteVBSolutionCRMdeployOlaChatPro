/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import User from "../../../models/User";
import AppError from "../../../errors/AppError";
import {
  getAnthropicIntegrationPublic,
  saveAnthropicIntegration,
  testAnthropicIntegration
} from "../services/AnthropicIntegrationService";
import {
  createMultiAgent,
  deleteMultiAgent,
  getMultiAgent,
  listMultiAgents,
  updateMultiAgent
} from "../services/AnthropicMultiAgentService";
import { testAnthropicMultiAgent } from "../services/testAnthropicMultiAgent";
import { listConnectionAgentOptions } from "../services/resolveConnectionAgent";
import {
  createAnthropicMultiAgentSmartActionFromPreset,
  listAnthropicMultiAgentSmartActions,
  updateAnthropicMultiAgentSmartAction
} from "../services/AnthropicMultiAgentSmartActionService";

async function assertAdmin(req: Request) {
  const authUser = await User.findByPk(req.user.id);
  if (!authUser) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }
  if (authUser.profile !== "admin" && !authUser.super) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
}

export const showIntegration = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = await getAnthropicIntegrationPublic(companyId);
  return res.status(200).json(data);
};

export const updateIntegration = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const data = await saveAnthropicIntegration({
    companyId,
    enabled: Boolean(b.enabled),
    apiKey: b.apiKey !== undefined ? String(b.apiKey) : undefined,
    defaultModel: String(b.defaultModel || "claude-sonnet-4-5-20250929"),
    scope: String(b.scope || "Pessoal"),
    temperature: Number(b.temperature ?? 1),
    topP: Number(b.topP ?? 1),
    presencePenalty: Number(b.presencePenalty ?? 0),
    frequencyPenalty: Number(b.frequencyPenalty ?? 0),
    stopSequences: String(b.stopSequences || "")
  });
  return res.status(200).json(data);
};

export const postTest = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const result = await testAnthropicIntegration({
    companyId,
    prompt: String(b.prompt || ""),
    model: String(b.model || ""),
    maxTokens: Number(b.maxTokens ?? 512),
    temperature: Number(b.temperature ?? 1),
    apiKeyOverride: b.apiKey != null ? String(b.apiKey) : undefined
  });
  return res.status(200).json(result);
};

export const indexMultiAgents = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const rows = await listMultiAgents(companyId);
  return res.status(200).json(rows);
};

export const postMultiAgentTest = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const result = await testAnthropicMultiAgent({
    companyId,
    userMessage: String(b.userMessage || b.prompt || ""),
    agentId: b.agentId != null ? Number(b.agentId) : undefined,
    profileJson: b.profileJson,
    model: b.model != null ? String(b.model) : undefined,
    maxTokens: b.maxTokens != null ? Number(b.maxTokens) : undefined,
    temperature: b.temperature != null ? Number(b.temperature) : undefined
  });
  return res.status(200).json(result);
};

export const createMultiAgentCtl = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const row = await createMultiAgent({
    companyId,
    name: String(b.name || "").trim() || "Agente",
    systemPrompt: String(b.systemPrompt || ""),
    model: String(b.model || "claude-sonnet-4-5-20250929"),
    temperature: Number(b.temperature ?? 1),
    topP: Number(b.topP ?? 1),
    enabled: b.enabled !== false,
    profileJson: b.profileJson != null ? b.profileJson : null
  });
  return res.status(200).json(row);
};

export const showMultiAgentCtl = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const row = await getMultiAgent(companyId, id);
  return res.status(200).json(row);
};

export const patchMultiAgentCtl = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const row = await updateMultiAgent(companyId, id, req.body || {});
  return res.status(200).json(row);
};

export const removeMultiAgentCtl = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const out = await deleteMultiAgent(companyId, id);
  return res.status(200).json(out);
};

export const connectionAgentOptions = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = await listConnectionAgentOptions(companyId);
  return res.status(200).json(data);
};

export const listAnthropicSmartActions = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const agentId = Number(req.params.id);
  const actions = await listAnthropicMultiAgentSmartActions(companyId, agentId);
  return res.status(200).json({ actions });
};

export const createAnthropicSmartAction = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const agentId = Number(req.params.id);
  const slug = String((req.body || {}).slug || "");
  const out = await createAnthropicMultiAgentSmartActionFromPreset(companyId, agentId, slug);
  return res.status(out.created ? 201 : 200).json(out);
};

export const patchAnthropicSmartAction = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const agentId = Number(req.params.id);
  const actionId = Number(req.params.actionId);
  const action = await updateAnthropicMultiAgentSmartAction(
    companyId,
    agentId,
    actionId,
    (req.body || {}) as Record<string, unknown>
  );
  return res.status(200).json({ action });
};
