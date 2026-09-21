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

export async function ensureDatabase(): Promise<void> {
  // Em produção, evitar rodar sequelize-cli via processo externo.
  // Apenas valida a conexão e retorna; migrações devem ser aplicadas pelo pipeline/deploy.
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
    /* ignore: evita derrubar boot se information_schema falhar */
  }
  try {
    await withTimeout(
      alignPromptModelToDatabase(),
      7000,
      "ensureDatabase alignPromptModelToDatabase"
    );
  } catch {
    /* ignore: evita derrubar boot se information_schema falhar */
  }
  try {
    await withTimeout(
      autoMigrateAttendanceFlow(),
      15000,
      "ensureDatabase autoMigrateAttendanceFlow"
    );
  } catch {
    /* ignore: stack do agente IA caí em fallback se faltar coluna/tabela */
  }
  try {
    await withTimeout(
      autoMigratePromptSmartActions(),
      10000,
      "ensureDatabase autoMigratePromptSmartActions"
    );
  } catch {
    /* ignore: aba Ações cai em fallback se colunas semânticas não existirem */
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
