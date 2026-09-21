"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/** E-mail do lead de venda — campo já enviado pelo frontend. */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("leads_sales", "email", {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("leads_sales", "email");
  }
};
