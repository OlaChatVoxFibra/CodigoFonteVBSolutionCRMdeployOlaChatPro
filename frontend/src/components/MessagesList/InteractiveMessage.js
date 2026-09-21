/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import MarkdownWrapper from "../MarkdownWrapper";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    root: {
      minWidth: 180,
      maxWidth: 280
    },
    bodyText: {
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      marginBottom: 8
    },
    header: {
      fontWeight: 600,
      fontSize: "0.85rem",
      marginBottom: 4
    },
    footer: {
      fontSize: "0.72rem",
      color: theme.palette.text.secondary,
      marginTop: 6
    },
    btn: {
      display: "block",
      width: "100%",
      marginTop: 6,
      padding: "8px 10px",
      borderRadius: 8,
      border: isDark
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid rgba(15,23,42,0.1)",
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      color: "#0b8ec4",
      fontWeight: 600,
      fontSize: "0.8rem",
      cursor: "pointer",
      textAlign: "center",
      "&:hover": {
        background: isDark ? "rgba(11,142,196,0.15)" : "rgba(11,142,196,0.08)"
      }
    },
    btnSelected: {
      borderColor: "#25D366",
      background: isDark ? "rgba(37,211,102,0.12)" : "rgba(37,211,102,0.1)",
      color: isDark ? "#86efac" : "#15803d"
    },
    listCta: {
      marginTop: 8,
      padding: "8px 10px",
      borderRadius: 8,
      border: isDark
        ? "1px solid rgba(37,211,102,0.35)"
        : "1px solid rgba(37,211,102,0.45)",
      background: isDark ? "rgba(37,211,102,0.08)" : "rgba(37,211,102,0.06)",
      color: isDark ? "#86efac" : "#15803d",
      fontWeight: 650,
      fontSize: "0.8rem",
      textAlign: "center",
      cursor: "pointer",
      width: "100%",
      "&:hover": {
        filter: "brightness(1.05)"
      }
    },
    row: {
      marginTop: 4,
      padding: "6px 8px",
      borderRadius: 6,
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
      fontSize: "0.78rem",
      cursor: "pointer",
      "&:hover": {
        background: isDark ? "rgba(37,211,102,0.12)" : "rgba(37,211,102,0.1)"
      }
    },
    rowSelected: {
      border: "1px solid #25D366",
      background: isDark ? "rgba(37,211,102,0.14)" : "rgba(37,211,102,0.12)"
    },
    rowDesc: {
      display: "block",
      fontSize: "0.68rem",
      color: theme.palette.text.secondary,
      marginTop: 2
    },
    sectionTitle: {
      fontSize: "0.7rem",
      fontWeight: 650,
      marginTop: 10,
      marginBottom: 4,
      color: theme.palette.text.secondary,
      textTransform: "uppercase",
      letterSpacing: "0.03em"
    },
    picked: {
      marginTop: 8,
      fontSize: "0.72rem",
      color: isDark ? "#86efac" : "#15803d",
      fontWeight: 600
    }
  };
});

function parseInteractive(message) {
  if (!message) return null;
  try {
    if (message.dataJson) {
      const raw =
        typeof message.dataJson === "string"
          ? JSON.parse(message.dataJson)
          : message.dataJson;
      if (raw?.interactive) return raw.interactive;
      if (raw?.type && (raw.action || raw.body)) return raw;
      if (raw?.body_interactive) return raw.body_interactive;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Renderiza botões / lista (enquete) da API Oficial Meta na bolha do chat.
 * Interativo no UI: expandir lista e selecionar opção (preenche/envia resposta no chat).
 */
export default function InteractiveMessage({ message, onSelectOption }) {
  const classes = useStyles();
  const interactive = useMemo(() => parseInteractive(message), [message]);
  const [listOpen, setListOpen] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState("");

  const fallbackBody = String(message?.body || "").replace(/^🔘\s*|^📋\s*/, "");
  const bodyText = interactive?.body?.text || fallbackBody;
  const headerText =
    interactive?.header?.text ||
    (interactive?.header?.type === "text" ? interactive.header.text : null);
  const footerText = interactive?.footer?.text;

  const pick = (id, title, source) => {
    setSelectedId(id || title);
    setSelectedTitle(title);
    if (typeof onSelectOption === "function") {
      onSelectOption(message, { id, title, source });
    }
  };

  if (!interactive) {
    return (
      <div className={classes.root}>
        <div className={classes.bodyText}>
          <MarkdownWrapper>{fallbackBody || message?.body || ""}</MarkdownWrapper>
        </div>
      </div>
    );
  }

  const type = String(interactive.type || "").toLowerCase();

  return (
    <div className={classes.root}>
      {headerText ? <div className={classes.header}>{headerText}</div> : null}
      {bodyText ? (
        <div className={classes.bodyText}>
          <MarkdownWrapper>{bodyText}</MarkdownWrapper>
        </div>
      ) : null}
      {footerText ? <div className={classes.footer}>{footerText}</div> : null}

      {type === "button" &&
        (interactive.action?.buttons || []).map((btn, idx) => {
          const id = btn?.reply?.id || `btn-${idx}`;
          const title = btn?.reply?.title || btn?.title || `Opção ${idx + 1}`;
          const selected = selectedId === id;
          return (
            <button
              key={id}
              type="button"
              className={`${classes.btn} ${selected ? classes.btnSelected : ""}`}
              onClick={() => pick(id, title, "button")}
            >
              {title}
            </button>
          );
        })}

      {type === "list" && (
        <>
          <button
            type="button"
            className={classes.listCta}
            onClick={() => setListOpen((v) => !v)}
          >
            {listOpen
              ? "Ocultar opções"
              : interactive.action?.button || "Ver opções"}
          </button>
          {listOpen &&
            (interactive.action?.sections || []).map((section, sIdx) => (
              <div key={section?.title || sIdx}>
                {section?.title ? (
                  <div className={classes.sectionTitle}>{section.title}</div>
                ) : (
                  <div className={classes.sectionTitle}>Opções</div>
                )}
                {(section?.rows || []).map((row, rIdx) => {
                  const id = row?.id || `row-${sIdx}-${rIdx}`;
                  const title = row?.title || `Item ${rIdx + 1}`;
                  const selected = selectedId === id;
                  return (
                    <div
                      key={id}
                      role="button"
                      tabIndex={0}
                      className={`${classes.row} ${
                        selected ? classes.rowSelected : ""
                      }`}
                      onClick={() => pick(id, title, "list")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          pick(id, title, "list");
                        }
                      }}
                    >
                      {title}
                      {row?.description ? (
                        <span className={classes.rowDesc}>{row.description}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
        </>
      )}

      {selectedTitle ? (
        <div className={classes.picked}>Selecionado: {selectedTitle}</div>
      ) : null}
    </div>
  );
}
