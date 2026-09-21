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

async function addColumnIfMissing(queryInterface, table, column, definition) {
  if (!(await tableExists(queryInterface, table))) return;
  if (await columnExists(queryInterface, table, column)) return;
  await queryInterface.addColumn(table, column, definition);
}

async function addIndexIfMissing(queryInterface, table, fields, name) {
  if (!(await tableExists(queryInterface, table))) return;
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = :table
        AND indexname = :name
      LIMIT 1`,
    { replacements: { table, name } }
  );
  if (Array.isArray(rows) && rows.length > 0) return;
  await queryInterface.addIndex(table, fields, { name });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const T = Sequelize;
    const table = "PromptKnowledgeSources";
    await addColumnIfMissing(queryInterface, table, "openAiFileId", { type: T.STRING(255), allowNull: true });
    await addColumnIfMissing(queryInterface, table, "openAiVectorStoreId", { type: T.STRING(255), allowNull: true });
    await addColumnIfMissing(queryInterface, table, "indexStatus", {
      type: T.STRING(32),
      allowNull: true,
      defaultValue: "pending"
    });
    await addColumnIfMissing(queryInterface, table, "indexedAt", { type: T.DATE, allowNull: true });
    await addColumnIfMissing(queryInterface, table, "indexError", { type: T.TEXT, allowNull: true });
    await addIndexIfMissing(
      queryInterface,
      table,
      ["companyId", "promptId", "indexStatus"],
      "idx_prompt_knowledge_company_prompt_index_status"
    );
  },

  down: async () => {
    // No-op: metadados de indexação não são removidos automaticamente em produção.
  }
};

