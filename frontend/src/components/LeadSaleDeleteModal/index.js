/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
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
    title: {
      padding: theme.spacing(2, 2, 0.25),
      fontSize: 15,
      fontWeight: 400,
      letterSpacing: "-0.03em",
      color: theme.palette.text.primary,
    },
    content: {
      padding: theme.spacing(0.5, 2, 1),
      "& .MuiFormControlLabel-root": {
        marginLeft: -6,
        marginRight: 0,
      },
      "& .MuiRadio-root": {
        padding: 6,
      },
    },
    hint: {
      fontSize: 11,
      fontWeight: 400,
      color: theme.palette.text.secondary,
      lineHeight: 1.45,
      letterSpacing: "-0.01em",
      marginBottom: theme.spacing(1),
    },
    leadName: {
      fontWeight: 400,
      fontSize: 12,
      color: theme.palette.text.primary,
      marginBottom: theme.spacing(0.75),
      letterSpacing: "-0.01em",
    },
    radioGroup: {
      "& .MuiFormControlLabel-label": {
        fontSize: 12,
        fontWeight: 400,
        fontFamily: HELVETICA_NEUE,
        letterSpacing: "-0.01em",
      },
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
    btnCancel: {
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
    btnDelete: {
      backgroundColor: `${theme.palette.error.main} !important`,
      color: `${topbarContrast} !important`,
      "&:hover": {
        backgroundColor: `${theme.palette.error.dark} !important`,
      },
    },
    btnDeleteMuted: {
      backgroundColor: `${topbar} !important`,
      color: `${topbarContrast} !important`,
      "&:hover": {
        backgroundColor: `${topbarHover} !important`,
      },
    },
  };
});

export default function LeadSaleDeleteModal({
  open,
  onClose,
  lead,
  onConfirm,
  deleting,
}) {
  const classes = useStyles();
  const [mode, setMode] = useState("leadOnly");
  const hasContact = Boolean(lead?.contactId);

  useEffect(() => {
    if (open) setMode("leadOnly");
  }, [open, lead?.id]);

  const displayName =
    lead?.name || lead?.companyName || (lead?.id ? `Lead #${lead.id}` : "este lead");

  const handleConfirm = () => {
    onConfirm({ deleteContact: mode === "leadAndContact" });
  };

  const useDangerStyle = mode === "leadAndContact" && hasContact;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{ className: classes.paper }}
    >
      <DialogTitle className={classes.title} disableTypography>
        Excluir lead
      </DialogTitle>
      <DialogContent className={classes.content}>
        <Typography className={classes.hint}>
          Escolha o que remover. Esta ação não pode ser desfeita.
        </Typography>
        <Typography className={classes.leadName}>{displayName}</Typography>
        <FormControl component="fieldset" fullWidth>
          <RadioGroup
            className={classes.radioGroup}
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <FormControlLabel
              value="leadOnly"
              control={<Radio color="primary" size="small" />}
              label="Somente o lead"
            />
            <FormControlLabel
              value="leadAndContact"
              control={<Radio color="primary" size="small" disabled={!hasContact} />}
              label={
                hasContact
                  ? "Lead e contato"
                  : "Lead e contato (indisponível)"
              }
            />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions className={classes.actions} disableSpacing>
        <Button
          variant="contained"
          disableElevation
          onClick={onClose}
          disabled={deleting}
          className={classes.btnCancel}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={handleConfirm}
          disabled={deleting || (mode === "leadAndContact" && !hasContact)}
          className={useDangerStyle ? classes.btnDelete : classes.btnDeleteMuted}
        >
          {deleting ? "Excluindo…" : "Excluir"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
