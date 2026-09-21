/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("QueueIntegrations", "typebotSlug", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ""
    }),
    queryInterface.addColumn("QueueIntegrations", "typebotExpires", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }),
    queryInterface.addColumn("QueueIntegrations", "typebotKeywordFinish", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ""
    }),
    queryInterface.addColumn("QueueIntegrations", "typebotUnknownMessage", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ""
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("QueueIntegrations", "typebotSlug"),
    queryInterface.removeColumn("QueueIntegrations", "typebotExpires"),
    queryInterface.removeColumn("QueueIntegrations", "typebotKeywordFinish"),
    queryInterface.removeColumn("QueueIntegrations", "typebotUnknownMessage");
  }
};