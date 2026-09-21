"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Novos registros de Prompt passam a usar modelo mais recente por padrão.
 * Prompts existentes mantêm o valor já salvo.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Prompts", "model", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "gpt-5.4-mini"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Prompts", "model", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "gpt-4.1-mini"
    });
  }
};
