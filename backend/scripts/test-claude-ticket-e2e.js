/**
 * Teste E2E local: resolve agente Claude + orquestrador (API Anthropic real se KEY no .env).
 * Uso: node scripts/test-claude-ticket-e2e.js
 */
require("dotenv").config();
require("ts-node/register/transpile-only");

const {
  resolvePromptWithLlmProvider,
  whatsappHasConnectionAgent
} = require("../src/providers/anthropic/services/resolveConnectionAgent");
const { runAgentOrchestrator } = require("../src/services/PromptServices/AgentOrchestratorService");

async function main() {
  const sequelize = require("../src/database").default;
  await sequelize.authenticate();
  const Whatsapp = require("../src/models/Whatsapp").default;
  const Prompt = require("../src/models/Prompt").default;

  let wa = await Whatsapp.findOne({
    where: { name: "TESTE API CLAUDE" },
    attributes: ["id", "name", "companyId", "promptId", "anthropicMultiAgentId", "agentDisabled"]
  });

  if (!wa) {
    console.error("Conexão 'TESTE API CLAUDE' não encontrada.");
    process.exit(1);
  }

  if (!whatsappHasConnectionAgent(wa)) {
    const claude = await Prompt.findOne({
      where: { companyId: wa.companyId, model: "claude-sonnet-4-6" }
    });
    if (!claude) {
      console.error("Nenhum prompt Claude encontrado para vincular.");
      process.exit(1);
    }
    await wa.update({ promptId: claude.id, agentDisabled: false, anthropicMultiAgentId: null });
    await wa.reload();
    console.log(`[repair] WhatsApp ${wa.id} vinculado ao prompt ${claude.id} (${claude.name})`);
  }

  const resolved = await resolvePromptWithLlmProvider(wa.companyId, wa.promptId);
  console.log("[resolve]", {
    provider: resolved.llmProvider,
    model: resolved.prompt.model,
    hasKey: Boolean(resolved.prompt.apiKey),
    promptName: resolved.prompt.name
  });

  if (resolved.llmProvider !== "anthropic" || !resolved.prompt.apiKey) {
    console.error("Falha: agente não está como anthropic ou sem API key.");
    process.exit(1);
  }

  const ticketStub = {
    id: 999999,
    companyId: wa.companyId,
    status: "pending",
    isBot: true,
    useIntegration: true,
    dataWebhook: {},
    queueId: null,
    userId: null
  };
  const contactStub = { id: 1, name: "Cliente Teste", number: "5541999999999" };

  console.log("[orchestrator] chamando API Claude (pode levar alguns segundos)...");
  const orch = await runAgentOrchestrator({
    prompt: resolved.prompt,
    ticket: ticketStub,
    contact: contactStub,
    userText: "Olá, quero informações"
  });

  console.log("[orchestrator]", {
    handled: orch.handled,
    replyPreview: String(orch.reply || "").slice(0, 200),
    fallbackReason: orch.fallbackReason
  });

  if (!orch.handled || !String(orch.reply || "").trim()) {
    console.error("Falha: orquestrador não gerou resposta.");
    process.exit(1);
  }

  console.log("\n✓ Teste E2E Claude OK — tickets devem responder após reiniciar o backend.");
  await sequelize.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
