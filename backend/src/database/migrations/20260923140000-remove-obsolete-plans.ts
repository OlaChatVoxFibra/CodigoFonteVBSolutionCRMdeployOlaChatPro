/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

const PLANS_TO_REMOVE = ["Gestão Vendas Pro", "Admin Local Unlimited"];
const FALLBACK_PLAN_NAME = "OlaChat Pro Unlimited";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.transaction(async (t) => {
      // 1. Encontrar o ID do plano fallback
      let [fallbackRows] = (await queryInterface.sequelize.query(
        `SELECT id FROM "Plans" WHERE name = :fallbackName LIMIT 1;`,
        { transaction: t, replacements: { fallbackName: FALLBACK_PLAN_NAME } }
      )) as [{ id: number }[], unknown];

      if (!fallbackRows.length) {
        // Se não encontrar o fallback, buscar qualquer outro plano disponível
        [fallbackRows] = (await queryInterface.sequelize.query(
          `SELECT id FROM "Plans" WHERE name NOT IN (:...plans) ORDER BY id ASC LIMIT 1;`,
          { transaction: t, replacements: { plans: PLANS_TO_REMOVE } }
        )) as [{ id: number }[], unknown];
      }

      const fallbackId = fallbackRows[0]?.id;

      if (fallbackId) {
        // 2. Reatribuir empresas vinculadas aos planos obsoletos para o plano fallback
        await queryInterface.sequelize.query(
          `
          UPDATE "Companies"
          SET "planId" = :fallbackId
          WHERE "planId" IN (
            SELECT id FROM "Plans" WHERE name IN (:...plans)
          );
          `,
          {
            transaction: t,
            replacements: { fallbackId, plans: PLANS_TO_REMOVE }
          }
        );
      }

      // 3. Deletar os planos obsoletos da tabela Plans
      await queryInterface.sequelize.query(
        `DELETE FROM "Plans" WHERE name IN (:...plans);`,
        {
          transaction: t,
          replacements: { plans: PLANS_TO_REMOVE }
        }
      );

      console.log(`[migration] Planos removidos com sucesso: ${PLANS_TO_REMOVE.join(", ")}`);
    });
  },

  down: async (_queryInterface: QueryInterface) => {
    // Operação irreversível ou recreação simples dos planos se necessário
  }
};
