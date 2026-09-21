/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("leads_convertidos", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      sector: {
        type: DataTypes.STRING,
        allowNull: true
      },
      contactId: {
        type: DataTypes.INTEGER,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      responsibleId: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "SET NULL",
        onDelete: "SET NULL",
        allowNull: true
      },
      date: {
        type: DataTypes.DATE,
        allowNull: true
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

    await queryInterface.addIndex("leads_convertidos", ["companyId", "name"], {
      name: "leads_convertidos_company_name_idx"
    });
    await queryInterface.addIndex("leads_convertidos", ["companyId", "sector"], {
      name: "leads_convertidos_company_sector_idx"
    });
    await queryInterface.addIndex("leads_convertidos", ["companyId", "date"], {
      name: "leads_convertidos_company_date_idx"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("leads_convertidos", "leads_convertidos_company_name_idx");
    await queryInterface.removeIndex("leads_convertidos", "leads_convertidos_company_sector_idx");
    await queryInterface.removeIndex("leads_convertidos", "leads_convertidos_company_date_idx");
    await queryInterface.dropTable("leads_convertidos");
  }
};
