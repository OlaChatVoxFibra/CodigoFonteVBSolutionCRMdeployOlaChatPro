/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Users", "allowRealTime", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "disabled"
    }),
      queryInterface.addColumn("Users", "allowConnections", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "disabled"
      });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Users", "allowRealTime"),
      queryInterface.removeColumn("Users", "allowConnections");
  }
};
