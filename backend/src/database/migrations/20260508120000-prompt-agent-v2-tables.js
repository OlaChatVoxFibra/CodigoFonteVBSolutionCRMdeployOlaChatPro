"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/** Estende Prompts e cria tabelas satélite multi-tenant (companyId) para o editor v2. */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const qi = queryInterface;
    const T = Sequelize;

    const promptsTable = await qi.describeTable("Prompts").catch(() => null);
    if (promptsTable) {
      const addCol = async (name, def) => {
        if (!promptsTable[name]) {
          await qi.addColumn("Prompts", name, def);
        }
      };
      await addCol("description", { type: T.TEXT, allowNull: true });
      await addCol("role", { type: T.TEXT, allowNull: true });
      await addCol("language", { type: T.STRING(64), allowNull: true });
      await addCol("emojisEnabled", { type: T.BOOLEAN, allowNull: true, defaultValue: true });
      await addCol("responseDelay", { type: T.INTEGER, allowNull: true });
      await addCol("generalRules", { type: T.TEXT, allowNull: true });
      await addCol("attendanceScript", { type: T.TEXT, allowNull: true });
      await addCol("faqEnabled", { type: T.BOOLEAN, allowNull: true, defaultValue: true });
      await addCol("knowledgeEnabled", { type: T.BOOLEAN, allowNull: true, defaultValue: true });
      await addCol("linkedAgentId", { type: T.INTEGER, allowNull: true });
    }

    const tables = await qi.showAllTables();
    const has = (n) => tables.includes(n);

    if (!has("PromptFaqItems")) {
      await qi.createTable("PromptFaqItems", {
        id: { type: T.INTEGER, autoIncrement: true, primaryKey: true },
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
        question: { type: T.TEXT, allowNull: false },
        answer: { type: T.TEXT, allowNull: false },
        category: { type: T.STRING(255), allowNull: true },
        priority: { type: T.INTEGER, allowNull: true, defaultValue: 0 },
        createdAt: { type: T.DATE, allowNull: false },
        updatedAt: { type: T.DATE, allowNull: false }
      });
      await qi.addIndex("PromptFaqItems", ["companyId", "promptId"], {
        name: "idx_prompt_faq_company_prompt"
      });
    }

    if (!has("PromptSmartActions")) {
      await qi.createTable("PromptSmartActions", {
        id: { type: T.INTEGER, autoIncrement: true, primaryKey: true },
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
        variables: { type: T.JSON, allowNull: true },
        apiUrl: { type: T.TEXT, allowNull: true },
        workflowId: { type: T.INTEGER, allowNull: true },
        confirm: { type: T.BOOLEAN, allowNull: true, defaultValue: false },
        autoExecute: { type: T.BOOLEAN, allowNull: true, defaultValue: false },
        responseMessage: { type: T.TEXT, allowNull: true },
        createdAt: { type: T.DATE, allowNull: false },
        updatedAt: { type: T.DATE, allowNull: false }
      });
      await qi.addIndex("PromptSmartActions", ["companyId", "promptId"], {
        name: "idx_prompt_smart_actions_company_prompt"
      });
    }

    if (!has("PromptAgentMedias")) {
      await qi.createTable("PromptAgentMedias", {
        id: { type: T.INTEGER, autoIncrement: true, primaryKey: true },
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
        slug: { type: T.STRING(128), allowNull: false },
        name: { type: T.STRING(255), allowNull: false },
        fileUrl: { type: T.TEXT, allowNull: true },
        fileType: { type: T.STRING(64), allowNull: true },
        caption: { type: T.TEXT, allowNull: true },
        createdAt: { type: T.DATE, allowNull: false },
        updatedAt: { type: T.DATE, allowNull: false }
      });
      await qi.addIndex("PromptAgentMedias", ["companyId", "promptId"], {
        name: "idx_prompt_agent_medias_company_prompt"
      });
    }

    if (!has("PromptKnowledgeSources")) {
      await qi.createTable("PromptKnowledgeSources", {
        id: { type: T.INTEGER, autoIncrement: true, primaryKey: true },
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
        sourceType: { type: T.STRING(64), allowNull: false },
        title: { type: T.STRING(512), allowNull: true },
        content: { type: T.TEXT, allowNull: true },
        fileUrl: { type: T.TEXT, allowNull: true },
        metadata: { type: T.JSON, allowNull: true },
        embeddings: { type: T.TEXT, allowNull: true },
        createdAt: { type: T.DATE, allowNull: false },
        updatedAt: { type: T.DATE, allowNull: false }
      });
      await qi.addIndex("PromptKnowledgeSources", ["companyId", "promptId"], {
        name: "idx_prompt_knowledge_company_prompt"
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const qi = queryInterface;
    const tables = await qi.showAllTables();
    const drop = async (n) => {
      if (tables.includes(n)) await qi.dropTable(n);
    };
    await drop("PromptKnowledgeSources");
    await drop("PromptAgentMedias");
    await drop("PromptSmartActions");
    await drop("PromptFaqItems");

    const promptsTable = await qi.describeTable("Prompts").catch(() => null);
    if (promptsTable) {
      const cols = [
        "linkedAgentId",
        "knowledgeEnabled",
        "faqEnabled",
        "attendanceScript",
        "generalRules",
        "responseDelay",
        "emojisEnabled",
        "language",
        "role",
        "description"
      ];
      for (const c of cols) {
        if (promptsTable[c]) {
          await qi.removeColumn("Prompts", c);
        }
      }
    }
  }
};
