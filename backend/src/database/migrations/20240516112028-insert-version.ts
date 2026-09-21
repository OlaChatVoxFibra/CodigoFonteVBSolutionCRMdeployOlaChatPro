/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

module.exports = {
  up: async (queryInterface) => {
    
    await queryInterface.sequelize.query(`
    INSERT INTO "Versions"
    (id, "versionFrontend", "versionBackend", "createdAt", "updatedAt")
    VALUES(1, '1.1.7d', '1.1.7d', '2024-05-16 12:13:48.163', '2024-05-16 13:02:46.030')`
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('DELETE FROM "Versions"');
  }
};
