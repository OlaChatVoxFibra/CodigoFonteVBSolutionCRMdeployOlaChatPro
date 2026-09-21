"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Remove mensagens outbound duplicadas em tickets originados de campanhas
 * (mesmo texto no mesmo ticket em janela curta — bug do listener sem marcador \u200c).
 */
module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== "postgres") return;

    await queryInterface.sequelize.query(`
      WITH campaign_tickets AS (
        SELECT DISTINCT t.id AS ticket_id
        FROM "Tickets" t
        LEFT JOIN "Contacts" c ON c.id = t."contactId"
        LEFT JOIN "ContactTags" ct ON ct."contactId" = c.id
        LEFT JOIN "Tags" tag ON tag.id = ct."tagId" AND tag.name LIKE 'Campanha #%'
        WHERE t."dataWebhook"::text LIKE '%sourceCampaignId%'
           OR tag.id IS NOT NULL
      ),
      normalized AS (
        SELECT
          m.id,
          m."ticketId",
          TRIM(
            REPLACE(
              REPLACE(COALESCE(m.body, ''), U&'\\200C', ''),
              U&'\\200E',
              ''
            )
          ) AS norm_body,
          m."createdAt"
        FROM "Messages" m
        INNER JOIN campaign_tickets ct ON ct.ticket_id = m."ticketId"
        WHERE m."fromMe" = true
      ),
      dup_pairs AS (
        SELECT n1.id AS delete_id
        FROM normalized n1
        INNER JOIN normalized n2
          ON n1."ticketId" = n2."ticketId"
         AND n1.norm_body = n2.norm_body
         AND n1.norm_body <> ''
         AND n1.id > n2.id
         AND ABS(EXTRACT(EPOCH FROM (n1."createdAt" - n2."createdAt"))) <= 180
      )
      DELETE FROM "Messages" m
      USING dup_pairs d
      WHERE m.id = d.delete_id;
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Messages"
      SET body = TRIM(REPLACE(COALESCE(body, ''), U&'\\200C', ''))
      WHERE body LIKE '%' || U&'\\200C' || '%';
    `);

    await queryInterface.sequelize.query(`
      UPDATE "Tickets" t
      SET "lastMessage" = latest.body
      FROM (
        SELECT DISTINCT ON (m."ticketId")
          m."ticketId",
          m.body
        FROM "Messages" m
        ORDER BY m."ticketId", m."createdAt" DESC, m.id DESC
      ) latest
      WHERE t.id = latest."ticketId"
        AND (
          t."dataWebhook"::text LIKE '%sourceCampaignId%'
          OR EXISTS (
            SELECT 1
            FROM "ContactTags" ct
            JOIN "Tags" tag ON tag.id = ct."tagId"
            WHERE ct."contactId" = t."contactId"
              AND tag.name LIKE 'Campanha #%'
          )
        );
    `);
  },

  async down() {
    /* dados removidos não são restaurados */
  }
};
