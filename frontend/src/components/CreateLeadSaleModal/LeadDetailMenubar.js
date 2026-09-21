/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  LayoutGrid,
  BarChart3,
  User,
  Package,
  Globe,
  StickyNote
} from "lucide-react";
import { WIZARD_STEPS, DETAIL_DOCK_STEPS } from "./leadWizardConstants";

const STEP_ICONS = {
  summary: BarChart3,
  personal: User,
  product: Package,
  origin: Globe,
  notes: StickyNote
};

const useStyles = makeStyles((theme) => {
  const dark = theme.palette.type === "dark";
  const accent = dark ? "#93C5FD" : "#1e3a8a";

  return {
    root: {
      display: "flex",
      alignItems: "stretch",
      width: "100%",
      minHeight: 30,
      padding: 0,
      gap: 0,
      border: "none",
      borderBottom: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #ECEEF1",
      background: "transparent",
      boxShadow: "none"
    },
    item: {
      flex: "1 1 0",
      minWidth: 0,
      height: 30,
      padding: "0 10px",
      borderRadius: 0,
      border: "none",
      borderBottom: "1.5px solid transparent",
      outline: "none",
      background: "transparent",
      color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
      boxShadow: "none",
      fontSize: 11,
      fontWeight: 500,
      fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif',
      letterSpacing: "0.01em",
      lineHeight: 1.2,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 0,
      marginBottom: -1,
      transition: "all 0.15s ease",
      "&:hover": {
        color: dark ? "rgba(147,197,253,0.9)" : accent,
        borderBottomColor: dark ? "rgba(147,197,253,0.4)" : "rgba(30,58,138,0.3)"
      },
      "&:focus-visible": {
        boxShadow: `0 0 0 2px ${dark ? "rgba(96,165,250,0.2)" : "rgba(37,99,235,0.12)"}`
      }
    },
    itemActive: {
      color: accent,
      fontWeight: 600,
      borderBottomColor: accent,
      "&:hover": {
        color: accent,
        borderBottomColor: accent
      }
    },
    label: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    },
    icon: {
      flexShrink: 0,
      opacity: 0.85
    }
  };
});

export default function LeadDetailMenubar({ activeStep, setActiveStep, variant = "detail" }) {
  const classes = useStyles();
  const isCreate = variant === "create";
  const steps = isCreate ? WIZARD_STEPS : DETAIL_DOCK_STEPS;
  const showAll = activeStep === null || activeStep === "";

  return (
    <nav
      className={classes.root}
      aria-label={isCreate ? "Seções do formulário" : "Seções do lead"}
    >
      <button
        type="button"
        aria-label="Todos"
        aria-pressed={showAll}
        className={`${classes.item} ${showAll ? classes.itemActive : ""}`}
        onClick={() => setActiveStep(null)}
      >
        <span className={classes.label}>Todos</span>
      </button>

      {steps.map((step) => {
        const active = !showAll && activeStep === step.id;
        return (
          <button
            key={step.id}
            type="button"
            aria-label={step.label}
            aria-pressed={active}
            className={`${classes.item} ${active ? classes.itemActive : ""}`}
            onClick={() => setActiveStep(step.id)}
          >
            <span className={classes.label}>{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
