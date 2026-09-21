/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response, NextFunction } from "express";
import moment from "moment";
import Company from "../models/Company";
import AppError from "../errors/AppError";

/** Full path for mounted routers (e.g. /auth/me). */
function fullPath(req: Request): string {
  return `${req.baseUrl || ""}${req.path || ""}`.split("?")[0];
}

/**
 * Blocks API usage when company license (dueDate) has passed.
 * Exempt paths allow payment, invoices, plan info, and session refresh.
 */
const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    return next();
  }

  const { companyId } = req.user;
  if (companyId === 1) {
    return next();
  }

  if (process.env.SUBSCRIPTION_ENFORCE === "false") {
    return next();
  }

  const p = fullPath(req);
  if (req.baseUrl === "/auth" && (req.path === "/me" || req.path === "/me/")) {
    return next();
  }
  if (req.baseUrl === "/auth" && /\/confirm\/[^/]+\/acknowledge\/?$/.test(p)) {
    return next();
  }

  const exemptPrefixes = [
    "/subscription",
    "/invoices",
    "/companies/listPlan",
    "/companiesPlan"
  ];
  if (exemptPrefixes.some(prefix => p.startsWith(prefix))) {
    return next();
  }
  /** Lista de empresas (Assinaturas): precisa responder mesmo com licença vencida; o controller restringe o retorno. */
  if (p === "/companies/list") {
    return next();
  }

  try {
    const company = await Company.findByPk(companyId, {
      attributes: ["id", "dueDate", "status"]
    });
    if (!company) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }
    if (company.status === false) {
      throw new AppError("ERR_COMPANY_SUSPENDED", 403);
    }

    const rawDue = company.dueDate;
    if (!rawDue || !moment(rawDue).isValid()) {
      return next();
    }

    const today = moment().startOf("day");
    const due = moment(rawDue).startOf("day");
    if (today.isAfter(due)) {
      throw new AppError("ERR_SUBSCRIPTION_EXPIRED", 402);
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

export default requireActiveSubscription;
