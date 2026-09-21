/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 *
 * Intercepta a API no modo DEV_NO_DB e persiste tudo em localStorage.
 */

import {
  listCollection,
  saveCollection,
  findById,
  createItem,
  updateItem,
  deleteItem,
  paginate,
  readDb,
  writeDb,
} from "./offlineStore";

/** Rotas que continuam no backend (auth JWT offline). */
const NETWORK_PREFIXES = [
  "/auth/login",
  "/auth/refresh_token",
  "/auth/logout",
  "/auth/me",
  "/auth/offline-status",
  "/auth/google",
];

const COLLECTION_MAP = [
  { match: /^\/projects\/?$/i, name: "projects", listKey: "projects" },
  { match: /^\/projects\/(\d+)\/?$/i, name: "projects", id: true },
  { match: /^\/activities\/?$/i, name: "activities", listKey: "activities" },
  { match: /^\/activities\/(\d+)\/?$/i, name: "activities", id: true },
  { match: /^\/leads-sales\/?$/i, name: "leadsSales", listKey: "leads" },
  { match: /^\/leads-sales\/(\d+)\/?$/i, name: "leadsSales", id: true },
  { match: /^\/contacts\/?$/i, name: "contacts", listKey: "contacts" },
  { match: /^\/contacts\/(\d+)\/?$/i, name: "contacts", id: true },
  { match: /^\/tickets\/?$/i, name: "tickets", listKey: "tickets" },
  { match: /^\/tickets\/(\d+)\/?$/i, name: "tickets", id: true },
  { match: /^\/companies\/?$/i, name: "companies", listKey: "companies" },
  { match: /^\/companies\/(\d+)\/?$/i, name: "companies", id: true },
  { match: /^\/tags\/?$/i, name: "tags", listKey: "tags" },
  { match: /^\/tags\/(\d+)\/?$/i, name: "tags", id: true },
  { match: /^\/queue\/?$/i, name: "queues", listKey: "queues" },
  { match: /^\/queue\/(\d+)\/?$/i, name: "queues", id: true },
  { match: /^\/inventory\/?$/i, name: "inventory", listKey: "items" },
  { match: /^\/inventory\/(\d+)\/?$/i, name: "inventory", id: true },
  { match: /^\/schedules\/?$/i, name: "schedules", listKey: "schedules" },
  { match: /^\/schedules\/(\d+)\/?$/i, name: "schedules", id: true },
  { match: /^\/quick-messages\/?$/i, name: "quickMessages", listKey: "records" },
  { match: /^\/announcements\/?$/i, name: "announcements", listKey: "records" },
  { match: /^\/converted-leads\/?$/i, name: "convertedLeads", listKey: "leads" },
];

function normalizePath(url = "") {
  try {
    if (url.startsWith("http")) {
      const u = new URL(url);
      return u.pathname.replace(/\/+$/, "") || "/";
    }
  } catch {
    /* ignore */
  }
  const path = String(url).split("?")[0];
  return path.replace(/\/+$/, "") || "/";
}

function shouldUseNetwork(path) {
  return NETWORK_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/") || path.startsWith(p)
  );
}

function getParams(config) {
  const params = { ...(config.params || {}) };
  try {
    if (config.url && config.url.includes("?")) {
      const qs = config.url.split("?")[1];
      new URLSearchParams(qs).forEach((v, k) => {
        if (params[k] == null) params[k] = v;
      });
    }
  } catch {
    /* ignore */
  }
  return params;
}

