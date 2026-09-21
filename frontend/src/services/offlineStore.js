/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

const DB_KEY = "vbs_offline_db_v1";

const DEFAULT_ACTIVITY_STAGES = [
  { key: "backlog", label: "Backlog", color: "#4B5563", order: 0 },
  { key: "pending", label: "Pendente", color: "#4B5563", order: 1 },
  { key: "in_progress", label: "Em Progresso", color: "#F97316", order: 2 },
  { key: "completed", label: "Concluído", color: "#10B981", order: 3 },
];

const DEFAULT_LEAD_PIPELINE = {
  id: 1,
  name: "Funil padrão",
  stages: [
    { id: 1, name: "Novo", color: "#64748b", order: 0 },
    { id: 2, name: "Qualificação", color: "#3b82f6", order: 1 },
    { id: 3, name: "Proposta", color: "#a855f7", order: 2 },
    { id: 4, name: "Ganho", color: "#22c55e", order: 3 },
  ],
};

function emptyDb() {
  return {
    projects: [],
    activities: [],
    leadsSales: [],
    contacts: [],
    tickets: [],
    companies: [],
    users: [
      {
        id: 1,
        name: "Admin Local",
        email: "admin@local.dev",
        profile: "admin",
        companyId: 1,
        super: true,
        allTicket: "enabled",
        allHistoric: "enabled",
        allUserChat: "enabled",
        showDashboard: "enabled",
        allowRealTime: "enabled",
        allowConnections: "enabled",
        showContacts: "enabled",
        showCampaign: "enabled",
        showFlow: "enabled",
        allowSeeMessagesInPendingTickets: "enabled",
        userClosePendingTicket: "enabled",
        allowGroup: true,
      },
    ],
    tags: [],
    queues: [],
    inventory: [],
    announcements: [],
    schedules: [],
    quickMessages: [],
    files: [],
    convertedLeads: [],
    activityStages: DEFAULT_ACTIVITY_STAGES,
    leadPipelines: [DEFAULT_LEAD_PIPELINE],
    settings: [],
    whatsapps: [],
    _seq: 100,
  };
}

export function readDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) {
      const db = emptyDb();
      writeDb(db);
      return db;
    }
    const parsed = JSON.parse(raw);
    const db = { ...emptyDb(), ...parsed };
    // Migra etapas antigas sem `key`/`label` (bug: tarefa aparecia em todas as colunas)
    if (Array.isArray(db.activityStages) && db.activityStages.length) {
      const needsFix = db.activityStages.some((s) => !s.key || !s.label);
      if (needsFix) {
        db.activityStages = DEFAULT_ACTIVITY_STAGES;
        writeDb(db);
      }
    }
    return db;
  } catch {
    const db = emptyDb();
    writeDb(db);
    return db;
  }
}

export function writeDb(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn("[offlineStore] falha ao gravar localStorage", e);
  }
}

export function nextId(db) {
  const id = (db._seq || 100) + 1;
  db._seq = id;
  return id;
}

export function listCollection(name) {
  const db = readDb();
  return Array.isArray(db[name]) ? [...db[name]] : [];
}

export function saveCollection(name, items) {
  const db = readDb();
  db[name] = items;
  writeDb(db);
  return items;
}

export function findById(name, id) {
  const n = Number(id);
  return listCollection(name).find((x) => Number(x.id) === n) || null;
}

export function createItem(name, payload) {
  const db = readDb();
  const items = Array.isArray(db[name]) ? db[name] : [];
  const now = new Date().toISOString();
  const item = {
    ...payload,
    id: payload.id != null ? payload.id : nextId(db),
    companyId: payload.companyId != null ? payload.companyId : 1,
    createdAt: payload.createdAt || now,
    updatedAt: now,
  };
  items.unshift(item);
  db[name] = items;
  writeDb(db);
  return item;
}

export function updateItem(name, id, patch) {
  const db = readDb();
  const items = Array.isArray(db[name]) ? db[name] : [];
  const n = Number(id);
  const idx = items.findIndex((x) => Number(x.id) === n);
  if (idx < 0) return null;
  items[idx] = {
    ...items[idx],
    ...patch,
    id: items[idx].id,
    updatedAt: new Date().toISOString(),
  };
  db[name] = items;
  writeDb(db);
  return items[idx];
}

export function deleteItem(name, id) {
  const db = readDb();
  const items = Array.isArray(db[name]) ? db[name] : [];
  const n = Number(id);
  const next = items.filter((x) => Number(x.id) !== n);
  db[name] = next;
  writeDb(db);
  return { message: "ok", id: n };
}

function matchesSearch(item, searchParam) {
  if (!searchParam) return true;
  const q = String(searchParam).toLowerCase().trim();
  if (!q) return true;
  const blob = JSON.stringify(item).toLowerCase();
  return blob.includes(q);
}

export function paginate(items, { pageNumber = 1, searchParam = "", pageSize = 40 } = {}) {
  const filtered = items.filter((i) => matchesSearch(i, searchParam));
  const page = Math.max(1, Number(pageNumber) || 1);
  const size = Math.max(1, Number(pageSize) || 40);
  const start = (page - 1) * size;
  const slice = filtered.slice(start, start + size);
  return {
    rows: slice,
    count: filtered.length,
    hasMore: start + size < filtered.length,
  };
}

export default {
  readDb,
  writeDb,
  listCollection,
  saveCollection,
  findById,
  createItem,
  updateItem,
  deleteItem,
  paginate,
  nextId,
};
