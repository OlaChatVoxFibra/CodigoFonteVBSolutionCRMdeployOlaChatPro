/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn('Whatsapps', 'collectiveVacationMessage', {
      type: DataTypes.TEXT,
    })
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.changeColumn('Whatsapps', 'collectiveVacationMessage', {
      type: DataTypes.STRING,
    })
  }
};

