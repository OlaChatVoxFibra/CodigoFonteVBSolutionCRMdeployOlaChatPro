/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("ChatMessages") as { [key: string]: any };

    if (!tableDescription.mediaType) {
      await queryInterface.addColumn("ChatMessages", "mediaType", {
        type: DataTypes.STRING,
        allowNull: true,
      });

    } else {
      console.log("A coluna 'mediaType' já existe. Ignorando a criação.");
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("ChatMessages") as { [key: string]: any };

    if (tableDescription.mediaType) {
      await queryInterface.removeColumn("ChatMessages", "mediaType");
    } else {
      console.log("A coluna 'mediaType' não existe. Ignorando a remoção.");
    }
  }
};
