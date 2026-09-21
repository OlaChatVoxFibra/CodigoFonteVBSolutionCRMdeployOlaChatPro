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
    if (!queues.isSystem) {
      await queryInterface.addColumn("Queues", "isSystem", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    const whatsapps = await tableInfo("Whatsapps");
    if (!whatsapps.queuesEnabled) {
      await queryInterface.addColumn("Whatsapps", "queuesEnabled", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      });
    }
    if (!whatsapps.sendGreetingMessage) {
      await queryInterface.addColumn("Whatsapps", "sendGreetingMessage", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
    if (!whatsapps.sendFarewellMessage) {
      await queryInterface.addColumn("Whatsapps", "sendFarewellMessage", {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const qi = queryInterface as any;
    const tableInfo = async (table: string) => {
      try {
        return await qi.describeTable(table);
      } catch {
        return {};
      }
    };

    const whatsapps = await tableInfo("Whatsapps");
    if (whatsapps.sendFarewellMessage) {
      await queryInterface.removeColumn("Whatsapps", "sendFarewellMessage");
    }
    if (whatsapps.sendGreetingMessage) {
      await queryInterface.removeColumn("Whatsapps", "sendGreetingMessage");
    }
    if (whatsapps.queuesEnabled) {
      await queryInterface.removeColumn("Whatsapps", "queuesEnabled");
    }

    const queues = await tableInfo("Queues");
    if (queues.isSystem) {
      await queryInterface.removeColumn("Queues", "isSystem");
    }
  }
};
