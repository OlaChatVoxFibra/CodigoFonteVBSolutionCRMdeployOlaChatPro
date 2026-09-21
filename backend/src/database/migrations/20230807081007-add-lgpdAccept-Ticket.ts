/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Tickets", "lgpdAcceptedAt", {
      type: DataTypes.DATE,
      defaultValue: null,
      allowNull: true
    }),
    queryInterface.addColumn("Tickets", "lgpdSendMessageAt", {
      type: DataTypes.DATE,
      defaultValue: null,
      allowNull: true
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Tickets", "lgpdAcceptedAt"),
    queryInterface.removeColumn("Tickets", "lgpdSendMessageAt");
  }
};