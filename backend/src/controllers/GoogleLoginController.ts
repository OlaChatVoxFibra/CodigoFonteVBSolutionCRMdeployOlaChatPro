/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { SendRefreshToken } from "../helpers/SendRefreshToken";
import { getGoogleOAuthClientConfig } from "../services/GoogleAuthServices/googleOAuthConfig";
import {
  buildGoogleLoginAuthorizeUrl,
  completeGoogleLogin,
  handleGoogleLoginOAuthCallback,
  isGoogleLoginOAuthState
} from "../services/AuthServices/GoogleLoginAuthService";

function frontendBase(): string {
  return (process.env.FRONTEND_URL || "http://localhost:5181").replace(/\/$/, "");
}

export const status = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  try {
    getGoogleOAuthClientConfig();
    return res.json({ configured: true });
  } catch (e: any) {
    return res.json({ configured: false, message: e?.message });
  }
};

export const authorize = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  const url = buildGoogleLoginAuthorizeUrl();
  return res.json({ authorizeUrl: url });
};

export const complete = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const exchange = String(req.body?.exchange || "").trim();
  const { token, serializedUser, refreshToken } = await completeGoogleLogin(
    exchange
  );

  SendRefreshToken(res, refreshToken);

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

  return res.status(200).json({
    token,
    refreshToken,
    user: serializedUser
  });
};

export async function handleGoogleLoginCallbackRedirect(
  req: Request,
  res: Response
): Promise<boolean> {
  const state = String(req.query.state || "");
  if (!isGoogleLoginOAuthState(state)) {
    return false;
  }

  const { code, error } = req.query;
  const base = frontendBase();

  if (error) {
    res.redirect(
      `${base}/login/google-oauth/callback?status=error&message=${encodeURIComponent(
        String(error)
      )}`
    );
    return true;
  }

  try {
    const result = await handleGoogleLoginOAuthCallback({
      code: String(code || ""),
      state
    });
    res.redirect(
      `${base}/login/google-oauth/callback?status=success&exchange=${encodeURIComponent(
        result.exchangeToken
      )}&email=${encodeURIComponent(result.email)}`
    );
  } catch (err: any) {
    const codeErr = err?.message || "Falha no login com Google";
    const emailParam = err?.googleEmail
      ? `&email=${encodeURIComponent(String(err.googleEmail))}`
      : "";
    res.redirect(
      `${base}/login/google-oauth/callback?status=error&message=${encodeURIComponent(
        codeErr
      )}${emailParam}`
    );
  }

  return true;
}
