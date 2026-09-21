"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Registra Claude Fable 5 (claude-fable-5) no ecossistema VB:
 * - modelo permitido via ANTHROPIC_ALLOWED_MODEL_IDS (código)
 * - seletores de agentes e Brain.AI (frontend)
 * - tier de créditos Brain "fable" (20× chat simples)
 *
 * Não altera schema — apenas normaliza registros legados que usavam prefixo anthropic:
 * para o novo ID, caso existam drafts salvos com typo ou alias futuro.
 */
module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    const aliases = ["anthropic:claude-fable-5", "claude-fable5", "claude_fable_5"];

    for (const alias of aliases) {
      const normalized = "claude-fable-5";
      if (dialect === "postgres") {
        await queryInterface.sequelize.query(
          `
          UPDATE "Prompts" SET "model" = :normalized
          WHERE LOWER(TRIM("model")) = LOWER(:alias);
          UPDATE "AnthropicMultiAgents" SET "model" = :normalized
          WHERE LOWER(TRIM("model")) = LOWER(:alias);
          UPDATE "AnthropicIntegrations" SET "defaultModel" = :normalized
          WHERE LOWER(TRIM("defaultModel")) = LOWER(:alias);
        `,
          { replacements: { alias, normalized } }
        );
      } else if (dialect === "mysql" || dialect === "mariadb") {
        await queryInterface.sequelize.query(
          `
          UPDATE Prompts SET model = :normalized
          WHERE LOWER(TRIM(model)) = LOWER(:alias);
          UPDATE AnthropicMultiAgents SET model = :normalized
          WHERE LOWER(TRIM(model)) = LOWER(:alias);
          UPDATE AnthropicIntegrations SET defaultModel = :normalized
          WHERE LOWER(TRIM(defaultModel)) = LOWER(:alias);
        `,
          { replacements: { alias, normalized } }
        );
      }
    }
  },

  async down() {
    /* irreversível — aliases normalizados para claude-fable-5 */
  }
};
