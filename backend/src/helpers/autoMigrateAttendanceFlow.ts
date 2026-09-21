/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Auto-migrator runtime defensivo para o stack do agente IA (PR 1-3).
 *
 * Roda no boot, ANTES de qualquer request:
 *  - Garante que a tabela `AttendanceFlowDefinitions` existe.
 *  - Garante que as 10 colunas IR existem em `AttendanceFlowSteps`.
 *  - Se o DB ainda não migrou, faz `removeAttribute` no model `AttendanceFlowStep`
 *    para que SELECTs do Sequelize não tentem buscar colunas inexistentes (não quebra
 *    a página de editar agente).
 *
 * Idempotente: pode ser rodado em todo boot, só executa o trabalho que falta.
 * Resiliente: qualquer erro só loga e segue — nunca derruba o servidor.
 */

import sequelize from "../database";
import AttendanceFlowStep from "../models/AttendanceFlowStep";
import AttendanceFlowDefinition from "../models/AttendanceFlowDefinition";
import logger from "../utils/logger";

type ColumnSpec = {
  name: string;
  sql: string;
};

const IR_COLUMNS: ColumnSpec[] = [
  { name: "title", sql: `VARCHAR(255)` },
  { name: "objective", sql: `TEXT` },
  { name: "expectedReply", sql: `VARCHAR(32)` },
  { name: "slotName", sql: `VARCHAR(128)` },
  { name: "slotSchema", sql: `JSONB` },
  { name: "branchesIR", sql: `JSONB` },
  { name: "commandsIR", sql: `JSONB` },
  { name: "customerVisibleText", sql: `TEXT` },
  { name: "trainingMarkers", sql: `JSONB` },
  { name: "version", sql: `INTEGER DEFAULT 1` }
];

