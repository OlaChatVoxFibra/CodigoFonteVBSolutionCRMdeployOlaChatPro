/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CloseIcon from "@material-ui/icons/Close";
import CardGiftcardIcon from "@material-ui/icons/CardGiftcard";
import {
  HELVETICA_NEUE,
  getTopbarMain,
  getTopbarContrast,
  getTopbarHover,
} from "../../utils/appleModalTheme";

const useStyles = makeStyles((theme) => {
  const topbar = getTopbarMain(theme);
  const topbarHover = getTopbarHover(theme);
  const topbarContrast = getTopbarContrast(theme);
  const isDark = theme.palette.type === "dark";

  return {
    paper: {
      borderRadius: 20,
      maxWidth: 340,
      overflow: "hidden",
      fontFamily: HELVETICA_NEUE,
      fontWeight: 400,
      backgroundColor: isDark
        ? "rgba(44,44,46,0.9)"
        : "rgba(255,255,255,0.94)",
      backdropFilter: "saturate(200%) blur(28px)",
      WebkitBackdropFilter: "saturate(200%) blur(28px)",
      boxShadow: isDark
        ? "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)"
        : "0 24px 64px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.95)",
      border: isDark
        ? "0.5px solid rgba(255,255,255,0.12)"
        : "0.5px solid rgba(255,255,255,0.8)",
    },
    closeBtn: {
      position: "absolute",
      right: 6,
      top: 6,
      zIndex: 2,
      padding: 6,
      color: isDark ? "rgba(235,235,245,0.6)" : "rgba(60,60,67,0.55)",
    },
    scene: {
      position: "relative",
      padding: theme.spacing(2, 2, 1),
      textAlign: "center",
      overflow: "hidden",
    },
    confetti: {
      position: "absolute",
      width: 5,
      height: 5,
      borderRadius: 1,
      opacity: 0.7,
      animation: "$confettiFall 2.2s ease-in infinite",
    },
    "@keyframes confettiFall": {
      "0%": { transform: "translateY(-12px) rotate(0deg)", opacity: 0 },
      "20%": { opacity: 0.8 },
      "100%": { transform: "translateY(140px) rotate(360deg)", opacity: 0 },
    },
    giftWrap: {
      display: "inline-flex",
      marginBottom: theme.spacing(0.75),
      animation: "$giftPulse 2.4s ease-in-out infinite",
    },
    "@keyframes giftPulse": {
      "0%, 100%": { transform: "scale(1)" },
      "50%": { transform: "scale(1.04) translateY(-3px)" },
    },
    giftIcon: {
      fontSize: 40,
      color: topbar,
      opacity: 0.92,
    },
    partyRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      marginBottom: theme.spacing(0.25),
      fontSize: 16,
      lineHeight: 1,
      opacity: 0.9,
    },
    title: {
      fontSize: 15,
      fontWeight: 400,
      letterSpacing: "-0.03em",
      color: theme.palette.text.primary,
      marginBottom: theme.spacing(0.25),
    },
    subtitle: {
      fontSize: 11,
      fontWeight: 400,
      color: theme.palette.text.secondary,
      lineHeight: 1.4,
      letterSpacing: "-0.01em",
    },
    leadName: {
      fontSize: 12,
      fontWeight: 400,
      color: topbar,
      marginTop: theme.spacing(0.75),
      letterSpacing: "-0.01em",
    },
    actions: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "nowrap",
      padding: theme.spacing(1, 1.75, 1.75),
      gap: theme.spacing(0.75),
      borderTop: isDark
        ? "0.5px solid rgba(255,255,255,0.08)"
        : "0.5px solid rgba(60,60,67,0.1)",
      "& > button": {
        flex: 1,
        minWidth: 0,
        textTransform: "none",
        borderRadius: 11,
        fontFamily: HELVETICA_NEUE,
        fontSize: 12,
        fontWeight: 400,
        letterSpacing: "-0.01em",
        minHeight: 32,
        padding: "6px 10px",
        boxShadow: "none",
        whiteSpace: "nowrap",
      },
    },
    btnPrimary: {
      backgroundColor: `${topbar} !important`,
      color: `${topbarContrast} !important`,
      "&:hover": {
        backgroundColor: `${topbarHover} !important`,
      },
    },
    btnSecondary: {
      color: `${theme.palette.text.primary} !important`,
      backgroundColor: isDark
        ? "rgba(120,120,128,0.28) !important"
        : "rgba(120,120,128,0.16) !important",
      border: "none !important",
      "&:hover": {
        backgroundColor: isDark
          ? "rgba(120,120,128,0.36) !important"
          : "rgba(120,120,128,0.22) !important",
      },
    },
  };
});

const CONFETTI = [
  { left: "12%", delay: "0s", color: "#F59E0B" },
  { left: "78%", delay: "0.3s", color: "#6366F1" },
  { left: "48%", delay: "0.6s", color: "#10B981" },
];

export default function LeadSaleCongratsModal({
  open,
  onClose,
  leadName,
  stageLabel,
  onAdvance,
  onCreateCompany,
  advancing,
  creatingCompany,
}) {
  const classes = useStyles();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{ className: classes.paper }}
    >
      <IconButton
        size="small"
        className={classes.closeBtn}
        onClick={onClose}
        aria-label="Fechar"
      >
        <CloseIcon style={{ fontSize: 16 }} />
      </IconButton>
      <DialogContent style={{ padding: 0 }}>
        <Box className={classes.scene}>
          {CONFETTI.map((c, i) => (
            <span
              key={i}
              className={classes.confetti}
              style={{
                left: c.left,
                backgroundColor: c.color,
                animationDelay: c.delay,
              }}
            />
          ))}
          <div className={classes.partyRow} aria-hidden>
            <span>🎉</span>
            <span>✨</span>
          </div>
          <Box className={classes.giftWrap}>
            <CardGiftcardIcon className={classes.giftIcon} />
          </Box>
          <Typography className={classes.title}>Parabéns pela venda!</Typography>
          <Typography className={classes.subtitle}>
            {stageLabel
              ? `Etapa «${stageLabel}»`
              : "Conclua ou registre a empresa"}
          </Typography>
          {leadName ? (
            <Typography className={classes.leadName}>{leadName}</Typography>
          ) : null}
        </Box>
      </DialogContent>
      <DialogActions className={classes.actions} disableSpacing>
        <Button
          variant="contained"
          disableElevation
          className={`${classes.btnSecondary}`}
          onClick={onCreateCompany}
          disabled={advancing || creatingCompany}
        >
          {creatingCompany ? "Abrindo…" : "Criar empresa"}
        </Button>
        <Button
          variant="contained"
          disableElevation
          className={classes.btnPrimary}
          onClick={onAdvance}
          disabled={advancing || creatingCompany}
        >
          {advancing ? "Avançando…" : "Avançar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
