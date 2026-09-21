/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    // Adicionar nova coluna whatsappIds
    await queryInterface.addColumn('FlowCampaigns', 'whatsappIds', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    // Migrar dados existentes: converter whatsappId único para array
    await queryInterface.sequelize.query(`
      UPDATE "FlowCampaigns" 
      SET "whatsappIds" = CASE 
        WHEN "whatsappId" IS NOT NULL THEN CONCAT('[', "whatsappId", ']')
        ELSE '[]'
      END
      WHERE "whatsappIds" IS NULL
    `);

    // Tornar a coluna obrigatória após migração
    await queryInterface.changeColumn('FlowCampaigns', 'whatsappIds', {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]'
    });

    console.log('✅ Migração concluída: whatsappIds adicionado e dados migrados');
  },

  down: async (queryInterface: QueryInterface) => {
    // Remover coluna whatsappIds
    await queryInterface.removeColumn('FlowCampaigns', 'whatsappIds');
    
    console.log('✅ Rollback concluído: whatsappIds removido');
  }
};