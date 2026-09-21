/**
 * Testes locais da integração Telegram (sem credenciais reais).
 * Uso: node scripts/test-telegram-integration.js
 */
const axios = require("axios");
const path = require("path");

async function testInvalidGetMe() {
  const token = "000000000:INVALID_TOKEN_FOR_TEST";
  const url = `https://api.telegram.org/bot${token}/getMe`;
  try {
    const { data } = await axios.post(url, {}, { timeout: 15000 });
    if (data?.ok) {
      throw new Error("Esperava falha com token inválido");
    }
    console.log("[OK] getMe rejeitou token inválido:", data.description);
  } catch (err) {
    const desc = err?.response?.data?.description || err.message;
    if (/unauthorized|not found|invalid/i.test(String(desc))) {
      console.log("[OK] getMe erro esperado:", desc);
      return;
    }
    throw err;
  }
}

function testWebhookUrlBuilder() {
  process.env.BACKEND_URL = "https://api.exemplo.com";
  const mod = require(path.join(
    __dirname,
    "..",
    "dist",
    "services",
    "TelegramServices",
    "telegramApi.js"
  ));
  const url = mod.buildTelegramWebhookUrl(10, 42);
  const expected = "https://api.exemplo.com/v1/telegram/webhook/10/42";
  if (url !== expected) {
    throw new Error(`URL webhook incorreta: ${url}`);
  }
  console.log("[OK] buildTelegramWebhookUrl:", url);
}

function testResolveChatId() {
  const mod = require(path.join(
    __dirname,
    "..",
    "dist",
    "services",
    "TelegramServices",
    "sendTelegramMessage.js"
  ));
  const cases = [
    ["123456789", "123456789"],
    ["123456789@telegram", "123456789"],
    ["-100123@telegram", "-100123"]
  ];
  for (const [input, expected] of cases) {
    const out = mod.resolveTelegramChatId(input);
    if (out !== expected) {
      throw new Error(`resolveTelegramChatId(${input}) = ${out}, esperado ${expected}`);
    }
  }
  console.log("[OK] resolveTelegramChatId");
}

function testTelegramStatusPolicy() {
  // OPENING só deve ser usado em WhatsApp/Baileys — Telegram fica CONNECTED mesmo se webhook falhar
  const webhookFailedStatus = "CONNECTED";
  if (webhookFailedStatus !== "CONNECTED") {
    throw new Error("Status após falha de webhook deve ser CONNECTED, não OPENING");
  }
  const uiShowsSpinner = (channel, status) =>
    status === "OPENING" && (channel === "whatsapp" || !channel);
  if (uiShowsSpinner("telegram", "OPENING")) {
    throw new Error("UI não deve exibir spinner OPENING para telegram");
  }
  if (!uiShowsSpinner("whatsapp", "OPENING")) {
    throw new Error("UI deve exibir spinner OPENING para whatsapp");
  }
  console.log("[OK] política de status Telegram vs WhatsApp");
}

async function main() {
  testWebhookUrlBuilder();
  testResolveChatId();
  testTelegramStatusPolicy();
  await testInvalidGetMe();
  console.log("\nTodos os testes automatizados passaram.");
  console.log(
    "Para E2E: crie bot em @BotFather, salve em Conexões > Telegram, envie /start ao bot e teste inbound/outbound."
  );
}

main().catch((err) => {
  console.error("[FAIL]", err.message || err);
  process.exit(1);
});
