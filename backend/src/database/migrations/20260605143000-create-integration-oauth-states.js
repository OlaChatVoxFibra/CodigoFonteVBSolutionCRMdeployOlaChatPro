"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


async function tableExists(queryInterface, table) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = :table LIMIT 1`,
    { replacements: { table } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (await tableExists(queryInterface, "integration_oauth_states")) return;

    await queryInterface.createTable("integration_oauth_states", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false
      },
      payload_json: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("integration_oauth_states", ["expires_at"], {
      name: "integration_oauth_states_expires_at"
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("integration_oauth_states");
  }
};
