/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable("leads_convertidos") as Record<string, unknown>;

    if (!table.phone) {
      await queryInterface.addColumn("leads_convertidos", "phone", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
    if (!table.city) {
      await queryInterface.addColumn("leads_convertidos", "city", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
    if (!table.state) {
      await queryInterface.addColumn("leads_convertidos", "state", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
    if (!table.document) {
      await queryInterface.addColumn("leads_convertidos", "document", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
    if (!table.website) {
      await queryInterface.addColumn("leads_convertidos", "website", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("leads_convertidos", "phone");
    await queryInterface.removeColumn("leads_convertidos", "city");
    await queryInterface.removeColumn("leads_convertidos", "state");
    await queryInterface.removeColumn("leads_convertidos", "document");
    await queryInterface.removeColumn("leads_convertidos", "website");
  }
};
