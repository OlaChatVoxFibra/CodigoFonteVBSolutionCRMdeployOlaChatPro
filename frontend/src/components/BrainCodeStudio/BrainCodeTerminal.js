/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  IconButton,
  MenuItem,
  Select,
  Typography,
  makeStyles,
  useTheme
} from "@material-ui/core";
import { Eraser, Plug, PlugZap, Plus, RefreshCw, Terminal, X } from "lucide-react";
import useBrainCodeTerminal from "../../hooks/useBrainCodeTerminal";
import {
  loadWorkspaceTerminalState,
  saveWorkspaceTerminalState,
  workspaceTerminalKey
} from "../../hooks/brainTerminalStore";

const useStyles = makeStyles((theme) => {
  const dark = theme.palette.type === "dark";
  const bg = dark ? "#2d2d2d" : "#fafafa";
  const surface = dark ? "#363636" : "#f4f4f5";
  const text = dark ? "#f2f2f7" : "#1c1917";
  const textMuted = dark ? "#aeaeb2" : "#78716c";
  const border = dark ? "#48484a" : "#e4e4e7";
  const hover = dark ? "#424242" : "rgba(0,0,0,0.05)";
  const outputText = dark ? "#e4e4e7" : "#1c1917";

  return {
    root: {
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      height: "100%",
      background: bg,
      fontFamily: '"Cascadia Mono", "Cascadia Code", Consolas, "Courier New", monospace',
      outline: "none"
    },
    rootHidden: {
      display: "none"
    },
    sessionTabs: {
      display: "flex",
      alignItems: "center",
      gap: 2,
      padding: "0 6px",
      borderBottom: `1px solid ${border}`,
      flexShrink: 0,
      overflowX: "auto",
      background: surface,
      minHeight: 35
    },
    sessionTab: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      padding: "6px 10px",
      borderRadius: 0,
      fontSize: 11,
      fontWeight: 400,
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      color: textMuted,
      cursor: "pointer",
      border: "none",
      borderBottom: "1px solid transparent",
      whiteSpace: "nowrap",
      userSelect: "none",
      background: "transparent",
      "&:hover": {
        color: text,
        background: hover
      }
    },
    sessionTabActive: {
      color: text,
      background: bg,
      borderBottom: "1px solid #007acc"
    },
    sessionTabClose: {
      padding: 2,
      opacity: 0.5,
      "&:hover": { opacity: 1 }
    },
    sessionTabAdd: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 24,
      height: 24,
      borderRadius: 4,
      border: "none",
      background: "transparent",
      color: textMuted,
      cursor: "pointer",
      flexShrink: 0,
      "&:hover": {
        background: hover,
        color: text
      }
    },
    sessionPane: {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      background: bg
    },
    sessionPaneHidden: {
      display: "none"
    },
    toolbar: {
      display: "none"
    },
    statusDot: {
      display: "none"
    },
    toolbarTitle: {
      display: "none"
    },
    toolbarTitleIcon: {
      display: "none"
    },
    shellSelect: {
      display: "none"
    },
    output: {
      flex: 1,
      overflow: "auto",
      padding: "8px 12px",
      fontFamily: '"Cascadia Mono", "Cascadia Code", Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.35,
      color: outputText,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      cursor: "text",
      background: bg
    },
    linePrompt: { color: outputText },
    lineErr: { color: "#f14c4c" },
    lineInfo: { color: "#6a9955" },
    inputRow: {
      display: "flex",
      alignItems: "center",
      gap: 0,
      padding: "0 12px 10px",
      borderTop: "none",
      flexShrink: 0,
      background: bg
    },
    shellPrefix: {
      color: outputText,
      fontFamily: '"Cascadia Mono", "Cascadia Code", Consolas, "Courier New", monospace',
      fontSize: 14,
      flexShrink: 0,
      userSelect: "none",
      whiteSpace: "pre"
    },
    commandInput: {
      flex: 1,
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: '"Cascadia Mono", "Cascadia Code", Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.35,
      color: outputText,
      padding: 0,
      margin: 0,
      caretColor: outputText
    },
    offlineHint: {
      fontSize: 11,
      color: textMuted,
      padding: "0 12px 8px",
      borderTop: "none",
      background: bg,
      fontFamily: '"Segoe UI", system-ui, sans-serif'
    },
    quickBtn: {
      display: "none"
    }
  };
});

