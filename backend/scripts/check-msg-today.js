require("dotenv/config");
const axios = require("axios");
const { Sequelize } = require("sequelize");

const WHATSAPP_ID = 236;
const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function main() {
  const conn = await db.query(
    `SELECT id, name, waba_webhook, waba_id, phone_number_id, length(send_token) as token_len, "updatedAt"
     FROM "Whatsapps" WHERE id = :id`,
    { replacements: { id: WHATSAPP_ID }, type: Sequelize.QueryTypes.SELECT }
  );
  console.log("\n=== CONEXÃO ===");
  console.log(JSON.stringify(conn[0], null, 2));

  const msgs = await db.query(
    `SELECT m.id, m."ticketId", m."fromMe", left(m.body, 100) as body, m."createdAt", c.number, c.name
     FROM "Messages" m
     JOIN "Tickets" t ON t.id = m."ticketId"
     JOIN "Contacts" c ON c.id = m."contactId"
     WHERE t."whatsappId" = :wid
       AND m."createdAt" >= '2026-05-28 14:50:00'
     ORDER BY m.id DESC LIMIT 20`,
    { replacements: { wid: WHATSAPP_ID }, type: Sequelize.QueryTypes.SELECT }
  );
  console.log("\n=== MENSAGENS HOJE (UTC no banco) ===");
  console.log(JSON.stringify(msgs, null, 2));

  const tickets = await db.query(
    `SELECT id, status, "lastMessage", "createdAt", "updatedAt"
     FROM "Tickets" WHERE "whatsappId" = :wid ORDER BY id DESC LIMIT 8`,
    { replacements: { wid: WHATSAPP_ID }, type: Sequelize.QueryTypes.SELECT }
  );
  console.log("\n=== TICKETS ===");
  console.log(JSON.stringify(tickets, null, 2));

  const token = (await db.query(
    `SELECT send_token FROM "Whatsapps" WHERE id = :id`,
    { replacements: { id: WHATSAPP_ID }, type: Sequelize.QueryTypes.SELECT }
  ))[0]?.send_token?.replace(/\s+/g, "");

  if (token) {
    try {
      const phone = await axios.get(
        `https://graph.facebook.com/v21.0/${conn[0].phone_number_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { fields: "status,display_phone_number" }
        }
      );
      console.log("\n=== META NÚMERO ===", phone.data);

      const subs = await axios.get(
        `https://graph.facebook.com/v21.0/${conn[0].waba_id}/subscribed_apps`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("\n=== SUBSCRIBED APPS ===");
      console.log(JSON.stringify(subs.data, null, 2));
    } catch (e) {
      console.log("Meta erro:", e.response?.data?.error || e.message);
    }
  }

  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
