'use strict';
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = 'Companies';
    const constraints = [
      'Companies_name_key',
      'companies_name_key',
      'companies_name_unique',
      'Companies_name_unique'
    ];

    for (const constraint of constraints) {
      try {
        await queryInterface.sequelize.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${constraint}";`);
        console.log(`Dropped constraint ${constraint}`);
      } catch (err) {
        console.log(`Failed to drop constraint ${constraint}: ${err.message}`);
      }
    }
  },

  down: (queryInterface, Sequelize) => {
    return Promise.resolve();
  }
};
