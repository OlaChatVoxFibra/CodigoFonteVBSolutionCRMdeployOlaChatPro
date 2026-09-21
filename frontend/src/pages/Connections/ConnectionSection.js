/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Paper, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { CONNECTIONS_FONT } from "./connectionsTypography";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    root: {
      marginBottom: theme.spacing(3),
      flex: "1 1 0",
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
    },
    rootFlat: {
      marginBottom: 0,
      flex: "1 1 0",
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
    },
    header: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: theme.spacing(1),
      marginBottom: theme.spacing(1),
      paddingLeft: theme.spacing(0.25),
    },
    title: {
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 400,
      fontSize: "0.75rem",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
    },
    subtitle: {
      fontSize: "0.75rem",
      color: theme.palette.text.secondary,
      opacity: 0.85,
    },
    surface: {
      borderRadius: 0,
      overflow: "visible",
      width: "100%",
      flex: "1 1 0",
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      border: "none",
      background: "transparent",
      boxShadow: "none",
    },
    surfaceInner: {
      flex: 1,
      minHeight: 0,
      width: "100%",
    },
  };
});

export default function ConnectionSection({
  title,
  subtitle,
  action,
  children,
  noPadding = false,
  flat = false,
}) {
  const classes = useStyles();
  const showHeader = Boolean(title || subtitle || action);

  return (
    <Box className={flat ? classes.rootFlat : classes.root}>
      {showHeader ? (
        <Box className={classes.header}>
          <Box minWidth={0}>
            {title ? (
              <Typography className={classes.title}>{title}</Typography>
            ) : null}
            {subtitle ? (
              <Typography className={classes.subtitle}>{subtitle}</Typography>
            ) : null}
          </Box>
          {action || null}
        </Box>
      ) : null}
      <Paper className={classes.surface} elevation={0}>
        <Box className={classes.surfaceInner} p={noPadding ? 0 : 0.5}>
          {children}
        </Box>
      </Paper>
    </Box>
  );
}
