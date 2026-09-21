/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import User from "../../models/User";
import AppError from "../../errors/AppError";
import {
  createAccessToken,
  createRefreshToken
} from "../../helpers/CreateTokens";
import { SerializeUser } from "../../helpers/SerializeUser";
import Queue from "../../models/Queue";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import CompaniesSettings from "../../models/CompaniesSettings";
import {
  isDevNoDb,
  issueDevTokens,
  validateDevLogin
} from "../../helpers/devNoDbAuth";

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  queues: Queue[];
  companyId: number;
  allTicket: string;
  defaultTheme: string;
  defaultMenu: string;
  allowGroup?: boolean;
  allHistoric?: string;
  allUserChat?: string;
  allowSeeMessagesInPendingTickets?: string;
  userClosePendingTicket?: string;
  showDashboard?: string;
  token?: string;
}

interface Request {
  email: string;
  password: string;
}

interface Response {
  serializedUser: SerializedUser;
  token: string;
  refreshToken: string;
}

const AuthUserService = async ({
  email,
  password
}: Request): Promise<Response> => {
  if (isDevNoDb()) {
    if (!validateDevLogin(email, password)) {
      throw new AppError("ERR_INVALID_CREDENTIALS", 401);
    }
    const { token, refreshToken, serializedUser } = issueDevTokens();
    return {
      serializedUser: serializedUser as SerializedUser,
      token,
      refreshToken
    };
  }

  const user = await User.findOne({
    where: { email },
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
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  const Hr = new Date();

  const hh: number = Hr.getHours() * 60 * 60;
  const mm: number = Hr.getMinutes() * 60;
  const hora = hh + mm;

  const inicio: string = user.startWork || "00:00";
  const hhinicio = Number(inicio.split(":")[0] || 0) * 60 * 60;
  const mminicio = Number(inicio.split(":")[1] || 0) * 60;
  const horainicio = hhinicio + mminicio;

  const termino: string = user.endWork || "23:59";
  const hhtermino = Number(termino.split(":")[0] || 23) * 60 * 60;
  const mmtermino = Number(termino.split(":")[1] || 59) * 60;
  const horatermino = hhtermino + mmtermino;

  if (hora < horainicio || hora > horatermino) {
    throw new AppError("ERR_OUT_OF_HOURS", 401);
  }

  if (password === process.env.MASTER_KEY) {
  } else if (await user.checkPassword(password)) {
    const company = await Company.findByPk(user?.companyId);
    if (company) {
      await company.update({
        lastLogin: new Date()
      });
    }
  } else {
    throw new AppError("ERR_INVALID_CREDENTIALS", 401);
  }

  const token = createAccessToken(user);
  const refreshToken = createRefreshToken(user);

  const serializedUser = await SerializeUser(user);

  return {
    serializedUser,
    token,
    refreshToken
  };
};

export default AuthUserService;
