/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = (await queryInterface.describeTable("Inventories")) as any;

    if (!table.currency) {
      await queryInterface.addColumn("Inventories", "currency", {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "BRL"
      });
    }
    if (!table.image) {
      await queryInterface.addColumn("Inventories", "image", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
    if (!table.sku) {
      await queryInterface.addColumn("Inventories", "sku", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
    if (!table.category) {
      await queryInterface.addColumn("Inventories", "category", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
    if (!table.brand) {
      await queryInterface.addColumn("Inventories", "brand", {
        type: DataTypes.STRING,
        allowNull: true
      });
    }
    if (!table.description) {
      await queryInterface.addColumn("Inventories", "description", {
        type: DataTypes.TEXT,
        allowNull: true
      });
    }
  },
  down: async (queryInterface: QueryInterface) => {
    const table = (await queryInterface.describeTable("Inventories")) as any;
    if (table.description) {
      await queryInterface.removeColumn("Inventories", "description");
    }
    if (table.brand) {
      await queryInterface.removeColumn("Inventories", "brand");
    }
    if (table.category) {
      await queryInterface.removeColumn("Inventories", "category");
    }
    if (table.sku) {
      await queryInterface.removeColumn("Inventories", "sku");
    }
    if (table.image) {
      await queryInterface.removeColumn("Inventories", "image");
    }
    if (table.currency) {
      await queryInterface.removeColumn("Inventories", "currency");
    }
  }
};
