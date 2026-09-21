/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

/**
 * Ensures a "Starter" plan row exists for FREEMIUM_PLAN_ID fallback (name match).
 * Idempotent: ON CONFLICT (name) DO UPDATE minimal fields.
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      INSERT INTO "Plans" (
        "name", "users", "connections", "queues", "amount",
        "useWhatsapp", "useFacebook", "useInstagram", "useCampaigns", "useSchedules",
        "useInternalChat", "useExternalApi", "useKanban",
        "trial", "trialDays", "recurrence", "useOpenAi", "useIntegrations",
        "isPublic", "useWhatsappOfficial", "wavoip", "createdAt", "updatedAt"
      ) VALUES (
        'Starter', 5, 2, 5, '147',
        true, true, true, true, true,
        true, true, true,
        false, 0, 'mensal', true, true,
        true, false, false, NOW(), NOW()
      )
      ON CONFLICT ("name") DO UPDATE SET
        "updatedAt" = NOW();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `DELETE FROM "Plans" WHERE name = :name`,
      { replacements: { name: "Starter" } }
    );
  }
};