function parseBody(config) {
  if (config.data == null) return {};
  if (typeof config.data === "string") {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data;
}

function listResponse(listKey, items, params) {
  const { rows, count, hasMore } = paginate(items, params);
  return {
    [listKey]: rows,
    count,
    hasMore,
    // aliases comuns
    records: rows,
    data: rows,
  };
}

function handleUsers(method, path, params, body) {
  if (method === "get" && /^\/users\/?$/i.test(path)) {
    const items = listCollection("users");
    const { rows, count, hasMore } = paginate(items, params);
    return { users: rows, count, hasMore };
  }
  if (method === "get") {
    const m = path.match(/^\/users\/(\d+)\/?$/i);
    if (m) return findById("users", m[1]) || listCollection("users")[0];
  }
  return null;
}

function handleSpecial(method, path, params, body) {
  // Plano da empresa — todos os módulos liberados no modo local
  if (method === "get" && /^\/companies\/listPlan\/\d+\/?$/i.test(path)) {
    const plan = {
      id: 1,
      name: "Local Dev Unlimited",
      users: 999999,
      connections: 999999,
      queues: 999999,
      amount: "0",
      trial: false,
      trialDays: 0,
      recurrence: "ANUAL",
      useWhatsapp: true,
      useFacebook: true,
      useInstagram: true,
      useCampaigns: true,
      useSchedules: true,
      useInternalChat: true,
      useExternalApi: true,
      useKanban: true,
      useOpenAi: true,
      useIntegrations: true,
      useWhatsappOfficial: true,
      wavoip: true,
      isPublic: false,
    };
    return {
      id: 1,
      name: "VB Solution Local",
      email: "admin@local.dev",
      status: true,
      dueDate: "2999-12-31T00:00:00.000Z",
      recurrence: "ANUAL",
      planId: 1,
      plan,
      allowOrgManualVisualIdentity: true,
    };
  }

  // WhatsApp connections
  if (method === "get" && /^\/whatsapp\/?$/i.test(path)) {
    return listCollection("whatsapps");
  }

  // Integrações do hub Connections (respostas vazias seguras)
  if (method === "get" && /^\/settings\/agent_integration\/?$/i.test(path)) {
    return { key: "agent_integration", value: null };
  }
  if (method === "get" && /^\/anthropic\/integration\/?$/i.test(path)) {
    return { enabled: false, apiKey: { hasKey: false }, defaultModel: null };
  }
  if (method === "get" && /^\/gemini\/integration\/?$/i.test(path)) {
    return { enabled: false, apiKey: { hasKey: false }, defaultModel: null };
  }
  if (method === "get" && /^\/integrations\/figma\/?$/i.test(path)) {
    return { status: "disconnected", credential: { hasKey: false } };
  }
  if (method === "get" && /^\/integrations\/github\/?$/i.test(path)) {
    return { status: "disconnected", credential: { hasKey: false }, githubAccount: null };
  }
  if (method === "get" && /^\/smtp-configs\/?$/i.test(path)) {
    return { items: [], count: 0 };
  }
  if (method === "get" && /^\/platform-api-credentials\/?$/i.test(path)) {
    return [];
  }

  // Settings
  if (method === "get" && /^\/settings\/?$/i.test(path)) {
    return listCollection("settings");
  }
  // Valor público de setting (string | null) — NÃO devolver objeto genérico
  if (method === "get" && /^\/public-settings\//i.test(path)) {
    return null;
  }
  if (method === "get" && /^\/setting\//i.test(path)) {
    return null;
  }
  if (method === "get" && /^\/settings\/public\//i.test(path)) {
    return null;
  }

  // Activity stages — formato { key, label, color } exigido pelo Kanban
  if (method === "get" && /^\/activity-stages\/?$/i.test(path)) {
    const stages = listCollection("activityStages");
    return (stages || []).map((s, idx) => ({
      key: s.key || s.id || `stage_${idx}`,
      label: s.label || s.name || String(s.key || s.id || `Etapa ${idx + 1}`),
      color: s.color || "#4B5563",
      order: s.order != null ? s.order : idx,
      id: s.id != null ? s.id : idx + 1,
    }));
  }
  if (method === "put" && /^\/activity-stages\/bulk\/?$/i.test(path)) {
    const stages = Array.isArray(body) ? body : body?.stages || [];
    const normalized = stages.map((s, idx) => ({
      key: s.key || s.id || `stage_${idx}`,
      label: s.label || s.name || `Etapa ${idx + 1}`,
      color: s.color || "#4B5563",
      order: s.order != null ? s.order : idx,
      id: s.id != null ? s.id : idx + 1,
    }));
    saveCollection("activityStages", normalized);
    return normalized;
  }

  // Lead pipelines
  if (method === "get" && /^\/lead-pipelines\/?$/i.test(path)) {
    return listCollection("leadPipelines");
  }
  if (
    (method === "post" || method === "put") &&
    /^\/lead-pipelines\/bulk\/?$/i.test(path)
  ) {
    const pipelines = Array.isArray(body) ? body : body?.pipelines || [];
    saveCollection("leadPipelines", pipelines);
    return pipelines;
  }

  // Leads dashboard
  if (method === "get" && /^\/leads-sales\/dashboard\/?$/i.test(path)) {
    const leads = listCollection("leadsSales");
    return {
      total: leads.length,
      open: leads.filter((l) => l.status !== "won" && l.status !== "lost").length,
      won: leads.filter((l) => l.status === "won").length,
      lost: leads.filter((l) => l.status === "lost").length,
      byStage: [],
    };
  }

  // Contacts list helper
  if (method === "get" && /^\/contacts\/list\/?$/i.test(path)) {
    return listCollection("contacts");
  }

  // Call historical whatsapp
  if (method === "get" && /\/call\/historical\/user\/whatsapp/i.test(path)) {
    return { whatsapp: null };
  }

  // Tickets kanban / counts — empty safe
  if (method === "get" && /^\/tickets\//i.test(path) && !/^\/tickets\/\d+/i.test(path)) {
    return { tickets: [], count: 0, hasMore: false };
  }

  // Messages / chats — empty
  if (method === "get" && (/\/messages/i.test(path) || /\/chats/i.test(path))) {
    return { messages: [], records: [], count: 0, hasMore: false };
  }

  // Version / helps / misc GETs
  if (method === "get" && (/\/version/i.test(path) || /\/helps/i.test(path))) {
    return [];
  }

  // Birthday / aniversários
  if (method === "get" && /^\/birthdays\/today\/?$/i.test(path)) {
    return { status: "success", data: { users: [], contacts: [], settings: null } };
  }
  if (method === "get" && /^\/birthdays\/settings\/?$/i.test(path)) {
    return {
      status: "success",
      data: {
        userBirthdayEnabled: false,
        contactBirthdayEnabled: false,
        userBirthdayMessage: "",
        contactBirthdayMessage: "",
        sendBirthdayTime: "09:00:00",
        createAnnouncementForUsers: false,
        whatsappId: null,
      },
    };
  }
  if (method === "get" && /birthday/i.test(path)) {
    return { contacts: [], settings: {}, status: "success", data: { users: [], contacts: [] } };
  }

  // Dashboards
  if (method === "get" && (/\/dashboard/i.test(path) || /\/statistics/i.test(path))) {
    return {
      counters: {},
      tickets: [],
      attendants: [],
      labels: [],
      series: [],
    };
  }

  // Announcements
  if (method === "get" && /announcement/i.test(path)) {
    return { records: [], count: 0, hasMore: false };
  }
  if (method === "post" && /announcement/i.test(path)) {
    return { message: "ok" };
  }
  if (method === "delete" && /announcement/i.test(path)) {
    return { message: "ok" };
  }

  // Files
  if (method === "get" && /^\/files\/?$/i.test(path)) {
    return { files: listCollection("files"), count: 0, hasMore: false };
  }

  // Campaigns empty
  if (method === "get" && /campaign/i.test(path)) {
    return { records: [], campaigns: [], count: 0, hasMore: false };
  }

  // Prompts / flows empty lists
  if (method === "get" && (/\/prompt/i.test(path) || /\/flow/i.test(path))) {
    return { records: [], prompts: [], flows: [], count: 0, hasMore: false };
  }

  // Email
  if (method === "get" && /\/email/i.test(path)) {
    return { templates: [], contacts: [], campaigns: [], count: 0, hasMore: false };
  }

  const users = handleUsers(method, path, params, body);
  if (users !== null) return users;

  return undefined; // not special
}

function handleCollectionRoute(method, path, params, body) {
  for (const route of COLLECTION_MAP) {
    const m = path.match(route.match);
    if (!m) continue;

    if (route.id) {
      const id = m[1];
      if (method === "get") {
        return findById(route.name, id) || { id: Number(id), name: "Item local" };
      }
      if (method === "put" || method === "patch") {
        const updated = updateItem(route.name, id, body);
        return updated || { ...body, id: Number(id) };
      }
      if (method === "delete") {
        return deleteItem(route.name, id);
      }
      continue;
    }

    // collection root
    if (method === "get") {
      return listResponse(route.listKey, listCollection(route.name), params);
    }
    if (method === "post") {
      // enrich common fields
      const payload = { ...body };
      if (route.name === "projects" && !payload.status) payload.status = "active";
      if (route.name === "projects" && !payload.name && payload.title) {
        payload.name = payload.title;
      }
      if (route.name === "activities" && !payload.status) payload.status = "todo";
      if (route.name === "leadsSales" && !payload.status) payload.status = "open";
      if (route.name === "contacts" && !payload.name) {
        payload.name = payload.email || "Contato local";
      }
      return createItem(route.name, payload);
    }
  }
  return undefined;
}

export function isOfflineNetworkPath(url = "") {
  const path = normalizePath(url);
  return shouldUseNetwork(path);
}

/**
 * Resolve um request axios no modo offline.
 * @returns {any|undefined} body de resposta; undefined = deixar seguir na rede
 */
export function resolveOfflineRequest(config) {
  const method = String(config.method || "get").toLowerCase();
  const path = normalizePath(config.url || "");
  const params = getParams(config);
  const body = parseBody(config);

  if (shouldUseNetwork(path)) {
    return undefined;
  }

  // Socket / upload binaries — empty ok
  if (method === "get" || method === "post" || method === "put" || method === "patch" || method === "delete") {
    const special = handleSpecial(method, path, params, body);
    if (special !== undefined) return special;

    const coll = handleCollectionRoute(method, path, params, body);
    if (coll !== undefined) return coll;
  }

  // Fallback genérico: não quebra a UI
  if (method === "get") {
    return { records: [], count: 0, hasMore: false, data: [], items: [] };
  }
  if (method === "post") {
    return createItem("_misc", { path, ...body });
  }
  if (method === "put" || method === "patch") {
    return { ...body, updatedAt: new Date().toISOString() };
  }
  if (method === "delete") {
    return { message: "ok" };
  }
  return {};
}

export function buildAxiosAdapterResponse(config, data) {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    config,
    request: {},
  };
}

export default {
  resolveOfflineRequest,
  buildAxiosAdapterResponse,
};
