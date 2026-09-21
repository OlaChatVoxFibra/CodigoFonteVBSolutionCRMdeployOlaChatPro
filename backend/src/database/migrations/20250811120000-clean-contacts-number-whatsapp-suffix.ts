/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Remove sufixos "@s.whatsapp.net" e "@g.us" do campo number em Contacts
    try {
      await queryInterface.sequelize.query(`
        UPDATE "Contacts"
        SET "number" = split_part("number", '@', 1)
        WHERE "number" LIKE '%@s.whatsapp.net' OR "number" LIKE '%@g.us';
      `);
    } catch (error) {
      // Não interrompe o fluxo de migrations caso ocorra erro aqui
      // Ex.: colunas/valores inexistentes em alguns ambientes
      // console.warn(
      //   '[Migration clean-contacts-number-whatsapp-suffix] Erro ao atualizar Contacts.number. Prosseguindo sem interromper as demais migrations.',
      //   error
      // );
    }
  },

  down: async () => {
    // Migração irreversível: não é possível restaurar os sufixos removidos
    return Promise.resolve();
  }
};


