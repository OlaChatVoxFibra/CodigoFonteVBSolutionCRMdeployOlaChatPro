/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import User from "../models/User";
import AppError from "../errors/AppError";
import { FigmaIntegrationStatus } from "../models/FigmaIntegration";
import {
  getFigmaIntegrationPublic,
  saveFigmaIntegration,
  testFigmaIntegration
} from "../services/FigmaServices/FigmaIntegrationService";

async function assertAdmin(req: Request) {
  const authUser = await User.findByPk(req.user.id);
  if (!authUser) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }
  if (authUser.profile !== "admin" && !authUser.super) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
}

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = await getFigmaIntegrationPublic(companyId);
  return res.status(200).json(data);
};

export const create = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const data = await saveFigmaIntegration({
    workspaceId: companyId,
    credential: b.credential != null ? String(b.credential) : undefined,
    enableBrainAi: b.enableBrainAi !== false,
    enablePrototypeAnalysis: b.enablePrototypeAnalysis !== false,
    enableCommentsSync: Boolean(b.enableCommentsSync),
    enableDesignSystem: b.enableDesignSystem !== false,
    status: "disconnected"
  });
  return res.status(201).json(data);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const data = await saveFigmaIntegration({
    workspaceId: companyId,
    credential: b.credential !== undefined ? String(b.credential) : undefined,
    enableBrainAi:
      b.enableBrainAi !== undefined ? Boolean(b.enableBrainAi) : undefined,
    enablePrototypeAnalysis:
      b.enablePrototypeAnalysis !== undefined
        ? Boolean(b.enablePrototypeAnalysis)
        : undefined,
    enableCommentsSync:
      b.enableCommentsSync !== undefined
        ? Boolean(b.enableCommentsSync)
        : undefined,
    enableDesignSystem:
      b.enableDesignSystem !== undefined
        ? Boolean(b.enableDesignSystem)
        : undefined,
    status: b.status
      ? (String(b.status) as FigmaIntegrationStatus)
      : undefined
  });
  return res.status(200).json(data);
};

export const postTest = async (req: Request, res: Response): Promise<Response> => {
  await assertAdmin(req);
  const { companyId } = req.user;
  const b = req.body || {};
  const result = await testFigmaIntegration({
    workspaceId: companyId,
    credentialOverride:
      b.credential != null ? String(b.credential) : undefined
  });
  if (!result.ok) {
    return res.status(422).json(result);
  }
  return res.status(200).json(result);
};
