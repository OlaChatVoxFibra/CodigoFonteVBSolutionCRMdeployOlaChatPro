/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addConstraint("Tickets", ["id", "contactId", "companyId", "whatsappId"], {
      type: "unique",
      name: "contactid_companyid_whatsappid_unique"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeConstraint(
      "Tickets",
      "contactid_companyid_whatsappid_unique"
    );
  }
};
