/**
 * Verifica inscrição de webhook na WABA via Graph API.
 * node scripts/verify-meta-webhook-sub.js [whatsappId]
 */
require("dotenv/config");
const axios = require("axios");
const { Sequelize } = require("sequelize");

const WHATSAPP_ID = Number(process.argv[2] || 228);

const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function main() {
  const rows = await db.query(
    `SELECT id, name, waba_id, phone_number_id, send_token FROM "Whatsapps" WHERE id = :id`,
    { replacements: { id: WHATSAPP_ID }, type: Sequelize.QueryTypes.SELECT }
  );
  const w = rows[0];
  if (!w) {
    console.error("Conexão não encontrada");
    process.exit(1);
  }

  const token = String(w.send_token || "").replace(/\s+/g, "");
  console.log("\n=== CONEXÃO ===", w.name, "| WABA", w.waba_id);

  try {
    const phone = await axios.get(
      `https://graph.facebook.com/v21.0/${w.phone_number_id}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          fields:
            "id,display_phone_number,verified_name,status,code_verification_status,quality_rating"
        }
      }
    );
    console.log("\n=== NÚMERO NA META ===");
    console.log(JSON.stringify(phone.data, null, 2));
  } catch (e) {
    console.log("\n=== NÚMERO === ERRO");
    console.log(JSON.stringify(e.response?.data?.error || e.message, null, 2));
  }

  try {
    const subs = await axios.get(
      `https://graph.facebook.com/v21.0/${w.waba_id}/subscribed_apps`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("\n=== APPS INSCRITOS NO WEBHOOK DA WABA ===");
    console.log(JSON.stringify(subs.data, null, 2));
  } catch (e) {
    console.log("\n=== SUBSCRIBED_APPS === ERRO");
    console.log(JSON.stringify(e.response?.data?.error || e.message, null, 2));
  }

  const expected =
    "https://vbsolutioncrmdeploy-production.up.railway.app/v1/webhook/waba";
  console.log("\n=== URL ESPERADA NO PAINEL META ===");
  console.log(expected);
  console.log(
    "\nSe o app do cliente ainda aponta para outro servidor (BSP antigo), mensagens NÃO chegam neste CRM."
  );

  await db.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
