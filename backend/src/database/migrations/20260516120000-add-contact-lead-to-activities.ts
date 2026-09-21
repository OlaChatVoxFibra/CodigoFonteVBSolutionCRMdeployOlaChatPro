/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn("Activities", "contactId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Contacts", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await queryInterface.addColumn("Activities", "leadId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "leads_sales", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("Activities", "leadId");
    await queryInterface.removeColumn("Activities", "contactId");
  }
};
