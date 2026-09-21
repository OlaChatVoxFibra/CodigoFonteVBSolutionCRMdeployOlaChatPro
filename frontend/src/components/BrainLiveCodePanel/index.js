/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  IconButton,
  Typography,
  makeStyles,
  useTheme
} from "@material-ui/core";
import { Check, Code2, Loader2, X } from "lucide-react";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  return {
    root: {
      margin: theme.spacing(0.75, 0, 1),
      display: "flex",
      flexDirection: "column",
      gap: 6,
      maxWidth: "100%",
      width: "100%"
    },
    rootHistorical: {
      margin: theme.spacing(0.5, 0, 0.75)
    },
    stackLabel: {
      fontSize: 10,
      color: isDark ? "rgba(255,255,255,0.42)" : theme.palette.text.secondary,
      letterSpacing: "0.03em",
      textTransform: "uppercase",
      fontWeight: 600
    },
    fileBlock: {
      borderRadius: 8,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
      overflow: "hidden",
      cursor: "pointer",
      transition: "border-color 0.15s, box-shadow 0.15s",
      "&:hover": {
        borderColor: isDark ? "rgba(167,139,250,0.35)" : "rgba(124,58,237,0.25)",
        boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.25)" : "0 2px 10px rgba(15,23,42,0.06)"
      }
    },
    fileBlockActive: {
      borderColor: isDark ? "rgba(167,139,250,0.45)" : "rgba(124,58,237,0.35)"
    },
    fileBlockHeader: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "5px 10px",
      borderBottom: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)"
    },
    fileBlockName: {
      fontSize: 11,
      fontWeight: 600,
      flex: 1,
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontFamily: "'JetBrains Mono', Consolas, monospace"
    },
    fileBlockStatus: {
      fontSize: 9,
      opacity: 0.65,
      display: "flex",
      alignItems: "center",
      gap: 3,
      flexShrink: 0
    },
    fileBlockPreview: {
      margin: 0,
      padding: "8px 10px",
      maxHeight: 88,
      overflow: "hidden",
      fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
      fontSize: 10,
      lineHeight: 1.45,
      color: isDark ? "#a1a1aa" : "#64748b",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word"
    },
    fileBlockPreviewLive: {
      maxHeight: 140,
      overflow: "auto",
      color: isDark ? "#d4d4d8" : "#334155",
      ...theme.scrollbarStylesSoft
    },
    ideLink: {
      fontSize: 10,
      color: isDark ? "#c4b5fd" : "#7c3aed",
      cursor: "pointer",
      background: "none",
      border: "none",
      padding: 0,
      marginTop: 2,
      fontFamily: "inherit",
      textDecoration: "underline",
      textUnderlineOffset: 2,
      alignSelf: "flex-start",
      "&:hover": { opacity: 0.85 }
    },
    dialogPaper: {
      background: isDark ? "#121218" : "#fafafa",
      borderRadius: 10,
      border: `1px solid ${border}`,
      maxWidth: 520,
      width: "min(92vw, 520px)"
    },
    dialogHeader: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 10px",
      borderBottom: `1px solid ${border}`
    },
    dialogCode: {
      margin: 0,
      padding: theme.spacing(1.25, 1.5),
      minHeight: 120,
      maxHeight: "min(55vh, 360px)",
      overflow: "auto",
      fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
      fontSize: 10.5,
      lineHeight: 1.45,
      color: isDark ? "#d4d4d8" : "#334155",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word"
    },
    spin: {
      animation: "$spin 1s linear infinite"
    },
    "@keyframes spin": {
      from: { transform: "rotate(0deg)" },
      to: { transform: "rotate(360deg)" }
    }
  };
});

function getPathContent(liveCode, path) {
  if (!path) return "";
  if (liveCode.streamingPaths?.[path] !== undefined) {
    return liveCode.streamingPaths[path];
  }
  return liveCode.files?.[path] || "";
}

function resolveFileOrder(liveCode) {
  if (liveCode?.fileOrder?.length) return liveCode.fileOrder;
  return [
    ...new Set([
      ...Object.keys(liveCode?.files || {}),
      ...Object.keys(liveCode?.streamingPaths || {})
    ])
  ];
}

