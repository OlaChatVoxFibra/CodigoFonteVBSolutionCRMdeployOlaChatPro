/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import User from "../../../models/User";
import AppError from "../../../errors/AppError";
import {
  getGrokIntegrationPublic,
  saveGrokIntegration,
  testGrokIntegration
} from "../services/GrokIntegrationService";
import { GROK_DEFAULT_MODEL } from "../utils/isGrokModel";

async function assertAdmin(req: Request) {
  const authUser = await User.findByPk(req.user.id);
  if (!authUser) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }
  if (authUser.profile !== "admin" && !authUser.super) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
}

export const showIntegration = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const data = await getGrokIntegrationPublic(companyId);
  return res.status(200).json(data);
};

export const updateIntegration = async (
  req: Request,
  res: Response
): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const data = await saveGrokIntegration({
    companyId,
    enabled: Boolean(b.enabled),
    apiKey: b.apiKey !== undefined ? String(b.apiKey) : undefined,
    defaultModel: String(b.defaultModel || GROK_DEFAULT_MODEL),
    scope: String(b.scope || "Pessoal"),
    temperature: Number(b.temperature ?? 1),
    topP: Number(b.topP ?? 1),
    maxOutputTokens: Number(b.maxOutputTokens ?? 4096)
  });
  return res.status(200).json(data);
};

export const postTest = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const result = await testGrokIntegration({
    companyId,
    prompt: String(b.prompt || ""),
    model: String(b.model || GROK_DEFAULT_MODEL),
    maxTokens: Number(b.maxTokens ?? 512),
    temperature: Number(b.temperature ?? 1),
    apiKeyOverride: b.apiKey != null ? String(b.apiKey) : undefined
  });
  return res.status(200).json(result);
};
