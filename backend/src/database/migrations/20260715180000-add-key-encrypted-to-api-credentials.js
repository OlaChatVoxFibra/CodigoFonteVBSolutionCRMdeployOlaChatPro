"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


async function columnExists(queryInterface, table, column) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = :table AND column_name = :column LIMIT 1`,
    { replacements: { table, column } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = "api_credentials";
    if (!(await columnExists(queryInterface, table, "key_encrypted"))) {
      await queryInterface.addColumn(table, "key_encrypted", {
        type: Sequelize.TEXT,
        allowNull: true
      });
    }
  },

  down: async (queryInterface) => {
    const table = "api_credentials";
    if (await columnExists(queryInterface, table, "key_encrypted")) {
      await queryInterface.removeColumn(table, "key_encrypted");
    }
  }
};
