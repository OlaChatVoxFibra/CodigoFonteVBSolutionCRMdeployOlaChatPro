/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Companies", "signupMetadata", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn("Companies", "whiteLabelHostDomain", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Companies", "whiteLabelHostDomain");
    await queryInterface.removeColumn("Companies", "signupMetadata");
  }
};