const QUICK_COMMANDS = [
  { label: "npm i", cmd: "npm install" },
  { label: "npm run dev", cmd: "npm run dev" },
  { label: "node -v", cmd: "node -v" },
  { label: "dir", cmd: "dir" }
];

function formatShellPrompt(shell) {
  const cwd = "C:\\Users\\Project";
  if (shell === "powershell") return `PS ${cwd}>`;
  if (shell === "cmd") return `${cwd}>`;
  return `$ `;
}

function BrainCodeTerminalSession({
  userId,
  projectFiles,
  projectId,
  codeWorkspaceId,
  sessionId,
  sessionTitle,
  isActive,
  panelVisible,
  isDark,
  classes
}) {
  const outRef = useRef(null);
  const inputRef = useRef(null);
  const sessionKey = `${workspaceTerminalKey(userId, projectId, codeWorkspaceId)}:${sessionId}`;
  const terminal = useBrainCodeTerminal(userId, projectFiles, projectId, codeWorkspaceId, sessionKey);

  useEffect(() => {
    if (outRef.current) outRef.current.scrollTop = outRef.current.scrollHeight;
  }, [terminal.lines, terminal.running]);

  useEffect(() => {
    if (!panelVisible || !isActive) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [panelVisible, isActive, projectId, codeWorkspaceId, sessionId]);

  const submitCommand = () => {
    const cmd = terminal.inputDraft.trim();
    if (!cmd || terminal.running) return;
    terminal.runCommand(cmd);
    terminal.setInputDraft("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      terminal.setInputDraft(terminal.historyUp());
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      terminal.setInputDraft(terminal.historyDown());
    }
  };

  const focusInput = () => {
    if (isActive && panelVisible) inputRef.current?.focus();
  };

  return (
    <div className={`${classes.sessionPane} ${!isActive ? classes.sessionPaneHidden : ""}`}>
      <div className={classes.toolbar}>
        <div className={classes.toolbarTitle}>
          <span
            className={classes.statusDot}
            style={{
              background: terminal.localConnected ? "#22c55e" : "#ef4444",
              boxShadow: terminal.localConnected ? "0 0 6px rgba(34,197,94,0.6)" : "none"
            }}
            title={terminal.localConnected ? "Terminal local conectado" : "Terminal local offline"}
          />
          <span className={classes.toolbarTitleIcon}>
            <Terminal size={13} />
          </span>
          {sessionTitle}
        </div>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            terminal.refreshConnection({ resetBanner: true });
          }}
          title="Reconectar terminal local"
          style={{ color: isDark ? "#e4e4e7" : "#fff", padding: 4 }}
        >
          {terminal.localConnected ? <PlugZap size={13} /> : <Plug size={13} />}
        </IconButton>
        <Select
          value={terminal.shell}
          onChange={(e) => terminal.setShell(e.target.value)}
          variant="outlined"
          className={classes.shellSelect}
          disableUnderline
          onClick={(e) => e.stopPropagation()}
        >
          {terminal.availableShells.map((s) => (
            <MenuItem key={s} value={s} dense>
              {s === "powershell" ? "PowerShell" : s === "cmd" ? "CMD" : "Bash"}
            </MenuItem>
          ))}
        </Select>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            terminal.syncWorkspace();
          }}
          title="Sincronizar arquivos"
          style={{ color: isDark ? "#e4e4e7" : "#fff", padding: 4 }}
        >
          <RefreshCw size={13} />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            terminal.clearTerminal();
            focusInput();
          }}
          title="Limpar"
          style={{ color: isDark ? "#e4e4e7" : "#fff", padding: 4 }}
        >
          <Eraser size={13} />
        </IconButton>
      </div>

      <Box px={1} py={0.5} display="flex" flexWrap="wrap" style={{ gap: 4 }} onClick={(e) => e.stopPropagation()}>
        {QUICK_COMMANDS.map((q) => (
          <button
            key={q.cmd}
            type="button"
            className={classes.quickBtn}
            onClick={() => {
              terminal.runCommand(q.cmd);
              focusInput();
            }}
            disabled={terminal.running}
          >
            {q.label}
          </button>
        ))}
      </Box>

      <div ref={outRef} className={classes.output} onClick={focusInput}>
        {terminal.lines.map((line, i) => (
          <span
            key={i}
            className={
              line.type === "prompt"
                ? classes.linePrompt
                : line.type === "err"
                  ? classes.lineErr
                  : line.type === "info"
                    ? classes.lineInfo
                    : undefined
            }
          >
            {line.text}
          </span>
        ))}
        {terminal.running ? (
          <Typography variant="caption" style={{ color: "#71717a" }}>
            Executando…
          </Typography>
        ) : null}
      </div>

      {!terminal.localConnected ? (
        <Typography className={classes.offlineHint}>
          Digite normalmente abaixo. Se falhar, rode{" "}
          <strong style={{ color: isDark ? "#e4e4e7" : "#fff" }}>npm run brain:terminal</strong> na raiz do VB
          Solution (não aqui dentro).
        </Typography>
      ) : null}

      <div className={classes.inputRow} onClick={(e) => e.stopPropagation()}>
        <span className={classes.shellPrefix}>{formatShellPrompt(terminal.shell)}</span>
        <input
          ref={inputRef}
          className={classes.commandInput}
          value={terminal.inputDraft}
          onChange={(e) => terminal.setInputDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="npm install, git status, node -v…"
          disabled={terminal.running}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label={`Comando do ${sessionTitle}`}
        />
      </div>
    </div>
  );
}

