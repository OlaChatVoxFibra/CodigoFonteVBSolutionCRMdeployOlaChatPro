/**
 * Valida roteamento Claude + estado de conexão (rode: node scripts/validate-claude-ticket-routing.js)
 */
require("dotenv").config();
require("ts-node/register/transpile-only");

const {
  isClaudeModelId,
  normalizeAgentModelId
} = require("../src/providers/anthropic/utils/isClaudeModel");
const {
  resolvePromptWithLlmProvider,
  whatsappHasConnectionAgent,
  parseConnectionAgentValue
} = require("../src/providers/anthropic/services/resolveConnectionAgent");

async function main() {
  const checks = [];

  const m1 = "anthropic:claude-sonnet-4-6";
  checks.push({
    name: "isClaudeModelId com prefixo anthropic:",
    ok: isClaudeModelId(m1) && normalizeAgentModelId(m1) === "claude-sonnet-4-6"
  });

  const parsed = parseConnectionAgentValue("prompt:1");
  checks.push({
    name: "parseConnectionAgentValue prompt:1",
    ok: parsed.promptId === 1 && parsed.anthropicMultiAgentId === null
  });

  try {
    const sequelize = require("../src/database").default;
    await sequelize.authenticate();
    const Whatsapp = require("../src/models/Whatsapp").default;
    const Prompt = require("../src/models/Prompt").default;

    const rows = await Whatsapp.findAll({
      where: {},
      attributes: ["id", "name", "companyId", "promptId", "anthropicMultiAgentId", "agentDisabled"],
      limit: 20,
      order: [["id", "DESC"]]
    });

    const withAgent = rows.filter((w) => whatsappHasConnectionAgent(w));
    checks.push({
      name: `conexões com agente no banco (${withAgent.length}/${rows.length} amostra)`,
      ok: true,
      detail: withAgent.map((w) => ({
        id: w.id,
        name: w.name,
        promptId: w.promptId,
        anthropicMultiAgentId: w.anthropicMultiAgentId
      }))
    });

    const claudePrompts = await Prompt.findAll({
      attributes: ["id", "name", "model", "companyId"],
      limit: 50
    });
    const claudeList = claudePrompts.filter((p) => isClaudeModelId(p.model));
    checks.push({
      name: `prompts Claude no banco (${claudeList.length})`,
      ok: true,
      detail: claudeList.map((p) => ({ id: p.id, name: p.name, model: p.model }))
    });

    if (claudeList.length) {
      const sample = claudeList[0];
      try {
        const resolved = await resolvePromptWithLlmProvider(sample.companyId, sample.id);
        checks.push({
          name: `resolvePromptWithLlmProvider prompt ${sample.id}`,
          ok:
            resolved.llmProvider === "anthropic" &&
            resolved.prompt.__llmProvider === "anthropic" &&
            Boolean(resolved.prompt.apiKey),
          detail: {
            model: resolved.prompt.model,
            provider: resolved.llmProvider,
            hasKey: Boolean(resolved.prompt.apiKey)
          }
        });
      } catch (e) {
        checks.push({
          name: `resolvePromptWithLlmProvider prompt ${sample.id}`,
          ok: false,
          detail: String(e.message || e)
        });
      }
    }

    await sequelize.close();
  } catch (e) {
    checks.push({
      name: "conexão banco",
      ok: false,
      detail: String(e.message || e)
    });
  }

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "OK" : "FALHA";
    if (!c.ok) failed += 1;
    console.log(`[${mark}] ${c.name}`);
    if (c.detail) console.log(JSON.stringify(c.detail, null, 2));
  }

  if (failed) {
    console.error(`\n${failed} verificação(ões) falharam.`);
    process.exit(1);
  }
  console.log("\nTodas as verificações passaram.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
