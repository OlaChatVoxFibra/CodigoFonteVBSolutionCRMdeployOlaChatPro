/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Whatsapps", "collectiveVacationEnd", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    }),
    queryInterface.addColumn("Whatsapps", "collectiveVacationMessage", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    }),
    queryInterface.addColumn("Whatsapps", "collectiveVacationStart", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    })
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Whatsapps", "collectiveVacationEnd"),
    queryInterface.removeColumn("Whatsapps", "collectiveVacationMessage"),
    queryInterface.removeColumn("Whatsapps", "collectiveVacationStart")
  }
};

