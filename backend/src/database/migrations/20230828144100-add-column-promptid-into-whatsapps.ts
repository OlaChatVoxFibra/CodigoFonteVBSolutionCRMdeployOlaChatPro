/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";
interface ExistingColumns {
  };

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = "Whatsapps";
    const column = "promptId";

    const tableInfo: ExistingColumns = await queryInterface.describeTable(table);
    if (tableInfo[column]) {
      return Promise.resolve();
    }

    return queryInterface.addColumn(table, column, {
      type: DataTypes.INTEGER,
      references: { model: "Prompts", key: "id" },
      onUpdate: "RESTRICT",
      onDelete: "RESTRICT"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Whatsapps", "promptId");
  }
};
