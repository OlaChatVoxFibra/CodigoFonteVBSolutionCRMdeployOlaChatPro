/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Queues", "closeTicket", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }),
    queryInterface.addColumn("Chatbots", "closeTicket", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    })
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Queues", "closeTicket"),
    queryInterface.removeColumn("Chatbots", "closeTicket")
  }
};