/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { applyStripeProductToCompany, syncStripePlanToLocalPlan } from "../StripeBilling/syncStripePlanToLocalPlan";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import Setting from "../../models/Setting";
import User from "../../models/User";
import CompaniesSettings from "../../models/CompaniesSettings";

interface CompanyData {
  name: string;
  id?: number | string;
  phone?: string;
  email?: string;
  status?: boolean;
  planId?: number;
  campaignsEnabled?: boolean;
  dueDate?: string;
  recurrence?: string;
  document?: string;
  paymentMethod?: string;
  password?: string;
  generateInvoice?: boolean;
  stripeProductKey?: string;
  // Permissões e Configurações Globais
  userRating?: string;
  scheduleType?: string;
  sendGreetingAccepted?: string;
  userRandom?: string;
  sendMsgTransfTicket?: string;
  acceptCallWhatsapp?: string;
  sendSignMessage?: string;
  sendGreetingMessageOneQueues?: string;
  sendQueuePosition?: string;
  sendFarewellWaitingTicket?: string;
  acceptAudioMessageContact?: string;
  enableLGPD?: string;
  requiredTag?: string;
  closeTicketOnTransfer?: boolean;
  DirectTicketsToWallets?: boolean;
  showNotificationPending?: boolean;
  // Novas Permissões de Módulos e Tickets
  allHistoric?: string;
  allTicket?: string;
  allUserChat?: string;
  viewMessagesPending?: string;
  closePendingTicket?: string;
  campaigns?: string;
  contacts?: string;
  dashboard?: string;
  connections?: string;
  flow?: string;
  kanban?: string;
  internalChat?: string;
  financeiro?: string;
  schedules?: string;
  useWhatsappOfficial?: boolean;
}

const UpdateCompanyService = async (
  companyData: CompanyData
): Promise<Company> => {

  const company = await Company.findByPk(companyData.id);
  const {
    name,
    phone,
    email,
    status,
    planId,
    campaignsEnabled,
    dueDate,
    recurrence,
    document,
    paymentMethod,
    password,
    generateInvoice,
    stripeProductKey,
    useWhatsappOfficial
  } = companyData;

  let resolvedPlanId = planId;
  let resolvedStripeKey = stripeProductKey
    ? String(stripeProductKey).trim().toLowerCase()
    : undefined;
  const billingInterval =
    recurrence && String(recurrence).toUpperCase() === "ANUAL" ? "annual" : "monthly";

  if (resolvedStripeKey) {
    const synced = await syncStripePlanToLocalPlan(resolvedStripeKey, {
      interval: billingInterval
    });
    resolvedPlanId = synced.planId;
  }

  if (!company) {
    throw new AppError("ERR_NO_COMPANY_FOUND", 404);
  }

  const existUser = await User.findOne({
    where: {
      companyId: company.id,
      email: email
    }
  });

  if (existUser && existUser.email !== company.email) {
    throw new AppError("Usuário já existe com esse e-mail!", 404)
  }

  const user = await User.findOne({
    where: {
      companyId: company.id,
      email: company.email
    }
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404)
  }
  
  await user.update({
    email,
    password: password || undefined,
    allHistoric: companyData.allHistoric || user.allHistoric,
    allTicket: companyData.allTicket || user.allTicket,
    allUserChat: companyData.allUserChat || user.allUserChat,
    userClosePendingTicket: companyData.closePendingTicket || user.userClosePendingTicket,
    showDashboard: companyData.dashboard || user.showDashboard,
    showContacts: companyData.contacts || user.showContacts,
    showCampaign: companyData.campaigns || user.showCampaign,
    showFlow: companyData.flow || user.showFlow,
    allowRealTime: companyData.dashboard || user.allowRealTime,
    allowConnections: companyData.connections || user.allowConnections,
    allowSeeMessagesInPendingTickets: companyData.viewMessagesPending || user.allowSeeMessagesInPendingTickets,
  });

  await company.update({
    name,
    phone,
    email,
    status,
    planId: resolvedPlanId,
    dueDate,
    recurrence,
    document,
    paymentMethod,
    generateInvoice,
    ...(useWhatsappOfficial !== undefined
      ? { useWhatsappOfficial: Boolean(useWhatsappOfficial) }
      : {}),
    ...(resolvedStripeKey !== undefined
      ? { stripeProductKey: resolvedStripeKey || null }
      : {})
  });

  if (resolvedStripeKey) {
    await applyStripeProductToCompany({
      companyId: company.id,
      stripeProductKey: resolvedStripeKey,
      interval: billingInterval
    });
  }

  // Atualizar Configurações da Empresa
  const [settings, created] = await CompaniesSettings.findOrCreate({
    where: { companyId: company.id },
    defaults: {
      companyId: company.id,
      hoursCloseTicketsAuto: "9999999999",
      chatBotType: "text",
    }
  });

  await settings.update({
    acceptCallWhatsapp: companyData.acceptCallWhatsapp || settings.acceptCallWhatsapp,
    userRandom: companyData.userRandom || settings.userRandom,
    sendGreetingMessageOneQueues: companyData.sendGreetingMessageOneQueues || settings.sendGreetingMessageOneQueues,
    sendSignMessage: companyData.sendSignMessage || settings.sendSignMessage,
    sendFarewellWaitingTicket: companyData.sendFarewellWaitingTicket || settings.sendFarewellWaitingTicket,
    userRating: companyData.userRating || settings.userRating,
    sendGreetingAccepted: companyData.sendGreetingAccepted || settings.sendGreetingAccepted,
    sendQueuePosition: companyData.sendQueuePosition || settings.sendQueuePosition,
    scheduleType: companyData.scheduleType || settings.scheduleType,
    acceptAudioMessageContact: companyData.acceptAudioMessageContact || settings.acceptAudioMessageContact,
    sendMsgTransfTicket: companyData.sendMsgTransfTicket || settings.sendMsgTransfTicket,
    enableLGPD: companyData.enableLGPD || settings.enableLGPD,
    requiredTag: companyData.requiredTag || settings.requiredTag,
    closeTicketOnTransfer: companyData.closeTicketOnTransfer !== undefined ? companyData.closeTicketOnTransfer : settings.closeTicketOnTransfer,
    DirectTicketsToWallets: companyData.DirectTicketsToWallets !== undefined ? companyData.DirectTicketsToWallets : settings.DirectTicketsToWallets,
    showNotificationPending: companyData.showNotificationPending !== undefined ? companyData.showNotificationPending : settings.showNotificationPending,
  });

  if (companyData.campaignsEnabled !== undefined) {
    const [setting, created] = await Setting.findOrCreate({
      where: {
        companyId: company.id,
        key: "campaignsEnabled"
      },
      defaults: {
        companyId: company.id,
        key: "campaignsEnabled",
        value: `${campaignsEnabled}`
      }
    });
    if (!created) {
      await setting.update({ value: `${campaignsEnabled}` });
    }
  }

  return company;
};

export default UpdateCompanyService;
