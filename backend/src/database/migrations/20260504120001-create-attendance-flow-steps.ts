/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("AttendanceFlowSteps", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      stepNumber: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      agentPrompt: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      responseOptions: {
        type: DataTypes.JSON,
        allowNull: true
      },
      conditions: {
        type: DataTypes.JSON,
        allowNull: true
      },
      promptId: {
        type: DataTypes.INTEGER,
        references: { model: "Prompts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("AttendanceFlowSteps");
  }
};
