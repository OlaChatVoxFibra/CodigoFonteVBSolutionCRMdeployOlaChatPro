/**
 * Verifica app Meta, token e inscrição de webhook.
 * node scripts/check-meta-app-webhook.js [whatsappId]
 */
require("dotenv/config");
const axios = require("axios");
const { Sequelize } = require("sequelize");

const WHATSAPP_ID = Number(process.argv[2] || 236);
const APP_ID = "25560988063575762";

const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function get(url, token) {
  try {
    const r = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000
    });
    return { ok: true, data: r.data };
  } catch (e) {
    return { ok: false, error: e.response?.data?.error || e.message };
  }
}

async function main() {
  const [w] = await db.query(
    `SELECT id, name, send_token, waba_id, phone_number_id, waba_webhook FROM "Whatsapps" WHERE id = :id`,
    { replacements: { id: WHATSAPP_ID }, type: Sequelize.QueryTypes.SELECT }
  );
  if (!w) {
    console.error("Conexão não encontrada");
    process.exit(1);
  }

  const token = String(w.send_token || "").replace(/\s+/g, "");
  console.log("\n=== CONEXÃO ===", w.name);

  const debug = await get(
    `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`,
    token
  );
  console.log("\n=== DEBUG TOKEN ===");
  console.log(JSON.stringify(debug, null, 2));

  const subs = await get(
    `https://graph.facebook.com/v21.0/${APP_ID}/subscriptions`,
    token
  );
  console.log("\n=== APP WEBHOOK SUBSCRIPTIONS (INTEGRAÇÂOWPPMW) ===");
  console.log(JSON.stringify(subs, null, 2));

  const wabaSubs = await get(
    `https://graph.facebook.com/v21.0/${w.waba_id}/subscribed_apps`,
    token
  );
  console.log("\n=== WABA SUBSCRIBED APPS ===");
  console.log(JSON.stringify(wabaSubs, null, 2));

  const phones = await get(
    `https://graph.facebook.com/v21.0/${w.waba_id}/phone_numbers`,
    token
  );
  console.log("\n=== WABA PHONE NUMBERS ===");
  console.log(JSON.stringify(phones, null, 2));

  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
