/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("Whatsapps");

    if (!(tableDescription as Record<string, any>).timeAwaitActiveFlowId) {
      await queryInterface.addColumn("Whatsapps", "timeAwaitActiveFlowId", {
        type: DataTypes.INTEGER,
        references: {
          model: "FlowBuilders",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("Whatsapps");

    if ((tableDescription as Record<string, any>).timeAwaitActiveFlowId) {
      await queryInterface.removeColumn("Whatsapps", "timeAwaitActiveFlowId");
    }
  },
};

