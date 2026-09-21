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
    if (!(await tableExists(queryInterface, "AiBrainConversations"))) {
      await queryInterface.createTable("AiBrainConversations", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        title: {
          type: Sequelize.STRING,
          allowNull: true
        },
        model: {
          type: Sequelize.STRING,
          allowNull: true,
          defaultValue: "gpt-4o"
        },
        companyId: {
          type: Sequelize.INTEGER,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          allowNull: false
        },
        userId: {
          type: Sequelize.INTEGER,
          references: { model: "Users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          allowNull: false
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

    if (!(await tableExists(queryInterface, "AiBrainMessages"))) {
      await queryInterface.createTable("AiBrainMessages", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        role: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: "user"
        },
        content: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        toolCalls: {
          type: Sequelize.JSON,
          allowNull: true
        },
        conversationId: {
          type: Sequelize.INTEGER,
          references: { model: "AiBrainConversations", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          allowNull: false
        },
        companyId: {
          type: Sequelize.INTEGER,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          allowNull: false
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("AiBrainMessages");
    await queryInterface.dropTable("AiBrainConversations");
  }
};
