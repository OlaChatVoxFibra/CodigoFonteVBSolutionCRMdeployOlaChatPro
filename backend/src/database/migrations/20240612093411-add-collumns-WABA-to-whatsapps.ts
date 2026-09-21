/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Whatsapps", "phone_number_id", {
        type: DataTypes.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn("Whatsapps", "waba_id", {
        type: DataTypes.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn("Whatsapps", "send_token", {
        type: DataTypes.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn("Whatsapps", "business_id", {
        type: DataTypes.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn("Whatsapps", "phone_number", {
        type: DataTypes.STRING,
        allowNull: true,
      }),
      queryInterface.addColumn("Whatsapps", "waba_webhook", {
        type: DataTypes.STRING,
        allowNull: true,
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Whatsapps", "phone_number_id"),
      queryInterface.removeColumn("Whatsapps", "waba_id"),
      queryInterface.removeColumn("Whatsapps", "send_token"),
      queryInterface.removeColumn("Whatsapps", "business_id"),
      queryInterface.removeColumn("Whatsapps", "phone_number")
    ]);
  }
};
