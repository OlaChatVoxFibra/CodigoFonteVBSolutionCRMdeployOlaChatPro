/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "valorVenda", {
      type: DataTypes.FLOAT,
      allowNull: true
    });
    await queryInterface.addColumn("Tickets", "motivoNaoVenda", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Tickets", "finalizadoComVenda", {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Tickets", "valorVenda");
    await queryInterface.removeColumn("Tickets", "motivoNaoVenda");
    await queryInterface.removeColumn("Tickets", "finalizadoComVenda");
  }
};
