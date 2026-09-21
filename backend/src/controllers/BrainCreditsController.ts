/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  confirmBrainPaymentSession,
  getBrainCreditsStatus,
  listBrainTokenLogs,
  listBrainPlatformCostBreakdown
} from "../services/AiBrainServices/BrainCreditService";
import { BRAIN_PLAN_OFFERS } from "../services/AiBrainServices/brainCreditsCatalog";
import { listBrainPlatformKeyStatus } from "../services/AiBrainServices/brainPlatformCredentials";
import { isBrainPlatformAdminEmail } from "../helpers/isBrainPlatformAdmin";
import User from "../models/User";

async function resolveRequestUserEmail(req: Request): Promise<string> {
  const cached = (req.user as { email?: string })?.email;
  if (cached) return cached;
  const row = await User.findByPk(Number(req.user.id), { attributes: ["email"] });
  return String(row?.email || "");
}

export const creditsStatus = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const status = await getBrainCreditsStatus(companyId);
  return res.json(status);
};

export const creditsPlans = async (_req: Request, res: Response): Promise<Response> => {
  return res.json({
    plans: BRAIN_PLAN_OFFERS,
    platformKeys: listBrainPlatformKeyStatus()
  });
};

export const confirmPayment = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const sessionId = String(req.body?.sessionId || "").trim();
  if (!sessionId) {
    throw new AppError("sessionId obrigatório", 400);
  }
  try {
    const result = await confirmBrainPaymentSession(sessionId, companyId);
    return res.json(result);
  } catch (err: any) {
    if (err?.message === "ERR_SESSION_COMPANY_MISMATCH") {
      throw new AppError("ERR_SESSION_COMPANY_MISMATCH", 403);
    }
    throw err;
  }
};

export const tokenLogs = async (req: Request, res: Response): Promise<Response> => {
  const { companyId, profile } = req.user;
  const email = await resolveRequestUserEmail(req);
  if (profile === "user" && !isBrainPlatformAdminEmail(email)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 25;
  const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
  const provider = req.query.provider ? String(req.query.provider) : undefined;
  const actionType = req.query.actionType ? String(req.query.actionType) : undefined;
  const userId = req.query.userId ? Number(req.query.userId) : undefined;
  const filterCompanyId = req.query.companyId ? Number(req.query.companyId) : undefined;

  const result = await listBrainTokenLogs({
    companyId: filterCompanyId || companyId,
    page,
    limit,
    startDate,
    endDate,
    provider,
    actionType,
    userId: Number.isFinite(userId) ? userId : undefined,
    platformWide: isBrainPlatformAdminEmail(email)
  });
  return res.json(result);
};

/** Visão global — exclusivo admin@admin / admin@admin.com */
export const tokenLogsPlatform = async (req: Request, res: Response): Promise<Response> => {
  const email = await resolveRequestUserEmail(req);
  if (!isBrainPlatformAdminEmail(email)) {
    throw new AppError("ERR_BRAIN_PLATFORM_ADMIN_ONLY", 403);
  }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 25;
  const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
  const provider = req.query.provider ? String(req.query.provider) : undefined;
  const actionType = req.query.actionType ? String(req.query.actionType) : undefined;
  const userId = req.query.userId ? Number(req.query.userId) : undefined;
  const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;

  const [logsResult, breakdown] = await Promise.all([
    listBrainTokenLogs({
      companyId,
      page,
      limit,
      startDate,
      endDate,
      provider,
      actionType,
      userId: Number.isFinite(userId) ? userId : undefined,
      platformWide: true
    }),
    listBrainPlatformCostBreakdown()
  ]);

  return res.json({
    ...logsResult,
    breakdown
  });
};
