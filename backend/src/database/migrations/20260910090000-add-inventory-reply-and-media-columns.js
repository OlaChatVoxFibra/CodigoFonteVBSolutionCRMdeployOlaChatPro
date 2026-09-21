/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable("Inventories");

    if (!table.buyLink) {
      await queryInterface.addColumn("Inventories", "buyLink", {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
    if (!table.images) {
      await queryInterface.addColumn("Inventories", "images", {
        type: Sequelize.JSONB,
        allowNull: true
      });
    }
    if (!table.replySettings) {
      await queryInterface.addColumn("Inventories", "replySettings", {
        type: Sequelize.JSONB,
        allowNull: true
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable("Inventories");
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
