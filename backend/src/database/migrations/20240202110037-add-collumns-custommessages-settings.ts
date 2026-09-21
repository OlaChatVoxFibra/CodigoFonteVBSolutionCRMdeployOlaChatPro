/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("CompaniesSettings", "transferMessage", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ""
    }),
    queryInterface.addColumn("CompaniesSettings", "greetingAcceptedMessage", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ""
    }),
    queryInterface.addColumn("CompaniesSettings", "AcceptCallWhatsappMessage", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ""
    }),
    queryInterface.addColumn("CompaniesSettings", "sendQueuePositionMessage", {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ""
    })
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("CompaniesSettings", "transferMessage"),
    queryInterface.removeColumn("CompaniesSettings", "greetingAcceptedMessage"),
    queryInterface.removeColumn("CompaniesSettings", "AcceptCallWhatsappMessage"),
    queryInterface.removeColumn("CompaniesSettings", "sendQueuePositionMessage")
  }
};
