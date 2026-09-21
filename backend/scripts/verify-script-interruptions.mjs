/**
 * Smoke test rápido (sem Jest) — interrupções no roteiro.
 * Uso: cd backend && node scripts/verify-script-interruptions.mjs
 */
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const {
  classifyScriptInboundTurn,
  shouldCannedAdvanceOnFreeReply,
  looksLikeCustomerQuestion
} = require("../dist/helpers/agentAttendanceFlowMemory");

const faqSamples = [
  "quanto custa?",
  "vocês atendem no domingo?",
  "quero saber valores",
  "qual o preço do plano",
  "tem desconto?",
  "como funciona o cancelamento",
  "vocês trabalham feriado?",
  "pode me explicar os pacotes?",
  "qual a diária?",
  "tem estacionamento?",
  "aceita cartão?",
  "onde fica a pousada?",
  "tem piscina?"
];

const dateVis = "Para qual data você deseja viajar?";
const greetVis = "Fala, tudo bem?";
let failed = 0;

for (const q of faqSamples) {
  const d = classifyScriptInboundTurn(dateVis, q);
  if (d.shouldCannedAdvance) {
    console.error(`FAIL FAQ should not advance on date step: "${q}"`, d);
    failed += 1;
  }
  if (!d.deferToLlm) {
    console.error(`FAIL FAQ should defer to LLM on date step: "${q}"`, d);
    failed += 1;
  }
}

const valid = [
  ["21/05", dateVis],
  ["final de julho", dateVis],
  ["tudo bem", greetVis],
  ["4 pessoas", "Quantas pessoas seriam?"],
  ["2", "Escolha:\n1️⃣ Beira-mar\n2️⃣ Piscina"]
];

for (const [body, vis] of valid) {
  if (!shouldCannedAdvanceOnFreeReply(vis, body)) {
    console.error(`FAIL valid reply should advance: "${body}" on "${vis}"`);
    failed += 1;
  }
}

const mixed = classifyScriptInboundTurn(greetVis, "tudo bem, quanto custa?");
if (mixed.shouldCannedAdvance || !mixed.deferToLlm) {
  console.error("FAIL mixed greeting+price should defer", mixed);
  failed += 1;
}

if (!looksLikeCustomerQuestion("quero saber valores")) {
  console.error("FAIL looksLikeCustomerQuestion without ?");
  failed += 1;
}

if (failed > 0) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("verify-script-interruptions: OK");
