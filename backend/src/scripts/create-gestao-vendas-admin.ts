/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "dotenv/config";
import sequelize from "../database";
import User from "../models/User";
import Company from "../models/Company";
import Plan from "../models/Plan";
import CreateCompanyService from "../services/CompanyService/CreateCompanyService";

const USER_EMAIL = "gestaovendas@gmail.com";
const USER_PASSWORD = "123456";
const USER_NAME = "Admin Gestão Vendas";
const COMPANY_NAME = "Gestão Vendas";
const PLAN_NAME = "Gestão Vendas Pro";

async function ensurePlan(): Promise<Plan> {
  const [plan] = await Plan.findOrCreate({
    where: { name: PLAN_NAME },
    defaults: {
      name: PLAN_NAME,
      users: 999999,
      connections: 999,
      queues: 999,
      amount: "0",
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
      trial: false,
      trialDays: 0,
      recurrence: "ANUAL",
      isPublic: false
    } as any
  });

  await plan.update({
    users: 999999,
    connections: 999,
    queues: 999,
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
    recurrence: "ANUAL"
  } as any);

  return plan;
}

async function main() {
  try {
    await sequelize.authenticate();

    const existing = await User.findOne({ where: { email: USER_EMAIL } });
    if (existing) {
      const company = await Company.findByPk(existing.companyId);
      console.log(
        `[gestao-vendas] Usuário já existe: ${USER_EMAIL} (userId=${existing.id}, companyId=${existing.companyId}, empresa=${company?.name || "?"})`
      );
      process.exit(0);
      return;
    }

    const plan = await ensurePlan();

    const company = await CreateCompanyService({
      name: COMPANY_NAME,
      email: USER_EMAIL,
      phone: "",
      password: USER_PASSWORD,
      companyUserName: USER_NAME,
      status: true,
      planId: plan.id,
      dueDate: "2099-12-31",
      recurrence: "ANUAL",
      document: "",
      paymentMethod: "",
      generateInvoice: false,
      skipExternalCnpjValidation: true,
      allHistoric: "enabled",
      allTicket: "enabled",
      allUserChat: "enabled",
      closePendingTicket: "enabled",
      dashboard: "enabled",
      connections: "enabled",
      campaigns: "enabled",
      contacts: "enabled",
      flow: "enabled",
      viewMessagesPending: "enabled"
    });

    const admin = await User.findOne({
      where: { email: USER_EMAIL, companyId: company.id }
    });

    if (admin) {
      await admin.update({
        allHistoric: "enabled",
        allTicket: "enabled",
        allUserChat: "enabled",
        showDashboard: "enabled",
        allowRealTime: "enabled",
        allowConnections: "enabled",
        showContacts: "enabled",
        showCampaign: "enabled",
        showFlow: "enabled",
        allowSeeMessagesInPendingTickets: "enabled",
        allowGroup: true,
        defaultMenu: "open",
        startWork: "00:00",
        endWork: "23:59",
        super: false
      } as any);
    }

    console.log(
      `[gestao-vendas] Conta criada: email=${USER_EMAIL}, companyId=${company.id}, planId=${plan.id}`
    );
    process.exit(0);
  } catch (err) {
    console.error("[gestao-vendas] Erro:", err);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch {}
  }
}

main();
