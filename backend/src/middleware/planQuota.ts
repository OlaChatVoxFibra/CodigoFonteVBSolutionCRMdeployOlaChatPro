/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import Whatsapp from "../models/Whatsapp";
import Queue from "../models/Queue";
import Company from "../models/Company";
import Plan from "../models/Plan";
import QueueIntegrations from "../models/QueueIntegrations";

async function getPlanForCompany(companyId: number) {
  const company = await Company.findByPk(companyId as any);
  if (!company) return null;
  const plan = await Plan.findByPk(company.planId as any);
  return plan;
}

function isUnlimited(plan: any, key: "users" | "connections" | "queues") {
  if (!plan) return false;
  const val = (plan as any)[key];
  if (!val || Number(val) <= 0) return true;
  if (String(plan.name || "").toLowerCase().includes("pro")) return true;
  return false;
}

export async function enforceUserQuota(req: Request, res: Response, next: NextFunction) {
  const companyId = (req as any).user?.companyId;
  const plan = await getPlanForCompany(companyId);
  if (!plan || isUnlimited(plan, "users")) return next();
  const limit = Number((plan as any).users || 0);
  const current = await User.count({ where: { companyId } as any });
  if (current >= limit) return res.status(403).json({ error: "Limite de usuários do plano atingido" });
  return next();
}

export async function enforceConnectionQuota(req: Request, res: Response, next: NextFunction) {
  // Atualização de conexão existente (ex.: SMS com id no body) não consome nova vaga
  if (req.body?.id) {
    return next();
  }
  const companyId = (req as any).user?.companyId;
  const plan = await getPlanForCompany(companyId);
  if (!plan || isUnlimited(plan, "connections")) return next();
  const limit = Number((plan as any).connections || 0);
  const current = await Whatsapp.count({ where: { companyId } as any });
  if (current >= limit) return res.status(403).json({ error: "Limite de conexões do plano atingido" });
  return next();
}

export async function enforceQueueQuota(req: Request, res: Response, next: NextFunction) {
  const companyId = (req as any).user?.companyId;
  const plan = await getPlanForCompany(companyId);
  if (!plan || isUnlimited(plan, "queues")) return next();
  const limit = Number((plan as any).queues || 0);
  const current = await Queue.count({ where: { companyId } as any });
  if (current >= limit) return res.status(403).json({ error: "Limite de filas do plano atingido" });
  return next();
}

function resolveIntegrationLimit(plan: any): number | "unlimited" {
  if (!plan) return 0;
  const raw = (plan as any).integrations;
  if (raw !== undefined && raw !== null) {
    const n = Number(raw);
    if (!n || n <= 0) return "unlimited";
    return n;
  }
  const name = String(plan.name || "").toLowerCase();
  if (name.includes("pro")) return "unlimited";
  if (name.includes("essencial") || name.includes("essential")) return 15;
  if (name.includes("starter")) return 2;
  return 0;
}

export async function enforceIntegrationQuota(req: Request, res: Response, next: NextFunction) {
  const companyId = (req as any).user?.companyId;
  const plan = await getPlanForCompany(companyId);
  const limit = resolveIntegrationLimit(plan);
  if (limit === "unlimited") return next();
  if (!limit || limit <= 0) return next();
  const current = await QueueIntegrations.count({ where: { companyId } as any });
  if (current >= limit) return res.status(403).json({ error: "Limite de integrações do plano atingido" });
  return next();
}
