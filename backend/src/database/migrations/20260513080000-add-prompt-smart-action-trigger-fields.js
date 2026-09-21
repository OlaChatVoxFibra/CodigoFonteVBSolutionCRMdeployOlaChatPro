"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


async function addColumnIfMissing(queryInterface, Sequelize, table, column, definition) {
  const columns = await queryInterface.describeTable(table).catch(() => null);
  if (!columns || columns[column]) return;
  await queryInterface.addColumn(table, column, definition);
}

async function removeColumnIfExists(queryInterface, table, column) {
  const columns = await queryInterface.describeTable(table).catch(() => null);
  if (!columns || !columns[column]) return;
  await queryInterface.removeColumn(table, column);
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await addColumnIfMissing(queryInterface, Sequelize, "PromptSmartActions", "enabled", {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: true
    });
    await addColumnIfMissing(queryInterface, Sequelize, "PromptSmartActions", "agentTriggerPatterns", {
      type: Sequelize.JSONB,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, Sequelize, "PromptSmartActions", "userTriggerPatterns", {
      type: Sequelize.JSONB,
      allowNull: true
    });
    await addColumnIfMissing(queryInterface, Sequelize, "PromptSmartActions", "intentSlotSchema", {
      type: Sequelize.JSONB,
      allowNull: true
    });
  },

  down: async (queryInterface) => {
    await removeColumnIfExists(queryInterface, "PromptSmartActions", "intentSlotSchema");
    await removeColumnIfExists(queryInterface, "PromptSmartActions", "userTriggerPatterns");
    await removeColumnIfExists(queryInterface, "PromptSmartActions", "agentTriggerPatterns");
    await removeColumnIfExists(queryInterface, "PromptSmartActions", "enabled");
  }
};
