"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


/** Coluna fromAgent em Messages (CLI Sequelize ignora .ts neste projeto). */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Messages'
        AND column_name = 'fromAgent'
      LIMIT 1;
    `);
    if (rows && rows.length) return;

    await queryInterface.addColumn("Messages", "fromAgent", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async queryInterface => {
    await queryInterface.removeColumn("Messages", "fromAgent");
  }
};