async function tableExists(name: string): Promise<boolean> {
  try {
    const [rows] = (await sequelize.query(
      `SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = :t LIMIT 1`,
      { replacements: { t: name } }
    )) as [any[], unknown];
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

async function findFlowStepsTable(): Promise<string | null> {
  try {
    const [rows] = (await sequelize.query(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name ILIKE '%attendance%flow%step%'
        ORDER BY table_name
        LIMIT 1`
    )) as [Array<{ table_name: string }>, unknown];
    return rows && rows[0] ? rows[0].table_name : null;
  } catch {
    return null;
  }
}

async function getColumns(table: string): Promise<Set<string>> {
  try {
    const [rows] = (await sequelize.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = :t`,
      { replacements: { t: table } }
    )) as [Array<{ column_name: string }>, unknown];
    return new Set((rows || []).map((r) => String(r.column_name)));
  } catch {
    return new Set();
  }
}

function quoteIdent(name: string): string {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function ensureIrColumnsOnFlowSteps(): Promise<{
  table: string | null;
  added: string[];
  missing: string[];
}> {
  const table = await findFlowStepsTable();
  if (!table) return { table: null, added: [], missing: IR_COLUMNS.map((c) => c.name) };
  const existing = await getColumns(table);
  const added: string[] = [];
  const missing: string[] = [];
  for (const col of IR_COLUMNS) {
    if (existing.has(col.name)) continue;
    try {
      await sequelize.query(
        `ALTER TABLE ${quoteIdent(table)} ADD COLUMN IF NOT EXISTS ${quoteIdent(
          col.name
        )} ${col.sql}`
      );
      added.push(col.name);
    } catch (e: any) {
      missing.push(col.name);
      logger.warn(
        `[autoMigrateAttendanceFlow] addColumn ${col.name} em ${table} falhou: ${
          e?.message || e
        }`
      );
    }
  }
  return { table, added, missing };
}

async function ensureDefinitionsTable(): Promise<{ created: boolean; ok: boolean }> {
  const exists = await tableExists("AttendanceFlowDefinitions");
  if (exists) {
    /** Tabela existe — apenas garante colunas. */
    const cols = await getColumns("AttendanceFlowDefinitions");
    const wanted: ColumnSpec[] = [
      { name: "entryStepId", sql: `VARCHAR(64)` },
      { name: "fallbackStepId", sql: `VARCHAR(64)` },
      { name: "policy", sql: `JSONB` },
      { name: "compilerVersion", sql: `INTEGER DEFAULT 1` },
      { name: "lastCompiledAt", sql: `TIMESTAMP WITH TIME ZONE` },
      { name: "flowUnderstanding", sql: `JSONB` },
      { name: "flowUnderstandingVersion", sql: `INTEGER DEFAULT 0` },
      { name: "transitionHooks", sql: `JSONB` }
    ];
    for (const w of wanted) {
      if (cols.has(w.name)) continue;
      try {
        await sequelize.query(
          `ALTER TABLE "AttendanceFlowDefinitions" ADD COLUMN IF NOT EXISTS ${quoteIdent(
            w.name
          )} ${w.sql}`
        );
      } catch (e: any) {
        logger.warn(
          `[autoMigrateAttendanceFlow] addColumn ${w.name} em AttendanceFlowDefinitions falhou: ${
            e?.message || e
          }`
        );
      }
    }
    return { created: false, ok: true };
  }
  /** Cria tabela do zero. */
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "AttendanceFlowDefinitions" (
        "id" SERIAL PRIMARY KEY,
        "companyId" INTEGER NOT NULL REFERENCES "Companies"("id") ON UPDATE CASCADE ON DELETE CASCADE,
        "promptId" INTEGER NOT NULL REFERENCES "Prompts"("id") ON UPDATE CASCADE ON DELETE CASCADE,
        "entryStepId" VARCHAR(64) NULL,
        "fallbackStepId" VARCHAR(64) NULL,
        "policy" JSONB NULL,
        "compilerVersion" INTEGER NULL DEFAULT 1,
        "lastCompiledAt" TIMESTAMP WITH TIME ZONE NULL,
        "flowUnderstanding" JSONB NULL,
        "flowUnderstandingVersion" INTEGER NULL DEFAULT 0,
        "transitionHooks" JSONB NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
    try {
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "idx_attendance_flow_definitions_company_prompt"
           ON "AttendanceFlowDefinitions" ("companyId", "promptId")`
      );
    } catch {
      /* ignore */
    }
    return { created: true, ok: true };
  } catch (e: any) {
    logger.warn(
      `[autoMigrateAttendanceFlow] createTable AttendanceFlowDefinitions falhou: ${
        e?.message || e
      }`
    );
    return { created: false, ok: false };
  }
}

function safeRemoveAttribute(model: any, attr: string): void {
  try {
    if (typeof model?.removeAttribute === "function") {
      model.removeAttribute(attr);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Função pública: aplica migrations defensivas + ajusta modelos Sequelize
 * (`removeAttribute`) para colunas que falharam ao criar. Logs verbosos.
 */
export async function autoMigrateAttendanceFlow(): Promise<void> {
  const stepsRes = await ensureIrColumnsOnFlowSteps();
  if (stepsRes.added.length) {
    logger.info(
      `[autoMigrateAttendanceFlow] colunas IR adicionadas em ${stepsRes.table}: ${stepsRes.added.join(
        ", "
      )}`
    );
  }
  if (stepsRes.missing.length) {
    logger.warn(
      `[autoMigrateAttendanceFlow] colunas IR FALTANDO em ${stepsRes.table || "(?)"}: ${stepsRes.missing.join(
        ", "
      )} — removendo attributes do model em runtime`
    );
    for (const name of stepsRes.missing) {
      safeRemoveAttribute(AttendanceFlowStep as any, name);
    }
  }

  const defRes = await ensureDefinitionsTable();
  if (defRes.created) {
    logger.info(`[autoMigrateAttendanceFlow] AttendanceFlowDefinitions criada`);
  }
  if (!defRes.ok) {
    logger.warn(
      `[autoMigrateAttendanceFlow] AttendanceFlowDefinitions não disponível — flow V2 desabilitado em runtime`
    );
    /** Remove TODOS os atributos opcionais para evitar SELECT/UPDATE quebrarem. */
    [
      "entryStepId",
      "fallbackStepId",
      "policy",
      "compilerVersion",
      "lastCompiledAt",
      "flowUnderstanding",
      "flowUnderstandingVersion",
      "transitionHooks"
    ].forEach((a) => safeRemoveAttribute(AttendanceFlowDefinition as any, a));
  }
}
