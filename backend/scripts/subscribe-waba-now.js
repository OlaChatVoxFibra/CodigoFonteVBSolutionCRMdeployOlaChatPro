/**
 * Inscreve app nos webhooks da WABA (produção).
 * node scripts/subscribe-waba-now.js [whatsappId]
 */
require("dotenv/config");
const axios = require("axios");
const { Sequelize } = require("sequelize");

const WHATSAPP_ID = Number(process.argv[2] || 228);
const BASE = (
  process.env.PUBLIC_BACKEND_URL ||
  process.env.BACKEND_PUBLIC_URL ||
  "https://vbsolutioncrmdeploy-production.up.railway.app"
).replace(/\/$/, "");
const WEBHOOK = `${BASE}/v1/webhook/waba`;
const VERIFY = (process.env.VERIFY_TOKEN || "vbsolution").trim();

const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function main() {
  const rows = await db.query(
    `SELECT id, name, waba_id, send_token FROM "Whatsapps" WHERE id = :id`,
    { replacements: { id: WHATSAPP_ID }, type: Sequelize.QueryTypes.SELECT }
  );
  const w = rows[0];
  const token = String(w.send_token || "").replace(/\s+/g, "");

  console.log("WABA", w.waba_id, "| webhook", WEBHOOK);

  const before = await axios.get(
    `https://graph.facebook.com/v21.0/${w.waba_id}/subscribed_apps`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log("\nAntes:", JSON.stringify(before.data, null, 2));

  try {
    const sub1 = await axios.post(
      `https://graph.facebook.com/v21.0/${w.waba_id}/subscribed_apps`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("\nPOST subscribe (base) OK:", sub1.data);
  } catch (e) {
    console.log("\nPOST base:", JSON.stringify(e.response?.data?.error || e.message, null, 2));
  }

  try {
    const sub2 = await axios.post(
      `https://graph.facebook.com/v21.0/${w.waba_id}/subscribed_apps`,
      { override_callback_uri: WEBHOOK, verify_token: VERIFY },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("\nPOST override OK:", sub2.data);
  } catch (e) {
    console.log("\nPOST override:", JSON.stringify(e.response?.data?.error || e.message, null, 2));
  }

  const after = await axios.get(
    `https://graph.facebook.com/v21.0/${w.waba_id}/subscribed_apps`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log("\nDepois:", JSON.stringify(after.data, null, 2));

  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
