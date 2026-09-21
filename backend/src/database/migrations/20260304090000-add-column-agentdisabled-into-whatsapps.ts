/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";
interface ExistingColumns {
  [key: string]: any;
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = "Whatsapps";
    const column = "agentDisabled";

    const tableInfo: ExistingColumns = await queryInterface.describeTable(table);
    if (tableInfo && tableInfo[column]) {
      return Promise.resolve();
    }

    return queryInterface.addColumn(table, column, {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Whatsapps", "agentDisabled");
  }
};
