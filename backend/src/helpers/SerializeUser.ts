/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import moment from "moment";
import Queue from "../models/Queue";
import Company from "../models/Company";
import User from "../models/User";
import jwt from "jsonwebtoken";
import authConfig from "../config/auth";
import { isWhiteLabelCompany } from "./isWhiteLabelCompany";
import { userCanAccessVisualIdentityUi } from "./visualIdentityPermissions";

function buildSubscriptionMeta(company: Company | null | undefined) {
  if (!company) {
    return {
      active: true,
      daysRemaining: null as number | null,
      expired: false,
      isTrialPlan: false,
      isFreemiumPeriod: false
    };
  }
  const rawDue = (company as any).dueDate;
  if (!rawDue || !moment(rawDue).isValid()) {
    return {
      active: true,
      daysRemaining: null as number | null,
      expired: false,
      isTrialPlan: false,
      isFreemiumPeriod: String((company as any).recurrence || "") === "freemium"
    };
  }
  const today = moment().startOf("day");
  const due = moment(rawDue).startOf("day");
  const expired = today.isAfter(due);
  const daysRemaining = expired ? 0 : due.diff(today, "days");
  const plan = (company as any).plan;
  const isTrialPlan = Boolean(plan?.trial);
  const recurrence = String((company as any).recurrence || "");
  const isFreemiumPeriod = recurrence === "freemium";
  return {
    active: !expired,
    daysRemaining,
    expired,
    isTrialPlan,
    isFreemiumPeriod
  };
}

interface SerializedUser {
  id: number;
  name: string;
  email: string;
  profile: string;
  companyId: number;
  company: Company | null;
  super: boolean;
  isWhiteLabelCustomer?: boolean;
  /** Habilitado por admin da plataforma para a empresa editar cores/logo próprios. */
  allowOrgManualVisualIdentity?: boolean;
  /** Se pode ver a aba Identidade Visual (regra unificada backend). */
  canAccessVisualIdentitySettings?: boolean;
  queues: Queue[];
  startWork: string;
  endWork: string;
  allTicket: string;
  ticketVisibility?: string;
  whatsappId: number;
  profileImage: string;
  defaultTheme: string;
  defaultMenu: string;
  allHistoric: string;
  allUserChat?: string;
  defaultTicketsManagerWidth?: number;
  userClosePendingTicket?: string;
  showDashboard?: string;
  token?: string;
  allowGroup: boolean;
  allowRealTime: string;
  allowConnections: string;
  allowSeeMessagesInPendingTickets: string;
  finalizacaoComValorVendaAtiva: boolean;
  showContacts: string;
  showCampaign: string;
  showFlow: string;
  subscription?: {
    active: boolean;
    daysRemaining: number | null;
    expired: boolean;
    isTrialPlan: boolean;
    isFreemiumPeriod?: boolean;
  };
}

export const SerializeUser = async (user: User): Promise<SerializedUser> => {
  // Gera um token de 32 bytes
  const generateToken = (userId: number | string): string => {
    const secret = authConfig.secret || "mysecret";
    return jwt.sign({ userId }, secret, { expiresIn: "1h" });
  };

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    companyId: user.companyId,
    company: user.company,
    super: user.super,
    queues: user.queues,
    startWork: user.startWork,
    endWork: user.endWork,
    allTicket: user.allTicket,
    ticketVisibility: user.ticketVisibility,
    whatsappId: user.whatsappId,
    profileImage: user.profileImage,
    defaultTheme: user.defaultTheme,
    defaultMenu: user.defaultMenu,
    allHistoric: user.allHistoric,
    allUserChat: user.allUserChat,
    userClosePendingTicket: user.userClosePendingTicket,
    showDashboard: user.showDashboard,
    token: generateToken(user.id),
    allowGroup: user.allowGroup,
    allowRealTime: user.allowRealTime,
    allowSeeMessagesInPendingTickets: user.allowSeeMessagesInPendingTickets || "enabled",
    allowConnections: user.allowConnections,
    finalizacaoComValorVendaAtiva: user.finalizacaoComValorVendaAtiva,
    showContacts: user.showContacts,
    showCampaign: user.showCampaign,
    showFlow: user.showFlow,
    subscription: buildSubscriptionMeta(user.company),
    isWhiteLabelCustomer: isWhiteLabelCompany(user.company),
    allowOrgManualVisualIdentity: !!(user.company as any)?.allowOrgManualVisualIdentity,
    canAccessVisualIdentitySettings: userCanAccessVisualIdentityUi(user, user.company)
  };
};
