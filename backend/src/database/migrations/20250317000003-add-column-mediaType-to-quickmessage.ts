/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from 'sequelize';

export default {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('QuickMessages', 'mediaType', {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
      comment: 'Tipo de mídia: image, audio, video, document'
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('QuickMessages', 'mediaType');
  }
};