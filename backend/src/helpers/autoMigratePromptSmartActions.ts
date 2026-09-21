/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Auto-migrator runtime defensivo para PromptSmartActions (PR 16).
 *
 * Garante as colunas opcionais que dão suporte à aba "Ações" Apple-style:
 *   - `enabled` (BOOLEAN DEFAULT true)
 *   - `agentTriggerPatterns` (JSONB)
 *   - `userTriggerPatterns` (JSONB)
 *   - `intentSlotSchema` (JSONB)
 *
 * Se a coluna não puder ser criada, faz `removeAttribute` no model em runtime
 * para evitar SELECTs quebrarem.
 *
 * Idempotente e silencioso em caso de erro.
 */

import sequelize from "../database";
import PromptSmartAction from "../models/PromptSmartAction";
import logger from "../utils/logger";

type ColumnSpec = { name: string; sql: string };

const ACTION_COLUMNS: ColumnSpec[] = [
  { name: "enabled", sql: "BOOLEAN NULL DEFAULT TRUE" },
  { name: "agentTriggerPatterns", sql: "JSONB" },
  { name: "userTriggerPatterns", sql: "JSONB" },
  { name: "intentSlotSchema", sql: "JSONB" }
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

function safeRemoveAttribute(model: any, attr: string): void {
  try {
    if (typeof model?.removeAttribute === "function") {
      model.removeAttribute(attr);
    }
  } catch {
    /* ignore */
  }
}

export async function autoMigratePromptSmartActions(): Promise<void> {
  const table = "PromptSmartActions";
  const exists = await tableExists(table);
  if (!exists) {
    logger.warn("[autoMigratePromptSmartActions] tabela PromptSmartActions ausente — removendo atributos opcionais do model");
    for (const c of ACTION_COLUMNS) safeRemoveAttribute(PromptSmartAction as any, c.name);
    return;
  }

  const cols = await getColumns(table);
  const added: string[] = [];
  const missing: string[] = [];
  for (const c of ACTION_COLUMNS) {
    if (cols.has(c.name)) continue;
    try {
      await sequelize.query(
        `ALTER TABLE ${quoteIdent(table)} ADD COLUMN IF NOT EXISTS ${quoteIdent(c.name)} ${c.sql}`
      );
      added.push(c.name);
    } catch (e: any) {
      missing.push(c.name);
      logger.warn(
        `[autoMigratePromptSmartActions] addColumn ${c.name} falhou: ${e?.message || e}`
      );
    }
  }
  if (added.length) {
    logger.info(`[autoMigratePromptSmartActions] colunas adicionadas: ${added.join(", ")}`);
  }
  if (missing.length) {
    logger.warn(
      `[autoMigratePromptSmartActions] colunas FALTANDO: ${missing.join(", ")} — removendo do model em runtime`
    );
    for (const name of missing) safeRemoveAttribute(PromptSmartAction as any, name);
  }
}
