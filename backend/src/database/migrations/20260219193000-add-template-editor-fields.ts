/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("EmailTemplates", "description", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("EmailTemplates", "fontSize", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn("EmailTemplates", "signatureImagePath", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.createTable("EmailTemplateAttachments", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      templateId: {
        type: DataTypes.INTEGER,
        references: { model: "EmailTemplates", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      filename: { type: DataTypes.STRING, allowNull: false },
      path: { type: DataTypes.STRING, allowNull: false },
      size: { type: DataTypes.INTEGER, allowNull: false },
      mimetype: { type: DataTypes.STRING, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("EmailTemplateAttachments", ["companyId", "templateId"]);
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("EmailTemplateAttachments");
    await queryInterface.removeColumn("EmailTemplates", "signatureImagePath");
    await queryInterface.removeColumn("EmailTemplates", "fontSize");
    await queryInterface.removeColumn("EmailTemplates", "description");
  }
};

