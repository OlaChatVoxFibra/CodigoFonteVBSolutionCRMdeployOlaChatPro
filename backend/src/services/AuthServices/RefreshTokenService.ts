/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { verify } from "jsonwebtoken";
import { Response as Res } from "express";

import User from "../../models/User";
import AppError from "../../errors/AppError";
import ShowUserService from "../UserServices/ShowUserService";
import authConfig from "../../config/auth";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import {
  isDevNoDb,
  getDevMockUserTokenSource,
  getDevSerializedUser
} from "../../helpers/devNoDbAuth";

interface RefreshTokenPayload {
  id: string;
  tokenVersion: number;
  companyId: number;
}

interface Response {
  user: User;
  newToken: string;
  refreshToken: string;
  serializedUser?: any;
}

export const RefreshTokenService = async (
  res: Res,
  token: string
): Promise<Response> => {
  try {
    const decoded = verify(token, authConfig.refreshSecret);
    const { id, tokenVersion, companyId } = decoded as RefreshTokenPayload;

    if (isDevNoDb()) {
      const mock = getDevMockUserTokenSource() as any;
      if (Number(id) !== mock.id) {
        res.clearCookie("jrt");
        throw new AppError("ERR_SESSION_EXPIRED", 401);
      }
      const newToken = createAccessToken(mock);
      const refreshToken = createRefreshToken(mock);
      return {
        user: mock as User,
        newToken,
        refreshToken,
        serializedUser: getDevSerializedUser()
      };
    }

    const user = await ShowUserService(id, companyId);

    if (user.tokenVersion !== tokenVersion) {
      res.clearCookie("jrt");
      throw new AppError("ERR_SESSION_EXPIRED", 401);
    }

    const newToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    return { user, newToken, refreshToken };
  } catch (err) {
    res.clearCookie("jrt");
    throw new AppError("ERR_SESSION_EXPIRED", 401);
  }
};
