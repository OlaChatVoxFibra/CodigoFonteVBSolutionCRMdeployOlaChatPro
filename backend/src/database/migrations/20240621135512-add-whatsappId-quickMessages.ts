/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("QuickMessages", "whatsappId", {
        type: DataTypes.INTEGER,
        references: {
          model: "Whatsapps", // Assumes the table name for QuickMessage is "QuickMessages"
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("QuickMessages", "whatsappId")
    ]);
  }
};
