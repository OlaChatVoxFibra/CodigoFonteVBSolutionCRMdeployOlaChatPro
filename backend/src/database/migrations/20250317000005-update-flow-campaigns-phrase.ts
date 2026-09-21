/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// database/migrations/YYYYMMDDHHMMSS-update-flow-campaigns-phrase.ts
import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Alterar o tipo da coluna phrase de STRING para TEXT
    // para suportar JSON maiores com múltiplas frases
    await queryInterface.changeColumn('FlowCampaigns', 'phrase', {
      type: DataTypes.TEXT,
      allowNull: false
    });

    console.log('Migração executada: Campo phrase atualizado para TEXT');
  },

  down: async (queryInterface: QueryInterface) => {
    // Reverter para STRING (pode causar perda de dados se houver JSONs muito grandes)
    await queryInterface.changeColumn('FlowCampaigns', 'phrase', {
      type: DataTypes.STRING,
      allowNull: false
    });

    console.log('Migração revertida: Campo phrase voltou para STRING');
  }
};