/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.changeColumn("Whatsapps", "token", {
        type: DataTypes.TEXT,
        allowNull: true,
      }),
      queryInterface.changeColumn("Whatsapps", "send_token", {
        type: DataTypes.TEXT,
        allowNull: true,
      }),
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.changeColumn("Whatsapps", "token", {
        type: DataTypes.STRING,
        allowNull: true,
      }),
      queryInterface.changeColumn("Whatsapps", "send_token", {
        type: DataTypes.STRING,
        allowNull: true,
      }),
    ]);
  },
};
