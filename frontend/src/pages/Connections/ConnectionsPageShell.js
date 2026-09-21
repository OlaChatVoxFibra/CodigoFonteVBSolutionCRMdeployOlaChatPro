/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  outer: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    animation: "$fadeIn 0.35s ease-out",
  },
  inner: {
    width: "100%",
    maxWidth: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  fullBleed: {
    width: "100%",
    marginLeft: 0,
    marginRight: 0,
  },
  "@keyframes fadeIn": {
    from: { opacity: 0, transform: "translateY(6px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
}));

/**
 * Container fluido para páginas de conexão (preenche largura disponível).
 */
export default function ConnectionsPageShell({
  children,
  fullBleed = false,
  noPadding = false,
}) {
  const classes = useStyles();
  return (
    <Box className={classes.outer} px={noPadding ? 0 : 0.5}>
      <Box
        className={`${classes.inner} ${fullBleed ? classes.fullBleed : ""}`}
      >
        {children}
      </Box>
    </Box>
  );
}
