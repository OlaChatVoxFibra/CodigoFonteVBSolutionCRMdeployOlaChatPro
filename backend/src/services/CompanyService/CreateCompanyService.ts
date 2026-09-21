/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Company from "../../models/Company";
import User from "../../models/User";
import sequelize from "../../database";
import CompaniesSettings from "../../models/CompaniesSettings";
import { applyStripeProductToCompany, syncStripePlanToLocalPlan } from "../StripeBilling/syncStripePlanToLocalPlan";
import axios from "axios";

interface CompanyData {
  name: string;
  phone?: string;
  email?: string;
  status?: boolean;
  planId?: number;
  dueDate?: string;
  recurrence?: string;
  document?: string;
  paymentMethod?: string;
  password?: string;
  companyUserName?: string;
  generateInvoice?: boolean;
  stripeProductKey?: string;
  /** Quando true, não consulta ReceitaWS (cadastro freemium / evita falhas de rede/API). */
  skipExternalCnpjValidation?: boolean;
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

const validateCnpjWithReceita = async (cnpj: string): Promise<boolean> => {
  try {
    // Remover formatação do CNPJ
    const cleanCnpj = cnpj.replace(/\D/g, '');
    
    const response = await axios.get(`https://receitaws.com.br/v1/cnpj/${cleanCnpj}`);
    const data = response.data;
    
    if (data.status === "ERROR") {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao validar CNPJ:", error);
    return false;
  }
};

const CreateCompanyService = async (
  companyData: CompanyData
): Promise<Company> => {
  const {
    name,
    phone,
    password,
    email,
    status,
    planId,
    dueDate,
    recurrence,
    document,
    paymentMethod,
    companyUserName,
    generateInvoice,
    skipExternalCnpjValidation,
    stripeProductKey,
    useWhatsappOfficial
  } = companyData;

  let resolvedPlanId = planId;
  let resolvedStripeKey = stripeProductKey ? String(stripeProductKey).trim().toLowerCase() : null;
  const billingInterval =
    recurrence && String(recurrence).toUpperCase() === "ANUAL" ? "annual" : "monthly";
  if (resolvedStripeKey) {
    const synced = await syncStripePlanToLocalPlan(resolvedStripeKey, {
      interval: billingInterval
    });
    resolvedPlanId = synced.planId;
  }

  const companySchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_COMPANY_INVALID_NAME")
      .required("ERR_COMPANY_INVALID_NAME")
  });

  try {
    await companySchema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Validar CNPJ na ReceitaWS apenas quando habilitado (API externa instável / rate limit)
  if (!skipExternalCnpjValidation && document && document.trim() !== "") {
    const cleanDoc = document.replace(/\D/g, "");

    if (cleanDoc.length === 14) {
      const isCnpjValid = await validateCnpjWithReceita(document);
      if (!isCnpjValid) {
        throw new AppError("CNPJ inválido ou não encontrado na Receita Federal", 400);
      }
    }
  }

  const t = await sequelize.transaction();

  try {
    const company = await Company.create({
      name,
      phone,
      email,
      status,
      planId: resolvedPlanId,
      dueDate,
      recurrence,
      document: document ? document.replace(/\D/g, '') : "",
      paymentMethod,
      generateInvoice,
      stripeProductKey: resolvedStripeKey,
      ...(useWhatsappOfficial !== undefined
        ? { useWhatsappOfficial: Boolean(useWhatsappOfficial) }
        : {})
    },
      { transaction: t }
    );

    const user = await User.create({
      name: companyUserName ? companyUserName : name,
      email: company.email,
      password: password ? password : "mudar123",
      profile: "admin",
      companyId: company.id,
      allHistoric: companyData.allHistoric || "disabled",
      allTicket: companyData.allTicket || "disabled",
      allUserChat: companyData.allUserChat || "disabled",
      userClosePendingTicket: companyData.closePendingTicket || "enabled",
      showDashboard: companyData.dashboard || "enabled",
      showContacts: companyData.contacts || "enabled",
      showCampaign: companyData.campaigns || "enabled",
      showFlow: companyData.flow || "enabled",
      allowRealTime: companyData.dashboard || "enabled",
      allowConnections: companyData.connections || "enabled",
      allowSeeMessagesInPendingTickets: companyData.viewMessagesPending || "enabled",
    },
      { transaction: t }
    );

    const settings = await CompaniesSettings.create({
          companyId: company.id,
          hoursCloseTicketsAuto: "9999999999",
          chatBotType: "text",
          acceptCallWhatsapp: companyData.acceptCallWhatsapp || "enabled",
          userRandom: companyData.userRandom || "enabled",
          sendGreetingMessageOneQueues: companyData.sendGreetingMessageOneQueues || "enabled",
          sendSignMessage: companyData.sendSignMessage || "enabled",
          sendFarewellWaitingTicket: companyData.sendFarewellWaitingTicket || "disabled",
          userRating: companyData.userRating || "disabled",
          sendGreetingAccepted: companyData.sendGreetingAccepted || "enabled",
          CheckMsgIsGroup: "enabled",
          sendQueuePosition: companyData.sendQueuePosition || "disabled",
          scheduleType: companyData.scheduleType || "disabled",
          acceptAudioMessageContact: companyData.acceptAudioMessageContact || "enabled",
          sendMsgTransfTicket: companyData.sendMsgTransfTicket || "disabled",
          enableLGPD: companyData.enableLGPD || "disabled",
          requiredTag: companyData.requiredTag || "disabled",
          lgpdDeleteMessage: "disabled",
          lgpdHideNumber: "disabled",
          lgpdConsent: "disabled",
          lgpdLink:"",
          lgpdMessage:"",
          createdAt: new Date(),
          updatedAt: new Date(),
          closeTicketOnTransfer: companyData.closeTicketOnTransfer || false,
          DirectTicketsToWallets: companyData.DirectTicketsToWallets || false,
          showNotificationPending: companyData.showNotificationPending || false
    },{ transaction: t })
    
    if (resolvedStripeKey) {
      await applyStripeProductToCompany({
        companyId: company.id,
        stripeProductKey: resolvedStripeKey,
        interval: billingInterval
      });
    }

    await t.commit();

    return company;
  } catch (error: any) {
    await t.rollback();
    if (error instanceof AppError) {
      throw error;
    }
    const errName = error?.name;
    const parentCode = error?.parent?.code;
    if (errName === "SequelizeUniqueConstraintError" || parentCode === "23505") {
      throw new AppError("Este e-mail já está cadastrado", 409);
    }
    const msg =
      typeof error?.message === "string" && error.message.length < 240
        ? error.message
        : "Não foi possível criar a empresa!";
    throw new AppError(msg, 400);
  }
};

export default CreateCompanyService;