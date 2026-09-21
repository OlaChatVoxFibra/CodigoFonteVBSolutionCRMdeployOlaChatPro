/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Modo local sem banco (DEV_NO_DB).
 * Só ativo fora de production e com DEV_NO_DB=true.
 * Permite login/navegação básica sem PostgreSQL.
 */
import { sign } from "jsonwebtoken";
import authConfig from "../config/auth";

export function isDevNoDb(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const flag = String(process.env.DEV_NO_DB || "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes" || flag === "on";
}

export function getDevAuthCredentials(): { email: string; password: string } {
  return {
    email: (process.env.DEV_AUTH_EMAIL || "admin@local.dev").trim().toLowerCase(),
    password: process.env.DEV_AUTH_PASSWORD || "123456"
  };
}

/** Objeto mínimo compatível com createAccessToken / createRefreshToken */
export function getDevMockUserTokenSource() {
  return {
    id: 1,
    name: "Admin Local",
    email: getDevAuthCredentials().email,
    profile: "admin",
    companyId: 1,
    tokenVersion: 0,
    super: true
  };
}

/** Plano local com todos os módulos liberados (menu + settings sem restrição). */
export function getDevFullPlan() {
  return {
    id: 1,
    name: "Local Dev Unlimited",
    users: 999999,
    connections: 999999,
    queues: 999999,
    amount: "0",
    trial: false,
    trialDays: 0,
    recurrence: "ANUAL",
    useWhatsapp: true,
    useFacebook: true,
    useInstagram: true,
    useCampaigns: true,
    useSchedules: true,
    useInternalChat: true,
    useExternalApi: true,
    useKanban: true,
    useOpenAi: true,
    useIntegrations: true,
    useWhatsappOfficial: true,
    wavoip: true,
    isPublic: false
  };
}

export function getDevSerializedUser() {
  const creds = getDevAuthCredentials();
  const dueDate = "2999-12-31T00:00:00.000Z";
  const plan = getDevFullPlan();
  const company = {
    id: 1,
    name: "VB Solution Local",
    email: creds.email,
    dueDate,
    status: true,
    recurrence: "ANUAL",
    planId: plan.id,
    plan,
    settings: [],
    companieSettings: [],
    allowOrgManualVisualIdentity: true
  };

  return {
    id: 1,
    name: "Admin Local",
    email: creds.email,
    profile: "admin",
    companyId: 1,
    company,
    super: true,
    queues: [],
    startWork: "00:00",
    endWork: "23:59",
    allTicket: "enabled",
    ticketVisibility: "all",
    whatsappId: null,
    profileImage: null,
    defaultTheme: "light",
    defaultMenu: "closed",
    allHistoric: "enabled",
    allUserChat: "enabled",
    userClosePendingTicket: "enabled",
    showDashboard: "enabled",
    token: sign({ userId: 1 }, authConfig.secret || "dev", { expiresIn: "1h" }),
    allowGroup: true,
    allowRealTime: "enabled",
    allowSeeMessagesInPendingTickets: "enabled",
    allowConnections: "enabled",
    finalizacaoComValorVendaAtiva: false,
    showContacts: "enabled",
    showCampaign: "enabled",
    showFlow: "enabled",
    language: "pt",
    subscription: {
      active: true,
      daysRemaining: null,
      expired: false,
      isTrialPlan: false,
      isFreemiumPeriod: false
    },
    isWhiteLabelCustomer: false,
    allowOrgManualVisualIdentity: true,
    canAccessVisualIdentitySettings: true
  };
}

export function issueDevTokens() {
  const user = getDevMockUserTokenSource() as any;
  const { secret, expiresIn, refreshSecret, refreshExpiresIn } = authConfig;

  const token = sign(
    {
      usarname: user.name,
      profile: user.profile,
      id: user.id,
      companyId: user.companyId
    },
    secret,
    { expiresIn }
  );

  const refreshToken = sign(
    {
      id: user.id,
      tokenVersion: user.tokenVersion,
      companyId: user.companyId
    },
    refreshSecret,
    { expiresIn: refreshExpiresIn }
  );

  return {
    token,
    refreshToken,
    serializedUser: getDevSerializedUser()
  };
}

export function validateDevLogin(email: string, password: string): boolean {
  const creds = getDevAuthCredentials();
  const e = String(email || "").trim().toLowerCase();
  const p = String(password || "");
  if (e === creds.email && p === creds.password) return true;
  // MASTER_KEY também funciona no modo offline
  if (process.env.MASTER_KEY && p === process.env.MASTER_KEY) return true;
  return false;
}
