/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  LayoutGrid,
  User,
  Package,
  Globe,
  StickyNote,
  BarChart3
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
    bar: {
      display: "flex",
      alignItems: "stretch",
      width: "100%",
      gap: 0,
      marginBottom: 0,
      padding: 0,
      borderBottom: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #ECEEF1"
    },
    barDetail: {
      maxWidth: "100%",
      margin: "0 auto"
    },
    tab: {
      flex: "1 1 0",
      minWidth: 0,
      height: 30,
      padding: "0 10px",
      borderRadius: 0,
      border: "none",
      borderBottom: "1.5px solid transparent",
      background: "transparent",
      color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
      fontSize: 11,
      fontWeight: 500,
      fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif',
      letterSpacing: "0.01em",
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
      }
    },
    tabActive: {
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
      whiteSpace: "nowrap",
      lineHeight: 1.2
    },
    icon: {
      flexShrink: 0,
      opacity: 0.85
    }
  };
});

function StepTab({ active, onClick, label, classes }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={`${classes.tab} ${active ? classes.tabActive : ""}`}
      onClick={onClick}
    >
      <span className={classes.label}>{label}</span>
    </button>
  );
}

export default function LeadCreateStepDock({ activeStep, setActiveStep, variant }) {
  const classes = useStyles();
  const isDetail = variant === "detail";
  const steps = isDetail ? DETAIL_DOCK_STEPS : WIZARD_STEPS;
  const showAll = !isDetail && (activeStep === null || activeStep === "");

  return (
    <nav
      className={`${classes.bar} ${isDetail ? classes.barDetail : ""}`}
      aria-label={isDetail ? "Seções do lead" : "Etapas do formulário"}
    >
      {!isDetail && (
        <StepTab
          classes={classes}
          label="Todos"
          Icon={LayoutGrid}
          active={showAll}
          compact={isDetail}
          onClick={() => setActiveStep(null)}
        />
      )}
      {steps.map((step) => {
        const Icon = STEP_ICONS[step.id] || User;
        const active = activeStep === step.id;
        return (
          <StepTab
            key={step.id}
            classes={classes}
            label={step.label}
            Icon={Icon}
            active={active}
            compact={isDetail}
            onClick={() => setActiveStep(step.id)}
          />
        );
      })}
    </nav>
  );
}
