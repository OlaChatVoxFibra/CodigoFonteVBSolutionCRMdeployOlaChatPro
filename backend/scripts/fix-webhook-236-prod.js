require("dotenv/config");
const axios = require("axios");
const { Sequelize } = require("sequelize");

const WHATSAPP_ID = 236;
const CORRECT =
  "https://vbsolutioncrmdeploy-production.up.railway.app/v1/webhook/waba";

const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function main() {
  await db.query(
    `UPDATE "Whatsapps" SET waba_webhook = :url WHERE id = :id`,
    { replacements: { url: CORRECT, id: WHATSAPP_ID } }
  );
  console.log("OK DB waba_webhook ->", CORRECT);

  const [w] = await db.query(
    `SELECT send_token, waba_id FROM "Whatsapps" WHERE id = :id`,
    { replacements: { id: WHATSAPP_ID }, type: Sequelize.QueryTypes.SELECT }
  );
  const token = String(w.send_token || "").replace(/\s+/g, "");

  await axios.post(
    `https://graph.facebook.com/v21.0/${w.waba_id}/subscribed_apps`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const sub = await axios.post(
    `https://graph.facebook.com/v21.0/${w.waba_id}/subscribed_apps`,
    { override_callback_uri: CORRECT, verify_token: "vbsolution" },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  console.log("Meta override:", sub.data);

  const check = await axios.get(
    `https://graph.facebook.com/v21.0/${w.waba_id}/subscribed_apps`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log("subscribed_apps:", JSON.stringify(check.data, null, 2));

  await db.close();
}

main().catch((e) => {
  console.error(e.response?.data || e.message);
  process.exit(1);
});
