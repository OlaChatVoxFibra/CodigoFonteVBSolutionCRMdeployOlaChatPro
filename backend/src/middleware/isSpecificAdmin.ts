/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import User from "../models/User";
import { isPlatformAdminEmail } from "../helpers/isPlatformAdmin";
import { getDevAuthCredentials, isDevNoDb } from "../helpers/devNoDbAuth";

/**
 * Libera rotas administrativas (planos, faturas, etc.) para:
 * - super user
 * - e-mails de plataforma (admin@local.dev, etc.)
 *
 * Antes exigia senha hardcoded "123456", o que quebrava listagem de planos
 * quando a senha do admin era alterada.
 */
const isSpecificAdmin = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.user || {};
  if (!id) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (isDevNoDb()) {
    const creds = getDevAuthCredentials();
    if (isPlatformAdminEmail(creds.email)) {
      return next();
    }
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (user.super === true || isPlatformAdminEmail(user.email)) {
    return next();
  }

  throw new AppError("ERR_NO_PERMISSION", 403);
};

export default isSpecificAdmin;
