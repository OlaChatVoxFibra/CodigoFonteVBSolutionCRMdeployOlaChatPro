"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Garante tabela de passos do fluxo (CLI Sequelize costuma ignorar .ts em status/migrate em alguns setups).
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name ILIKE '%attendance%flow%step%'
      LIMIT 1;
    `);
    if (rows && rows.length) {
      return;
    }

    await queryInterface.createTable("AttendanceFlowSteps", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      stepNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      agentPrompt: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      responseOptions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      conditions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      attachments: {
        type: Sequelize.JSON,
        allowNull: true
      },
      promptId: {
        type: Sequelize.INTEGER,
        references: { model: "Prompts", key: "id" },
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
  },

  down: async queryInterface => {
    await queryInterface.dropTable("AttendanceFlowSteps");
  }
};
