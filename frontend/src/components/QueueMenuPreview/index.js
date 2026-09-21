/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { makeStyles, Box, Typography } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  wrap: {
    marginTop: 8,
    padding: "12px 14px",
    borderRadius: 12,
    background:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.04)"
        : "linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)",
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    }`,
  },
  label: {
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: theme.palette.text.secondary,
    marginBottom: 8,
  },
  bubble: {
    maxWidth: "92%",
    padding: "10px 12px",
    borderRadius: "12px 12px 12px 4px",
    background: theme.palette.type === "dark" ? "#005c4b" : "#dcf8c6",
    color: theme.palette.type === "dark" ? "#e9edef" : "#111827",
    fontSize: 13,
    lineHeight: 1.45,
    whiteSpace: "pre-wrap",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    boxShadow:
      theme.palette.type === "dark"
        ? "none"
        : "0 1px 2px rgba(0,0,0,0.06)",
  },
  optionLine: {
    marginTop: 4,
  },
}));

export default function QueueMenuPreview({ headerText, queues = [] }) {
  const classes = useStyles();
  const header = (headerText || "Escolha uma opção:").trim();

  return (
    <Box className={classes.wrap}>
      <Typography className={classes.label}>Preview</Typography>
      <Box className={classes.bubble}>
        <div>{header}</div>
        {queues.map((q, index) => (
          <div key={q.id || index} className={classes.optionLine}>
            {`*[ ${index + 1} ]* - ${q.name || `Fila ${index + 1}`}`}
          </div>
        ))}
        <div className={classes.optionLine}>*[ Sair ]* - Encerrar</div>
      </Box>
    </Box>
  );
}
