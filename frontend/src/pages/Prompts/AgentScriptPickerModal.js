/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Dialog, DialogContent, IconButton, List, ListItem, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    paper: {
      borderRadius: 18,
      overflow: "hidden",
      maxHeight: "min(420px, 72vh)",
      background: isDark ? "rgba(28,28,30,0.98)" : "rgba(255,255,255,0.98)",
      boxShadow: isDark
        ? "0 24px 80px rgba(0,0,0,0.55), 0 0 1px rgba(255,255,255,0.1)"
        : "0 24px 80px rgba(15,23,42,0.14), 0 0 1px rgba(15,23,42,0.06)"
    },
    titleRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing(1.5, 2, 0.5),
      borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.06)"
    },
    title: {
      fontWeight: 600,
      fontSize: "1.02rem",
      letterSpacing: "-0.03em",
      fontFamily: '"Helvetica Neue", Helvetica, system-ui, sans-serif'
    },
    subtitle: {
      fontSize: 12,
      opacity: 0.55,
      marginTop: 2,
      letterSpacing: "-0.01em"
    },
    list: {
      padding: theme.spacing(1, 1, 1.5),
      overflowY: "auto",
      maxHeight: 340
    },
    row: {
      borderRadius: 12,
      marginBottom: 6,
      padding: theme.spacing(0.75, 1),
      border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(15,23,42,0.07)",
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
      transition: "background 0.15s ease, border-color 0.15s ease",
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(99,102,241,0.06)",
        borderColor: isDark ? "rgba(129,140,248,0.35)" : "rgba(99,102,241,0.25)"
      }
    },
    rowInner: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      width: "100%"
    },
    emojiCell: {
      width: 40,
      height: 40,
      borderRadius: 11,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 20,
      flexShrink: 0,
      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)"
    },
    textCell: {
      flex: 1,
      minWidth: 0
    },
    primary: {
      fontWeight: 600,
      fontSize: 14,
      letterSpacing: "-0.02em",
      lineHeight: 1.3
    },
    secondary: {
      fontSize: 12,
      opacity: 0.62,
      marginTop: 2,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    },
    empty: {
      padding: theme.spacing(3, 2),
      textAlign: "center",
      opacity: 0.55,
      fontSize: 13
    }
  };
});

/**
 * Modal compacto estilo Apple para escolher ação (/) ou variável (*).
 */
export default function AgentScriptPickerModal({
  open,
  mode,
  items,
  onPick,
  onClose,
  title,
  hint
}) {
  const classes = useStyles();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      classes={{ paper: classes.paper }}
      disableAutoFocus
      disableEnforceFocus
      disableScrollLock
    >
      <Box className={classes.titleRow}>
        <Box>
          <Typography className={classes.title}>{title}</Typography>
          {hint ? (
            <Typography className={classes.subtitle} component="div">
              {hint}
            </Typography>
          ) : null}
        </Box>
        <IconButton
          size="small"
          aria-label="fechar"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose(e);
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <DialogContent style={{ padding: 0 }}>
        {items.length === 0 ? (
          <Typography className={classes.empty}>
            {mode === "slash"
              ? "Cadastre ações ou mídias no agente."
              : "Nenhuma variável corresponde ao filtro."}
          </Typography>
        ) : (
          <List className={classes.list} disablePadding>
            {items.map((it) => (
              <ListItem
                key={it.key}
                button
                className={classes.row}
                onClick={() => {
                  onPick(it);
                }}
                disableGutters
              >
                <Box className={classes.rowInner}>
                  <Box className={classes.emojiCell}>{it.emoji || "✨"}</Box>
                  <Box className={classes.textCell}>
                    <Typography className={classes.primary}>{it.title}</Typography>
                    <Typography className={classes.secondary} component="div">
                      {it.subtitle}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
