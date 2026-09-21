/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../database";
import Prompt from "../models/Prompt";

type PromptOptionalColumns = {
  cargo: boolean;
  cerebro: boolean;
  produtividade: boolean;
  midias: boolean;
};

async function getPromptOptionalColumns(): Promise<PromptOptionalColumns> {
  try {
    const [rows] = (await sequelize.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name = 'Prompts' OR table_name = 'prompts')
        AND column_name IN ('cargo', 'cerebro', 'produtividade', 'midias')
      `
    )) as [Array<{ column_name: string }>, unknown];

    const names = new Set(rows.map((r) => String(r.column_name || "").toLowerCase()));
    return {
      cargo: names.has("cargo"),
      cerebro: names.has("cerebro"),
      produtividade: names.has("produtividade"),
      midias: names.has("midias")
    };
  } catch {
    return {
      cargo: false,
      cerebro: false,
      produtividade: false,
      midias: false
    };
  }
}

/**
 * Alinha o model Prompt para bancos antigos que ainda não possuem
 * colunas JSON opcionais (cargo/cerebro/produtividade/midias).
 */
export async function alignPromptModelToDatabase(): Promise<void> {
  const cols = await getPromptOptionalColumns();
  const M = Prompt as unknown as { removeAttribute?: (k: string) => void };
  if (typeof M.removeAttribute !== "function") return;

  if (!cols.cargo) {
    try {
      M.removeAttribute("cargo");
    } catch {
      /* ignore */
    }
  }
  if (!cols.cerebro) {
    try {
      M.removeAttribute("cerebro");
    } catch {
      /* ignore */
    }
  }
  if (!cols.produtividade) {
    try {
      M.removeAttribute("produtividade");
    } catch {
      /* ignore */
    }
  }
  if (!cols.midias) {
    try {
      M.removeAttribute("midias");
    } catch {
      /* ignore */
    }
  }
}
