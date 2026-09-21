/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import User from "../models/User";
import { compare } from "bcryptjs";
import { isPlatformAdminEmail } from "../helpers/isPlatformAdmin";
import { getDevAuthCredentials, isDevNoDb } from "../helpers/devNoDbAuth";

const isSpecificAdmin = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const { id } = req.user || {};
  if (!id) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (isDevNoDb()) {
    const creds = getDevAuthCredentials();
    if (isPlatformAdminEmail(creds.email) && creds.password === "123456") {
      return next();
    }
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const user = await User.findByPk(id);
  if (!user) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const isEmailOk = isPlatformAdminEmail(user.email);
  const isPasswordOk = await compare("123456", user.passwordHash || "");

  if (!isEmailOk || !isPasswordOk) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  return next();
};

export default isSpecificAdmin;
