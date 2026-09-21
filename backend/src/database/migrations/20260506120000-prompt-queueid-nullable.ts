/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn("Prompts", "queueId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "Queues", key: "id" },
      onUpdate: "NO ACTION",
      onDelete: "NO ACTION"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn("Prompts", "queueId", {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "Queues", key: "id" },
      onUpdate: "NO ACTION",
      onDelete: "NO ACTION"
    });
  }
};
