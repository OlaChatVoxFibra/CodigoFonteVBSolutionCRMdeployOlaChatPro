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

async function addIndexIfMissing(queryInterface, table, fields, name, options = {}) {
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
  await queryInterface.addIndex(table, fields, { name, ...options });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const T = Sequelize;
    const JSON_TYPE = T.JSONB || T.JSON;

    if (!(await tableExists(queryInterface, "PromptSmartActions"))) {
      await queryInterface.createTable("PromptSmartActions", {
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
        name: { type: T.STRING(255), allowNull: false },
        slug: { type: T.STRING(128), allowNull: true },
        type: { type: T.STRING(128), allowNull: false },
        description: { type: T.TEXT, allowNull: true },
        triggerType: { type: T.STRING(64), allowNull: true },
        triggerValue: { type: T.TEXT, allowNull: true },
        conditionExpr: { type: T.TEXT, allowNull: true },
        variables: { type: JSON_TYPE, allowNull: true },
        apiUrl: { type: T.TEXT, allowNull: true },
        workflowId: { type: T.INTEGER, allowNull: true },
        confirm: { type: T.BOOLEAN, allowNull: true, defaultValue: false },
        autoExecute: { type: T.BOOLEAN, allowNull: true, defaultValue: false },
        responseMessage: { type: T.TEXT, allowNull: true },
        enabled: { type: T.BOOLEAN, allowNull: true, defaultValue: true },
        agentTriggerPatterns: { type: JSON_TYPE, allowNull: true },
        userTriggerPatterns: { type: JSON_TYPE, allowNull: true },
        intentSlotSchema: { type: JSON_TYPE, allowNull: true },
        createdAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW },
        updatedAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW }
      });
    } else {
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "description", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "triggerType", { type: T.STRING(64), allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "triggerValue", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "conditionExpr", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "variables", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "apiUrl", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "workflowId", { type: T.INTEGER, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "confirm", { type: T.BOOLEAN, allowNull: true, defaultValue: false });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "autoExecute", { type: T.BOOLEAN, allowNull: true, defaultValue: false });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "responseMessage", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "enabled", { type: T.BOOLEAN, allowNull: true, defaultValue: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "agentTriggerPatterns", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "userTriggerPatterns", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptSmartActions", "intentSlotSchema", { type: JSON_TYPE, allowNull: true });
    }

    await addIndexIfMissing(
      queryInterface,
      "PromptSmartActions",
      ["companyId", "promptId"],
      "idx_prompt_smart_actions_company_prompt"
    );
    await addIndexIfMissing(
      queryInterface,
      "PromptSmartActions",
      ["companyId", "promptId", "slug"],
      "idx_prompt_smart_actions_company_prompt_slug"
    );

    if (!(await tableExists(queryInterface, "AttendanceFlowDefinitions"))) {
      await queryInterface.createTable("AttendanceFlowDefinitions", {
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
        policy: { type: JSON_TYPE, allowNull: true },
        compilerVersion: { type: T.INTEGER, allowNull: true, defaultValue: 1 },
        lastCompiledAt: { type: T.DATE, allowNull: true },
        flowUnderstanding: { type: JSON_TYPE, allowNull: true },
        flowUnderstandingVersion: { type: T.INTEGER, allowNull: true, defaultValue: 0 },
        transitionHooks: { type: JSON_TYPE, allowNull: true },
        createdAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW },
        updatedAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW }
      });
    } else {
      await addColumnIfMissing(queryInterface, "AttendanceFlowDefinitions", "entryStepId", { type: T.STRING(64), allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowDefinitions", "fallbackStepId", { type: T.STRING(64), allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowDefinitions", "policy", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowDefinitions", "compilerVersion", { type: T.INTEGER, allowNull: true, defaultValue: 1 });
      await addColumnIfMissing(queryInterface, "AttendanceFlowDefinitions", "lastCompiledAt", { type: T.DATE, allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowDefinitions", "flowUnderstanding", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowDefinitions", "flowUnderstandingVersion", { type: T.INTEGER, allowNull: true, defaultValue: 0 });
      await addColumnIfMissing(queryInterface, "AttendanceFlowDefinitions", "transitionHooks", { type: JSON_TYPE, allowNull: true });
    }

    await addIndexIfMissing(
      queryInterface,
      "AttendanceFlowDefinitions",
      ["companyId", "promptId"],
      "idx_attendance_flow_definitions_company_prompt",
      { unique: true }
    ).catch(() =>
      addIndexIfMissing(
        queryInterface,
        "AttendanceFlowDefinitions",
        ["companyId", "promptId"],
        "idx_attendance_flow_definitions_company_prompt"
      )
    );

    await addColumnIfMissing(queryInterface, "Tickets", "dataWebhook", {
      type: T.JSON,
      allowNull: true
    });
  },

  down: async () => {
    // No-op: migration de garantia para produção. Não remove dados do agente/roteiro.
  }
};
