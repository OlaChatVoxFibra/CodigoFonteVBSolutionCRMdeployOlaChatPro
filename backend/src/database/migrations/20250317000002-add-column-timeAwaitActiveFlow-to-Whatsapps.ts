/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";
// Adicionar a coluna flowBuilderId na tabela Whatsapp

module.exports = {

  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Whatsapps", "timeAwaitActiveFlow", {
      type: DataTypes.INTEGER,
      allowNull: true
    });
  },

  down: (queryInterface: QueryInterface) => {
    queryInterface.removeColumn("Whatsapps", "timeAwaitActiveFlow");
  }

}
