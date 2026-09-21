"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


async function tableExists(queryInterface, table) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = :table
      LIMIT 1`,
    { replacements: { table } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (await tableExists(queryInterface, "integrations_github")) {
      return;
    }

    await queryInterface.createTable("integrations_github", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      workspace_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      auth_type: {
        type: Sequelize.STRING(16),
        allowNull: false,
        defaultValue: "pat"
      },
      pat_enc: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      oauth_token_enc: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      github_login: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      github_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      avatar_url: {
        type: Sequelize.STRING(512),
        allowNull: true
      },
      oauth_scope: {
        type: Sequelize.STRING(512),
        allowNull: true
      },
      enable_brain_ai: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      enable_publish: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      enable_repos_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "disconnected"
      },
      last_sync_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("integrations_github");
  }
};
