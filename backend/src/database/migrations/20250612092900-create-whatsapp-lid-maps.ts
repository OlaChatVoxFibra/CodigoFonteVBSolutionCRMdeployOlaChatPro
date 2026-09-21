/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface
      .createTable("WhatsappLidMaps", {
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true
        },
        lid: {
          type: DataTypes.STRING,
          allowNull: false
        },
        companyId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        contactId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: "Contacts",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      })
      .then(() => queryInterface.addIndex("WhatsappLidMaps", ["lid"]))
      .then(() => queryInterface.addIndex("WhatsappLidMaps", ["companyId"]))
      .then(() =>
        queryInterface.addConstraint("WhatsappLidMaps", {
          fields: ["lid", "companyId"],
          type: "unique",
          name: "unique_lid_companyId"
        } as any)
      );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("WhatsappLidMaps");
  }
};
