/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Companies"
      ADD COLUMN IF NOT EXISTS "signupMetadata" JSONB DEFAULT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Companies"
      ADD COLUMN IF NOT EXISTS "whiteLabelHostDomain" VARCHAR(255) DEFAULT NULL;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Companies"
      DROP COLUMN IF EXISTS "whiteLabelHostDomain";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "Companies"
      DROP COLUMN IF EXISTS "signupMetadata";
    `);
  }
};
