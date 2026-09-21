/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Queues", "sendQueueEntryMessage", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });
    await queryInterface.addColumn("Queues", "queueEntryMessage", {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "Você está na fila *{{queue}}*. Em breve será atendido!"
    });
    await queryInterface.addColumn("Whatsapps", "sendQueueEntryMessage", {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "inherit"
    });
    await queryInterface.addColumn("Users", "ticketVisibility", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "own_only"
    });

    await queryInterface.sequelize.query(`
      UPDATE "Users"
      SET "ticketVisibility" = CASE
        WHEN "allTicket" IN ('enable', 'enabled')
          AND "allHistoric" = 'enabled'
          AND "allUserChat" = 'enabled' THEN 'all'
        WHEN "allHistoric" = 'enabled'
          AND "allUserChat" = 'enabled' THEN 'own_queues'
        ELSE 'own_only'
      END
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Users", "ticketVisibility");
    await queryInterface.removeColumn("Whatsapps", "sendQueueEntryMessage");
    await queryInterface.removeColumn("Queues", "queueEntryMessage");
    await queryInterface.removeColumn("Queues", "sendQueueEntryMessage");
  }
};
