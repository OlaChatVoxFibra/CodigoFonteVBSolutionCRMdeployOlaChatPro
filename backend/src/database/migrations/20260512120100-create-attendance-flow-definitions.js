"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/**
 * Cria tabela AttendanceFlowDefinitions (1:1 com Prompt) para guardar metadados globais
 * do fluxo: entryStepId, fallbackStepId, policy, compilador, pré-compreensão LLM
 * (`flowUnderstanding`) e hooks de transição.
 *
 * Defensivo: só cria se não existir; só adiciona colunas que faltam (re-run safe).
 */

async function tableExists(qi, name) {
  const [rows] = await qi.sequelize.query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = :t
      LIMIT 1;`,
    { replacements: { t: name } }
  );
  return Array.isArray(rows) && rows.length > 0;
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
    const T = Sequelize;
    const TABLE = "AttendanceFlowDefinitions";

    if (!(await tableExists(queryInterface, TABLE))) {
      await queryInterface.createTable(TABLE, {
        id: { type: T.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        companyId: {
          type: T.INTEGER,
          allowNull: false,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        promptId: {
          type: T.INTEGER,
          allowNull: false,
          references: { model: "Prompts", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        entryStepId: { type: T.STRING(64), allowNull: true },
        fallbackStepId: { type: T.STRING(64), allowNull: true },
        policy: { type: T.JSON, allowNull: true },
        compilerVersion: { type: T.INTEGER, allowNull: true, defaultValue: 1 },
        lastCompiledAt: { type: T.DATE, allowNull: true },
        flowUnderstanding: { type: T.JSON, allowNull: true },
        flowUnderstandingVersion: { type: T.INTEGER, allowNull: true, defaultValue: 0 },
        transitionHooks: { type: T.JSON, allowNull: true },
        createdAt: { type: T.DATE, allowNull: false },
        updatedAt: { type: T.DATE, allowNull: false }
      });

      await queryInterface
        .addIndex(TABLE, ["companyId", "promptId"], {
          name: "idx_attendance_flow_definitions_company_prompt",
          unique: true
        })
        .catch(() => {
          // índice único pode falhar em dialects sem suporte completo; segue como índice normal.
          return queryInterface.addIndex(TABLE, ["companyId", "promptId"], {
            name: "idx_attendance_flow_definitions_company_prompt"
          });
        });
      return;
    }

    // Tabela já existe (re-run da migration): garante colunas novas.
    const T2 = Sequelize;
    const addCol = async (name, def) => {
      if (await columnExists(queryInterface, TABLE, name)) return;
      await queryInterface.addColumn(TABLE, name, def);
    };
    await addCol("entryStepId", { type: T2.STRING(64), allowNull: true });
    await addCol("fallbackStepId", { type: T2.STRING(64), allowNull: true });
    await addCol("policy", { type: T2.JSON, allowNull: true });
    await addCol("compilerVersion", { type: T2.INTEGER, allowNull: true, defaultValue: 1 });
    await addCol("lastCompiledAt", { type: T2.DATE, allowNull: true });
    await addCol("flowUnderstanding", { type: T2.JSON, allowNull: true });
    await addCol("flowUnderstandingVersion", { type: T2.INTEGER, allowNull: true, defaultValue: 0 });
    await addCol("transitionHooks", { type: T2.JSON, allowNull: true });
  },

  down: async queryInterface => {
    if (await tableExists(queryInterface, "AttendanceFlowDefinitions")) {
      await queryInterface.dropTable("AttendanceFlowDefinitions");
    }
  }
};
