"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


module.exports = {
  up: async queryInterface => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === "postgres") {
      await queryInterface.sequelize.query(
        'ALTER TABLE "Prompts" ALTER COLUMN "queueId" DROP NOT NULL;'
      );
    }
  },

  down: async queryInterface => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === "postgres") {
      await queryInterface.sequelize.query(
        'ALTER TABLE "Prompts" ALTER COLUMN "queueId" SET NOT NULL;'
      );
    }
  }
};
