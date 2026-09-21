/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Company from "../models/Company";
import { getCompanyOptionalColumns } from "./companyOptionalColumns";

/**
 * Se a migration 20260407000000 ainda não rodou, o modelo Sequelize referencia colunas
 * que não existem no PostgreSQL e qualquer SELECT em Companies falha.
 * Remove os atributos do modelo para alinhar ao schema real até as colunas existirem.
 */
export async function alignCompanyModelToDatabase(): Promise<void> {
  const cols = await getCompanyOptionalColumns();
  const M = Company as unknown as { removeAttribute?: (k: string) => void };
  if (typeof M.removeAttribute !== "function") return;
  if (!cols.signupMetadata) {
    try {
      M.removeAttribute("signupMetadata");
    } catch {
      /* ignore */
    }
  }
  if (!cols.whiteLabelHostDomain) {
    try {
      M.removeAttribute("whiteLabelHostDomain");
    } catch {
      /* ignore */
    }
  }
  if (!cols.allowOrgManualVisualIdentity) {
    try {
      M.removeAttribute("allowOrgManualVisualIdentity");
    } catch {
      /* ignore */
    }
  }
}
