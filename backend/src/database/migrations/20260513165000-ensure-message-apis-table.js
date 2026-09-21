"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


async function tableExists(queryInterface, table) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = :table
      LIMIT 1`,
    { replacements: { table } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function columnExists(queryInterface, table, column) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :table
        AND column_name = :column
      LIMIT 1`,
    { replacements: { table, column } }
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function addColumnIfMissing(queryInterface, table, column, definition) {
  if (!(await tableExists(queryInterface, table))) return;
  if (await columnExists(queryInterface, table, column)) return;
  await queryInterface.addColumn(table, column, definition);
}

async function addIndexIfMissing(queryInterface, table, fields, name, options = {}) {
  if (!(await tableExists(queryInterface, table))) return;
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = :table
        AND indexname = :name
      LIMIT 1`,
    { replacements: { table, name } }
  );
  if (Array.isArray(rows) && rows.length > 0) return;
  await queryInterface.addIndex(table, fields, { name, ...options });
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const T = Sequelize;
    const TABLE = "MessageApis";

    if (!(await tableExists(queryInterface, TABLE))) {
      await queryInterface.createTable(TABLE, {
        id: { type: T.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        companyId: {
          type: T.INTEGER,
          allowNull: false,
          references: { model: "Companies", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        ticketId: {
          type: T.INTEGER,
          allowNull: true,
          references: { model: "Tickets", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        whatsappId: {
          type: T.INTEGER,
          allowNull: true,
          references: { model: "Whatsapps", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        contactId: {
          type: T.INTEGER,
          allowNull: true,
          references: { model: "Contacts", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        number: { type: T.STRING(255), allowNull: false },
        body: { type: T.TEXT, allowNull: true },
        bodyBase64: { type: T.TEXT, allowNull: true },
        userId: {
          type: T.INTEGER,
          allowNull: true,
          references: { model: "Users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        queueId: {
          type: T.INTEGER,
          allowNull: true,
          references: { model: "Queues", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL"
        },
        sendSignature: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
        closeTicket: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
        base64: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
        schedule: { type: T.DATE, allowNull: true },
        isSending: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
        originalName: { type: T.STRING(512), allowNull: true },
        encoding: { type: T.STRING(128), allowNull: true },
        mimeType: { type: T.STRING(255), allowNull: true },
        size: { type: T.STRING(128), allowNull: true },
        destination: { type: T.TEXT, allowNull: true },
        filename: { type: T.STRING(512), allowNull: true },
        path: { type: T.TEXT, allowNull: true },
        buffer: { type: T.TEXT, allowNull: true },
        mediaType: { type: T.STRING(128), allowNull: true },
        mediaUrl: { type: T.TEXT, allowNull: true },
        error: { type: T.TEXT, allowNull: true },
        sentAt: { type: T.DATE, allowNull: true },
        createdAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW },
        updatedAt: { type: T.DATE, allowNull: false, defaultValue: T.NOW }
      });
    } else {
      await addColumnIfMissing(queryInterface, TABLE, "companyId", { type: T.INTEGER, allowNull: false });
      await addColumnIfMissing(queryInterface, TABLE, "ticketId", { type: T.INTEGER, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "whatsappId", { type: T.INTEGER, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "contactId", { type: T.INTEGER, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "number", { type: T.STRING(255), allowNull: false, defaultValue: "" });
      await addColumnIfMissing(queryInterface, TABLE, "body", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "bodyBase64", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "userId", { type: T.INTEGER, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "queueId", { type: T.INTEGER, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "sendSignature", { type: T.BOOLEAN, allowNull: false, defaultValue: false });
      await addColumnIfMissing(queryInterface, TABLE, "closeTicket", { type: T.BOOLEAN, allowNull: false, defaultValue: false });
      await addColumnIfMissing(queryInterface, TABLE, "base64", { type: T.BOOLEAN, allowNull: false, defaultValue: false });
      await addColumnIfMissing(queryInterface, TABLE, "schedule", { type: T.DATE, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "isSending", { type: T.BOOLEAN, allowNull: false, defaultValue: false });
      await addColumnIfMissing(queryInterface, TABLE, "originalName", { type: T.STRING(512), allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "encoding", { type: T.STRING(128), allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "mimeType", { type: T.STRING(255), allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "size", { type: T.STRING(128), allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "destination", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "filename", { type: T.STRING(512), allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "path", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "buffer", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "mediaType", { type: T.STRING(128), allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "mediaUrl", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "error", { type: T.TEXT, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "sentAt", { type: T.DATE, allowNull: true });
      await addColumnIfMissing(queryInterface, TABLE, "createdAt", { type: T.DATE, allowNull: false, defaultValue: T.NOW });
      await addColumnIfMissing(queryInterface, TABLE, "updatedAt", { type: T.DATE, allowNull: false, defaultValue: T.NOW });
    }

    await addIndexIfMissing(
      queryInterface,
      TABLE,
      ["companyId", "whatsappId", "isSending", "error", "schedule"],
      "idx_message_apis_pending_by_whatsapp"
    );
    await addIndexIfMissing(
      queryInterface,
      TABLE,
      ["companyId", "isSending", "schedule"],
      "idx_message_apis_company_schedule"
    );
    await addIndexIfMissing(
      queryInterface,
      TABLE,
      ["ticketId"],
      "idx_message_apis_ticket"
    );
  },

  down: async () => {
    // No-op: tabela operacional de fila API. Não remover dados em rollback automático.
  }
};
