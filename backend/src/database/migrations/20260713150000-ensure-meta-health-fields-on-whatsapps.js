"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Campos de saúde/perfil Meta na conexão WhatsApp API Oficial.
 * Idempotente — migrations .js são as que rodam no Railway.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Whatsapps"
      ADD COLUMN IF NOT EXISTS "meta_quality_rating" VARCHAR(64) DEFAULT NULL;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Whatsapps"
      ADD COLUMN IF NOT EXISTS "meta_messaging_limit" VARCHAR(64) DEFAULT NULL;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Whatsapps"
      ADD COLUMN IF NOT EXISTS "meta_verified_name" VARCHAR(255) DEFAULT NULL;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Whatsapps"
      ADD COLUMN IF NOT EXISTS "meta_phone_status" VARCHAR(64) DEFAULT NULL;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Whatsapps"
      ADD COLUMN IF NOT EXISTS "meta_health_synced_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Whatsapps" DROP COLUMN IF EXISTS "meta_quality_rating";
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Whatsapps" DROP COLUMN IF EXISTS "meta_messaging_limit";
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Whatsapps" DROP COLUMN IF EXISTS "meta_verified_name";
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Whatsapps" DROP COLUMN IF EXISTS "meta_phone_status";
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "Whatsapps" DROP COLUMN IF EXISTS "meta_health_synced_at";
    `);
  }
};
