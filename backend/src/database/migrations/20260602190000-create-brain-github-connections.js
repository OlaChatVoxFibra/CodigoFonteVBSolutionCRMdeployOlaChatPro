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
    if (await tableExists(queryInterface, "BrainGithubConnections")) return;

    await queryInterface.createTable("BrainGithubConnections", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: Sequelize.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      githubLogin: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      githubName: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      avatarUrl: {
        type: Sequelize.STRING(512),
        allowNull: true
      },
      accessTokenEnc: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      scope: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    await queryInterface.addIndex("BrainGithubConnections", ["companyId", "userId"], {
      unique: true,
      name: "brain_github_connections_company_user_unique"
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("BrainGithubConnections");
  }
};
