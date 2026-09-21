/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Users", "defaultTicketsManagerWidth", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 550
    })
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Users", "defaultTicketsManagerWidth")
  }
};
