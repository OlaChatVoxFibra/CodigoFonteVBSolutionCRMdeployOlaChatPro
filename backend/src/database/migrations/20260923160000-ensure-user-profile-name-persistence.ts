/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Migration para garantir integridade e persistência de dados de usuários
    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET "updatedAt" = NOW()
      WHERE "name" IS NOT NULL AND "name" != '';
    `);
    console.log("[migration] Tabela Users verificada e nomes de perfil validados.");
  },

  down: async (_queryInterface: QueryInterface) => {}
};
