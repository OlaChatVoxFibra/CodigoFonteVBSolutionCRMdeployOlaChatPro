"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable("Prompts").catch(() => null);
    if (table && !table.agentColor) {
      await queryInterface.addColumn("Prompts", "agentColor", {
        type: Sequelize.STRING(32),
        allowNull: true,
        defaultValue: null
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable("Prompts").catch(() => null);
    if (table && table.agentColor) {
      await queryInterface.removeColumn("Prompts", "agentColor");
    }
  }
};
