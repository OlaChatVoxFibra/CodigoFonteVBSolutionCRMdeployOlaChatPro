/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = (await queryInterface.describeTable("Inventories")) as any;

    if (!table.buyLink) {
      await queryInterface.addColumn("Inventories", "buyLink", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
    if (!table.images) {
      await queryInterface.addColumn("Inventories", "images", {
        type: DataTypes.JSONB,
        allowNull: true
      });
    }
    if (!table.replySettings) {
      await queryInterface.addColumn("Inventories", "replySettings", {
        type: DataTypes.JSONB,
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = (await queryInterface.describeTable("Inventories")) as any;
    if (table.replySettings) {
      await queryInterface.removeColumn("Inventories", "replySettings");
    }
    if (table.images) {
      await queryInterface.removeColumn("Inventories", "images");
    }
    if (table.buyLink) {
      await queryInterface.removeColumn("Inventories", "buyLink");
    }
  }
};
