/**
 * Restaura contatos, tickets, mensagens e conexões órfãos (companyId NULL)
 * para a organização Gestão Vendas (companyId=41).
 *
 * Uso: node scripts/restore-gestao-vendas-data.js
 */
require("dotenv").config();
const { Sequelize } = require("sequelize");

const url = process.env.DATABASE_URL || process.env.RAILWAY_DATABASE_URL;
const sequelize = new Sequelize(url, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

const COMPANY_ID = 41;
const USER_EMAIL = "gestaovendas@gmail.com";

async function count(label, sql, replacements = {}) {
  const [rows] = await sequelize.query(sql, { replacements });
  const n = rows[0]?.total ?? rows[0]?.count ?? 0;
  console.log(`${label}: ${n}`);
  return n;
}

async function main() {
  await sequelize.authenticate();

  const [users] = await sequelize.query(
    `SELECT id, "companyId" FROM "Users" WHERE LOWER(email) = LOWER(:email)`,
    { replacements: { email: USER_EMAIL } }
  );
  if (!users.length || users[0].companyId !== COMPANY_ID) {
    throw new Error(`Conta ${USER_EMAIL} não encontrada em companyId=${COMPANY_ID}`);
  }
  const userId = users[0].id;

  await sequelize.transaction(async (t) => {
    const opts = { transaction: t };

    console.log("\n--- ANTES ---");
    await count(
      "Contatos órfãos",
      `SELECT COUNT(*)::int as total FROM "Contacts" WHERE "companyId" IS NULL`
    );
    await count(
      "Tickets órfãos",
      `SELECT COUNT(*)::int as total FROM "Tickets" WHERE "companyId" IS NULL`
    );

    const [, contactsMeta] = await sequelize.query(
      `UPDATE "Contacts" SET "companyId" = :companyId, "updatedAt" = NOW()
       WHERE "companyId" IS NULL`,
      { replacements: { companyId: COMPANY_ID }, ...opts }
    );
    console.log(`\nContatos restaurados: ${contactsMeta?.rowCount ?? "?"}`);

    const [, ticketsMeta] = await sequelize.query(
      `UPDATE "Tickets" SET "companyId" = :companyId, "updatedAt" = NOW()
       WHERE "companyId" IS NULL`,
      { replacements: { companyId: COMPANY_ID }, ...opts }
    );
    console.log(`Tickets restaurados: ${ticketsMeta?.rowCount ?? "?"}`);

    const [, ticketsFromContacts] = await sequelize.query(
      `UPDATE "Tickets" t SET "companyId" = :companyId, "updatedAt" = NOW()
       FROM "Contacts" c
       WHERE c.id = t."contactId" AND c."companyId" = :companyId AND t."companyId" IS DISTINCT FROM :companyId`,
      { replacements: { companyId: COMPANY_ID }, ...opts }
    );
    console.log(`Tickets via contatos: ${ticketsFromContacts?.rowCount ?? "?"}`);

    const [, messagesMeta] = await sequelize.query(
      `UPDATE "Messages" SET "companyId" = :companyId, "updatedAt" = NOW()
       WHERE "companyId" IS NULL`,
      { replacements: { companyId: COMPANY_ID }, ...opts }
    );
    console.log(`Mensagens restauradas: ${messagesMeta?.rowCount ?? "?"}`);

    const [, whatsappsMeta] = await sequelize.query(
      `UPDATE "Whatsapps" SET "companyId" = :companyId, "updatedAt" = NOW()
       WHERE "companyId" IS NULL`,
      { replacements: { companyId: COMPANY_ID }, ...opts }
    );
    console.log(`WhatsApps restaurados: ${whatsappsMeta?.rowCount ?? "?"}`);

    const [, queuesMeta] = await sequelize.query(
      `UPDATE "Queues" SET "companyId" = :companyId, "updatedAt" = NOW()
       WHERE "companyId" IS NULL`,
      { replacements: { companyId: COMPANY_ID }, ...opts }
    );
    console.log(`Filas restauradas: ${queuesMeta?.rowCount ?? "?"}`);

    await sequelize.query(
      `UPDATE "Companies" SET "allowOrgManualVisualIdentity" = true, "updatedAt" = NOW()
       WHERE id = :companyId`,
      { replacements: { companyId: COMPANY_ID }, ...opts }
    );
    console.log("Identidade visual manual habilitada.");

    const [whatsappRows] = await sequelize.query(
      `SELECT id FROM "Whatsapps" WHERE "companyId" = :companyId ORDER BY id LIMIT 1`,
      { replacements: { companyId: COMPANY_ID }, ...opts }
    );
    if (whatsappRows.length) {
      await sequelize.query(
        `UPDATE "Users" SET "whatsappId" = :whatsappId, "updatedAt" = NOW() WHERE id = :userId`,
        {
          replacements: { whatsappId: whatsappRows[0].id, userId },
          ...opts
        }
      );
      console.log(`WhatsApp padrão atribuído ao usuário (whatsappId=${whatsappRows[0].id}).`);
    }
  });

  console.log("\n--- DEPOIS ---");
  await count(
    "Contatos Gestão Vendas",
    `SELECT COUNT(*)::int as total FROM "Contacts" WHERE "companyId" = :companyId`,
    { companyId: COMPANY_ID }
  );
  await count(
    "Tickets Gestão Vendas",
    `SELECT COUNT(*)::int as total FROM "Tickets" WHERE "companyId" = :companyId`,
    { companyId: COMPANY_ID }
  );
  await count(
    "Leads Gestão Vendas",
    `SELECT COUNT(*)::int as total FROM leads_sales WHERE "companyId" = :companyId`,
    { companyId: COMPANY_ID }
  );
  await count(
    "Contatos ainda órfãos",
    `SELECT COUNT(*)::int as total FROM "Contacts" WHERE "companyId" IS NULL`
  );

  await sequelize.close();
  console.log("\nRestauração concluída.");
}

main().catch((e) => {
  console.error("ERRO:", e.message);
  process.exit(1);
});
