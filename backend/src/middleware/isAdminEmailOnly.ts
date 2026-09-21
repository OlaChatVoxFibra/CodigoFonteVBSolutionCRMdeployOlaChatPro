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

const isAdminEmailOnly = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const { id } = req.user || {};
  if (!id) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (isDevNoDb()) {
    if (isPlatformAdminEmail(getDevAuthCredentials().email)) {
      return next();
    }
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await User.findByPk(id);
  if (!user || !isPlatformAdminEmail(user.email)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  return next();
};

export default isAdminEmailOnly;
