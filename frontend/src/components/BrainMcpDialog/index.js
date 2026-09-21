/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Check, Plug, X } from "lucide-react";
import { BRAIN_MCP_OPTIONS, ALL_BRAIN_MCP_IDS } from "../../config/brainMcpCatalog";
import BrainMcpIcon from "./BrainMcpIcon";
import useScheduleTranslateWhen from "../../hooks/useScheduleTranslateWhen";

const ACCENT = "#8b5cf6";
const ALL_MCP_IDS = ALL_BRAIN_MCP_IDS;

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    paper: {
      borderRadius: 16,
      maxWidth: 520,
      width: "100%",
    },
    titleRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      color: ACCENT,
      fontFamily: "-apple-system, 'SF Pro Text', 'Inter', sans-serif",
      fontWeight: 600,
      fontSize: 15,
    },
    lead: {
      fontSize: 13,
      color: theme.palette.text.secondary,
      lineHeight: 1.55,
      marginBottom: theme.spacing(1),
      fontFamily: "-apple-system, 'SF Pro Text', 'Inter', sans-serif",
    },
    toolbar: {
      display: "flex",
      justifyContent: "flex-end",
      marginBottom: theme.spacing(1.25),
    },
    selectAllBtn: {
      textTransform: "none",
      fontSize: 12,
      fontWeight: 500,
      padding: "4px 10px",
      borderRadius: 8,
      color: ACCENT,
      border: `1px solid ${isDark ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.25)"}`,
      background: isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.04)",
      "&:hover": {
        background: isDark ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.08)",
      },
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: 8,
      [theme.breakpoints.up("sm")]: {
        gridTemplateColumns: "1fr 1fr",
      },
    },
    card: {
      borderRadius: 12,
      padding: "12px 12px 11px",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
      cursor: "pointer",
      transition: "border-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease",
      textAlign: "left",
      "&:hover": {
        borderColor: isDark ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.25)",
        transform: "translateY(-1px)",
      },
    },
    cardSelected: {
      borderColor: isDark ? "rgba(139,92,246,0.55)" : "rgba(139,92,246,0.45)",
      boxShadow: isDark
        ? "0 0 0 1px rgba(139,92,246,0.25)"
        : "0 8px 24px rgba(139,92,246,0.12)",
      background: isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.04)",
    },
    cardTop: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 8,
    },
    cardBrand: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      background: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"}`,
    },
    cardTitle: {
      fontSize: 12.5,
      fontWeight: 600,
      color: theme.palette.text.primary,
      lineHeight: 1.25,
      fontFamily: "-apple-system, 'SF Pro Text', 'Inter', sans-serif",
    },
    cardProvider: {
      fontSize: 10,
      color: theme.palette.text.secondary,
      marginTop: 1,
    },
    cardDesc: {
      fontSize: 11,
      lineHeight: 1.45,
      color: theme.palette.text.secondary,
      fontFamily: "-apple-system, 'SF Pro Text', 'Inter', sans-serif",
    },
    check: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.12)"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      color: "transparent",
    },
    checkSelected: {
      background: `linear-gradient(135deg, ${ACCENT}, #60a5fa)`,
      borderColor: "transparent",
      color: "#fff",
    },
    footnote: {
      marginTop: theme.spacing(1.5),
      fontSize: 11,
      color: theme.palette.text.secondary,
      lineHeight: 1.45,
      fontFamily: "-apple-system, 'SF Pro Text', 'Inter', sans-serif",
    },
    connectBtn: {
      background: "#1e3a8a",
      color: "#fff !important",
      fontWeight: 600,
      textTransform: "none",
      borderRadius: 8,
      padding: "6px 16px",
      boxShadow: "none",
      "&:hover": {
        background: "#1e40af",
        boxShadow: "none",
      },
      "&.Mui-disabled": {
        background: "rgba(120,120,128,0.25) !important",
        color: "rgba(255,255,255,0.5) !important",
      },
    },
  };
});

export default function BrainMcpDialog({
  open,
  onClose,
  selectedMcps,
  onSave,
}) {
  useScheduleTranslateWhen(open);
  const classes = useStyles();
  const [draft, setDraft] = useState(selectedMcps || []);

  useEffect(() => {
    if (open) setDraft(Array.isArray(selectedMcps) ? [...selectedMcps] : []);
  }, [open, selectedMcps]);

  const allSelected = useMemo(
    () => ALL_MCP_IDS.every((id) => draft.includes(id)),
    [draft]
  );

  const toggle = (id) => {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    setDraft(allSelected ? [] : [...ALL_MCP_IDS]);
  };

  const handleSave = () => {
    onSave?.(draft);
    onClose?.();
  };

  const renderMcpCard = (item) => {
    const selected = draft.includes(item.id);
    return (
      <button
        key={item.id}
        type="button"
        className={`${classes.card} ${selected ? classes.cardSelected : ""}`}
        onClick={() => toggle(item.id)}
      >
        <div className={classes.cardTop}>
          <div className={classes.cardBrand}>
            <div className={classes.iconWrap}>
              <BrainMcpIcon id={item.id} size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className={classes.cardTitle}>{item.name}</div>
              <div className={classes.cardProvider}>{item.provider}</div>
            </div>
          </div>
          <span className={`${classes.check} ${selected ? classes.checkSelected : ""}`}>
            {selected ? <Check size={12} /> : null}
          </span>
        </div>
        <div className={classes.cardDesc}>{item.description}</div>
      </button>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} classes={{ paper: classes.paper }} maxWidth="sm" fullWidth>
      <DialogTitle style={{ paddingBottom: 4 }}>
        <Box className={classes.titleRow}>
          <Plug size={18} />
          <span>Conectar MCP ao Brain.AI</span>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography className={classes.lead}>
          Escolha quais servidores MCP ficam disponíveis para a inteligência do Brain nesta
          sessão. O Brain usará essas integrações como contexto ao responder.
        </Typography>

        <div className={classes.toolbar}>
          <Button
            size="small"
            className={classes.selectAllBtn}
            onClick={handleToggleAll}
            disableElevation
          >
            {allSelected ? "Desmarcar todos" : "Habilitar todos"}
          </Button>
        </div>

        <div className={classes.grid}>
          {BRAIN_MCP_OPTIONS.map(renderMcpCard)}
        </div>

        <Typography className={classes.footnote}>
          A conexão real com cada MCP (OAuth, tokens e permissões) será concluída nas
          integrações. Aqui você define quais fontes o Brain deve considerar ativas.
        </Typography>
      </DialogContent>
      <DialogActions style={{ padding: "8px 16px 16px" }}>
        <Button
          onClick={onClose}
          color="default"
          size="small"
          style={{ textTransform: "none" }}
          startIcon={<X size={14} />}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          className={classes.connectBtn}
          size="small"
          disableElevation
        >
          {draft.length ? `Conectar ${draft.length} MCP${draft.length > 1 ? "s" : ""}` : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
