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

    await addColumnIfMissing(queryInterface, "Prompts", "description", { type: T.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, "Prompts", "role", { type: T.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, "Prompts", "language", { type: T.STRING(64), allowNull: true });
    await addColumnIfMissing(queryInterface, "Prompts", "emojisEnabled", { type: T.BOOLEAN, allowNull: true, defaultValue: true });
    await addColumnIfMissing(queryInterface, "Prompts", "responseDelay", { type: T.INTEGER, allowNull: true });
    await addColumnIfMissing(queryInterface, "Prompts", "generalRules", { type: T.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, "Prompts", "attendanceScript", { type: T.TEXT, allowNull: true });
    await addColumnIfMissing(queryInterface, "Prompts", "faqEnabled", { type: T.BOOLEAN, allowNull: true, defaultValue: true });
    await addColumnIfMissing(queryInterface, "Prompts", "knowledgeEnabled", { type: T.BOOLEAN, allowNull: true, defaultValue: true });
    await addColumnIfMissing(queryInterface, "Prompts", "linkedAgentId", { type: T.INTEGER, allowNull: true });

    if (!(await tableExists(queryInterface, "PromptFaqItems"))) {
      await queryInterface.createTable("PromptFaqItems", {
        id: { type: T.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        companyId: { type: T.INTEGER, allowNull: false, references: { model: "Companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
        promptId: { type: T.INTEGER, allowNull: false, references: { model: "Prompts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
        question: { type: T.TEXT, allowNull: false },
        answer: { type: T.TEXT, allowNull: false },
        category: { type: T.STRING(255), allowNull: true },
        priority: { type: T.INTEGER, allowNull: true, defaultValue: 0 },
        createdAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW },
        updatedAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW }
      });
    }
    await addIndexIfMissing(queryInterface, "PromptFaqItems", ["companyId", "promptId"], "idx_prompt_faq_company_prompt");

    if (!(await tableExists(queryInterface, "PromptAgentMedias"))) {
      await queryInterface.createTable("PromptAgentMedias", {
        id: { type: T.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        companyId: { type: T.INTEGER, allowNull: false, references: { model: "Companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
        promptId: { type: T.INTEGER, allowNull: false, references: { model: "Prompts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
        slug: { type: T.STRING(128), allowNull: false },
        name: { type: T.STRING(255), allowNull: false },
        fileUrl: { type: T.TEXT, allowNull: true },
        fileType: { type: T.STRING(64), allowNull: true },
        caption: { type: T.TEXT, allowNull: true },
        createdAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW },
        updatedAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW }
      });
    } else {
      await addColumnIfMissing(queryInterface, "PromptAgentMedias", "fileUrl", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptAgentMedias", "fileType", { type: T.STRING(64), allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptAgentMedias", "caption", { type: T.TEXT, allowNull: true });
    }
    await addIndexIfMissing(queryInterface, "PromptAgentMedias", ["companyId", "promptId"], "idx_prompt_agent_medias_company_prompt");

    if (!(await tableExists(queryInterface, "PromptKnowledgeSources"))) {
      await queryInterface.createTable("PromptKnowledgeSources", {
        id: { type: T.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        companyId: { type: T.INTEGER, allowNull: false, references: { model: "Companies", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
        promptId: { type: T.INTEGER, allowNull: false, references: { model: "Prompts", key: "id" }, onUpdate: "CASCADE", onDelete: "CASCADE" },
        sourceType: { type: T.STRING(64), allowNull: false },
        title: { type: T.STRING(512), allowNull: true },
        content: { type: T.TEXT, allowNull: true },
        fileUrl: { type: T.TEXT, allowNull: true },
        metadata: { type: JSON_TYPE, allowNull: true },
        embeddings: { type: T.TEXT, allowNull: true },
        createdAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW },
        updatedAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW }
      });
    } else {
      await addColumnIfMissing(queryInterface, "PromptKnowledgeSources", "metadata", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "PromptKnowledgeSources", "embeddings", { type: T.TEXT, allowNull: true });
    }
    await addIndexIfMissing(queryInterface, "PromptKnowledgeSources", ["companyId", "promptId"], "idx_prompt_knowledge_company_prompt");

    if (await tableExists(queryInterface, "AttendanceFlowSteps")) {
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "attachments", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "title", { type: T.STRING(255), allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "objective", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "expectedReply", { type: T.STRING(64), allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "slotName", { type: T.STRING(128), allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "slotSchema", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "branchesIR", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "commandsIR", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "customerVisibleText", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "trainingMarkers", { type: JSON_TYPE, allowNull: true });
      await addColumnIfMissing(queryInterface, "AttendanceFlowSteps", "version", { type: T.INTEGER, allowNull: true, defaultValue: 1 });
      await addIndexIfMissing(queryInterface, "AttendanceFlowSteps", ["companyId", "promptId"], "idx_attendance_flow_steps_company_prompt");
    }
  },

  down: async () => {
    // No-op: migration de garantia para salvar /prompts em produção sem apagar dados.
  }
};
