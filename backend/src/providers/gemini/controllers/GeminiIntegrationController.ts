/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import User from "../../../models/User";
import AppError from "../../../errors/AppError";
import {
  getGeminiIntegrationPublic,
  saveGeminiIntegration,
  testGeminiIntegration
} from "../services/GeminiIntegrationService";

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
  const data = await getGeminiIntegrationPublic(companyId);
  return res.status(200).json(data);
};

export const updateIntegration = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const data = await saveGeminiIntegration({
    companyId,
    enabled: Boolean(b.enabled),
    apiKey: b.apiKey !== undefined ? String(b.apiKey) : undefined,
    defaultModel: String(b.defaultModel || "gemini-2.5-flash"),
    scope: String(b.scope || "Pessoal"),
    temperature: Number(b.temperature ?? 1),
    topP: Number(b.topP ?? 0.95),
    topK: Number(b.topK ?? 40),
    maxOutputTokens: Number(b.maxOutputTokens ?? 8192),
    multimodalEnabled: b.multimodalEnabled !== false,
    toolsEnabled: b.toolsEnabled !== false,
    groundingEnabled: Boolean(b.groundingEnabled),
    capabilities: b.capabilities && typeof b.capabilities === "object" ? b.capabilities : undefined
  });
  return res.status(200).json(data);
};

export const postTest = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const result = await testGeminiIntegration({
    companyId,
    prompt: String(b.prompt || ""),
    model: String(b.model || "gemini-2.5-flash"),
    maxTokens: Number(b.maxTokens ?? 512),
    temperature: Number(b.temperature ?? 1),
    apiKeyOverride: b.apiKey != null ? String(b.apiKey) : undefined,
    parts: Array.isArray(b.parts) ? b.parts : undefined
  });
  return res.status(200).json(result);
};

export const postMultimodalTest = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const result = await testGeminiIntegration({
    companyId,
    prompt: String(b.prompt || "Descreva o conteúdo enviado."),
    model: String(b.model || "gemini-2.5-flash"),
    maxTokens: Number(b.maxTokens ?? 1024),
    temperature: Number(b.temperature ?? 0.7),
    apiKeyOverride: b.apiKey != null ? String(b.apiKey) : undefined,
    parts: Array.isArray(b.parts) ? b.parts : undefined
  });
  return res.status(200).json(result);
};
