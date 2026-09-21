/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { CONNECTIONS_FONT } from "./connectionsTypography";
import ConnectionsMagicFrame from "./ConnectionsMagicFrame";
import { useConnectionsMagicFrameStyles } from "./connectionsMagicUi";

const useStyles = makeStyles((theme) => ({
  header: {
    marginBottom: theme.spacing(0.5),
  },
  title: {
    fontFamily: CONNECTIONS_FONT,
    fontWeight: 500,
    fontSize: "1rem",
    letterSpacing: "-0.02em",
    color: theme.palette.text.primary,
    lineHeight: 1.25,
  },
  subtitle: {
    fontFamily: CONNECTIONS_FONT,
    fontWeight: 400,
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.25),
    lineHeight: 1.45,
  },
  content: {
    width: "100%",
  },
  hint: {
    fontFamily: CONNECTIONS_FONT,
    fontSize: "0.6875rem",
    fontWeight: 400,
    color: theme.palette.text.secondary,
    lineHeight: 1.45,
    marginBottom: theme.spacing(0.5),
    padding: theme.spacing(0.5, 0.75),
    borderRadius: 8,
    border: `1px solid ${
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.08)"
        : "rgba(15,23,42,0.06)"
    }`,
    background:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.03)"
        : "rgba(15,23,42,0.02)",
    "& a": {
      color: theme.palette.primary.main,
    },
  },
}));

export function ConnectionSetupHint({ children }) {
  const classes = useStyles();
  return (
    <Typography component="div" className={classes.hint}>
      {children}
    </Typography>
  );
}

export default function ConnectionSetupFluid({
  title,
  subtitle,
  hint,
  children,
  footer,
  wide = false,
  hidePageHeader = false,
  fluid = false,
}) {
  const classes = useStyles();
  const magicFrame = useConnectionsMagicFrameStyles();

  const inner = (
    <>
      {!hidePageHeader ? (
        <Box className={classes.header}>
          <Typography className={classes.title}>{title}</Typography>
          {subtitle ? (
            <Typography className={classes.subtitle}>{subtitle}</Typography>
          ) : null}
        </Box>
      ) : null}
      {hint ? <ConnectionSetupHint>{hint}</ConnectionSetupHint> : null}
      <Box className={classes.content}>{children}</Box>
    </>
  );

  const footerNode = footer ? (
    <Box className={magicFrame.setupStickyFooter}>{footer}</Box>
  ) : null;

  if (fluid) {
    return (
      <ConnectionsMagicFrame fluid noPanel formPanel>
        <Box className={magicFrame.embeddedForm}>
          <Box
            className={`${magicFrame.embeddedBody} ${magicFrame.setupBodyWithFooter}`}
          >
            {inner}
          </Box>
          {footerNode}
        </Box>
      </ConnectionsMagicFrame>
    );
  }

  return (
    <ConnectionsMagicFrame wide={wide}>
      <Box className={magicFrame.setupBodyWithFooter}>
        {inner}
        {footerNode}
      </Box>
    </ConnectionsMagicFrame>
  );
}
