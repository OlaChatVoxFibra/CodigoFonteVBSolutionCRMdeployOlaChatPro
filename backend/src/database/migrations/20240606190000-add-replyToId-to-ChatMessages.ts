"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("ChatMessages", "replyToId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "ChatMessages",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("ChatMessages", "replyToId");
  }
};
