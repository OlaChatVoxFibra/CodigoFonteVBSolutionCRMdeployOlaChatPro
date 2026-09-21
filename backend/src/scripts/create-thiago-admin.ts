/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "dotenv/config";
import { Op } from "sequelize";
import sequelize from "../database";
import User from "../models/User";
import Company from "../models/Company";
import Plan from "../models/Plan";
import CompaniesSettings from "../models/CompaniesSettings";
import CreateCompanyService from "../services/CompanyService/CreateCompanyService";
import AuthUserService from "../services/UserServices/AuthUserService";

const USER_EMAIL = "thiagocsr83@gmail.com";
const USER_PASSWORD = "123456";
const USER_NAME = "Thiago";
const COMPANY_NAME = "Thiago";
const DUE_DATE = "2037-12-31";

async function ensureCompaniesSettings(companyId: number): Promise<void> {
  await CompaniesSettings.findOrCreate({
    where: { companyId },
    defaults: {
      companyId,
      hoursCloseTicketsAuto: "9999999999",
      chatBotType: "text"
    } as any
  });
}

async function ensureAdminUser(company: Company): Promise<User> {
  let user = await User.findOne({
    where: {
      companyId: company.id,
      email: { [Op.iLike]: USER_EMAIL } as any
    }
  });

  if (user) {
    user.password = USER_PASSWORD;
    await user.update({
      name: USER_NAME,
      profile: "admin",
      startWork: "00:00",
      endWork: "23:59",
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
      defaultMenu: "open"
    } as any);
    await user.save();
    return user;
  }

  user = await User.create({
    name: USER_NAME,
    email: USER_EMAIL,
    password: USER_PASSWORD,
    profile: "admin",
    companyId: company.id,
    startWork: "00:00",
    endWork: "23:59",
    allHistoric: "enabled",
    allTicket: "enabled",
    allUserChat: "enabled",
    userClosePendingTicket: "enabled",
    showDashboard: "enabled",
    allowRealTime: "enabled",
    allowConnections: "enabled",
    showContacts: "enabled",
    showCampaign: "enabled",
    showFlow: "enabled",
    allowSeeMessagesInPendingTickets: "enabled",
    allowGroup: true,
    defaultMenu: "open"
  } as any);

  return user;
}

async function main() {
  try {
    await sequelize.authenticate();

    let company = await Company.findOne({
      where: { email: { [Op.iLike]: USER_EMAIL } } as any
    });

    if (!company) {
      const plan =
        (await Plan.findOne({ order: [["id", "ASC"]] })) ||
        (await Plan.findByPk(3));

      if (!plan) {
        throw new Error("Nenhum plano encontrado para criar a empresa.");
      }

      company = await CreateCompanyService({
        name: COMPANY_NAME,
        email: USER_EMAIL,
        phone: "",
        password: USER_PASSWORD,
        companyUserName: USER_NAME,
        status: true,
        planId: plan.id,
        dueDate: DUE_DATE,
        recurrence: "MENSAL",
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
    } else {
      await company.update({
        email: USER_EMAIL,
        status: true,
        dueDate: DUE_DATE
      } as any);
    }

    await ensureCompaniesSettings(Number(company.id));
    const user = await ensureAdminUser(company);

    const auth = await AuthUserService({
      email: USER_EMAIL,
      password: USER_PASSWORD
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          email: USER_EMAIL,
          userId: user.id,
          companyId: company.id,
          dueDate: company.dueDate,
          authUserId: auth.serializedUser.id,
          authCompanyId: auth.serializedUser.companyId
        },
        null,
        2
      )
    );
    process.exit(0);
  } catch (err) {
    console.error("[create-thiago-admin] Erro:", err);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch {}
  }
}

main();
