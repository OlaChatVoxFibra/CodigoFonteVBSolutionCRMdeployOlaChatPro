/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Queues", "startTime", {
        type: DataTypes.STRING,
        defaultValue: null
      }),
      queryInterface.addColumn("Queues", "endTime", {
        type: DataTypes.STRING,
        defaultValue: null
      }),
      queryInterface.addColumn("Queues", "outOfHoursMessage", {
        type: DataTypes.TEXT,
        defaultValue: null
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Queues", "startTime"),
      queryInterface.removeColumn("Queues", "endTime"),
      queryInterface.removeColumn("Queues", "outOfHoursMessage")
    ]);
  }
};
