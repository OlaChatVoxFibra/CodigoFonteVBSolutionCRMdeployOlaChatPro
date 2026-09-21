/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { verify } from "jsonwebtoken";
import ShowUserService from "../UserServices/ShowUserService";
import authConfig from "../../config/auth";
import User from "../../models/User";

interface RefreshTokenPayload {
  id: string;
  tokenVersion: number;
  companyId: number;
}

export default async function FindUserFromToken(token: string): Promise<User> {
  const decoded = verify(token, authConfig.refreshSecret);
  const { id, companyId } = decoded as RefreshTokenPayload;

  const user = await ShowUserService(id, companyId);
  return user;
}
