/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  execLocalTerminalCommand,
  probeLocalTerminal,
  syncLocalBrainWorkspace
} from "../services/brainLocalTerminalService";
import { loadSessionData, saveSessionData } from "./brainTerminalStore";

const SHELL_STORAGE = (userId) => `brain-code-shell-${userId || "guest"}`;

function readShell(userId) {
  try {
    return localStorage.getItem(SHELL_STORAGE(userId)) || "";
  } catch {
    return "";
  }
}

function writeShell(userId, shell) {
  try {
    localStorage.setItem(SHELL_STORAGE(userId), shell);
  } catch {
    /* ignore */
  }
}

const OFFLINE_LINES = [
  {
    type: "info",
    text:
      "Terminal LOCAL desligado.\n\n" +
      "No seu PC, abra um terminal na pasta do projeto VB Solution e rode:\n\n" +
      "  npm run brain:terminal\n\n" +
      "Deixe essa janela aberta. Os comandos rodam na SUA máquina — não no Railway/VPS.\n"
  }
];

function defaultConnectedLines(info, workspacePath) {
  return [
    { type: "info", text: info.banner || "Brain IDE · terminal local\n" },
    {
      type: "info",
      text: workspacePath
        ? `Pasta deste projeto IDE: ${workspacePath}\n`
        : "Conectado ao PowerShell/CMD deste computador.\n"
    },
    {
      type: "info",
      text:
        "Dica: npm install / npm run dev rodam na pasta acima. " +
        "npm run brain:terminal só funciona na raiz do VB Solution (fora daqui).\n"
    }
  ];
}

function isOnlyOfflineBanner(lines) {
  if (!Array.isArray(lines) || !lines.length) return true;
  return lines.every((l) => l.type === "info") && lines.some((l) => String(l.text).includes("Terminal LOCAL desligado"));
}

function isBrainTerminalBootstrapCmd(cmd) {
  return /\bnpm\s+run\s+brain:terminal\b/i.test(String(cmd || ""));
}

