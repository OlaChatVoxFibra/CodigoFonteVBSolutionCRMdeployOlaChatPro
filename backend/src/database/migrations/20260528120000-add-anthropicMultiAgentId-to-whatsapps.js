"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable("Whatsapps");
    if (!table.anthropicMultiAgentId) {
      await queryInterface.addColumn("Whatsapps", "anthropicMultiAgentId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable("Whatsapps");
    if (table.anthropicMultiAgentId) {
      await queryInterface.removeColumn("Whatsapps", "anthropicMultiAgentId");
    }
  }
};
