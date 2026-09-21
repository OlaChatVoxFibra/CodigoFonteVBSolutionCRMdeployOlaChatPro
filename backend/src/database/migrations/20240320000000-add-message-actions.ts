/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("ChatMessages", "isEdited", {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn("ChatMessages", "isDeleted", {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn("ChatMessages", "forwardedFromId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "ChatMessages",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("ChatMessages", "isEdited");
    await queryInterface.removeColumn("ChatMessages", "isDeleted");
    await queryInterface.removeColumn("ChatMessages", "forwardedFromId");
  }
};
