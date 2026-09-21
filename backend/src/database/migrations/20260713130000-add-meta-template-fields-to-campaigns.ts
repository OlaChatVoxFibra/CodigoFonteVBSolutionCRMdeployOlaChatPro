/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Campaigns", "metaTemplateQuickMessageId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
      }),
      queryInterface.addColumn("Campaigns", "metaTemplateVariables", {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Campaigns", "metaTemplateQuickMessageId"),
      queryInterface.removeColumn("Campaigns", "metaTemplateVariables")
    ]);
  }
};
