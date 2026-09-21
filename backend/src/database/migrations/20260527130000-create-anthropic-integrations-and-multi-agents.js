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
    if (!(await tableExists(queryInterface, "AnthropicIntegrations"))) {
      await queryInterface.createTable("AnthropicIntegrations", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        companyId: {
          type: Sequelize.INTEGER,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          allowNull: false,
          unique: true
        },
        apiKeyEncrypted: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        enabled: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        defaultModel: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "claude-3-7-sonnet-latest"
        },
        scope: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "Pessoal"
        },
        temperature: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 1
        },
        topP: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 1
        },
        presencePenalty: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        frequencyPenalty: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0
        },
        stopSequences: {
          type: Sequelize.TEXT,
          allowNull: true
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

    if (!(await tableExists(queryInterface, "AnthropicMultiAgents"))) {
      await queryInterface.createTable("AnthropicMultiAgents", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        companyId: {
          type: Sequelize.INTEGER,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          allowNull: false
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        systemPrompt: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: ""
        },
        model: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "claude-3-7-sonnet-latest"
        },
        temperature: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 1
        },
        topP: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 1
        },
        enabled: {
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
      await queryInterface.addIndex("AnthropicMultiAgents", ["companyId"], {
        name: "AnthropicMultiAgents_companyId_idx"
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("AnthropicMultiAgents");
    await queryInterface.dropTable("AnthropicIntegrations");
  }
};
