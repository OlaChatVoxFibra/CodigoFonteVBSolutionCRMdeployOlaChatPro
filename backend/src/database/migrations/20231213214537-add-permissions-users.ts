/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Users", "userClosePendingTicket", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "enabled"
    }),
      queryInterface.addColumn("Users", "showDashboard", {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "disabled"
      });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Users", "userClosePendingTicket"),
      queryInterface.removeColumn("Users", "showDashboard");
  }
};
