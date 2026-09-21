/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Whatsapps", "queueIdImportMessages", {
      references: { model: "Queues", key: "id" },
      type: DataTypes.INTEGER,
      defaultValue: null,
      allowNull: true,
      onDelete: "SET NULL",
      onUpdate: "CASCADE"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Whatsapps", "queueIdImportMessages"),
    ])
  }
};
