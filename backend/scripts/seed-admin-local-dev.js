/**
 * Seed admin@local.dev / 123456 no Postgres (Railway ou local).
 * Uso:
 *   DATABASE_URL=... DB_SSL=true node scripts/seed-admin-local-dev.js
 */
require("dotenv").config();
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const USER_EMAIL = "admin@local.dev";
const USER_PASSWORD = "123456";
const USER_NAME = "Admin Local";
const COMPANY_NAME = "VB Solution Admin";
const PLAN_NAME = "Admin Local Unlimited";

function dbUrl() {
  return (
    process.env.DATABASE_PUBLIC_URL ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
}

async function main() {
  const connectionString = dbUrl();
  if (!connectionString) {
    console.error("Defina DATABASE_URL ou DATABASE_PUBLIC_URL");
    process.exit(1);
  }

  const ssl =
    String(process.env.DB_SSL || "").toLowerCase() === "true" ||
    /railway|rlwy\.net|sslmode=require/i.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined;

  const client = new Client({ connectionString, ssl });
  await client.connect();

  try {
    const passwordHash = await bcrypt.hash(USER_PASSWORD, 8);
    const dueDate = "2099-12-31";

    await client.query("BEGIN");

    await client.query(
      `
      INSERT INTO "Plans" (
        "name", "users", "connections", "queues", "amount",
        "useWhatsapp", "useFacebook", "useInstagram", "useCampaigns", "useSchedules",
        "useInternalChat", "useExternalApi", "useKanban",
        "trial", "trialDays", "recurrence", "useOpenAi", "useIntegrations",
        "isPublic", "useWhatsappOfficial", "wavoip", "createdAt", "updatedAt"
      ) VALUES (
        $1, 999999, 999999, 999, '0',
        true, true, true, true, true,
        true, true, true,
        false, 0, 'ANUAL', true, true,
        false, true, true, NOW(), NOW()
      )
      ON CONFLICT ("name") DO UPDATE SET
        "users" = 999999,
        "connections" = 999999,
        "queues" = 999,
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
        "updatedAt" = NOW()
      `,
      [PLAN_NAME]
    );

    const planRes = await client.query(
      `SELECT id FROM "Plans" WHERE name = $1 LIMIT 1`,
      [PLAN_NAME]
    );
    const planId = planRes.rows[0].id;

    const existingUser = await client.query(
      `SELECT id, "companyId" FROM "Users" WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [USER_EMAIL]
    );

    let companyId;
    let userId;

    if (existingUser.rows.length) {
      userId = existingUser.rows[0].id;
      companyId = existingUser.rows[0].companyId;

      await client.query(
        `
        UPDATE "Users" SET
          "name" = $2,
          "passwordHash" = $3,
          "profile" = 'admin',
          "super" = true,
          "startWork" = '00:00',
          "endWork" = '23:59',
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
          "defaultTheme" = 'light',
          "defaultMenu" = 'open',
          "updatedAt" = NOW()
        WHERE id = $1
        `,
        [userId, USER_NAME, passwordHash]
      );

      await client.query(
        `
        UPDATE "Companies" SET
          "planId" = $2,
          "dueDate" = $3,
          "status" = true,
          "recurrence" = 'ANUAL',
          "allowOrgManualVisualIdentity" = true,
          "updatedAt" = NOW()
        WHERE id = $1
        `,
        [companyId, planId, dueDate]
      );

      console.log(`[admin-local] Usuário atualizado: ${USER_EMAIL} (id=${userId}, companyId=${companyId})`);
    } else {
      const companyRes = await client.query(
        `
        INSERT INTO "Companies" (
          "name", "email", "phone", "status", "dueDate", "recurrence",
          "planId", "document", "paymentMethod", "generateInvoice",
          "allowOrgManualVisualIdentity", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, '', true, $3, 'ANUAL',
          $4, '', '', false,
          true, NOW(), NOW()
        )
        RETURNING id
        `,
        [COMPANY_NAME, USER_EMAIL, dueDate, planId]
      );
      companyId = companyRes.rows[0].id;

      const userRes = await client.query(
        `
        INSERT INTO "Users" (
          "name", "email", "passwordHash", "profile", "companyId", "super",
          "startWork", "endWork", "allHistoric", "allTicket", "allUserChat",
          "userClosePendingTicket", "showDashboard", "allowRealTime", "allowConnections",
          "showContacts", "showCampaign", "showFlow", "allowSeeMessagesInPendingTickets",
          "allowGroup", "defaultTheme", "defaultMenu", "tokenVersion", "online",
          "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, 'admin', $4, true,
          '00:00', '23:59', 'enabled', 'enabled', 'enabled',
          'enabled', 'enabled', 'enabled', 'enabled',
          'enabled', 'enabled', 'enabled', 'enabled',
          true, 'light', 'open', 0, false,
          NOW(), NOW()
        )
        RETURNING id
        `,
        [USER_NAME, USER_EMAIL, passwordHash, companyId]
      );
      userId = userRes.rows[0].id;

      await client.query(
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
          $1, '9999999999', 'text', 'enabled',
          'enabled', 'enabled', 'enabled',
          'enabled', 'enabled', 'enabled',
          'enabled', 'enabled', 'enabled',
          'enabled', 'enabled', 'disabled',
          'disabled', 'disabled', 'disabled', 'disabled',
          '', '', false, false,
          false, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM "CompaniesSettings" WHERE "companyId" = $1
        )
        `,
        [companyId]
      );

      console.log(`[admin-local] Conta criada: ${USER_EMAIL} / ${USER_PASSWORD} (id=${userId}, companyId=${companyId})`);
    }

    await client.query("COMMIT");
    console.log("[admin-local] OK — login: admin@local.dev / 123456 (super admin, plano ilimitado)");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("[admin-local] Erro:", err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
