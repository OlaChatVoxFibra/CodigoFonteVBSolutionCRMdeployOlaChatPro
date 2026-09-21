/**
 * Diagnóstico produção: conexão, tickets recentes, webhook simulado.
 * Uso: node scripts/diag-waba-prod.js
 */
require("dotenv/config");
const axios = require("axios");
const { Sequelize } = require("sequelize");

const WHATSAPP_ID = 228;
const BASE = "https://vbsolutioncrmdeploy-production.up.railway.app";

const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function main() {
  const conn = await db.query(
    `SELECT id, name, status, waba_id, phone_number_id, length(send_token) as token_len, waba_webhook
     FROM "Whatsapps" WHERE id = ${WHATSAPP_ID}`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  console.log("\n=== CONEXÃO ===");
  console.log(JSON.stringify(conn[0], null, 2));

  const wh = conn[0]?.waba_webhook || "";
  const correct = `${BASE}/v1/webhook/waba`;
  if (wh.includes(":8080") || wh.includes(":3000")) {
    console.log("\n!!! WEBHOOK NO BANCO COM PORTA ERRADA !!!");
    console.log("Salvo:", wh);
    console.log("Correto no Meta:", correct);
    if (process.argv.includes("--fix-webhook")) {
      await db.query(
        `UPDATE "Whatsapps" SET waba_webhook = :url WHERE id = :id`,
        { replacements: { url: correct, id: WHATSAPP_ID } }
      );
      console.log(">>> waba_webhook corrigido no banco");
    } else {
      console.log("Rode: node scripts/diag-waba-prod.js --fix-webhook");
    }
  }

  const tickets = await db.query(
    `SELECT id, status, "lastMessage", "userId", "queueId", "createdAt", "updatedAt"
     FROM "Tickets" WHERE "whatsappId" = ${WHATSAPP_ID} ORDER BY id DESC LIMIT 8`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  console.log("\n=== ÚLTIMOS TICKETS (228) ===");
  console.log(JSON.stringify(tickets, null, 2));

  const tokenRow = await db.query(
    `SELECT send_token FROM "Whatsapps" WHERE id = ${WHATSAPP_ID}`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  const token = (tokenRow[0]?.send_token || "").replace(/\s+/g, "");

  if (token && conn[0]?.waba_id) {
    try {
      const st = await axios.get(
        `https://graph.facebook.com/v21.0/${conn[0].phone_number_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { fields: "id,status,display_phone_number" }
        }
      );
      console.log("\n=== TOKEN META === OK");
      console.log("Status número:", st.data?.status, st.data?.display_phone_number);
    } catch (e) {
      console.log("\n=== TOKEN META === FALHOU");
      console.log(JSON.stringify(e.response?.data?.error || e.message, null, 2));
    }
  }

  if (process.argv.includes("--register") && token && conn[0]?.phone_number_id) {
    const pin = (process.env.META_WABA_REGISTER_PIN || "123456").replace(/\D/g, "").slice(0, 6).padStart(6, "0");
    console.log("\n=== REGISTRO CLOUD API (pin:", pin, ") ===");
    try {
      const reg = await axios.post(
        `https://graph.facebook.com/v21.0/${conn[0].phone_number_id}/register`,
        { messaging_product: "whatsapp", pin },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      console.log("OK", reg.data);
    } catch (e) {
      console.log("FALHOU", JSON.stringify(e.response?.data?.error || e.message, null, 2));
    }
  }

  const beforeMax = tickets[0]?.id || 0;
  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: conn[0].waba_id,
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: conn[0].phone_number_id },
              contacts: [{ profile: { name: "Diag Prod" }, wa_id: "5511988776655" }],
              messages: [
                {
                  from: "5511988776655",
                  id: `wamid.diag.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: `Diag ${new Date().toISOString()}` }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  console.log("\n=== POST WEBHOOK (sem assinatura) ===");
  try {
    const r = await axios.post(`${BASE}/v1/webhook/waba`, payload, { timeout: 45000 });
    console.log("HTTP", r.status, r.data);
  } catch (e) {
    console.log("FALHOU", e.response?.status, e.response?.data || e.message);
  }

  await new Promise((r) => setTimeout(r, 4000));

  const after = await db.query(
    `SELECT id, status, "lastMessage", "createdAt" FROM "Tickets"
     WHERE "whatsappId" = ${WHATSAPP_ID} ORDER BY id DESC LIMIT 3`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  console.log("\n=== TICKETS APÓS WEBHOOK ===");
  console.log(JSON.stringify(after, null, 2));

  const newest = after[0];
  if (newest && newest.id > beforeMax) {
    console.log("\n>>> CÓDIGO CRIOU TICKET #", newest.id, "status:", newest.status);
  } else {
    console.log("\n>>> WEBHOOK NÃO CRIOU TICKET NOVO — bug ou erro no processamento");
  }

  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
