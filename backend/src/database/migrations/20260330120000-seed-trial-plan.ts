/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

/**
 * Ensures a public trial plan exists (30 days) for self-service signup.
 * Idempotent: INSERT ... ON CONFLICT (name) DO UPDATE.
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
        'Trial 30 dias', 5, 2, 5, '0',
        true, true, true, true, true,
        true, true, true,
        true, 30, 'trial', true, true,
        true, false, false, NOW(), NOW()
      )
      ON CONFLICT ("name") DO UPDATE SET
        "trial" = true,
        "trialDays" = 30,
        "isPublic" = true,
        "updatedAt" = NOW();
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `DELETE FROM "Plans" WHERE name = :name`,
      { replacements: { name: "Trial 30 dias" } }
    );
  }
};
