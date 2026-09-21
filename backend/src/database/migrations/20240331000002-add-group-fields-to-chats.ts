/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Chats", "isGroup", {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn("Chats", "groupName", {
      type: DataTypes.STRING
    });
    await queryInterface.addColumn("Chats", "groupAdminId", {
      type: DataTypes.INTEGER,
      references: { model: "Users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Chats", "isGroup");
    await queryInterface.removeColumn("Chats", "groupName");
    await queryInterface.removeColumn("Chats", "groupAdminId");
  }
};
