/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import logger from "../utils/logger";

const PLAN_NAME =
  (process.env.SEED_PLAN_NAME || "OlaChat Pro Unlimited").trim();
const COMPANY_NAME =
  (process.env.SEED_COMPANY_NAME || "OlaChat Pro").trim();
const USER_NAME =
  (process.env.SEED_ADMIN_NAME || "Admin OlaChat Pro").trim();
const PRIMARY_EMAIL =
  (process.env.SEED_ADMIN_EMAIL || "admin@local.dev").trim().toLowerCase();
const USER_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "123456";
const DUE_DATE = "2099-12-31T00:00:00.000Z";

export const ADMIN_EMAILS = [PRIMARY_EMAIL].filter(Boolean);

export async function ensureAdminUser(): Promise<void> {
  try {
    const Plan = (await import("../models/Plan")).default;
    const Company = (await import("../models/Company")).default;
    const User = (await import("../models/User")).default;
    const CompaniesSettings = (await import("../models/CompaniesSettings")).default;

    // Garantir que os e-mails de admin não sejam deletados e preservem nomes customizados
    const adminEmails = Array.from(new Set([PRIMARY_EMAIL, "admin@dev.local", "admin@local.dev"].filter(Boolean)));
    const passwordHash = await bcrypt.hash(USER_PASSWORD, 8);

    let plan = await Plan.findOne({ where: { name: PLAN_NAME } });
    if (!plan) {
      plan = await Plan.create({
        name: PLAN_NAME,
        users: 999999,
        connections: 999999,
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
        trial: false,
        trialDays: 0,
        recurrence: "ANUAL",
        useOpenAi: true,
        useIntegrations: true,
        isPublic: false,
        useWhatsappOfficial: true,
        wavoip: true
      });
      logger.info(`[ensureAdminUser] Plano criado: ${plan.id}`);
    } else {
      await plan.update({
        users: 999999,
        connections: 999999,
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
        wavoip: true
      });
    }

    let company = await Company.findOne({
      where: { email: { [Op.iLike]: PRIMARY_EMAIL } }
    });

    if (!company) {
      company = await Company.create({
        name: COMPANY_NAME,
        email: PRIMARY_EMAIL,
        phone: "",
        status: true,
        dueDate: DUE_DATE,
        recurrence: "ANUAL",
        planId: plan.id,
        document: "",
        paymentMethod: "",
        generateInvoice: false,
        allowOrgManualVisualIdentity: true
      });
      logger.info(`[ensureAdminUser] Empresa criada: id=${company.id}`);
    } else {
      await company.update({
        planId: plan.id,
        dueDate: DUE_DATE,
        status: true,
        recurrence: "ANUAL",
        allowOrgManualVisualIdentity: true
      });
    }

    const companyId = company.id;

    for (const adminEmail of adminEmails) {
      let user = await User.findOne({
        where: { email: { [Op.iLike]: adminEmail } }
      });

      if (user) {
        // Manter o NOME customizado e SENHA editados pelo usuário no painel!
        await user.update({
          profile: "admin",
          companyId,
          super: true
        });
        logger.info(`[ensureAdminUser] Admin preservado/mantido: ${user.email} (id=${user.id})`);
      } else {
        user = await User.create({
          name: USER_NAME,
          email: adminEmail,
          passwordHash,
          profile: "admin",
          companyId,
          super: true,
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
          defaultTheme: "light",
          defaultMenu: "open",
          tokenVersion: 0,
          online: false
        });
        logger.info(`[ensureAdminUser] Admin criado: ${adminEmail} (id=${user.id}, companyId=${companyId})`);
      }
    }

    try {
      await CompaniesSettings.findOrCreate({
        where: { companyId },
        defaults: {
          companyId,
          hoursCloseTicketsAuto: "9999999999",
          chatBotType: "text",
          acceptCallWhatsapp: "enabled",
          userRandom: "enabled",
          sendGreetingMessageOneQueues: "enabled",
          sendSignMessage: "enabled",
          sendFarewellWaitingTicket: "enabled",
          userRating: "enabled",
          sendGreetingAccepted: "enabled",
          CheckMsgIsGroup: "enabled",
          sendQueuePosition: "enabled",
          scheduleType: "enabled",
          acceptAudioMessageContact: "enabled",
          sendMsgTransfTicket: "enabled",
          enableLGPD: "disabled",
          requiredTag: "disabled",
          lgpdDeleteMessage: "disabled",
          lgpdHideNumber: "disabled",
          lgpdConsent: "disabled",
          lgpdLink: "",
          lgpdMessage: "",
          closeTicketOnTransfer: false,
          DirectTicketsToWallets: false,
          showNotificationPending: false
        }
      });
    } catch (e: any) {
      logger.warn({
        msg: "[ensureAdminUser] CompaniesSettings (não crítico)",
        error: e?.message || String(e)
      });
    }

    logger.info(
      `[ensureAdminUser] OK — logins garantidos: ${ADMIN_EMAILS.join(" | ")} / senha: ${USER_PASSWORD}`
    );
  } catch (err: any) {
    logger.error({
      msg: "[ensureAdminUser] Falha (erro crítico no seed admin)",
      error: err?.message || String(err),
      stack: err?.stack?.split("\n")[0]
    });
  }
}

export default ensureAdminUser;
