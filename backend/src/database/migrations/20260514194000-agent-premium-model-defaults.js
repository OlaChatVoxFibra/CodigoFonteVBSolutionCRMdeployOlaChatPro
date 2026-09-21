"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


async function tableExists(queryInterface, table) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = :table
      LIMIT 1`,
    { replacements: { table } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(queryInterface, table, column) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :table
        AND column_name = :column
      LIMIT 1`,
    { replacements: { table, column } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await tableExists(queryInterface, "Prompts"))) return;
    if (await columnExists(queryInterface, "Prompts", "model")) {
      await queryInterface.changeColumn("Prompts", "model", {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "gpt-5.5"
      });
    }
    if (await columnExists(queryInterface, "Prompts", "maxTokens")) {
      await queryInterface.changeColumn("Prompts", "maxTokens", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 2200
      });
    }
  },

  down: async () => {
    // No-op: defaults novos são intencionais e não alteram linhas existentes.
  }
};

