/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE "leads_sales"
      SET "status" = 'novo'
      WHERE "status" IS NULL OR trim("status") = ''
    `);
  },
  down: async (_queryInterface: QueryInterface) => {
    // noop
  }
};

