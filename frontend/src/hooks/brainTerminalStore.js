/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

const memory = new Map();

export function workspaceTerminalKey(userId, projectId, workspaceId) {
  return `${userId || "guest"}-p${projectId || 0}-w${workspaceId || 0}`;
}

function storageKey(wsKey) {
  return `brain-terminal-v1-${wsKey}`;
}

function defaultWorkspaceState() {
  return {
    sessions: [{ id: "t1", title: "Terminal 1" }],
    activeSessionId: "t1",
    nextNum: 2
  };
}

export function loadWorkspaceTerminalState(wsKey) {
  if (memory.has(wsKey)) return memory.get(wsKey);

  let parsed = null;
  try {
    const raw = localStorage.getItem(storageKey(wsKey));
    if (raw) parsed = JSON.parse(raw);
  } catch {
    /* ignore */
  }

  const state = {
    ...defaultWorkspaceState(),
    ...(parsed || {})
  };
  if (!state.sessions?.length) state.sessions = defaultWorkspaceState().sessions;
  if (!state.activeSessionId) state.activeSessionId = state.sessions[0].id;
  memory.set(wsKey, state);
  return state;
}

export function saveWorkspaceTerminalState(wsKey, state) {
  memory.set(wsKey, state);
  try {
    localStorage.setItem(
      storageKey(wsKey),
      JSON.stringify({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        nextNum: state.nextNum
      })
    );
  } catch {
    /* ignore */
  }
}

const sessionDataMemory = new Map();

function sessionDataStorageKey(sessionKey) {
  return `brain-terminal-session-v1-${sessionKey}`;
}

export function loadSessionData(sessionKey) {
  if (sessionDataMemory.has(sessionKey)) return sessionDataMemory.get(sessionKey);

  let parsed = null;
  try {
    const raw = localStorage.getItem(sessionDataStorageKey(sessionKey));
    if (raw) parsed = JSON.parse(raw);
  } catch {
    /* ignore */
  }

  const data = {
    lines: parsed?.lines ?? null,
    inputDraft: parsed?.inputDraft ?? "",
    commandHistory: Array.isArray(parsed?.commandHistory) ? parsed.commandHistory : [],
    histIdx: -1,
    syncedOnce: false
  };
  sessionDataMemory.set(sessionKey, data);
  return data;
}

export function saveSessionData(sessionKey, data) {
  sessionDataMemory.set(sessionKey, data);
  try {
    const lines = Array.isArray(data.lines) ? data.lines.slice(-120) : null;
    localStorage.setItem(
      sessionDataStorageKey(sessionKey),
      JSON.stringify({
        lines,
        inputDraft: data.inputDraft ?? "",
        commandHistory: (data.commandHistory || []).slice(0, 50)
      })
    );
  } catch {
    /* ignore */
  }
}
