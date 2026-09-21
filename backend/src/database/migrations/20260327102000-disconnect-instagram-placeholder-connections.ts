/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Marca como desconectadas conexões "instagram" placeholders antigas
    // (criadas sem instagram_business_account real e reaproveitando pageId).
    // Critérios seguros:
    // - channel = instagram
    // - name = "Instagram" (nome usado no placeholder legado)
    // - existe conexão facebook com mesmo companyId e mesmo facebookPageUserId
    await queryInterface.sequelize.query(`
      UPDATE "Whatsapps" i
      SET "status" = 'DISCONNECTED',
          "updatedAt" = NOW()
      WHERE LOWER(i."channel") = 'instagram'
        AND i."name" = 'Instagram'
        AND EXISTS (
          SELECT 1
          FROM "Whatsapps" f
          WHERE LOWER(f."channel") = 'facebook'
            AND f."companyId" = i."companyId"
            AND f."facebookPageUserId" = i."facebookPageUserId"
        );
    `);
  },

  down: async () => {
    // Sem rollback automático seguro para status anterior.
    return Promise.resolve();
  }
};

