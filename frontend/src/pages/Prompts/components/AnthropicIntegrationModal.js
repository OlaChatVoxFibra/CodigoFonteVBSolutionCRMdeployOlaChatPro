/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import AnthropicConnectionSetupForm from "../../Connections/setup/AnthropicConnectionSetupForm";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    overlay: {
      position: "fixed",
      inset: 0,
      zIndex: 1299,
      backgroundColor: isDark ? "rgba(0, 0, 0, 0.38)" : "rgba(15, 23, 42, 0.32)",
      pointerEvents: "auto"
    },
    paper: {
      borderRadius: 16,
      overflow: "hidden",
      maxHeight: "92vh",
      display: "flex",
      flexDirection: "column",
      background: isDark ? "rgba(28, 28, 30, 0.98)" : "#ffffff",
      boxShadow: isDark
        ? "0 24px 80px rgba(0,0,0,0.55)"
        : "0 24px 80px rgba(15,23,42,0.12), 0 0 1px rgba(0,0,0,0.08)"
    },
    titleRow: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      padding: theme.spacing(2, 2.5, 1.25),
      borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
      flexShrink: 0
    },
    title: {
      fontWeight: 600,
      fontSize: "1.05rem",
      letterSpacing: "-0.02em",
      color: theme.palette.text.primary
    },
    subtitle: {
      fontSize: 12,
      lineHeight: 1.45,
      color: theme.palette.text.secondary,
      marginTop: 4,
      maxWidth: 640
    },
    dialogContent: {
      padding: 0,
      flex: 1,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }
  };
});

export default function AnthropicIntegrationModal({
  open,
  onClose,
  initialModel = "",
  onSaved
}) {
  const classes = useStyles();

  return (
    <>
      {open ? <Box className={classes.overlay} onClick={onClose} aria-hidden /> : null}
      <Dialog
        open={open}
        onClose={onClose}
        hideBackdrop
        maxWidth="lg"
        fullWidth
        scroll="paper"
        classes={{ paper: classes.paper }}
        style={{ zIndex: 1300 }}
      >
        <Box className={classes.titleRow}>
          <Box>
            <Typography component="h2" className={classes.title}>
              Integração Claude (Anthropic)
            </Typography>
            <Typography className={classes.subtitle}>
              Integração Claude — isolado da Open IA. Agentes em Agente IA → Agentes.
            </Typography>
          </Box>
          <IconButton aria-label="Fechar" size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent className={classes.dialogContent}>
          <AnthropicConnectionSetupForm
            presentation="promptsModal"
            hidePageHeader
            isEdit
            initialModel={initialModel}
            onCancel={onClose}
            onSaved={onSaved}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
