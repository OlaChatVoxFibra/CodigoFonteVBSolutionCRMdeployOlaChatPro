/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.sequelize.query('DELETE FROM "Settings"'),
      queryInterface.removeConstraint("Settings", "Settings_pkey"),
      queryInterface.addColumn("Settings", "id", {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.sequelize.query('DELETE FROM "Settings"'),
      queryInterface.removeColumn("Settings", "id"),
      queryInterface.addConstraint("Settings", ["key"], {
        type: "primary key",
        name: "Settings_pkey"
      })
    ]);
  }
};
