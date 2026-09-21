/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Response } from "express";

export const SendRefreshToken = (res: Response, token: string): void => {
  const isProd = process.env.NODE_ENV === "production";
  // Em localhost (HTTP) cookie secure:true não é gravado pelo browser → refresh sempre 401
  res.cookie("jrt", token, {
    httpOnly: true,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    maxAge: 24 * 60 * 60 * 1000 * 30 // 30 days
  });
};
