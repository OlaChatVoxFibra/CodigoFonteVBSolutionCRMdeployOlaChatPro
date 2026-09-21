/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Contexto da página onde o Brain.AI está embutido (drawer / composer). */
export function resolveBrainPageContext(context) {
  if (!context) return "general";
  const c = String(context).toLowerCase();
  if (c.includes("lead") || c.includes("venda") || c.includes("sale") || c.includes("convertido")) {
    return "leads";
  }
  if (c.includes("atividade") || c.includes("activit") || c.includes("task")) {
    return "atividades";
  }
  if (c.includes("contato") || c.includes("contact")) {
    return "contatos";
  }
  if (c.includes("projeto") || c.includes("project")) {
    return "projetos";
  }
  if (
    c.includes("template") ||
    c.includes("meta-template") ||
    c.includes("campaign-meta")
  ) {
    return "metaTemplates";
  }
  if (
    c.includes("ticket") ||
    c.includes("atendimento") ||
    c.includes("whatsapp") ||
    c.includes("chat")
  ) {
    return "tickets";
  }
  if (c.includes("conexo") || c.includes("connection") || c.includes("integra")) {
    return "conexoes";
  }
  if (c.includes("dashboard") || c.includes("relatorio") || c.includes("report")) {
    return "dashboard";
  }
  return "general";
}

export const BRAIN_CRM_TAB_LABELS = {
  leads: "Traga Leads de um CRM",
  atividades: "Traga Atividades de um CRM",
  contatos: "Traga Contatos de um CRM",
  projetos: "Traga Projetos de um CRM",
  tickets: "Traga Atendimentos de um CRM",
  conexoes: "Traga Dados de um CRM",
  metaTemplates: "Templates Meta / Campanhas",
  dashboard: "Traga Dados de um CRM",
  general: "Traga Dados de um CRM",
};

export function getBrainCrmTabLabel(context) {
  const key = resolveBrainPageContext(context);
  return BRAIN_CRM_TAB_LABELS[key] || BRAIN_CRM_TAB_LABELS.general;
}

/** Rótulo curto para o botão de ação rápida abaixo do composer. */
export const BRAIN_CRM_QUICK_LABELS = {
  leads: "Traga leads de CRM",
  atividades: "Traga atividades de CRM",
  contatos: "Traga contatos de CRM",
  projetos: "Traga projetos de CRM",
  tickets: "Traga atendimentos de CRM",
  conexoes: "Traga dados de CRM",
  metaTemplates: "Enviar Template Meta",
  dashboard: "Traga dados de CRM",
  general: "Traga dados de CRM",
};

export function getBrainCrmQuickActionLabel(context) {
  const key = resolveBrainPageContext(context);
  return BRAIN_CRM_QUICK_LABELS[key] || BRAIN_CRM_QUICK_LABELS.general;
}
