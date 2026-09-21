/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { sign, verify } from "jsonwebtoken";
import { Op } from "sequelize";
import { google } from "googleapis";
import User from "../../models/User";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import CompaniesSettings from "../../models/CompaniesSettings";
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import { SerializeUser } from "../../helpers/SerializeUser";
import {
  createGoogleOAuthClient
} from "../GoogleAuthServices/googleOAuthService";
import {
  signGoogleLoginOAuthState,
  verifyGoogleLoginOAuthState
} from "./googleLoginOAuthState";
import authConfig from "../../config/auth";

const LOGIN_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
];

function loadUserByEmail(email: string) {
  return User.findOne({
    where: { email: { [Op.iLike]: email.trim() } },
    include: [
      "queues",
      {
        model: Company,
        include: [
          {
            model: Plan,
            as: "plan",
            attributes: ["id", "name", "trial", "trialDays", "amount"]
          },
          { model: CompaniesSettings }
        ]
      }
    ],
    attributes: { include: ["finalizacaoComValorVendaAtiva"] }
  });
}

function assertWithinWorkHours(user: User): void {
  const Hr = new Date();
  const hh = Hr.getHours() * 60 * 60;
  const mm = Hr.getMinutes() * 60;
  const hora = hh + mm;

  const inicio = user.startWork || "00:00";
  const hhinicio = Number(inicio.split(":")[0] || 0) * 60 * 60;
  const mminicio = Number(inicio.split(":")[1] || 0) * 60;
  const horainicio = hhinicio + mminicio;

  const termino = user.endWork || "23:59";
  const hhtermino = Number(termino.split(":")[0] || 23) * 60 * 60;
  const mmtermino = Number(termino.split(":")[1] || 59) * 60;
  const horatermino = hhtermino + mmtermino;

  if (hora < horainicio || hora > horatermino) {
    throw new AppError("ERR_OUT_OF_HOURS", 401);
  }
}

function createLoginExchangeToken(userId: number): string {
  return sign(
    {
      purpose: "google-login-exchange",
      userId,
      ts: Date.now()
    },
    authConfig.secret,
    { expiresIn: "2m" }
  );
}

function verifyLoginExchangeToken(token: string): number {
  try {
    const payload = verify(token, authConfig.secret) as {
      purpose?: string;
      userId?: number;
    };
    if (payload?.purpose !== "google-login-exchange" || !payload.userId) {
      throw new AppError("ERR_GOOGLE_LOGIN_INVALID", 401);
    }
    return Number(payload.userId);
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError("ERR_GOOGLE_LOGIN_INVALID", 401);
  }
}

export function buildGoogleLoginAuthorizeUrl(): string {
  const oauth2 = createGoogleOAuthClient();
  const state = signGoogleLoginOAuthState();
  return oauth2.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: LOGIN_SCOPES,
    state,
    include_granted_scopes: false
  });
}

export function isGoogleLoginOAuthState(state: string): boolean {
  return !!verifyGoogleLoginOAuthState(state);
}

export async function handleGoogleLoginOAuthCallback(params: {
  code: string;
  state: string;
}): Promise<{ exchangeToken: string; email: string }> {
  if (!verifyGoogleLoginOAuthState(params.state)) {
    throw new AppError("Estado OAuth inválido ou expirado.", 400);
  }

  const oauth2 = createGoogleOAuthClient();
  const { tokens } = await oauth2.getToken(params.code);
  if (!tokens.access_token) {
    throw new AppError("Google não retornou token de acesso.", 400);
  }

  oauth2.setCredentials(tokens);
  const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
  const { data: profile } = await oauth2Api.userinfo.get();
  const accountEmail = String(profile.email || "").trim().toLowerCase();

  if (!accountEmail) {
    throw new AppError("Não foi possível obter o e-mail da conta Google.", 400);
  }

  const user = await loadUserByEmail(accountEmail);
  if (!user) {
    const err = new AppError("ERR_GOOGLE_EMAIL_NOT_REGISTERED", 401) as AppError & {
      googleEmail?: string;
    };
    err.googleEmail = accountEmail;
    throw err;
  }

  assertWithinWorkHours(user);

  const company = await Company.findByPk(user.companyId);
  if (company) {
    await company.update({ lastLogin: new Date() });
  }

  return {
    exchangeToken: createLoginExchangeToken(user.id),
    email: accountEmail
  };
}

export async function completeGoogleLogin(exchangeToken: string) {
  const userId = verifyLoginExchangeToken(exchangeToken);
  const user = await User.findByPk(userId, {
    include: [
      "queues",
      {
        model: Company,
        include: [
          {
            model: Plan,
            as: "plan",
            attributes: ["id", "name", "trial", "trialDays", "amount"]
          },
          { model: CompaniesSettings }
        ]
      }
    ],
    attributes: { include: ["finalizacaoComValorVendaAtiva"] }
  });

  if (!user) {
    throw new AppError("ERR_GOOGLE_EMAIL_NOT_REGISTERED", 401);
  }

  assertWithinWorkHours(user);

  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  const serializedUser = await SerializeUser(user);

  return {
    serializedUser,
    token,
    refreshToken
  };
}
