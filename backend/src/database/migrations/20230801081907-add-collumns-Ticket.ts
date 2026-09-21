/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Tickets", "fromMe", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }),
    queryInterface.addColumn("Tickets", "sendInactiveMessage", {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    }),
    queryInterface.addColumn("Tickets", "amountUsedBotQueuesNPS", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    });
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Tickets", "fromMe"),
      queryInterface.removeColumn("Tickets", "sendInactiveMessage"),
      queryInterface.removeColumn("Tickets", "amountUsedBotQueuesNPS"),
    ])
  }
};