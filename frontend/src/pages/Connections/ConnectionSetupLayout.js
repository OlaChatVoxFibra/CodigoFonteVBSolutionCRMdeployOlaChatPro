/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Grid,
  Divider,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Close as CloseIcon } from "@material-ui/icons";
import ConnectionChannelWizard from "../../components/HelpStepsList/ConnectionChannelWizard";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    root: {
      borderRadius: 18,
      overflow: "hidden",
      border: `1px solid ${
        isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.07)"
      }`,
      background: isDark
        ? "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)"
        : "linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)",
      boxShadow: isDark
        ? "0 12px 40px rgba(0,0,0,0.28)"
        : "0 8px 32px rgba(15,23,42,0.06)",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing(2, 2.25),
      borderBottom: `1px solid ${
        isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"
      }`,
    },
    title: {
      fontWeight: 650,
      fontSize: "1.05rem",
      letterSpacing: "-0.02em",
    },
    closeBtn: {
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(120,120,128,0.1)",
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(120,120,128,0.16)",
      },
    },
    body: {
      padding: theme.spacing(2.25, 2.25, 2),
    },
    formCol: {
      minWidth: 0,
    },
    wizardCol: {
      minWidth: 0,
      [theme.breakpoints.down("sm")]: {
        marginTop: theme.spacing(1.5),
      },
    },
    wizardSticky: {
      position: "sticky",
      top: theme.spacing(2),
    },
    footer: {
      display: "flex",
      flexWrap: "wrap",
      gap: theme.spacing(1),
      justifyContent: "flex-end",
      padding: theme.spacing(1.75, 2.25),
      borderTop: `1px solid ${
        isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"
      }`,
      backgroundColor: isDark ? "rgba(0,0,0,0.12)" : "rgba(248,250,252,0.8)",
      "& > button": {
        textTransform: "none",
        borderRadius: 10,
        fontWeight: 500,
      },
    },
  };
});

/**
 * Layout de configuração em página (formulário + passo a passo à direita).
 */
export default function ConnectionSetupLayout({
  open,
  title,
  onClose,
  wizardSteps,
  wizardResetKey,
  wizardLabel,
  children,
  footer,
  hideSidebarWizard = false,
}) {
  const classes = useStyles();
  if (!open) return null;

  const hasWizard = Boolean(wizardSteps?.length) && !hideSidebarWizard;

  return (
    <Paper className={classes.root} elevation={0}>
      <Box className={classes.header}>
        <Typography className={classes.title}>{title}</Typography>
        {onClose ? (
          <IconButton
            size="small"
            className={classes.closeBtn}
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null}
      </Box>
      <Box className={classes.body}>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={hasWizard ? 8 : 12} className={classes.formCol}>
            {children}
          </Grid>
          {hasWizard ? (
            <Grid item xs={12} md={4} className={classes.wizardCol}>
              <Box className={classes.wizardSticky}>
                <ConnectionChannelWizard
                  steps={wizardSteps}
                  resetKey={wizardResetKey}
                  label={wizardLabel}
                />
              </Box>
            </Grid>
          ) : null}
        </Grid>
      </Box>
      {footer ? (
        <>
          <Divider />
          <Box className={classes.footer}>{footer}</Box>
        </>
      ) : null}
    </Paper>
  );
}
