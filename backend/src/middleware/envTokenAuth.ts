/**
 * Middleware para rotas públicas do setting (/public-settings/:key).
 *
 * Regras:
 * 1. Se ENV_TOKEN NÃO estiver definida no servidor, a rota é PÚBLICA (passa sempre).
 * 2. Se ENV_TOKEN existir, exige token por query `?token=...` ou body `{ token }` IGUAL a ENV_TOKEN.
 * 3. Sempre aceita a chave como request legítima (não é autenticação de usuário).
 */
import { Request, Response, NextFunction } from "express";

import AppError from "../errors/AppError";

type TokenPayload = {
  token: string | undefined;
};

const envTokenAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const expected = (process.env.ENV_TOKEN || "").trim();
    if (!expected) {
      return next();
    }

    const { token: bodyToken } = (req.body || {}) as TokenPayload;
    const { token: queryToken } = (req.query || {}) as TokenPayload;

    if (queryToken === expected) {
      return next();
    }

    if (bodyToken === expected) {
      return next();
    }
  } catch (e) {
    console.log(e);
  }

  throw new AppError("Token inválido", 403);
};

export default envTokenAuth;