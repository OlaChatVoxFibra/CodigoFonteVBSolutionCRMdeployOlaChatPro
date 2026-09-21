/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";
import { hash } from "bcryptjs";

const PLAN_NAME = "Admin Local Unlimited";
const COMPANY_NAME = "VB Solution Admin";
const USER_EMAIL = "admin@local.dev";
const USER_NAME = "Admin Local";
const USER_PASSWORD = "123456";

/**
 * Admin plataforma local/demo: admin@local.dev / 123456
 * super=true, plano ilimitado, todas as flags enabled.
 * Idempotente.
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const [existingUsers] = (await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE LOWER(email) = LOWER(:email) LIMIT 1`,
      { replacements: { email: USER_EMAIL } }
    )) as [{ id: number }[], unknown];

    if (existingUsers.length > 0) {
      const passwordHash = await hash(USER_PASSWORD, 8);
      await queryInterface.sequelize.query(
        `
        UPDATE "Users" SET
          "passwordHash" = :passwordHash,
          "profile" = 'admin',
          "super" = true,
          "allHistoric" = 'enabled',
          "allTicket" = 'enabled',
          "allUserChat" = 'enabled',
          "userClosePendingTicket" = 'enabled',
          "showDashboard" = 'enabled',
          "allowRealTime" = 'enabled',
          "allowConnections" = 'enabled',
          "showContacts" = 'enabled',
          "showCampaign" = 'enabled',
          "showFlow" = 'enabled',
          "allowSeeMessagesInPendingTickets" = 'enabled',
          "allowGroup" = true,
          "updatedAt" = NOW()
        WHERE LOWER(email) = LOWER(:email)
        `,
        { replacements: { email: USER_EMAIL, passwordHash } }
      );
      console.log(`[admin-local] Usuário já existia — senha/perms atualizadas (${USER_EMAIL})`);
      return;
    }

    const passwordHash = await hash(USER_PASSWORD, 8);
    const dueDate = "2099-12-31";

    await queryInterface.sequelize.transaction(async t => {
      await queryInterface.sequelize.query(
        `
        INSERT INTO "Plans" (
          "name", "users", "connections", "queues", "amount",
          "useWhatsapp", "useFacebook", "useInstagram", "useCampaigns", "useSchedules",
          "useInternalChat", "useExternalApi", "useKanban",
          "trial", "trialDays", "recurrence", "useOpenAi", "useIntegrations",
          "isPublic", "useWhatsappOfficial", "wavoip", "createdAt", "updatedAt"
        ) VALUES (
          :planName, 999999, 999999, 999, '0',
          true, true, true, true, true,
          true, true, true,
          false, 0, 'ANUAL', true, true,
          false, true, true, NOW(), NOW()
        )
        ON CONFLICT ("name") DO UPDATE SET
          "users" = EXCLUDED."users",
          "connections" = EXCLUDED."connections",
          "queues" = EXCLUDED."queues",
          "useWhatsapp" = true,
          "useFacebook" = true,
          "useInstagram" = true,
          "useCampaigns" = true,
          "useSchedules" = true,
          "useInternalChat" = true,
          "useExternalApi" = true,
          "useKanban" = true,
          "useOpenAi" = true,
          "useIntegrations" = true,
          "useWhatsappOfficial" = true,
          "wavoip" = true,
          "updatedAt" = NOW();
        `,
        { transaction: t, replacements: { planName: PLAN_NAME } }
      );

      const [planRows] = (await queryInterface.sequelize.query(
        `SELECT id FROM "Plans" WHERE name = :planName LIMIT 1`,
        { transaction: t, replacements: { planName: PLAN_NAME } }
      )) as [{ id: number }[], unknown];
      const planId = planRows[0]?.id;
      if (!planId) throw new Error("[admin-local] Falha ao resolver planId.");

      const [companyRows] = (await queryInterface.sequelize.query(
        `
        INSERT INTO "Companies" (
          "name", "email", "phone", "status", "dueDate", "recurrence",
          "planId", "document", "paymentMethod", "generateInvoice",
          "allowOrgManualVisualIdentity", "createdAt", "updatedAt"
        ) VALUES (
          :companyName, :email, '', true, :dueDate, 'ANUAL',
          :planId, '', '', false,
          true, NOW(), NOW()
        )
        RETURNING id;
        `,
        {
          transaction: t,
          replacements: {
            companyName: COMPANY_NAME,
            email: USER_EMAIL,
            dueDate,
            planId
          }
        }
      )) as [{ id: number }[], unknown];
      const companyId = companyRows[0]?.id;
      if (!companyId) throw new Error("[admin-local] Falha ao criar empresa.");

      await queryInterface.sequelize.query(
        `
        INSERT INTO "Users" (
          "name", "email", "passwordHash", "profile", "companyId", "super",
          "startWork", "endWork", "allHistoric", "allTicket", "allUserChat",
          "userClosePendingTicket", "showDashboard", "allowRealTime", "allowConnections",
          "showContacts", "showCampaign", "showFlow", "allowSeeMessagesInPendingTickets",
          "allowGroup", "defaultTheme", "defaultMenu", "tokenVersion", "online",
          "createdAt", "updatedAt"
        ) VALUES (
          :userName, :email, :passwordHash, 'admin', :companyId, true,
          '00:00', '23:59', 'enabled', 'enabled', 'enabled',
          'enabled', 'enabled', 'enabled', 'enabled',
          'enabled', 'enabled', 'enabled', 'enabled',
          true, 'light', 'open', 0, false,
          NOW(), NOW()
        );
        `,
        {
          transaction: t,
          replacements: {
            userName: USER_NAME,
            email: USER_EMAIL,
            passwordHash,
            companyId
          }
        }
      );

      await queryInterface.sequelize.query(
        `
        INSERT INTO "CompaniesSettings" (
          "companyId", "hoursCloseTicketsAuto", "chatBotType", "acceptCallWhatsapp",
          "userRandom", "sendGreetingMessageOneQueues", "sendSignMessage",
          "sendFarewellWaitingTicket", "userRating", "sendGreetingAccepted",
          "CheckMsgIsGroup", "sendQueuePosition", "scheduleType",
          "acceptAudioMessageContact", "sendMsgTransfTicket", "enableLGPD",
          "requiredTag", "lgpdDeleteMessage", "lgpdHideNumber", "lgpdConsent",
          "lgpdLink", "lgpdMessage", "closeTicketOnTransfer", "DirectTicketsToWallets",
          "showNotificationPending", "createdAt", "updatedAt"
        )
        SELECT
          :companyId, '9999999999', 'text', 'enabled',
          'enabled', 'enabled', 'enabled',
          'enabled', 'enabled', 'enabled',
          'enabled', 'enabled', 'enabled',
          'enabled', 'enabled', 'disabled',
          'disabled', 'disabled', 'disabled', 'disabled',
          '', '', false, false,
          false, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM "CompaniesSettings" WHERE "companyId" = :companyId
        );
        `,
        { transaction: t, replacements: { companyId } }
      );

      console.log(
        `[admin-local] Conta criada: companyId=${companyId}, admin=${USER_EMAIL}`
      );
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const [users] = (await queryInterface.sequelize.query(
      `SELECT id, "companyId" FROM "Users" WHERE LOWER(email) = LOWER(:email) LIMIT 1`,
      { replacements: { email: USER_EMAIL } }
    )) as [{ id: number; companyId: number }[], unknown];

    if (!users.length) return;

    const { id: userId, companyId } = users[0];
    await queryInterface.sequelize.transaction(async t => {
      await queryInterface.sequelize.query(`DELETE FROM "Users" WHERE id = :userId`, {
        transaction: t,
        replacements: { userId }
      });
      await queryInterface.sequelize.query(
        `DELETE FROM "CompaniesSettings" WHERE "companyId" = :companyId`,
        { transaction: t, replacements: { companyId } }
      );
      await queryInterface.sequelize.query(`DELETE FROM "Companies" WHERE id = :companyId`, {
        transaction: t,
        replacements: { companyId }
      });
      await queryInterface.sequelize.query(`DELETE FROM "Plans" WHERE name = :planName`, {
        transaction: t,
        replacements: { planName: PLAN_NAME }
      });
    });
  }
};
