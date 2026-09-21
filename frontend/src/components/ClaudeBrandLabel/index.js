/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import IntegrationBrandIcon from "../../pages/Connections/IntegrationBrandIcon";

const CLAUDE_ACCENT = "#D97757";

const useStyles = makeStyles(() => ({
  root: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    verticalAlign: "middle",
    lineHeight: 1.2
  },
  label: {
    fontSize: "inherit",
    fontWeight: "inherit"
  }
}));

/** Ícone Claude + texto "Anthropic Claude" (ou rótulo customizado). */
export default function ClaudeBrandLabel({ label = "Anthropic Claude", className, labelClassName }) {
  const classes = useStyles();
  return (
    <span className={`${classes.root} ${className || ""}`}>
      <IntegrationBrandIcon
        brandKey="claude"
        variant="table"
        plain
        accentColor={CLAUDE_ACCENT}
      />
      <span className={`${classes.label} ${labelClassName || ""}`}>{label}</span>
    </span>
  );
}

export { CLAUDE_ACCENT };
