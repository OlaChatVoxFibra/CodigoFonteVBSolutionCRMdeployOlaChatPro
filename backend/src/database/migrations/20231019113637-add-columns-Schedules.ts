/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Schedules", "ticketUserId", {
      type: DataTypes.INTEGER,
      references: { model: "Users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }),
    queryInterface.addColumn("Schedules", "whatsappId", {
      type: DataTypes.INTEGER,
      references: { model: "Whatsapps", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }),
    queryInterface.addColumn("Schedules", "queueId", {
      type: DataTypes.INTEGER,
      references: { model: "Queues", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    }),
    queryInterface.addColumn("Schedules", "statusTicket", {
      type: DataTypes.STRING,
      defaultValue: "closed"
    })
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Schedules", "userId"),
    queryInterface.removeColumn("Schedules", "queueId"),
    queryInterface.removeColumn("Schedules", "whatsappId"),
    queryInterface.removeColumn("Schedules", "statusTicket")
  }
};