export default function BrainLiveCodePanel({
  liveCode,
  onSelectPath,
  historical = false,
  onOpenIdeBuild
}) {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const [popupPath, setPopupPath] = useState("");
  const dialogCodeRef = useRef(null);
  const livePreviewRefs = useRef({});

  const orderedPaths = useMemo(() => resolveFileOrder(liveCode), [
    liveCode?.fileOrder,
    liveCode?.files,
    liveCode?.streamingPaths
  ]);

  if (!orderedPaths.length) return null;

  const activePath = liveCode.activePath || orderedPaths[orderedPaths.length - 1] || "";
  const isStreaming = Object.keys(liveCode.streamingPaths || {}).length > 0;
  const popupContent = getPathContent(liveCode, popupPath);
  const popupStreaming = liveCode.streamingPaths?.[popupPath] !== undefined;

  useEffect(() => {
    if (!popupPath || !dialogCodeRef.current) return;
    dialogCodeRef.current.scrollTop = dialogCodeRef.current.scrollHeight;
  }, [popupContent, popupPath, liveCode?.tick]);

  useEffect(() => {
    orderedPaths.forEach((path) => {
      if (liveCode.streamingPaths?.[path] === undefined) return;
      const el = livePreviewRefs.current[path];
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [liveCode?.tick, liveCode?.streamingPaths, orderedPaths]);

  const openPopup = (path) => {
    onSelectPath?.(path);
    setPopupPath(path);
  };

  return (
    <>
      <div className={`${classes.root} ${historical ? classes.rootHistorical : ""}`}>
        {!historical && isStreaming ? (
          <span className={classes.stackLabel}>
            {liveCode.projectTitle ? `${liveCode.projectTitle} · ` : ""}
            arquivos
          </span>
        ) : historical ? (
          <span className={classes.stackLabel}>Arquivos gerados</span>
        ) : null}

        {orderedPaths.map((path) => {
          const streaming = liveCode.streamingPaths?.[path] !== undefined;
          const content = getPathContent(liveCode, path);
          const isActive = path === activePath && !historical;
          const done = !streaming && Boolean(liveCode.files?.[path]);

          return (
            <div
              key={path}
              className={`${classes.fileBlock} ${isActive ? classes.fileBlockActive : ""}`}
              onClick={() => openPopup(path)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openPopup(path);
              }}
            >
              <div className={classes.fileBlockHeader}>
                <Code2 size={11} style={{ flexShrink: 0, opacity: 0.75 }} />
                <span className={classes.fileBlockName} title={path}>
                  {path}
                </span>
                <span className={classes.fileBlockStatus}>
                  {streaming ? (
                    <>
                      <Loader2 size={10} className={classes.spin} />
                      escrevendo
                    </>
                  ) : done ? (
                    <>
                      <Check size={10} />
                      pronto
                    </>
                  ) : null}
                </span>
              </div>
              <pre
                ref={(el) => {
                  if (streaming) livePreviewRefs.current[path] = el;
                }}
                className={`${classes.fileBlockPreview} ${streaming ? classes.fileBlockPreviewLive : ""}`}
              >
                {content || " "}
              </pre>
            </div>
          );
        })}

        {onOpenIdeBuild && !isStreaming ? (
          <button type="button" className={classes.ideLink} onClick={onOpenIdeBuild}>
            Abrir no IDE Build →
          </button>
        ) : null}
      </div>

      <Dialog
        open={Boolean(popupPath)}
        onClose={() => setPopupPath("")}
        classes={{ paper: classes.dialogPaper }}
        maxWidth={false}
      >
        <div className={classes.dialogHeader}>
          <Code2 size={12} color={isDark ? "#c4b5fd" : "#7c3aed"} />
          <Typography style={{ fontSize: 11, fontWeight: 600, flex: 1 }} noWrap>
            {popupPath}
            {popupStreaming ? " · escrevendo…" : ""}
          </Typography>
          {popupStreaming ? (
            <Loader2 size={12} className={classes.spin} color={isDark ? "#c4b5fd" : "#7c3aed"} />
          ) : null}
          <IconButton size="small" onClick={() => setPopupPath("")} style={{ padding: 3 }}>
            <X size={12} />
          </IconButton>
        </div>
        <pre ref={dialogCodeRef} className={classes.dialogCode}>
          {popupContent || " "}
        </pre>
      </Dialog>
    </>
  );
}

export function buildBrainCodeSnapshot(liveCode) {
  if (!liveCode) return null;
  const files = liveCode.files || {};
  const streaming = liveCode.streamingPaths || {};
  const fileOrder = resolveFileOrder(liveCode);
  if (!fileOrder.length) return null;
  const mergedFiles = { ...files };
  Object.entries(streaming).forEach(([path, content]) => {
    if (!mergedFiles[path]) mergedFiles[path] = content;
  });
  return {
    isActive: false,
    projectTitle: liveCode.projectTitle || "IDE Build",
    files: mergedFiles,
    fileOrder,
    streamingPaths: {},
    activePath: liveCode.activePath || fileOrder[fileOrder.length - 1],
    workspaceId: liveCode.workspaceId || null
  };
}

export function sanitizeBrainAssistantContent(content) {
  let text = String(content || "").trim();
  if (!text) return text;
  const patterns = [
    /^(\*\*)?(você é o assistente|voce e o assistente|sou o assistente|estou usando|i am using|i'm using)[\s\S]*?(gpt|openai|claude|gemini|anthropic|modelo)[\s\S]*?(\*\*)?\s*[\n\r]+/i,
    /^(\*\*)?modelo desta resposta[\s\S]*?(\*\*)?\s*[\n\r]+/i,
    /^(você é|voce e|i am)\s+\*\*(claude|gemini|brain|openai)[\s\S]*?modelo\s+[`'][^`']+[`'][\s\S]*?[\n\r]+/i
  ];
  patterns.forEach((re) => {
    text = text.replace(re, "").trim();
  });
  return text;
}
