"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Normaliza Prompts.model: remove prefixo "anthropic:" salvo pelo editor v2
 * para que isClaudeModelId e o roteamento OpenAI/Claude funcionem nos tickets.
 */
module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === "postgres") {
      await queryInterface.sequelize.query(`
        UPDATE "Prompts"
        SET "model" = SUBSTRING("model" FROM 12)
        WHERE "model" ILIKE 'anthropic:%'
          AND LENGTH(TRIM("model")) > 11;
      `);
      return;
    }
    if (dialect === "mysql" || dialect === "mariadb") {
      await queryInterface.sequelize.query(`
        UPDATE Prompts
        SET model = SUBSTRING(model, 12)
        WHERE model LIKE 'anthropic:%'
          AND CHAR_LENGTH(TRIM(model)) > 11;
      `);
    }
  },

  async down() {
    /* irreversível com segurança — modelos Claude permanecem sem prefixo */
  }
};
