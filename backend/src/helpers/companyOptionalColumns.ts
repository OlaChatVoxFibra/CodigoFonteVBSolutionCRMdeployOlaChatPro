/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../database";

export type CompanyOptionalColumns = {
  signupMetadata: boolean;
  whiteLabelHostDomain: boolean;
  allowOrgManualVisualIdentity: boolean;
  stripeProductKey: boolean;
};

let cache: CompanyOptionalColumns | null = null;

function tableHasColumn(
  columnKeys: string[],
  ...candidates: string[]
): boolean {
  const lower = columnKeys.map((k) => k.toLowerCase());
  for (const c of candidates) {
    if (lower.includes(c.toLowerCase())) return true;
  }
  return false;
}

async function describeCompaniesTable(): Promise<Record<string, unknown>> {
  const qi = sequelize.getQueryInterface();
  for (const name of ["Companies", "companies"]) {
    try {
      const desc = await qi.describeTable(name);
      if (desc && Object.keys(desc).length) {
        return desc as Record<string, unknown>;
      }
    } catch {
      /* tenta próximo nome */
    }
  }
  return {};
}

/**
 * Colunas opcionais (migrations incrementais). Usa describeTable no schema real —
 * information_schema no Postgres costuma divergir de nomes/tabelas e gerava falso positivo.
 */
export async function getCompanyOptionalColumns(): Promise<CompanyOptionalColumns> {
  if (cache) return cache;

  try {
    const dialect = sequelize.getDialect();
    if (dialect !== "postgres") {
      cache = {
        signupMetadata: true,
        whiteLabelHostDomain: true,
        allowOrgManualVisualIdentity: true,
        stripeProductKey: true
      };
      return cache;
    }

    const desc = await describeCompaniesTable();
    const columnKeys = Object.keys(desc || {});

    cache = {
      signupMetadata: tableHasColumn(columnKeys, "signupMetadata"),
      whiteLabelHostDomain: tableHasColumn(columnKeys, "whiteLabelHostDomain"),
      allowOrgManualVisualIdentity: tableHasColumn(
        columnKeys,
        "allowOrgManualVisualIdentity"
      ),
      stripeProductKey: tableHasColumn(columnKeys, "stripeProductKey")
    };
    return cache;
  } catch {
    cache = {
      signupMetadata: false,
      whiteLabelHostDomain: false,
      allowOrgManualVisualIdentity: false,
      stripeProductKey: false
    };
    return cache;
  }
}

/** Para testes ou após migrations manuais */
export function resetCompanyOptionalColumnsCache(): void {
  cache = null;
}

/** Include de Company em ShowUserService / auth — nunca pedir colunas que o PG não tem. */
export async function getCompanyAttributesForUserInclude(): Promise<string[]> {
  const cols = await getCompanyOptionalColumns();
  const attrs = ["id", "name", "dueDate", "document", "recurrence"];
  if (cols.allowOrgManualVisualIdentity) {
    attrs.push("allowOrgManualVisualIdentity");
  }
  if (cols.whiteLabelHostDomain) {
    attrs.push("whiteLabelHostDomain");
  }
  if (cols.signupMetadata) {
    attrs.push("signupMetadata");
  }
  return attrs;
}

/** Company.findByPk no fluxo de tema público (GetPublicSettingService). */
export async function getCompanyAttributesForPublicThemeResolve(): Promise<string[]> {
  const cols = await getCompanyOptionalColumns();
  const attrs = ["id"];
  if (cols.allowOrgManualVisualIdentity) {
    attrs.push("allowOrgManualVisualIdentity");
  }
  if (cols.whiteLabelHostDomain) {
    attrs.push("whiteLabelHostDomain");
  }
  if (cols.signupMetadata) {
    attrs.push("signupMetadata");
  }
  return attrs;
}
