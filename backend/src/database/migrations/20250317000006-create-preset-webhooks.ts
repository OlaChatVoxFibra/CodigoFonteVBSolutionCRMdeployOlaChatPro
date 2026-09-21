/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/database/migrations/001-create-preset-webhooks.ts
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('PresetWebhooks', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Null para presets do sistema
        references: {
          model: 'Companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      provider: {
        type: DataTypes.STRING,
        allowNull: false
      },
      configuration: {
        type: DataTypes.JSON,
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      isSystem: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Índices para performance e isolamento
    await queryInterface.addIndex('PresetWebhooks', ['companyId']);
    await queryInterface.addIndex('PresetWebhooks', ['provider']);
    await queryInterface.addIndex('PresetWebhooks', ['isActive']);
    await queryInterface.addIndex('PresetWebhooks', ['isSystem']);
    await queryInterface.addIndex('PresetWebhooks', ['companyId', 'isActive']);
    await queryInterface.addIndex('PresetWebhooks', ['companyId', 'provider']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('PresetWebhooks');
  }
};