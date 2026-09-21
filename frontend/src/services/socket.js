/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { isObject } from "lodash";
import SocketWorker from "./SocketWorker";
import { getCompanyIdFromStoredToken } from "../helpers/jwtPayload";

/** Mesma regra do namespace do socket: JWT tem prioridade sobre companyId do objeto user. */
export function resolveSocketCompanyId(params) {
  let companyId = "";
  if (isObject(params)) {
    if (isObject(params.user)) {
      companyId = params.user.companyId ?? companyId;
    }
    if (params.companyId !== undefined) {
      companyId = params.companyId;
    }
  }

  const fromJwt = getCompanyIdFromStoredToken();
  const nUser = Number(companyId);
  if (fromJwt != null && Number.isFinite(fromJwt) && fromJwt > 0) {
    return fromJwt;
  }
  if (Number.isFinite(nUser) && nUser > 0) {
    return nUser;
  }
  return null;
}

export function socketConnection(params) {
  let userId = "";
  let companyId = "";
  if (isObject(params)) {
    if (isObject(params.user)) {
      companyId = params.user.companyId ?? companyId;
      userId = params.user.id ?? userId;
    }
    if (params.companyId !== undefined) {
      companyId = params.companyId;
    }
    if (params.userId !== undefined) {
      userId = params.userId;
    }
  }

  const effective = resolveSocketCompanyId(params);
  if (effective == null) {
    return null;
  }
  return SocketWorker(effective, userId);
}
