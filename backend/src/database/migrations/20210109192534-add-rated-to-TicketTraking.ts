/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("TicketTraking", "ratingAt", {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null
      }),
      queryInterface.addColumn("TicketTraking", "rated", {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("TicketTraking", "ratingAt"),
      queryInterface.removeColumn("TicketTraking", "rated")
    ]);
  }
};
