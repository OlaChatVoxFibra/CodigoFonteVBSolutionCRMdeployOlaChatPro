"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


async function tableExists(queryInterface, table) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = :table LIMIT 1`,
    { replacements: { table } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await tableExists(queryInterface, "integration_accounts"))) {
      await queryInterface.createTable("integration_accounts", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        company_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        provider: {
          type: Sequelize.STRING(32),
          allowNull: false
        },
        access_token_enc: { type: Sequelize.TEXT, allowNull: true },
        refresh_token_enc: { type: Sequelize.TEXT, allowNull: true },
        workspace_id: { type: Sequelize.STRING(255), allowNull: true },
        account_label: { type: Sequelize.STRING(255), allowNull: true },
        metadata_json: { type: Sequelize.JSONB, allowNull: true },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "disconnected"
        },
        last_sync_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false }
      });
      await queryInterface.addIndex("integration_accounts", ["company_id", "provider"], {
        unique: true,
        name: "integration_accounts_company_provider_unique"
      });
    }

    if (!(await tableExists(queryInterface, "integration_sync_logs"))) {
      await queryInterface.createTable("integration_sync_logs", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        company_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        provider: { type: Sequelize.STRING(32), allowNull: false },
        entity_type: { type: Sequelize.STRING(64), allowNull: false },
        direction: { type: Sequelize.STRING(8), allowNull: false },
        status: { type: Sequelize.STRING(32), allowNull: false },
        payload_json: { type: Sequelize.JSONB, allowNull: true },
        error_message: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false }
      });
      await queryInterface.addIndex("integration_sync_logs", ["company_id", "provider", "created_at"], {
        name: "integration_sync_logs_company_provider_created"
      });
    }

    if (!(await tableExists(queryInterface, "external_mappings"))) {
      await queryInterface.createTable("external_mappings", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        company_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        provider: { type: Sequelize.STRING(32), allowNull: false },
        internal_entity_type: { type: Sequelize.STRING(64), allowNull: false },
        internal_id: { type: Sequelize.INTEGER, allowNull: false },
        external_id: { type: Sequelize.STRING(255), allowNull: false },
        metadata_json: { type: Sequelize.JSONB, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false }
      });
      await queryInterface.addIndex(
        "external_mappings",
        ["company_id", "provider", "internal_entity_type", "internal_id"],
        { unique: true, name: "external_mappings_internal_unique" }
      );
      await queryInterface.addIndex(
        "external_mappings",
        ["company_id", "provider", "external_id"],
        { name: "external_mappings_external_idx" }
      );
    }

    if (!(await tableExists(queryInterface, "webhook_events"))) {
      await queryInterface.createTable("webhook_events", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        company_id: { type: Sequelize.INTEGER, allowNull: true },
        provider: { type: Sequelize.STRING(32), allowNull: false },
        event_type: { type: Sequelize.STRING(128), allowNull: true },
        payload: { type: Sequelize.JSONB, allowNull: false },
        processed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        error_message: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false }
      });
      await queryInterface.addIndex("webhook_events", ["provider", "processed", "created_at"], {
        name: "webhook_events_provider_processed"
      });
    }

    if (!(await tableExists(queryInterface, "integration_sync_jobs"))) {
      await queryInterface.createTable("integration_sync_jobs", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        company_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        provider: { type: Sequelize.STRING(32), allowNull: false },
        job_type: { type: Sequelize.STRING(64), allowNull: false },
        payload_json: { type: Sequelize.JSONB, allowNull: false },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "pending"
        },
        attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        max_attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
        next_retry_at: { type: Sequelize.DATE, allowNull: true },
        last_error: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false },
        updated_at: { type: Sequelize.DATE, allowNull: false }
      });
      await queryInterface.addIndex("integration_sync_jobs", ["status", "next_retry_at"], {
        name: "integration_sync_jobs_retry"
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("integration_sync_jobs");
    await queryInterface.dropTable("webhook_events");
    await queryInterface.dropTable("external_mappings");
    await queryInterface.dropTable("integration_sync_logs");
    await queryInterface.dropTable("integration_accounts");
  }
};
