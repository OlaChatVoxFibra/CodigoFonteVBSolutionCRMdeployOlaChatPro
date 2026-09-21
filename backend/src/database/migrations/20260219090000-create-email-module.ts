/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // EmailTemplates
    await queryInterface.createTable("EmailTemplates", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      name: { type: DataTypes.STRING, allowNull: false },
      subject: { type: DataTypes.STRING, allowNull: false },
      contentHtml: { type: DataTypes.TEXT, allowNull: true },
      contentText: { type: DataTypes.TEXT, allowNull: true },
      createdBy: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "SET NULL",
        onDelete: "SET NULL",
        allowNull: true
      },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("EmailTemplates", ["companyId"]);

    // EmailContacts
    await queryInterface.createTable("EmailContacts", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      name: { type: DataTypes.STRING, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: true },
      tags: { type: DataTypes.JSONB, allowNull: true },
      unsubscribeToken: { type: DataTypes.STRING, allowNull: true },
      isUnsubscribed: { type: DataTypes.BOOLEAN, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("EmailContacts", ["companyId", "email"], { unique: true, name: "EmailContacts_company_email_uq" });

    // EmailCampaigns
    await queryInterface.createTable("EmailCampaigns", {
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
        onUpdate: "SET NULL",
        onDelete: "SET NULL",
        allowNull: true
      },
      name: { type: DataTypes.STRING, allowNull: false },
      subject: { type: DataTypes.STRING, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
      scheduledAt: { type: DataTypes.DATE, allowNull: true },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      createdBy: {
        type: DataTypes.INTEGER,
        references: { model: "Users", key: "id" },
        onUpdate: "SET NULL",
        onDelete: "SET NULL",
        allowNull: true
      },
      totalRecipients: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalSent: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalOpened: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalClicked: { type: DataTypes.INTEGER, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("EmailCampaigns", ["companyId"]);
    await queryInterface.addIndex("EmailCampaigns", ["companyId", "status"]);

    // EmailSchedules
    await queryInterface.createTable("EmailSchedules", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      campaignId: {
        type: DataTypes.INTEGER,
        references: { model: "EmailCampaigns", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      contactId: {
        type: DataTypes.INTEGER,
        references: { model: "EmailContacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      scheduledAt: { type: DataTypes.DATE, allowNull: true },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: "scheduled" },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      retryCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("EmailSchedules", ["companyId", "status"]);

    // EmailLogs
    await queryInterface.createTable("EmailLogs", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      campaignId: {
        type: DataTypes.INTEGER,
        references: { model: "EmailCampaigns", key: "id" },
        onUpdate: "SET NULL",
        onDelete: "SET NULL",
        allowNull: true
      },
      contactId: {
        type: DataTypes.INTEGER,
        references: { model: "EmailContacts", key: "id" },
        onUpdate: "SET NULL",
        onDelete: "SET NULL",
        allowNull: true
      },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      openedAt: { type: DataTypes.DATE, allowNull: true },
      clickedAt: { type: DataTypes.DATE, allowNull: true },
      bounceType: { type: DataTypes.STRING, allowNull: true },
      errorMessage: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("EmailLogs", ["companyId", "contactId"]);

    // SmtpConfigs
    await queryInterface.createTable("SmtpConfigs", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      smtpHost: { type: DataTypes.STRING, allowNull: false },
      smtpPort: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 587 },
      smtpUsername: { type: DataTypes.STRING, allowNull: true },
      smtpPasswordEnc: { type: DataTypes.TEXT, allowNull: true },
      smtpEncryption: { type: DataTypes.STRING, allowNull: false, defaultValue: "tls" },
      isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("SmtpConfigs", ["companyId", "isDefault"]);

    // EmailAnalytics
    await queryInterface.createTable("EmailAnalytics", {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      totalSent: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalOpened: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalClicked: { type: DataTypes.INTEGER, defaultValue: 0 },
      totalBounced: { type: DataTypes.INTEGER, defaultValue: 0 },
      unsubscribeCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false }
    });
    await queryInterface.addIndex("EmailAnalytics", ["companyId", "date"], { unique: true, name: "EmailAnalytics_company_date_uq" });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("EmailAnalytics");
    await queryInterface.dropTable("SmtpConfigs");
    await queryInterface.dropTable("EmailLogs");
    await queryInterface.dropTable("EmailSchedules");
    await queryInterface.dropTable("EmailCampaigns");
    await queryInterface.dropTable("EmailContacts");
    await queryInterface.dropTable("EmailTemplates");
  }
};

