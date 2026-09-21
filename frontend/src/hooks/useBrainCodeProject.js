/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCodeWorkspace,
  deleteCodeWorkspace,
  fetchCodeWorkspace,
  listCodeWorkspaces,
  saveCodeWorkspace
} from "../services/brainProjectService";

const defaultProject = () => ({
  title: "Novo projeto IDE",
  files: {
    "index.html": `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Preview</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main class="app">
    <h1>Projeto de código</h1>
    <p>Peça ao Brain para gerar telas ou importe uma pasta.</p>
  </main>
  <script src="app.js"></script>
</body>
</html>`,
    "styles.css": `* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; background: #0f0f12; color: #fafafa; }
.app { padding: 24px; max-width: 480px; margin: 0 auto; }
h1 { font-size: 1.25rem; }`,
    "app.js": "console.log('Brain code sandbox');"
  },
  activePath: "index.html"
});

function storageKey(userId, brainProjectId, workspaceId) {
  return `vbrain-code-${userId || "guest"}-p${brainProjectId || "x"}-w${workspaceId || "x"}`;
}

function activeWorkspaceKey(userId, brainProjectId) {
  return `brain-active-code-ws-${userId || "guest"}-p${brainProjectId || "x"}`;
}

function readActiveWorkspaceId(userId, brainProjectId) {
  try {
    const v = localStorage.getItem(activeWorkspaceKey(userId, brainProjectId));
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function writeActiveWorkspaceId(userId, brainProjectId, workspaceId) {
  try {
    if (workspaceId) localStorage.setItem(activeWorkspaceKey(userId, brainProjectId), String(workspaceId));
  } catch {
    /* ignore */
  }
}

function fromApiWorkspace(ws) {
  if (!ws?.files) return defaultProject();
  return {
    title: ws.title || "Projeto IDE",
    files: ws.files,
    activePath: ws.activePath || "index.html"
  };
}

export default function useBrainCodeProject(userId, brainProject, preferredWorkspaceId = null) {
  const brainProjectId = brainProject?.id ?? null;
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState(null);
  const [project, setProject] = useState(defaultProject);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const saveTimer = useRef(null);
  const persistEnabledRef = useRef(false);
  const loadedWorkspaceRef = useRef(null);

  const selectWorkspace = useCallback(
    (workspaceId) => {
      if (!workspaceId) return;
      setActiveWorkspaceIdState(workspaceId);
      if (brainProjectId) writeActiveWorkspaceId(userId, brainProjectId, workspaceId);
    },
    [brainProjectId, userId]
  );

  const loadWorkspaceList = useCallback(async () => {
    if (!brainProjectId) return [];
    try {
      const items = await listCodeWorkspaces(brainProjectId);
      setWorkspaces(items);
      setLoadError("");
      return items;
    } catch (e) {
      setLoadError(e?.response?.data?.error || e?.message || "Falha ao carregar projetos IDE.");
      setWorkspaces([]);
      throw e;
    }
  }, [brainProjectId]);

  useEffect(() => {
    let cancelled = false;

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    persistEnabledRef.current = false;
    loadedWorkspaceRef.current = null;
    setWorkspaces([]);
    setActiveWorkspaceIdState(null);

    if (!brainProjectId) {
      setProject(defaultProject());
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    (async () => {
      try {
        const items = await listCodeWorkspaces(brainProjectId);
        if (cancelled) return;
        setWorkspaces(items);
        const stored = readActiveWorkspaceId(userId, brainProjectId);
        const preferred =
          preferredWorkspaceId && items.some((w) => w.id === preferredWorkspaceId)
            ? preferredWorkspaceId
            : null;
        const pick =
          preferred ||
          (stored && items.some((w) => w.id === stored) ? stored : items[0]?.id ?? null);
        if (pick) {
          selectWorkspace(pick);
        } else {
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.response?.data?.error || e?.message || "Falha ao carregar projetos IDE.");
          setWorkspaces([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [brainProjectId, userId, selectWorkspace, preferredWorkspaceId]);

  useEffect(() => {
    let cancelled = false;

    if (!brainProjectId || !activeWorkspaceId) return () => {};

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    persistEnabledRef.current = false;
    setLoading(true);

    (async () => {
      try {
        const ws = await fetchCodeWorkspace(brainProjectId, activeWorkspaceId);
        if (cancelled) return;
        loadedWorkspaceRef.current = activeWorkspaceId;
        setProject(fromApiWorkspace(ws));
        persistEnabledRef.current = true;
      } catch {
        if (cancelled) return;
        loadedWorkspaceRef.current = activeWorkspaceId;
        setProject(defaultProject());
        persistEnabledRef.current = true;
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [brainProjectId, activeWorkspaceId]);

  const persist = useCallback(
    (next) => {
      if (!persistEnabledRef.current) return;
      if (!brainProjectId || !activeWorkspaceId) return;
      if (loadedWorkspaceRef.current !== activeWorkspaceId) return;

      try {
        localStorage.setItem(
          storageKey(userId, brainProjectId, activeWorkspaceId),
          JSON.stringify(next)
        );
      } catch {
        /* quota */
      }

      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveCodeWorkspace(brainProjectId, activeWorkspaceId, {
          files: next.files,
          activePath: next.activePath,
          title: next.title
        }).catch(() => {});
      }, 700);
    },
    [activeWorkspaceId, brainProjectId, userId]
  );

  useEffect(() => {
    persist(project);
  }, [project, persist]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setWorkspaces((prev) =>
      prev.map((w) => (w.id === activeWorkspaceId ? { ...w, title: project.title } : w))
    );
  }, [project.title, activeWorkspaceId]);

  const createWorkspace = useCallback(
    async (title) => {
      if (!brainProjectId) {
        throw new Error("Selecione um projeto Brain antes de criar um IDE.");
      }
      const ws = await createCodeWorkspace(brainProjectId, { title });
      const items = await listCodeWorkspaces(brainProjectId);
      setWorkspaces(items);
      setLoadError("");
      selectWorkspace(ws.id);
      return ws;
    },
    [brainProjectId, selectWorkspace]
  );

  const removeWorkspace = useCallback(
    async (workspaceId) => {
      if (!brainProjectId || !workspaceId) return;
      await deleteCodeWorkspace(brainProjectId, workspaceId);
      const items = await listCodeWorkspaces(brainProjectId);
      setWorkspaces(items);
      if (activeWorkspaceId === workspaceId) {
        selectWorkspace(items[0]?.id ?? null);
      }
    },
    [activeWorkspaceId, brainProjectId, selectWorkspace]
  );

  const mergeFiles = useCallback((files, title) => {
    if (!Array.isArray(files) || !files.length) return;
    setProject((prev) => {
      const next = { ...prev.files };
      files.forEach((f) => {
        const path = String(f.path || "").replace(/^\/+/, "");
        if (path) next[path] = String(f.content ?? "");
      });
      const activePath =
        next["index.html"] !== undefined
          ? "index.html"
          : files[0]?.path?.replace(/^\/+/, "") || prev.activePath;
      return {
        title: title || prev.title,
        files: next,
        activePath
      };
    });
  }, []);

  const openFolderFromInput = useCallback(async (fileList) => {
    if (!fileList?.length) return;
    const files = {};
    const readers = [];
    for (let i = 0; i < fileList.length; i += 1) {
      const file = fileList[i];
      const path = String(file.webkitRelativePath || file.name || "").replace(/^\/+/, "");
      if (!path || file.size > 800000) continue;
      readers.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ path, content: String(reader.result || "") });
          reader.onerror = () => resolve(null);
          if (/\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|zip|pdf)$/i.test(path)) {
            resolve(null);
          } else {
            reader.readAsText(file);
          }
        })
      );
    }
    const loaded = (await Promise.all(readers)).filter(Boolean);
    loaded.forEach((item) => {
      files[item.path] = item.content;
    });
    if (!Object.keys(files).length) return;
    setProject({
      title: fileList[0]?.webkitRelativePath?.split("/")[0] || "Pasta importada",
      files,
      activePath: files["index.html"] !== undefined ? "index.html" : Object.keys(files)[0]
    });
  }, []);

  const resetProject = useCallback(() => {
    setProject(defaultProject());
  }, []);

  const reloadActiveWorkspace = useCallback(async () => {
    if (!brainProjectId || !activeWorkspaceId) return;
    try {
      const ws = await fetchCodeWorkspace(brainProjectId, activeWorkspaceId);
      loadedWorkspaceRef.current = activeWorkspaceId;
      setProject(fromApiWorkspace(ws));
      persistEnabledRef.current = true;
    } catch {
      /* ignore */
    }
  }, [activeWorkspaceId, brainProjectId]);

  return {
    brainProjectId,
    workspaces,
    activeWorkspaceId,
    project,
    loading,
    loadError,
    setProject,
    selectWorkspace,
    createWorkspace,
    removeWorkspace,
    reloadWorkspaces: loadWorkspaceList,
    mergeFiles,
    openFolderFromInput,
    resetProject,
    reloadActiveWorkspace
  };
};
