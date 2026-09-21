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
    if (!(await tableExists(queryInterface, "BrainCreditAccounts"))) {
      await queryInterface.createTable("BrainCreditAccounts", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        companyId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        balance: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        monthlyQuota: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 100
        },
        brainAddonPlan: {
          type: Sequelize.STRING(32),
          allowNull: true
        },
        cycleStartAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        cycleEndsAt: {
          type: Sequelize.DATE,
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
      await queryInterface.addIndex("BrainCreditAccounts", ["companyId"], {
        name: "idx_brain_credit_accounts_company_id"
      });
    }

    if (!(await tableExists(queryInterface, "BrainTokenLogs"))) {
      await queryInterface.createTable("BrainTokenLogs", {
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
        userId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "Users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        conversationId: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        actionType: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "chat_simples"
        },
        provider: {
          type: Sequelize.STRING(24),
          allowNull: false,
          defaultValue: "openai"
        },
        model: {
          type: Sequelize.STRING(128),
          allowNull: true
        },
        creditsUsed: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        promptTokens: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        completionTokens: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        totalTokens: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        costUsdEstimate: {
          type: Sequelize.DECIMAL(12, 6),
          allowNull: false,
          defaultValue: 0
        },
        toolsUsed: {
          type: Sequelize.JSON,
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSON,
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
      await queryInterface.addIndex("BrainTokenLogs", ["companyId", "createdAt"], {
        name: "idx_brain_token_logs_company_created"
      });
      await queryInterface.addIndex("BrainTokenLogs", ["userId"], {
        name: "idx_brain_token_logs_user_id"
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("BrainTokenLogs");
    await queryInterface.dropTable("BrainCreditAccounts");
  }
};
