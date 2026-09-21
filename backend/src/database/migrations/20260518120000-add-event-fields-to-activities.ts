/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface, DataTypes } from "sequelize";

type ColumnSpec = Parameters<QueryInterface["addColumn"]>[2];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = "Activities";
    const add = async (name: string, spec: ColumnSpec) => {
      try {
        await queryInterface.addColumn(table, name, spec);
      } catch (err: any) {
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("already exists") || msg.includes("duplicate column")) {
          return;
        }
        throw err;
      }
    };

    await add("location", { type: DataTypes.STRING, allowNull: true });
    await add("address", { type: DataTypes.STRING, allowNull: true });
    await add("phone", { type: DataTypes.STRING, allowNull: true });
    await add("link", { type: DataTypes.STRING, allowNull: true });
    await add("eventColor", { type: DataTypes.STRING, allowNull: true });
  },

  down: async (queryInterface: QueryInterface) => {
    const table = "Activities";
    for (const col of ["eventColor", "link", "phone", "address", "location"]) {
      try {
        await queryInterface.removeColumn(table, col);
      } catch {
        // ignore
      }
    }
  }
};
