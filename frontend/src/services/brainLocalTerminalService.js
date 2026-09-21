/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

const LOCAL_TERMINAL_BASE =
  process.env.REACT_APP_BRAIN_LOCAL_TERMINAL_URL || "http://127.0.0.1:9333";

const HEALTH_TIMEOUT_MS = 2500;

async function localRequest(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? 120_000);
  try {
    const res = await fetch(`${LOCAL_TERMINAL_BASE}${path}`, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.response = { data };
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export function getLocalTerminalBaseUrl() {
  return LOCAL_TERMINAL_BASE;
}

export async function probeLocalTerminal() {
  try {
    const data = await localRequest("/health", { timeout: HEALTH_TIMEOUT_MS });
    if (!data?.ok) return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchLocalTerminalInfo() {
  const info = await probeLocalTerminal();
  if (!info) {
    const err = new Error("LOCAL_TERMINAL_OFFLINE");
    err.code = "LOCAL_TERMINAL_OFFLINE";
    throw err;
  }
  return info;
}

export async function syncLocalBrainWorkspace(files, projectId, workspaceId) {
  return localRequest("/sync", {
    method: "POST",
    body: { files, projectId: projectId || undefined, workspaceId: workspaceId || undefined }
  });
}

export async function execLocalTerminalCommand({ command, shell, files, projectId, workspaceId }) {
  return localRequest("/exec", {
    method: "POST",
    body: {
      command,
      shell,
      files,
      projectId: projectId || undefined,
      workspaceId: workspaceId || undefined
    },
    timeout: 95_000
  });
}
