/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("ChatMessages") as { [key: string]: any };

    if (!tableDescription.companyId) {
      await queryInterface.addColumn("ChatMessages", "companyId", {
        type: DataTypes.INTEGER,
        references: {
          model: "Companies",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: true,
      });

      await queryInterface.sequelize.query(`
        UPDATE "ChatMessages" SET "companyId" = (SELECT "companyId" FROM "Chats" WHERE "Chats"."id" = "ChatMessages"."chatId")
      `);
    } else {
      console.log("A coluna 'companyId' já existe. Ignorando a criação.");
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const tableDescription = await queryInterface.describeTable("ChatMessages") as { [key: string]: any };

    if (tableDescription.companyId) {
      await queryInterface.removeColumn("ChatMessages", "companyId");
    } else {
      console.log("A coluna 'companyId' não existe. Ignorando a remoção.");
    }
  }
};
