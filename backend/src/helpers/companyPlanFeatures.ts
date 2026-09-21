/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

type CompanyPlanFeatureSource = {
  useWhatsappOfficial?: boolean | null;
  plan?: { useWhatsappOfficial?: boolean | null } | null;
};

/** Plano da org + override em Company (Settings → Assinaturas). */
export function resolveUseWhatsappOfficial(
  company: CompanyPlanFeatureSource | null | undefined
): boolean {
  if (!company) return false;
  if (
    company.useWhatsappOfficial !== null &&
    company.useWhatsappOfficial !== undefined
  ) {
    return Boolean(company.useWhatsappOfficial);
  }
  return Boolean(company.plan?.useWhatsappOfficial);
}
