/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Prompts", "model", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "gpt-4.1-mini"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Prompts", "model");
  }
};
