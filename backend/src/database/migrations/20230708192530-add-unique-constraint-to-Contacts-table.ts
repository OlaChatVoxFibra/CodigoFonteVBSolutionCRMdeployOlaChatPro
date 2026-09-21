/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addConstraint("Contacts", ["number", "companyId"], {
      type: "unique",
      name: "number_companyid_unique"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeConstraint(
      "Contacts",
      "number_companyid_unique"
    );
  }
};
