/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Tickets", "useIntegration", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,

    }),
     queryInterface.addColumn("Tickets", "integrationId", {
      references: { model: "QueueIntegrations", key: "id" },
        type: DataTypes.INTEGER,
        defaultValue: null,
        allowNull: true,
  
      });
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
        queryInterface.removeColumn("Tickets", "useIntegration"),
        queryInterface.removeColumn("Tickets", "integrationId"),
    ])
  }
};
