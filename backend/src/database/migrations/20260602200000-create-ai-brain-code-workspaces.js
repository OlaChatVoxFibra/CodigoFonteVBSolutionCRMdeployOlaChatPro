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
    if (!(await tableExists(queryInterface, "AiBrainCodeWorkspaces"))) {
      await queryInterface.createTable("AiBrainCodeWorkspaces", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        brainProjectId: {
          type: Sequelize.INTEGER,
          references: { model: "AiBrainProjects", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
          allowNull: false
        },
        title: {
          type: Sequelize.STRING(120),
          allowNull: false
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
        sortOrder: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
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

      await queryInterface.addIndex("AiBrainCodeWorkspaces", ["brainProjectId", "sortOrder"], {
        name: "ai_brain_code_workspaces_project_sort"
      });
    }

    const [projects] = await queryInterface.sequelize.query(`
      SELECT id, title, "codeFiles", "activePath", "companyId", "userId", "createdAt", "updatedAt"
      FROM "AiBrainProjects"
    `);

    const now = new Date();
    for (const p of projects || []) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM "AiBrainCodeWorkspaces" WHERE "brainProjectId" = :pid LIMIT 1`,
        { replacements: { pid: p.id } }
      );
      if (existing?.length) continue;

      const codeFiles =
        p.codeFiles && typeof p.codeFiles === "object"
          ? JSON.stringify(p.codeFiles)
          : null;

      await queryInterface.sequelize.query(
        `INSERT INTO "AiBrainCodeWorkspaces"
         ("brainProjectId", title, "codeFiles", "activePath", "sortOrder", "companyId", "userId", "createdAt", "updatedAt")
         VALUES (:brainProjectId, :title, :codeFiles::jsonb, :activePath, 0, :companyId, :userId, :createdAt, :updatedAt)`,
        {
          replacements: {
            brainProjectId: p.id,
            title: "Projeto principal",
            codeFiles: codeFiles || "{}",
            activePath: p.activePath || "index.html",
            companyId: p.companyId,
            userId: p.userId,
            createdAt: p.createdAt || now,
            updatedAt: p.updatedAt || now
          }
        }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("AiBrainCodeWorkspaces");
  }
};
