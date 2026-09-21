/**
 * Mensagens/tickets recentes — ver se webhook real chegou.
 * node scripts/check-inbound-prod.js
 */
require("dotenv/config");
const { Sequelize } = require("sequelize");

const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function main() {
  const conns = await db.query(
    `SELECT id, name, status, phone_number_id, waba_id, waba_webhook,
            length(send_token) as token_len, "companyId"
     FROM "Whatsapps" WHERE channel = 'whatsapp_oficial' ORDER BY id`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  console.log("\n=== CONEXÕES OFICIAL ===");
  console.log(JSON.stringify(conns, null, 2));

  const msgs = await db.query(
    `SELECT m.id, m."ticketId", m."fromMe", left(m.body, 80) as body,
            m."createdAt", t.status, t."whatsappId", c.name, c.number
     FROM "Messages" m
     JOIN "Tickets" t ON t.id = m."ticketId"
     JOIN "Contacts" c ON c.id = m."contactId"
     WHERE t."whatsappId" IN (SELECT id FROM "Whatsapps" WHERE channel = 'whatsapp_oficial')
       AND m."createdAt" > NOW() - INTERVAL '48 hours'
     ORDER BY m.id DESC LIMIT 25`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  console.log("\n=== MENSAGENS (48h) ===");
  console.log(JSON.stringify(msgs, null, 2));

  const pending = await db.query(
    `SELECT id, status, "lastMessage", "userId", "queueId", "whatsappId", "updatedAt"
     FROM "Tickets"
     WHERE status IN ('pending','chatbot','lgpd')
       AND "whatsappId" IN (SELECT id FROM "Whatsapps" WHERE channel = 'whatsapp_oficial')
     ORDER BY id DESC LIMIT 10`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  console.log("\n=== TICKETS AGUARDANDO (oficial) ===");
  console.log(JSON.stringify(pending, null, 2));

  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
