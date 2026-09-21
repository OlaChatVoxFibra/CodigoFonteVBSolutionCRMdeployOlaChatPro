/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import ApiCredential from "../models/ApiCredential";
import User from "../models/User";
import {
  extractApiKeyFromRequest,
  verifyApiKey
} from "../helpers/apiKeyUtils";
import { hasApiScope } from "../helpers/apiKeyScopes";
import type { ApiCredentialScope } from "../models/ApiCredential";

declare global {
  namespace Express {
    interface Request {
      apiCredential?: {
        id: number;
        companyId: number;
        scopes: string[];
        userId: number;
      };
    }
  }
}

export const apiKeyAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const rawKey = extractApiKeyFromRequest(
    req.headers.authorization,
    req.headers["x-api-key"] as string | undefined
  );

  if (!rawKey) {
    throw new AppError("ERR_API_KEY_REQUIRED", 401);
  }

  const prefixMatch = rawKey.match(/^(vb_live_[a-f0-9]{8})_/i);
  if (!prefixMatch) {
    throw new AppError("ERR_API_KEY_INVALID", 401);
  }

  const keyPrefix = prefixMatch[1].toLowerCase();
  const credential = await ApiCredential.findOne({
    where: { keyPrefix, revokedAt: null }
  });

  if (!credential) {
    throw new AppError("ERR_API_KEY_INVALID", 401);
  }

  if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
    throw new AppError("ERR_API_KEY_EXPIRED", 401);
  }

  const valid = await verifyApiKey(rawKey, credential.keyHash);
  if (!valid) {
    throw new AppError("ERR_API_KEY_INVALID", 401);
  }

  const adminUser = await User.findOne({
    where: { companyId: credential.companyId, profile: "admin" },
    order: [["id", "ASC"]]
  });

  if (!adminUser) {
    throw new AppError("ERR_API_KEY_NO_USER", 403);
  }

  req.apiCredential = {
    id: credential.id,
    companyId: credential.companyId,
    scopes: credential.scopes || [],
    userId: adminUser.id
  };

  credential.update({ lastUsedAt: new Date() }).catch(() => undefined);

  return next();
};

export const requireApiScope =
  (scope: ApiCredentialScope) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const scopes = req.apiCredential?.scopes;
    if (!hasApiScope(scopes, scope)) {
      throw new AppError("ERR_API_SCOPE_DENIED", 403);
    }
    next();
  };

export default apiKeyAuth;
