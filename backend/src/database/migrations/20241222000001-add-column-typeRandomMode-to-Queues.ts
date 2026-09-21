/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Queues", "typeRandomMode", {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "RANDOM"
    });
  },

  down: (queryInterface: QueryInterface) => {
    queryInterface.removeColumn("Queues", "typeRandomMode");
  }

}
