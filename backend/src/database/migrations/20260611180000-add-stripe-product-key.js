"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/** Vincula empresas e planos locais aos produtos Stripe (Starter, Essencial, Pro, Brain…). */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Companies"
      ADD COLUMN IF NOT EXISTS "stripeProductKey" VARCHAR(64) NULL;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Plans"
      ADD COLUMN IF NOT EXISTS "stripeProductKey" VARCHAR(64) NULL;
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Plans_stripeProductKey_unique"
      ON "Plans" ("stripeProductKey")
      WHERE "stripeProductKey" IS NOT NULL;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "Plans_stripeProductKey_unique";
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Plans" DROP COLUMN IF EXISTS "stripeProductKey";
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Companies" DROP COLUMN IF EXISTS "stripeProductKey";
    `);
  }
};
