"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Repara conexões WhatsApp com agentDisabled=false mas sem promptId/anthropicMultiAgentId,
 * vinculando ao único agente Claude da mesma empresa (quando existir apenas um).
 */
module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== "postgres") return;

    await queryInterface.sequelize.query(`
      WITH claude_prompts AS (
        SELECT p.id, p."companyId",
               COUNT(*) OVER (PARTITION BY p."companyId") AS cnt
        FROM "Prompts" p
        WHERE p."model" ILIKE 'claude%'
           OR p."model" ILIKE 'anthropic:%'
      ),
      single_claude AS (
        SELECT id, "companyId" FROM claude_prompts WHERE cnt = 1
      )
      UPDATE "Whatsapps" w
      SET "promptId" = sc.id,
          "anthropicMultiAgentId" = NULL,
          "agentDisabled" = false
      FROM single_claude sc
      WHERE w."companyId" = sc."companyId"
        AND w."agentDisabled" = false
        AND w."promptId" IS NULL
        AND (w."anthropicMultiAgentId" IS NULL);
    `);
  },

  async down() {
    /* não reverte vínculos automáticos */
  }
};
