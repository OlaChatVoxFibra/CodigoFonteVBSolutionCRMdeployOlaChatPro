/**
 * Validação end-to-end da integração WhatsApp API Oficial (conexão 228).
 * Uso: node scripts/validate-waba.js
 */
require("dotenv/config");
const { Sequelize } = require("sequelize");
const axios = require("axios");

const WHATSAPP_ID = 228;
const COMPANY_ID = 1;
const BASE = process.env.BACKEND_URL || "http://localhost:3000";

const db = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }
});

let passed = 0;
let failed = 0;
const errors = [];

function ok(msg) {
  console.log(`  ✓ ${msg}`);
  passed++;
}

function fail(msg) {
  console.log(`  ✗ ${msg}`);
  failed++;
  errors.push(msg);
}

async function main() {
  console.log("=== Validação WhatsApp API Oficial ===\n");

  // 1) Conexão
  const conn = await db.query(
    `SELECT id, name, status, waba_id, phone_number_id, length(send_token) as token_len, waba_webhook
     FROM "Whatsapps" WHERE id = ${WHATSAPP_ID}`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  if (!conn[0]) {
    fail(`Conexão ${WHATSAPP_ID} não encontrada`);
    await db.close();
    process.exit(1);
  }
  console.log("Conexão:", JSON.stringify(conn[0], null, 2));
  if (conn[0].status === "CONNECTED") {
    ok("Status da conexão: CONNECTED");
  } else {
    fail(`Status da conexão: ${conn[0].status} (esperado CONNECTED)`);
  }

  // 2) Webhook simulado → ticket pending
  const uniqueFrom = `5511999${String(Date.now()).slice(-6)}`;
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
              metadata: {
                display_phone_number: "5511999999999",
                phone_number_id: conn[0].phone_number_id
              },
              contacts: [
                { profile: { name: "Teste E2E Validação" }, wa_id: uniqueFrom }
              ],
              messages: [
                {
                  from: uniqueFrom,
                  id: `wamid.e2e.${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: `Mensagem E2E ${Date.now()}` }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  const webhookUrl = `/v1/webhook/waba`;
  const webhookUrlLegacy = `/v1/webhook/${COMPANY_ID}/${WHATSAPP_ID}`;
  let webhookRes;
  try {
    webhookRes = await axios.post(`${BASE}${webhookUrl}`, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    });
  } catch (e) {
    try {
      webhookRes = await axios.post(`${BASE}${webhookUrlLegacy}`, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000
      });
      ok("Webhook legado (/v1/webhook/company/id) respondeu");
    } catch (e2) {
      fail(`Webhook POST falhou: ${e.message}`);
    }
  }

  if (webhookRes?.status === 200) {
    ok("Webhook simulado retornou 200");

    await new Promise((r) => setTimeout(r, 2000));

    const pendingList = await db.query(
      `SELECT id, status, "lastMessage", "userId", "queueId", "isBot"
       FROM "Tickets"
       WHERE "whatsappId" = ${WHATSAPP_ID} AND status IN ('pending','lgpd','chatbot')
       ORDER BY id DESC LIMIT 3`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    console.log("Tickets pending:", JSON.stringify(pendingList, null, 2));

    if (pendingList.length === 0) {
      fail("Nenhum ticket pending após webhook simulado");
    } else {
      ok(`Ticket #${pendingList[0].id} em aba Aguardando (status=${pendingList[0].status})`);
    }
  }

  // 3) API /tickets?status=pending
  const loginRes = await axios
    .post(`${BASE}/auth/login`, { email: "admin@admin.com", password: "123456" })
    .catch(() => null);

  if (loginRes?.data?.token) {
    const token = loginRes.data.token;
    const pendingApi = await axios.get(`${BASE}/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { status: "pending", pageNumber: 1, showAll: "true" }
    });
    const tickets = pendingApi.data?.tickets || [];
    const wabaPending = tickets.filter(
      (t) =>
        Number(t.whatsappId) === WHATSAPP_ID ||
        Number(t.whatsapp?.id) === WHATSAPP_ID
    );
    if (wabaPending.length > 0) {
      ok(
        `API pending lista ticket #${wabaPending[0].id} da conexão ${WHATSAPP_ID}`
      );
    } else {
      fail(
        `Ticket da conexão ${WHATSAPP_ID} não aparece em GET /tickets?status=pending`
      );
    }
  } else {
    fail("Login admin falhou — não foi possível testar API pending");
  }

  // 4) Meta templates
  const row = await db.query(
    `SELECT send_token, waba_id FROM "Whatsapps" WHERE id = ${WHATSAPP_ID}`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  const metaToken = (row[0]?.send_token || "").replace(/\s+/g, "");
  if (metaToken && row[0]?.waba_id) {
    try {
      const res = await axios.get(
        `https://graph.facebook.com/v21.0/${row[0].waba_id}/message_templates`,
        {
          headers: { Authorization: `Bearer ${metaToken}` },
          params: { limit: 5 }
        }
      );
      ok(`Meta API: ${res.data?.data?.length || 0} template(s) encontrado(s)`);
    } catch (e) {
      const err = e.response?.data?.error;
      if (err?.code === 190) {
        fail(
          "Token Meta EXPIRADO — gere novo token permanente no Meta Business e atualize na conexão"
        );
      } else {
        fail(`Meta API erro: ${err?.message || e.message}`);
      }
    }
  } else {
    fail("send_token ou waba_id ausente na conexão");
  }

  // 5) Webhook URL pública
  const webhook = conn[0]?.waba_webhook || "";
  const expectedWaba = `${(process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_URL || BASE).replace(/\/$/, "")}/v1/webhook/waba`;
  if (/localhost|127\.0\.0\.1/.test(webhook)) {
    fail(
      `Webhook no banco é localhost (${webhook}). No Meta Developer use: ${expectedWaba}`
    );
  } else if (webhook && !webhook.includes("/webhook/waba") && !webhook.includes(`/webhook/${COMPANY_ID}/`)) {
    fail(`Webhook no banco parece incorreto: ${webhook}. Use: ${expectedWaba}`);
  } else {
    ok(`Webhook: ${webhook}`);
  }

  await db.close();

  console.log("\n========== RESUMO ==========");
  console.log(`Passou: ${passed}`);
  console.log(`Falhou: ${failed}`);
  if (errors.length) {
    console.log("\nAções necessárias:");
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
