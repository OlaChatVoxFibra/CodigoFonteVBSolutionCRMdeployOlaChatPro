require("dotenv/config");
const axios = require("axios");
const { Sequelize } = require("sequelize");

const WHATSAPP_ID = 236;
const BASE = "https://vbsolutioncrmdeploy-production.up.railway.app";

const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

async function main() {
  const [c] = await db.query(
    `SELECT waba_id, phone_number_id FROM "Whatsapps" WHERE id = ${WHATSAPP_ID}`,
    { type: Sequelize.QueryTypes.SELECT }
  );

  const payload = {
    object: "whatsapp_business_account",
    entry: [
      {
        id: c.waba_id,
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: { phone_number_id: c.phone_number_id },
              contacts: [
                { profile: { name: "Teste Leonardo" }, wa_id: "5541999998888" }
              ],
              messages: [
                {
                  from: "5541999998888",
                  id: `wamid.test.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: `Simulado ${new Date().toISOString()}` }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const r = await axios.post(`${BASE}/v1/webhook/waba`, payload, { timeout: 45000 });
  console.log("POST", r.status, r.data);

  await new Promise((resolve) => setTimeout(resolve, 4000));

  const tickets = await db.query(
    `SELECT id, status, "lastMessage", "createdAt" FROM "Tickets"
     WHERE "whatsappId" = ${WHATSAPP_ID} ORDER BY id DESC LIMIT 5`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  console.log("\nTICKETS:", JSON.stringify(tickets, null, 2));

  await db.close();
}

main().catch((e) => {
  console.error(e.response?.data || e.message);
  process.exit(1);
});
