"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Step IR (PR 1 / fluxo agente IA senior revamp): adiciona colunas opcionais à tabela
 * AttendanceFlowSteps para guardar o resultado do compilador de fluxo.
 *
 * - Todas as colunas são `allowNull: true` → zero quebra para agentes antigos.
 * - Defensivo: detecta o nome real da tabela (`AttendanceFlowSteps` vs camelCase distinto)
 *   e só adiciona colunas que ainda não existem.
 */

async function resolveFlowStepsTable(qi) {
  const [rows] = await qi.sequelize.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name ILIKE '%attendance%flow%step%'
    ORDER BY table_name
    LIMIT 5;
  `);
  return rows && rows[0] && rows[0].table_name ? rows[0].table_name : null;
}

async function columnExists(qi, table, column) {
  const [rows] = await qi.sequelize.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :t
        AND column_name = :c
      LIMIT 1;`,
    { replacements: { t: table, c: column } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = await resolveFlowStepsTable(queryInterface);
    if (!tableName) {
      // eslint-disable-next-line no-console
      console.warn(
        "[migration add-ir-to-attendance-flow-steps] tabela de passos do fluxo não encontrada — pulando."
      );
      return;
    }

    const T = Sequelize;

    const addCol = async (name, def) => {
      if (await columnExists(queryInterface, tableName, name)) return;
      await queryInterface.addColumn(tableName, name, def);
    };

    await addCol("title", { type: T.STRING(255), allowNull: true });
    await addCol("objective", { type: T.TEXT, allowNull: true });
    await addCol("expectedReply", { type: T.STRING(32), allowNull: true });
    await addCol("slotName", { type: T.STRING(128), allowNull: true });
    await addCol("slotSchema", { type: T.JSON, allowNull: true });
    await addCol("branchesIR", { type: T.JSON, allowNull: true });
    await addCol("commandsIR", { type: T.JSON, allowNull: true });
    await addCol("customerVisibleText", { type: T.TEXT, allowNull: true });
    await addCol("trainingMarkers", { type: T.JSON, allowNull: true });
    await addCol("version", { type: T.INTEGER, allowNull: true, defaultValue: 1 });
  },

  down: async queryInterface => {
    const tableName = await resolveFlowStepsTable(queryInterface);
    if (!tableName) return;
    const cols = [
      "version",
      "trainingMarkers",
      "customerVisibleText",
      "commandsIR",
      "branchesIR",
      "slotSchema",
      "slotName",
      "expectedReply",
      "objective",
      "title"
    ];
    for (const c of cols) {
      if (await columnExists(queryInterface, tableName, c)) {
        await queryInterface.removeColumn(tableName, c);
      }
    }
  }
};
