/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Chats", "description", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ""
    });
    await queryInterface.addColumn("Chats", "groupImage", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ""
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Chats", "description");
    await queryInterface.removeColumn("Chats", "groupImage");
  }
};
