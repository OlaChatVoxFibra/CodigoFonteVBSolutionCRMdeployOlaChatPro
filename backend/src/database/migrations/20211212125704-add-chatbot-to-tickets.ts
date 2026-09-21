/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Tickets", "chatbot", {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
      }),
      queryInterface.addColumn("Tickets", "queueOptionId", {
        type: DataTypes.INTEGER,
        references: { model: "QueueOptions", key: "id" },
        onUpdate: "SET null",
        onDelete: "SET null",
        allowNull: true
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Tickets", "chatbot");
  }
};
