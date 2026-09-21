/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Fab, Tooltip } from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles({
  fab: {
    position: "fixed",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    zIndex: 1200,
    backgroundColor: "#131B2D",
    color: "#fff",
    boxShadow: "0 8px 24px rgba(19, 27, 45, 0.45)",
    "&:hover": {
      backgroundColor: "#1a2438",
    },
  },
});

export default function ConnectionsNewFab({
  onClick,
  label = "Nova conexão",
  disabled = false,
}) {
  const classes = useStyles();

  return (
    <Tooltip title={label} placement="left">
      <span>
        <Fab
          className={`${classes.fab} premium-fab`}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          <AddIcon />
        </Fab>
      </span>
    </Tooltip>
  );
}
