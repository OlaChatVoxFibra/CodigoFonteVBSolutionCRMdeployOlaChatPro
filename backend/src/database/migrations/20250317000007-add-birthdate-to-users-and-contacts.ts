/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/database/migrations/20250123001-add-birthdate-to-users-and-contacts.ts
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Adicionar birthDate à tabela Users
    await queryInterface.addColumn('Users', 'birthDate', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Data de nascimento do usuário'
    });

    // Adicionar birthDate à tabela Contacts
    await queryInterface.addColumn('Contacts', 'birthDate', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Data de nascimento do contato'
    });

    // Adicionar índices para otimizar consultas de aniversário
    await queryInterface.addIndex('Users', ['birthDate'], {
      name: 'idx_users_birth_date'
    });

    await queryInterface.addIndex('Contacts', ['birthDate'], {
      name: 'idx_contacts_birth_date'
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Remover índices
    await queryInterface.removeIndex('Users', 'idx_users_birth_date');
    await queryInterface.removeIndex('Contacts', 'idx_contacts_birth_date');

    // Remover colunas
    await queryInterface.removeColumn('Users', 'birthDate');
    await queryInterface.removeColumn('Contacts', 'birthDate');
  }
};