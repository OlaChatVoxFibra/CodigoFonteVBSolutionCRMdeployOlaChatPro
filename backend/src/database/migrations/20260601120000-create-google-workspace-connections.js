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

async function indexExists(queryInterface, indexName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = :indexName
      LIMIT 1`,
    { replacements: { indexName } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await tableExists(queryInterface, "GoogleWorkspaceConnections"))) {
      await queryInterface.createTable("GoogleWorkspaceConnections", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        companyId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        service: {
          type: Sequelize.STRING,
          allowNull: false
        },
        accountEmail: {
          type: Sequelize.STRING,
          allowNull: false
        },
        accountName: {
          type: Sequelize.STRING,
          allowNull: true
        },
        refreshTokenEnc: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        accessTokenEnc: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        accessTokenExpiresAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        scopes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
    }

    if (!(await indexExists(queryInterface, "google_workspace_company_service"))) {
      await queryInterface.addIndex(
        "GoogleWorkspaceConnections",
        ["companyId", "service"],
        { name: "google_workspace_company_service" }
      );
    }

    if (
      !(await indexExists(
        queryInterface,
        "google_workspace_company_service_email_unique"
      ))
    ) {
      await queryInterface.addIndex(
        "GoogleWorkspaceConnections",
        ["companyId", "service", "accountEmail"],
        {
          unique: true,
          name: "google_workspace_company_service_email_unique"
        }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("GoogleWorkspaceConnections");
  }
};