export default function useBrainCodeTerminal(
  userId,
  projectFiles,
  projectId,
  codeWorkspaceId,
  sessionKey
) {
  const sessionRef = useRef(loadSessionData(sessionKey));
  if (sessionRef.current.lines == null) {
    sessionRef.current.lines = OFFLINE_LINES;
  }
  const [shell, setShellState] = useState(() => readShell(userId) || "powershell");
  const [lines, setLinesState] = useState(() => sessionRef.current.lines ?? OFFLINE_LINES);
  const [inputDraft, setInputDraftState] = useState(() => sessionRef.current.inputDraft ?? "");
  const [running, setRunning] = useState(false);
  const [availableShells, setAvailableShells] = useState(["powershell", "cmd", "bash"]);
  const [localConnected, setLocalConnected] = useState(false);
  const [workspacePath, setWorkspacePath] = useState("");
  const historyRef = useRef(sessionRef.current.commandHistory || []);
  const histIdxRef = useRef(-1);
  const probeSeq = useRef(0);
  const connectedOnce = useRef(false);
  const syncedOnceRef = useRef(sessionRef.current.syncedOnce || false);

  const persistSession = useCallback(() => {
    saveSessionData(sessionKey, {
      lines: sessionRef.current.lines ?? lines,
      inputDraft: sessionRef.current.inputDraft ?? inputDraft,
      commandHistory: historyRef.current,
      histIdx: histIdxRef.current,
      syncedOnce: syncedOnceRef.current
    });
  }, [sessionKey, lines, inputDraft]);

  const setLines = useCallback(
    (updater) => {
      setLinesState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        sessionRef.current.lines = next;
        return next;
      });
    },
    []
  );

  const setInputDraft = useCallback((value) => {
    sessionRef.current.inputDraft = value;
    setInputDraftState(value);
  }, []);

  useEffect(() => {
    persistSession();
  }, [lines, inputDraft, persistSession]);

  const applyLocalInfo = useCallback(
    (info, { resetBanner = false } = {}) => {
      if (Array.isArray(info.availableShells)) setAvailableShells(info.availableShells);
      const stored = readShell(userId);
      const next =
        stored && info.availableShells?.includes(stored)
          ? stored
          : info.defaultShell || "powershell";
      setShellState(next);
      setLocalConnected(true);

      const hasPersistedOutput =
        Array.isArray(sessionRef.current.lines) &&
        sessionRef.current.lines.length > 0 &&
        !isOnlyOfflineBanner(sessionRef.current.lines);

      if ((resetBanner || !connectedOnce.current) && !hasPersistedOutput) {
        const wsPath = workspacePath || info.workspaceRoot || "";
        setLines(defaultConnectedLines(info, wsPath));
      }
      connectedOnce.current = true;
    },
    [userId, setLines, workspacePath]
  );

  const refreshConnection = useCallback(
    async (opts = {}) => {
      const seq = ++probeSeq.current;
      const info = await probeLocalTerminal();
      if (seq !== probeSeq.current) return false;
      if (info) {
        applyLocalInfo(info, { resetBanner: opts.resetBanner === true });
        return true;
      }
      connectedOnce.current = false;
      setLocalConnected(false);
      setWorkspacePath("");
      if (!sessionRef.current.lines || sessionRef.current.lines === OFFLINE_LINES) {
        setLines(OFFLINE_LINES);
      }
      return false;
    },
    [applyLocalInfo, setLines]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await refreshConnection();
    })();

    const intervalId = setInterval(() => {
      if (!cancelled) refreshConnection();
    }, 12000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [refreshConnection, sessionKey]);

  const setShell = useCallback(
    (next) => {
      setShellState(next);
      writeShell(userId, next);
    },
    [userId]
  );

  const appendLine = useCallback(
    (line) => {
      setLines((prev) => [...prev, line]);
    },
    [setLines]
  );

  const ensureWorkspaceSynced = useCallback(async () => {
    if (syncedOnceRef.current) return workspacePath;
    if (!projectFiles || !Object.keys(projectFiles).length) return workspacePath;

    try {
      const r = await syncLocalBrainWorkspace(projectFiles, projectId, codeWorkspaceId);
      syncedOnceRef.current = true;
      sessionRef.current.syncedOnce = true;
      if (r.workspacePath) {
        setWorkspacePath(r.workspacePath);
        appendLine({
          type: "info",
          text: `Arquivos sincronizados (${r.fileCount}) → ${r.workspacePath}\n`
        });
      }
      return r.workspacePath || workspacePath;
    } catch (e) {
      appendLine({
        type: "err",
        text: `Falha ao sincronizar arquivos: ${e?.message || "erro"}\n`
      });
      return workspacePath;
    }
  }, [appendLine, codeWorkspaceId, projectFiles, projectId, workspacePath]);

  const runCommand = useCallback(
    async (command) => {
      const cmd = String(command || "").trim();
      if (!cmd || running) return;

      if (isBrainTerminalBootstrapCmd(cmd)) {
        appendLine({ type: "prompt", text: `${shell}> ${cmd}` });
        appendLine({
          type: "err",
          text:
            "Este comando não roda aqui dentro.\n\n" +
            "npm run brain:terminal inicia o agente local e deve ser executado na pasta raiz do VB Solution " +
            "(onde está o package.json principal), em um terminal do Windows — não nesta pasta do projeto IDE.\n\n" +
            "Se o terminal já está verde/conectado, você não precisa rodar isso de novo.\n"
        });
        return;
      }

      let connected = localConnected;
      if (!connected) {
        connected = await refreshConnection();
      }

      if (!connected) {
        appendLine({
          type: "err",
          text:
            "Terminal local offline. No PowerShell, na pasta do VB Solution:\n  npm run brain:terminal\n"
        });
        return;
      }

      appendLine({ type: "prompt", text: `${shell}> ${cmd}` });
      historyRef.current = [cmd, ...historyRef.current.filter((c) => c !== cmd)].slice(0, 50);
      sessionRef.current.commandHistory = historyRef.current;
      histIdxRef.current = -1;
      setRunning(true);

      try {
        await ensureWorkspaceSynced();

        const result = await execLocalTerminalCommand({
          command: cmd,
          shell,
          files: projectFiles || {},
          projectId: projectId || undefined,
          workspaceId: codeWorkspaceId || undefined
        });

        if (result.workspacePath) setWorkspacePath(result.workspacePath);

        if (result.stdout) appendLine({ type: "out", text: result.stdout });
        if (result.stderr) appendLine({ type: "err", text: result.stderr });
        if (!result.stdout && !result.stderr && result.success) {
          appendLine({ type: "info", text: "(comando concluído sem saída)\n" });
        }
        if (result.error && !result.stderr) {
          appendLine({ type: "err", text: `${result.error}\n` });
        }
        appendLine({
          type: "info",
          text: `[exit ${result.exitCode ?? "?"}]\n`
        });
      } catch (e) {
        if (e?.code === "LOCAL_TERMINAL_OFFLINE" || e?.name === "AbortError") {
          setLocalConnected(false);
          connectedOnce.current = false;
          appendLine({
            type: "err",
            text: "Conexão com terminal local perdida. Rode npm run brain:terminal na raiz do VB Solution.\n"
          });
        } else {
          appendLine({
            type: "err",
            text: `${e?.response?.data?.error || e?.message || "Erro ao executar comando"}\n`
          });
        }
      } finally {
        setRunning(false);
        persistSession();
      }
    },
    [
      appendLine,
      codeWorkspaceId,
      ensureWorkspaceSynced,
      localConnected,
      persistSession,
      projectFiles,
      projectId,
      refreshConnection,
      running,
      shell,
      setLines
    ]
  );

  const syncWorkspace = useCallback(async () => {
    if (!localConnected) {
      appendLine({ type: "err", text: "Terminal local offline.\n" });
      return;
    }
    if (!projectFiles || !Object.keys(projectFiles).length) {
      appendLine({ type: "info", text: "Nenhum arquivo no projeto para sincronizar.\n" });
      return;
    }
    appendLine({ type: "info", text: "Sincronizando arquivos com a pasta local…\n" });
    try {
      const r = await syncLocalBrainWorkspace(projectFiles, projectId, codeWorkspaceId);
      syncedOnceRef.current = true;
      sessionRef.current.syncedOnce = true;
      if (r.workspacePath) setWorkspacePath(r.workspacePath);
      appendLine({
        type: "info",
        text: `Pasta local atualizada (${r.fileCount} arquivo(s)).\n${r.workspacePath || ""}\n`
      });
    } catch (e) {
      appendLine({
        type: "err",
        text: `${e?.response?.data?.error || e?.message || "Falha ao sincronizar"}\n`
      });
    } finally {
      persistSession();
    }
  }, [appendLine, codeWorkspaceId, localConnected, persistSession, projectFiles, projectId]);

  const clearTerminal = useCallback(() => {
    setLines([{ type: "info", text: "Terminal limpo.\n" }]);
    persistSession();
  }, [persistSession, setLines]);

  const historyUp = useCallback(() => {
    const h = historyRef.current;
    if (!h.length) return inputDraft;
    histIdxRef.current = Math.min(histIdxRef.current + 1, h.length - 1);
    return h[histIdxRef.current] || "";
  }, [inputDraft]);

  const historyDown = useCallback(() => {
    if (histIdxRef.current <= 0) {
      histIdxRef.current = -1;
      return "";
    }
    histIdxRef.current -= 1;
    return historyRef.current[histIdxRef.current] || "";
  }, []);

  return {
    shell,
    setShell,
    availableShells,
    lines,
    inputDraft,
    setInputDraft,
    running,
    localConnected,
    workspacePath,
    refreshConnection,
    runCommand,
    syncWorkspace,
    clearTerminal,
    historyUp,
    historyDown
  };
}
