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
    if (!(await tableExists(queryInterface, "integrations_figma"))) {
      await queryInterface.createTable("integrations_figma", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        workspace_id: {
          type: Sequelize.INTEGER,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          allowNull: false,
          unique: true
        },
        credential: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        enable_brain_ai: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        enable_prototype_analysis: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        enable_comments_sync: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        enable_design_system: {
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
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("integrations_figma");
  }
};
