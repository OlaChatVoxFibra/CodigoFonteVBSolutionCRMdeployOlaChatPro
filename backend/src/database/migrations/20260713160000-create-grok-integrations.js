"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Integração Grok (xAI) por empresa — API key criptografada.
 * Idempotente (createTable só se não existir).
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
    if (!(await tableExists(queryInterface, "GrokIntegrations"))) {
      await queryInterface.createTable("GrokIntegrations", {
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
          defaultValue: "grok-4-1-fast"
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
        maxOutputTokens: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 4096
        },
        capabilitiesJson: {
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("GrokIntegrations");
  }
};
