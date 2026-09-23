/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../database";
import { alignCompanyModelToDatabase } from "../helpers/alignCompanyModelToDatabase";
import { alignPromptModelToDatabase } from "../helpers/alignPromptModelToDatabase";
import { autoMigrateAttendanceFlow } from "../helpers/autoMigrateAttendanceFlow";
import { autoMigratePromptSmartActions } from "../helpers/autoMigratePromptSmartActions";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timeout after ${ms}ms`));
    }, ms);

    promise
      .then((value) => resolve(value))
      .catch((err) => reject(err))
      .finally(() => clearTimeout(timer));
  });
}

export async function alignUserModelToDatabase(): Promise<void> {
  try {
    const qi = sequelize.getQueryInterface();
    const table: any = await qi.describeTable("Users").catch(() => null);
    if (!table) return;

    if (!table.finalizacaoComValorVendaAtiva) {
      await qi.addColumn("Users", "finalizacaoComValorVendaAtiva", {
        type: (sequelize.Sequelize as any).BOOLEAN,
        allowNull: true,
        defaultValue: false
      }).catch(() => {});
    }
    if (!table.ticketVisibility) {
      await qi.addColumn("Users", "ticketVisibility", {
        type: (sequelize.Sequelize as any).STRING,
        allowNull: true,
        defaultValue: "own_only"
      }).catch(() => {});
    }
    if (!table.allowGroup) {
      await qi.addColumn("Users", "allowGroup", {
        type: (sequelize.Sequelize as any).BOOLEAN,
        allowNull: true,
        defaultValue: false
      }).catch(() => {});
    }
    if (!table.allHistoric) {
      await qi.addColumn("Users", "allHistoric", {
        type: (sequelize.Sequelize as any).STRING,
        allowNull: true,
        defaultValue: "disabled"
      }).catch(() => {});
    }
    if (!table.allUserChat) {
      await qi.addColumn("Users", "allUserChat", {
        type: (sequelize.Sequelize as any).STRING,
        allowNull: true,
        defaultValue: "disabled"
      }).catch(() => {});
    }
    if (!table.userClosePendingTicket) {
      await qi.addColumn("Users", "userClosePendingTicket", {
        type: (sequelize.Sequelize as any).STRING,
        allowNull: true,
        defaultValue: "enabled"
      }).catch(() => {});
    }
    if (!table.showDashboard) {
      await qi.addColumn("Users", "showDashboard", {
        type: (sequelize.Sequelize as any).STRING,
        allowNull: true,
        defaultValue: "disabled"
      }).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

export async function ensureDatabase(): Promise<void> {
  try {
    await withTimeout(
      Promise.resolve(sequelize.query("SELECT 1")),
      7000,
      "ensureDatabase SELECT 1"
    );
  } catch {
    /* ignore */
  }
  try {
    await withTimeout(
      alignCompanyModelToDatabase(),
      7000,
      "ensureDatabase alignCompanyModelToDatabase"
    );
  } catch {
    /* ignore */
  }
  try {
    await withTimeout(
      alignUserModelToDatabase(),
      7000,
      "ensureDatabase alignUserModelToDatabase"
    );
  } catch {
    /* ignore */
  }
  try {
    await withTimeout(
      alignPromptModelToDatabase(),
      7000,
      "ensureDatabase alignPromptModelToDatabase"
    );
  } catch {
    /* ignore */
  }
  try {
    await withTimeout(
      autoMigrateAttendanceFlow(),
      15000,
      "ensureDatabase autoMigrateAttendanceFlow"
    );
  } catch {
    /* ignore */
  }
  try {
    await withTimeout(
      autoMigratePromptSmartActions(),
      10000,
      "ensureDatabase autoMigratePromptSmartActions"
    );
  } catch {
    /* ignore */
  }
  try {
    await withTimeout(
      (async () => {
        const qi = sequelize.getQueryInterface();
        const table = await qi.describeTable("leads_convertidos");
        const cols = ["phone", "city", "state", "document", "website"];
        for (const col of cols) {
          if (!(table as any)[col]) {
            await qi.addColumn("leads_convertidos", col, { type: "VARCHAR(255)", allowNull: true } as any);
          }
        }
      })(),
      10000,
      "ensureDatabase leads_convertidos extra columns"
    );
  } catch {
    /* ignore */
  }
}
