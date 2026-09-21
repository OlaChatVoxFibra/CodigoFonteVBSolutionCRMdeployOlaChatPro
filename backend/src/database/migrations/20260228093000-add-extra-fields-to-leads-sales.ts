/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table: any = await queryInterface.describeTable("leads_sales").catch(() => ({}));
    const safeAdd = async (col: string, def: any) => {
      try {
        if (!table || !(table as any)[col]) {
          await queryInterface.addColumn("leads_sales", col, def);
        }
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (!/already exists/i.test(msg)) {
          throw e;
        }
      }
    };
    await safeAdd("site", { type: DataTypes.STRING, allowNull: true });
    await safeAdd("origin", { type: DataTypes.STRING, allowNull: true });
    await safeAdd("document", { type: DataTypes.STRING, allowNull: true, comment: "CPF/CNPJ" });
    await safeAdd("birthDate", { type: DataTypes.DATE, allowNull: true });
    await safeAdd("address", { type: DataTypes.JSON, allowNull: true });
  },

  down: async (queryInterface: QueryInterface) => {
    const table: any = await queryInterface.describeTable("leads_sales").catch(() => ({}));
    const safeRemove = async (col: string) => {
      try {
        if (table && (table as any)[col]) {
          await queryInterface.removeColumn("leads_sales", col);
        }
      } catch {
        // no-op
      }
    };
    await safeRemove("address");
    await safeRemove("birthDate");
    await safeRemove("document");
    await safeRemove("origin");
    await safeRemove("site");
  }
};

