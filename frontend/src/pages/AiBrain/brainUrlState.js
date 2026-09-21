/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

const BRAIN_MAIN_VIEWS = new Set([
  "chat",
  "plans",
  "ide",
  "connectors",
  "personalize",
  "conversations",
  "projects",
]);

const IDE_CONV_KEY = "brain-ide-conversation-ids";
const IDE_LAST_CONV_KEY = "brain-ide-last-conversation-id";
const IDE_LAST_CONV_BY_PROJECT_KEY = "brain-ide-last-conv-by-project";

export function readBrainViewFromUrl() {
  if (typeof window === "undefined") return "chat";
  const view = new URLSearchParams(window.location.search).get("view");
  return view && BRAIN_MAIN_VIEWS.has(view) ? view : "chat";
}

export function readBrainUrlState() {
  if (typeof window === "undefined") {
    return { view: "chat", conversationId: null, studio: false, workspaceId: null };
  }
  const params = new URLSearchParams(window.location.search);
  const view = readBrainViewFromUrl();
  const conv = params.get("conv");
  const ws = params.get("ws");
  return {
    view,
    conversationId: conv && /^\d+$/.test(conv) ? Number(conv) : null,
    studio: params.get("studio") === "1",
    workspaceId: ws && /^\d+$/.test(ws) ? Number(ws) : null,
  };
}

export function buildBrainPathname(
  { view = "chat", conversationId, studio, workspaceId } = {},
  pathname = typeof window !== "undefined" ? window.location.pathname : "/brain-ai"
) {
  const params = new URLSearchParams();
  if (view && view !== "chat") params.set("view", view);
  if (conversationId) params.set("conv", String(conversationId));
  if (studio && view === "ide") params.set("studio", "1");
  if (workspaceId && view === "ide") params.set("ws", String(workspaceId));
  const qs = params.toString();
  return `${pathname}${qs ? `?${qs}` : ""}`;
}

export function markIdeConversation(conversationId, projectId) {
  if (!conversationId || typeof window === "undefined") return;
  try {
    const id = Number(conversationId);
    saveIdeLastConversation(id, projectId);
    const raw = JSON.parse(window.localStorage.getItem(IDE_CONV_KEY) || "[]");
    const list = Array.isArray(raw) ? raw.map(Number).filter(Boolean) : [];
    if (!list.includes(id)) list.unshift(id);
    window.localStorage.setItem(IDE_CONV_KEY, JSON.stringify(list.slice(0, 300)));
  } catch {
    /* ignore */
  }
}

export function isIdeConversation(conversationId, projectId) {
  if (!conversationId || typeof window === "undefined") return false;
  try {
    const id = Number(conversationId);
    const raw = JSON.parse(window.localStorage.getItem(IDE_CONV_KEY) || "[]");
    if (Array.isArray(raw) && raw.map(Number).includes(id)) return true;
    if (projectId && readIdeLastConversation(projectId) === id) return true;
    return false;
  } catch {
    return false;
  }
}

export function saveIdeLastConversation(conversationId, projectId) {
  if (!conversationId || typeof window === "undefined") return;
  try {
    const id = Number(conversationId);
    window.sessionStorage.setItem(IDE_LAST_CONV_KEY, String(id));
    if (projectId) {
      const raw = JSON.parse(window.localStorage.getItem(IDE_LAST_CONV_BY_PROJECT_KEY) || "{}");
      raw[String(projectId)] = id;
      window.localStorage.setItem(IDE_LAST_CONV_BY_PROJECT_KEY, JSON.stringify(raw));
    }
  } catch {
    /* ignore */
  }
}

export function readIdeLastConversation(projectId) {
  if (typeof window === "undefined") return null;
  try {
    if (projectId) {
      const raw = JSON.parse(window.localStorage.getItem(IDE_LAST_CONV_BY_PROJECT_KEY) || "{}");
      const perProject = raw[String(projectId)];
      if (perProject && /^\d+$/.test(String(perProject))) {
        return Number(perProject);
      }
    }
    const fallback = window.sessionStorage.getItem(IDE_LAST_CONV_KEY);
    return fallback && /^\d+$/.test(fallback) ? Number(fallback) : null;
  } catch {
    return null;
  }
}

export function pickLatestIdeConversationId(conversations = [], projectId) {
  const pid = projectId ? Number(projectId) : null;
  const sorted = [...(conversations || [])]
    .filter((c) => {
      if (pid && c.projectId && Number(c.projectId) !== pid) return false;
      return isIdeConversation(c.id, projectId);
    })
    .sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  return sorted[0]?.id || readIdeLastConversation(projectId) || null;
}
