/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.renameColumn("Whatsapps", "default", "isDefault");
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.renameColumn("Whatsapps", "isDefault", "default");
  }
};
