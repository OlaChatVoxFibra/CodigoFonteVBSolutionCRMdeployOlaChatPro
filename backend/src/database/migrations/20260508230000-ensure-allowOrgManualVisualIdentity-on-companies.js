"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Coluna exigida pelo modelo Company (allowOrgManualVisualIdentity).
 * Idempotente: seguro se já existir.
 * (Migrations .ts não são descobertas pelo sequelize-cli deste projeto — usar .js.)
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Companies"
      ADD COLUMN IF NOT EXISTS "allowOrgManualVisualIdentity" BOOLEAN NOT NULL DEFAULT false;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Companies"
      DROP COLUMN IF EXISTS "allowOrgManualVisualIdentity";
    `);
  }
};
