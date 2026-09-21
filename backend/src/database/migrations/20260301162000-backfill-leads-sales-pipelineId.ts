/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Para cada empresa, define pipelineId dos leads antigos (NULL) para a primeira pipeline (menor id)
    await queryInterface.sequelize.query(`
      UPDATE "leads_sales" l
      SET "pipelineId" = sub.min_id
      FROM (
        SELECT "companyId", MIN(id) AS min_id
        FROM "LeadPipelines"
        GROUP BY "companyId"
      ) sub
      WHERE l."companyId" = sub."companyId"
        AND l."pipelineId" IS NULL
    `);
  },

  down: async (_queryInterface: QueryInterface) => {
    // não desfaz (safe)
  }
};

