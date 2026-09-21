/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Typography, TextField, FormControl } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { CONNECTIONS_FONT } from "./connectionsTypography";
import {
  getConnectionsMinimalFieldWrap,
} from "./connectionsTheme";

const useStyles = makeStyles((theme) => ({
  root: {
    marginBottom: theme.spacing(1),
    "&:last-child": { marginBottom: 0 },
  },
  title: {
    fontFamily: CONNECTIONS_FONT,
    fontSize: "0.625rem",
    fontWeight: 500,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.35),
  },
}));

/** Marcação leve apenas no input (não em Box/Switch). */
export function ConnectionFieldWrap({ children }) {
  return <Box className="connection-field-wrap">{children}</Box>;
}

function wrapFieldChild(child) {
  if (child == null || child === false) return child;
  if (child.type === ConnectionFieldWrap) return child;
  if (child.type === Typography || child.type === Box) return child;
  if (child.type === TextField || child.type === FormControl) {
    return <ConnectionFieldWrap>{child}</ConnectionFieldWrap>;
  }
  return child;
}

export function ConnectionSetupFormShell({ children, className }) {
  const classes = useSetupFormStyles();
  return <Box className={`${classes.formRoot} ${className || ""}`}>{children}</Box>;
}

const useSetupFormStyles = makeStyles((theme) => ({
  formRoot: {
    maxWidth: "100%",
    width: "100%",
    fontFamily: CONNECTIONS_FONT,
    "& .MuiTextField-root, & .MuiFormControl-root": {
      margin: 0,
      width: "100%",
    },
    "& .connection-field-wrap": getConnectionsMinimalFieldWrap(theme),
    "& .MuiInputLabel-root": {
      fontFamily: CONNECTIONS_FONT,
    },
  },
}));

export default function ConnectionSetupSection({ title, children }) {
  const classes = useStyles();
  return (
    <Box className={classes.root}>
      {title ? (
        <Typography className={classes.title} component="h3">
          {title}
        </Typography>
      ) : null}
      <Box className={classes.body}>
        {React.Children.map(children, wrapFieldChild)}
      </Box>
    </Box>
  );
}
