/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Chip, makeStyles } from "@material-ui/core";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    root: {
      display: "inline",
      lineHeight: "inherit"
    },
    mcpChip: {
      display: "inline-flex",
      verticalAlign: "middle",
      height: 18,
      marginRight: 4,
      marginBottom: 1,
      fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: 9.5,
      fontWeight: 700,
      letterSpacing: "0.05em",
      borderRadius: 5,
      backgroundColor: isDark ? "rgba(139,92,246,0.22)" : "rgba(139,92,246,0.14)",
      color: isDark ? "#ddd6fe" : "#6d28d9",
      border: `1px solid ${isDark ? "rgba(139,92,246,0.4)" : "rgba(139,92,246,0.32)"}`,
      boxShadow: isDark
        ? "0 1px 2px rgba(0,0,0,0.2)"
        : "0 1px 2px rgba(109,40,217,0.08)",
      "& .MuiChip-label": {
        paddingLeft: 6,
        paddingRight: 6,
        lineHeight: 1.2
      }
    }
  };
});

/** "MCP CRM", "MCP Database" ou "MCP" viram chip roxo inline. */
const MCP_SPLIT = /(MCP(?:\s+CRM|\s+Database)?)/g;
const MCP_MATCH = /^(MCP(?:\s+CRM|\s+Database)?)$/;

export default function McpTagText({ text, className }) {
  const classes = useStyles();
  if (!text) return null;

  const parts = String(text).split(MCP_SPLIT).filter(Boolean);

  return (
    <span className={`${classes.root} ${className || ""}`}>
      {parts.map((part, index) =>
        MCP_MATCH.test(part.trim()) ? (
          <Chip
            key={`${part}-${index}`}
            size="small"
            label={part.trim()}
            className={classes.mcpChip}
            component="span"
          />
        ) : (
          <span key={`t-${index}`}>{part}</span>
        )
      )}
    </span>
  );
}
