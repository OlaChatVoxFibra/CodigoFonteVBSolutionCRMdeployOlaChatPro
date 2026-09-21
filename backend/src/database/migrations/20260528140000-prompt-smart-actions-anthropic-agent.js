"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable("PromptSmartActions");

    if (!table.anthropicMultiAgentId) {
      await queryInterface.addColumn("PromptSmartActions", "anthropicMultiAgentId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "AnthropicMultiAgents", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      });
    }

    if (table.promptId && table.promptId.allowNull === false) {
      await queryInterface.changeColumn("PromptSmartActions", "promptId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Prompts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      });
    }

    try {
      await queryInterface.addIndex("PromptSmartActions", ["companyId", "anthropicMultiAgentId"], {
        name: "idx_prompt_smart_actions_company_anthropic_agent"
      });
    } catch {
      /* index may exist */
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeIndex(
        "PromptSmartActions",
        "idx_prompt_smart_actions_company_anthropic_agent"
      );
    } catch {
      /* ignore */
    }
    const table = await queryInterface.describeTable("PromptSmartActions");
    if (table.anthropicMultiAgentId) {
      await queryInterface.removeColumn("PromptSmartActions", "anthropicMultiAgentId");
    }
    await queryInterface.changeColumn("PromptSmartActions", "promptId", {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: "Prompts", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE"
    });
  }
};
