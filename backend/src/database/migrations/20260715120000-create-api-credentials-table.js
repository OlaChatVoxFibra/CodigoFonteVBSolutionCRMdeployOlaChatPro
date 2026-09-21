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
    if (await tableExists(queryInterface, "api_credentials")) return;

    await queryInterface.createTable("api_credentials", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      key_prefix: {
        type: Sequelize.STRING(32),
        allowNull: false
      },
      key_hash: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      scopes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      },
      created_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      revoked_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("api_credentials", ["key_prefix"], {
      unique: true,
      name: "api_credentials_key_prefix_unique"
    });
    await queryInterface.addIndex("api_credentials", ["company_id"], {
      name: "api_credentials_company_id_idx"
    });
    await queryInterface.addIndex("api_credentials", ["revoked_at"], {
      name: "api_credentials_revoked_at_idx"
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("api_credentials");
  }
};
