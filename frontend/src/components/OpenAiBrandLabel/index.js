/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import IntegrationBrandIcon from "../../pages/Connections/IntegrationBrandIcon";

const useStyles = makeStyles(() => ({
  root: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    verticalAlign: "middle",
    lineHeight: 1.2,
  },
  label: {
    fontSize: "inherit",
    fontWeight: "inherit",
  },
}));

/** Ícone OpenAI + rótulo (ex. "Conexões — OpenAI (GPT)"). */
export default function OpenAiBrandLabel({
  label = "OpenAI",
  className,
  labelClassName,
}) {
  const classes = useStyles();
  return (
    <span className={`${classes.root} ${className || ""}`}>
      <IntegrationBrandIcon brandKey="openai" variant="table" plain />
      <span className={`${classes.label} ${labelClassName || ""}`}>{label}</span>
    </span>
  );
}
