"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Remove flags de agente IA em tickets de campanha que nunca tiveram resposta do agente.
 */
module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== "postgres") return;

    await queryInterface.sequelize.query(`
      UPDATE "Tickets" t
      SET
        "isBot" = false,
        "useIntegration" = false,
        "integrationId" = NULL
      WHERE (
        t."dataWebhook"::text LIKE '%sourceCampaignId%'
        OR EXISTS (
          SELECT 1
          FROM "ContactTags" ct
          JOIN "Tags" tag ON tag.id = ct."tagId"
          WHERE ct."contactId" = t."contactId"
            AND tag.name LIKE 'Campanha #%'
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "Messages" m
        WHERE m."ticketId" = t.id
          AND m."fromAgent" = true
      );
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Tickets" t
      SET
        "isBot" = false,
        "useIntegration" = false,
        "integrationId" = NULL
      WHERE t."isBot" = true
        AND t."fromMe" = true
        AND t."userId" IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM "Messages" m
          WHERE m."ticketId" = t.id
            AND m."fromAgent" = true
        )
        AND EXISTS (
          SELECT 1
          FROM "Whatsapps" w
          WHERE w.id = t."whatsappId"
            AND (
              w."agentDisabled" = true
              OR (
                w."promptId" IS NULL
                AND w."anthropicMultiAgentId" IS NULL
              )
            )
        );
    `);
  },

  async down() {
    /* não reverte correção de flags */
  }
};
