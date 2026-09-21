/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import AppError from "../errors/AppError";
import { getIO } from "../libs/socket";

import AuthUserService from "../services/UserServices/AuthUserService";
import { SendRefreshToken } from "../helpers/SendRefreshToken";
import { RefreshTokenService } from "../services/AuthServices/RefreshTokenService";
import User from "../models/User";
import { SerializeUser } from "../helpers/SerializeUser";
import ShowUserService from "../services/UserServices/ShowUserService";
import {
  isDevNoDb,
  getDevSerializedUser,
  getDevAuthCredentials
} from "../helpers/devNoDbAuth";

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  const { token, serializedUser, refreshToken } = await AuthUserService({
    email,
    password
  });

  SendRefreshToken(res, refreshToken);

  try {
    const io = getIO();
    io.of(serializedUser.companyId.toString()).emit(
      `company-${serializedUser.companyId}-auth`,
      {
        action: "update",
        user: {
          id: serializedUser.id,
          email: serializedUser.email,
          companyId: serializedUser.companyId,
          token: serializedUser.token
        }
      }
    );
  } catch {
    /* socket ainda não pronto / modo offline */
  }

  return res.status(200).json({
    token,
    refreshToken,
    user: serializedUser
  });
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  // Cookie httpOnly (ideal) OU body/header — fallback p/ Vercel↔Railway
  // quando o browser bloqueia cookie third-party.
  const token: string =
    req.cookies?.jrt ||
    (typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "") ||
    (typeof req.headers["x-refresh-token"] === "string"
      ? String(req.headers["x-refresh-token"])
      : "");

  if (!token) {
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }

  const { user, newToken, refreshToken, serializedUser: offlineUser } =
    await RefreshTokenService(res, token);

  SendRefreshToken(res, refreshToken);

  if (offlineUser) {
    return res.json({
      token: newToken,
      refreshToken,
      user: offlineUser
    });
  }

  const serializedUser = await SerializeUser(user);
  return res.json({
    token: newToken,
    refreshToken,
    user: serializedUser
  });
};

export const me = async (req: Request, res: Response): Promise<Response> => {
  if (isDevNoDb()) {
    return res.json({ user: getDevSerializedUser() });
  }
  const { id, companyId } = req.user;
  const user = await ShowUserService(id, companyId);
  const serializedUser = await SerializeUser(user);
  return res.json({ user: serializedUser });
};

/** Público: indica se o modo local sem DB está ativo. */
export const offlineStatus = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  if (!isDevNoDb()) {
    return res.json({ enabled: false });
  }
  const { email } = getDevAuthCredentials();
  return res.json({
    enabled: true,
    email,
    hint: "Modo local sem banco — use as credenciais de desenvolvimento."
  });
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (isDevNoDb()) {
    res.clearCookie("jrt");
    return res.send();
  }
  const { id } = req.user;
  if (id) {
    const user = await User.findByPk(id);
    if (user) {
      await user.update({ online: false });
    }
  }
  res.clearCookie("jrt");

  return res.send();
};
