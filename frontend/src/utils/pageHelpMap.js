/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Mapeia rotas do sistema para tópicos de ajuda (?).
 * Rotas dinâmicas usam match por prefixo.
 */
export const PAGE_HELP_TOPICS = {
  "/connections": "connections",
  "/queues": "queues",
  "/contacts": "contacts",
  "/contacts/import": "contactsImport",
  "/quick-messages": "quickMessages",
  "/schedules": "schedules",
  "/tags": "tags",
  "/users": "users",
  "/settings": "settings",
  "/api": "api",
  "/reports": "reports",
  "/relatorio-vendas": "relatorioVendas",
  "/integrations": "integrations",
  "/queue-integration": "integrations",
  "/announcements": "announcements",
  "/chats": "chats",
  "/files": "files",
  "/moments": "moments",
  "/Kanban": "kanban",
  "/TagsKanban": "tagsKanban",
  "/prompts": "prompts",
  "/allConnections": "allConnections",
  "/phrase-lists": "phraseLists",
  "/flowbuilders": "flowbuilders",
  "/flowbuilder": "flowbuilder",
  "/activities": "activities",
  "/whatsapp-dashboard": "whatsappDashboard",
  "/leads-convertidos": "leadsConvertidos",
  "/projects": "projects",
  "/leads-sales": "leadsSales",
  "/inventory": "inventory",
  "/arquivos": "arquivos",
  "/email": "email",
  "/call-historicals": "callHistoricals",
  "/wallets": "wallets",
  "/helps": "helps",
  "/todolist": "todolist",
  "/companies": "companies",
  "/financeiro": "financeiro",
  "/financeiro-aberto": "financeiro",
  "/platform-api": "platform_api",
  "/birthday-settings": "birthdaySettings",
  "/contact-lists": "contactLists",
  "/campaigns": "campaigns",
  "/campaign-meta-templates": "whatsappApiOficial",
  "/campaigns-config": "campaignsConfig",
  "/ai-brain": "aiBrain",
};

const PREFIX_TOPICS = [
  ["/prompts/create", "promptsAgent"],
  ["/campaign/", "campaignReport"],
  ["/contact-lists/", "contactListItems"],
  ["/flowbuilder/", "flowbuilder"],
  ["/chats/", "chats"],
];

const NO_HELP_PREFIXES = [
  "/login",
  "/signup",
  "/register",
  "/cadastro-gratis",
  "/white-label",
  "/payment",
  "/reset-password",
  "/tickets",
];

export function getHelpTopicForPath(pathname = "") {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  if (NO_HELP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return null;
  }
  if (PAGE_HELP_TOPICS[path]) return PAGE_HELP_TOPICS[path];
  for (const [prefix, topic] of PREFIX_TOPICS) {
    if (path.startsWith(prefix)) return topic;
  }
  return null;
}

/** Páginas com ? na navbar interna (ActivitiesStyleLayout) — não duplicar na topbar global. */
const LAYOUT_NAVBAR_HELP_PREFIXES = [
  "/leads-sales",
  "/activities",
  "/projects",
  "/connections",
  "/queues",
  "/prompts",
  "/schedules",
  "/contacts",
  "/reports",
  "/whatsapp-dashboard",
  "/leads-convertidos",
  "/inventory",
  "/campaigns",
  "/campaign-meta-templates",
  "/email",
  "/flowbuilder",
  "/flowbuilders",
  "/queue-integration",
  "/settings",
  "/quick-messages",
  "/messages-api",
  "/chat",
  "/ai-brain",
];

export function usesLayoutNavbarHelp(pathname = "") {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  return LAYOUT_NAVBAR_HELP_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );
}
