/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes, Sequelize } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'),
      queryInterface.addColumn("Tickets", "uuid", {
        type: DataTypes.UUID,
        allowNull: true,
        //defaultValue: Sequelize.literal('uuid_generate_v4()')
        defaultValue: require('sequelize').UUIDV4,
      })
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Tickets", "uuid");
  }
};