export default function BrainCodeTerminal({
  userId,
  projectFiles,
  projectId,
  codeWorkspaceId,
  visible,
  fullWidth
}) {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const wsKey = workspaceTerminalKey(userId, projectId, codeWorkspaceId);

  const [wsState, setWsState] = useState(() => loadWorkspaceTerminalState(wsKey));

  useEffect(() => {
    setWsState(loadWorkspaceTerminalState(wsKey));
  }, [wsKey]);

  const persistWs = useCallback(
    (next) => {
      setWsState(next);
      saveWorkspaceTerminalState(wsKey, next);
    },
    [wsKey]
  );

  const addSession = () => {
    const id = `t${wsState.nextNum}`;
    const title = `Terminal ${wsState.nextNum}`;
    persistWs({
      ...wsState,
      sessions: [...wsState.sessions, { id, title }],
      activeSessionId: id,
      nextNum: wsState.nextNum + 1
    });
  };

  const closeSession = (id, e) => {
    e?.stopPropagation();
    if (wsState.sessions.length <= 1) return;
    const remaining = wsState.sessions.filter((s) => s.id !== id);
    const nextActive =
      wsState.activeSessionId === id ? remaining[remaining.length - 1].id : wsState.activeSessionId;
    persistWs({
      ...wsState,
      sessions: remaining,
      activeSessionId: nextActive
    });
  };

  const selectSession = (id) => {
    persistWs({ ...wsState, activeSessionId: id });
  };

  return (
    <div
      className={`${classes.root} ${!visible ? classes.rootHidden : ""}`}
      style={fullWidth ? { borderLeft: "none", height: "100%" } : undefined}
    >
      <div className={classes.sessionTabs}>
        {wsState.sessions.map((s) => {
          const active = s.id === wsState.activeSessionId;
          return (
            <div
              key={s.id}
              className={`${classes.sessionTab} ${active ? classes.sessionTabActive : ""}`}
              onClick={() => selectSession(s.id)}
              role="tab"
              aria-selected={active}
              tabIndex={0}
              onKeyDown={() => {}}
            >
              <Terminal size={11} />
              {s.title}
              {wsState.sessions.length > 1 ? (
                <IconButton
                  size="small"
                  className={classes.sessionTabClose}
                  onClick={(e) => closeSession(s.id, e)}
                  aria-label={`Fechar ${s.title}`}
                >
                  <X size={10} />
                </IconButton>
              ) : null}
            </div>
          );
        })}
        <button type="button" className={classes.sessionTabAdd} onClick={addSession} title="Novo terminal">
          <Plus size={13} />
        </button>
      </div>

      {wsState.sessions.map((s) => (
        <BrainCodeTerminalSession
          key={`${wsKey}:${s.id}`}
          userId={userId}
          projectFiles={projectFiles}
          projectId={projectId}
          codeWorkspaceId={codeWorkspaceId}
          sessionId={s.id}
          sessionTitle={s.title}
          isActive={s.id === wsState.activeSessionId}
          panelVisible={visible}
          isDark={isDark}
          classes={classes}
        />
      ))}
    </div>
  );
}
