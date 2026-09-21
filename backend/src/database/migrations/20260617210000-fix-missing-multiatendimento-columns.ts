/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const qi = queryInterface as any;
    const tableInfo = async (table: string) => {
      try {
        return await qi.describeTable(table);
      } catch {
        return {};
      }
    };

    const queues = await tableInfo("Queues");
    if (!queues.sendQueueEntryMessage) {
      await queryInterface.addColumn("Queues", "sendQueueEntryMessage", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }
    if (!queues.queueEntryMessage) {
      await queryInterface.addColumn("Queues", "queueEntryMessage", {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "Você está na fila *{{queue}}*. Em breve será atendido!"
      });
    }

    const whatsapps = await tableInfo("Whatsapps");
    if (!whatsapps.sendQueueEntryMessage) {
      await queryInterface.addColumn("Whatsapps", "sendQueueEntryMessage", {
        type: DataTypes.STRING(255),
        allowNull: false,
        defaultValue: "inherit"
      });
    }
    if (!whatsapps.queueEntryMessage) {
      await queryInterface.addColumn("Whatsapps", "queueEntryMessage", {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ""
      });
    }

    const users = await tableInfo("Users");
    if (!users.ticketVisibility) {
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
        WHERE "ticketVisibility" IS NULL OR "ticketVisibility" = 'own_only'
      `);
    }
  },

  down: async () => {
    /* colunas mantidas — migration corretiva */
  }
};
