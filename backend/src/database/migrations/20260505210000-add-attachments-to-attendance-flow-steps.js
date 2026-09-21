"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name ILIKE '%attendance%flow%step%'
      ORDER BY table_name
      LIMIT 5;
    `);
    const tableName = rows && rows[0] && rows[0].table_name;
    if (!tableName) {
      // eslint-disable-next-line no-console
      console.warn(
        "[migration] Tabela de passos do fluxo não encontrada — pulando coluna attachments."
      );
      return;
    }
    const [cols] = await queryInterface.sequelize.query(
      `
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = :t AND column_name = 'attachments';
    `,
      { replacements: { t: tableName } }
    );
    if (cols && cols.length) return;

    await queryInterface.addColumn(tableName, "attachments", {
      type: Sequelize.JSON,
      allowNull: true
    });
  },

  down: async queryInterface => {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name ILIKE '%attendance%flow%step%'
      LIMIT 1;
    `);
    const tableName = rows && rows[0] && rows[0].table_name;
    if (!tableName) return;
    await queryInterface.removeColumn(tableName, "attachments");
  }
};
