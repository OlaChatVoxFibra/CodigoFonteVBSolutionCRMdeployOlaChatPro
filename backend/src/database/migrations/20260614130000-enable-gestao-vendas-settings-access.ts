/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

const USER_EMAIL = "gestaovendas@gmail.com";

/** Habilita Identidade Visual manual e permissões de configuração completas para a org Gestão Vendas. */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `
      UPDATE "Companies" c
      SET
        "allowOrgManualVisualIdentity" = true,
        "updatedAt" = NOW()
      FROM "Users" u
      WHERE LOWER(u.email) = LOWER(:email)
        AND u."companyId" = c.id;
      `,
      { replacements: { email: USER_EMAIL } }
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `
      UPDATE "Companies" c
      SET
        "allowOrgManualVisualIdentity" = false,
        "updatedAt" = NOW()
      FROM "Users" u
      WHERE LOWER(u.email) = LOWER(:email)
        AND u."companyId" = c.id;
      `,
      { replacements: { email: USER_EMAIL } }
    );
  }
};
