/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Contacts", "lid", {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Linked Device ID para unificar contatos multi-dispositivo"
    });

    await queryInterface.addIndex("Contacts", ["lid", "companyId"], {
      name: "contacts_lid_company_idx"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("Contacts", "contacts_lid_company_idx");
    await queryInterface.removeColumn("Contacts", "lid");
  }
};
