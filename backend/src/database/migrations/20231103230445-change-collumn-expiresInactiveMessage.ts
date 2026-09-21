'use strict';
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Whatsapps', 'expiresInactiveMessage', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Whatsapps', 'expiresInactiveMessage', {
      type: Sequelize.STRING, 
      allowNull: true,
    });
  },
};
