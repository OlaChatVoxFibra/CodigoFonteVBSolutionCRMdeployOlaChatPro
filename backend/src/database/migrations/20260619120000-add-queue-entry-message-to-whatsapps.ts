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

    const whatsapps = await tableInfo("Whatsapps");
    if (!whatsapps.queueEntryMessage) {
      await queryInterface.addColumn("Whatsapps", "queueEntryMessage", {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: ""
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
    if (whatsapps.queueEntryMessage) {
      await queryInterface.removeColumn("Whatsapps", "queueEntryMessage");
    }
  }
};
