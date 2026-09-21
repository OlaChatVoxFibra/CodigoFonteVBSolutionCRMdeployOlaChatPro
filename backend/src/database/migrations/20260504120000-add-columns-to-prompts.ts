/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Prompts", "cargo", {
      type: DataTypes.JSON,
      allowNull: true
    })
    .then(() => {
      return queryInterface.addColumn("Prompts", "cerebro", {
        type: DataTypes.JSON,
        allowNull: true
      });
    })
    .then(() => {
      return queryInterface.addColumn("Prompts", "produtividade", {
        type: DataTypes.JSON,
        allowNull: true
      });
    })
    .then(() => {
      return queryInterface.addColumn("Prompts", "midias", {
        type: DataTypes.JSON,
        allowNull: true
      });
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Prompts", "midias")
    .then(() => {
      return queryInterface.removeColumn("Prompts", "produtividade");
    })
    .then(() => {
      return queryInterface.removeColumn("Prompts", "cerebro");
    })
    .then(() => {
      return queryInterface.removeColumn("Prompts", "cargo");
    });
  }
};
