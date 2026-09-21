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

async function columnExists(queryInterface, table, column) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :table AND column_name = :column LIMIT 1`,
    { replacements: { table, column } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await tableExists(queryInterface, "AiBrainProjects"))) {
      await queryInterface.createTable("AiBrainProjects", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        title: {
          type: Sequelize.STRING(120),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        accentColor: {
          type: Sequelize.STRING(16),
          allowNull: true,
          defaultValue: "#8b5cf6"
        },
        codeFiles: {
          type: Sequelize.JSON,
          allowNull: true
        },
        activePath: {
          type: Sequelize.STRING(255),
          allowNull: true,
          defaultValue: "index.html"
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
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
    }

    if (!(await columnExists(queryInterface, "AiBrainConversations", "projectId"))) {
      await queryInterface.addColumn("AiBrainConversations", "projectId", {
        type: Sequelize.INTEGER,
        references: { model: "AiBrainProjects", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: true
      });
    }

    const [pairs] = await queryInterface.sequelize.query(`
      SELECT DISTINCT "companyId", "userId"
      FROM "AiBrainConversations"
      WHERE "projectId" IS NULL
    `);

    const now = new Date();
    for (const row of pairs || []) {
      const companyId = row.companyId;
      const userId = row.userId;
      const [inserted] = await queryInterface.sequelize.query(
        `INSERT INTO "AiBrainProjects" ("title", "description", "accentColor", "companyId", "userId", "createdAt", "updatedAt")
         VALUES ('Projeto padrão', 'Conversas migradas automaticamente', '#8b5cf6', :companyId, :userId, :now, :now)
         RETURNING id`,
        { replacements: { companyId, userId, now } }
      );
      const projectId = inserted?.[0]?.id;
      if (projectId) {
        await queryInterface.sequelize.query(
          `UPDATE "AiBrainConversations" SET "projectId" = :projectId
           WHERE "companyId" = :companyId AND "userId" = :userId AND "projectId" IS NULL`,
          { replacements: { projectId, companyId, userId } }
        );
      }
    }
  },

  down: async (queryInterface) => {
    if (await columnExists(queryInterface, "AiBrainConversations", "projectId")) {
      await queryInterface.removeColumn("AiBrainConversations", "projectId");
    }
    if (await tableExists(queryInterface, "AiBrainProjects")) {
      await queryInterface.dropTable("AiBrainProjects");
    }
  }
};
