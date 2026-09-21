/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("CompanyKanbanConfigs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      laneOrder: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "JSON array with lane IDs in order",
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("CompanyKanbanConfigs", ["companyId"], {
      name: "idx_company_kanban_config_company_id",
      unique: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("CompanyKanbanConfigs");
  },
};
