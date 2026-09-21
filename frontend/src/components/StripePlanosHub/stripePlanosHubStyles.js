/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { makeStyles } from "@material-ui/core/styles";

/** Tipografia ClickUp / Plus Jakarta Sans — já carregada no index.html */
export const PLANOS_FONT =
  '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const useStripePlanosHubStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const hairline = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  const hairlineSoft = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.035)";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)";
  const surface = isDark ? "rgba(28,28,30,0.78)" : "rgba(255,255,255,0.92)";
  const detailBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(248,250,252,0.6)";

  return {
    root: {
      width: "100%",
      fontFamily: PLANOS_FONT,
      fontWeight: 400,
      "& *": { fontWeight: "inherit" },
      "& strong, & b": { fontWeight: 400 }
    },
    paper: {
      borderRadius: 14,
      border: `1px solid ${border}`,
      background: surface,
      backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)",
      overflow: "hidden",
      marginBottom: theme.spacing(1.5),
      boxShadow: isDark
        ? "0 4px 24px rgba(0,0,0,0.18)"
        : "0 1px 3px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.03)"
    },
    head: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: theme.spacing(2, 2.5),
      flexWrap: "wrap",
      borderBottom: `1px solid ${hairline}`
    },
    title: {
      fontFamily: PLANOS_FONT,
      fontWeight: 400,
      fontSize: 15,
      letterSpacing: "-0.02em",
      color: theme.palette.text.primary
    },
    meta: {
      fontFamily: PLANOS_FONT,
      fontWeight: 400,
      fontSize: 12,
      color: theme.palette.text.secondary,
      marginTop: 3,
      lineHeight: 1.5,
      letterSpacing: "-0.01em"
    },
    sectionDivider: {
      padding: theme.spacing(1.25, 2.5, 0.5),
      display: "flex",
      alignItems: "center",
      gap: 12
    },
    sectionDividerLabel: {
      fontFamily: PLANOS_FONT,
      fontSize: 11,
      fontWeight: 400,
      letterSpacing: "0.01em",
      color: theme.palette.text.secondary,
      whiteSpace: "nowrap"
    },
    sectionDividerLine: {
      flex: 1,
      height: 1,
      background: `linear-gradient(90deg, ${hairline} 0%, ${hairlineSoft} 100%)`
    },
    listTable: {
      fontFamily: PLANOS_FONT,
      fontWeight: 400,
      "& th": {
        fontSize: 10,
        fontWeight: 400,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.45)",
        borderBottom: `1px solid ${hairline}`,
        padding: theme.spacing(1, 2.5),
        background: "transparent"
      },
      "& td": {
        fontSize: 13,
        fontWeight: 400,
        letterSpacing: "-0.01em",
        borderBottom: `1px solid ${hairlineSoft}`,
        padding: theme.spacing(1.1, 2.5),
        verticalAlign: "middle",
        color: theme.palette.text.primary
      },
      "& tbody tr:last-child td": {
        borderBottom: "none"
      },
      "& tbody tr:hover": {
        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.015)"
      }
    },
    detailBox: {
      padding: theme.spacing(1.75, 2.5),
      borderTop: `1px solid ${hairlineSoft}`,
      background: detailBg
    },
    planName: {
      fontWeight: 400,
      fontSize: 13,
      letterSpacing: "-0.01em",
      color: theme.palette.text.primary
    },
    mono: {
      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
      fontSize: 10,
      fontWeight: 400,
      wordBreak: "break-all",
      opacity: 0.55,
      marginTop: 2
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 400,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: theme.palette.text.secondary,
      margin: theme.spacing(1.5, 0, 0.75)
    },
    refreshBtn: {
      textTransform: "none",
      borderRadius: 9,
      fontFamily: PLANOS_FONT,
      fontWeight: 400,
      fontSize: 12,
      letterSpacing: "-0.01em",
      boxShadow: "none",
      borderColor: border
    },
    actionBtn: {
      textTransform: "none",
      borderRadius: 8,
      fontFamily: PLANOS_FONT,
      fontSize: 12,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      minWidth: 0,
      padding: "4px 10px",
      boxShadow: "none"
    },
    iconBtn: {
      borderRadius: 8,
      padding: 6,
      color: theme.palette.text.secondary,
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
        color: theme.palette.text.primary
      }
    },
    empty: {
      padding: theme.spacing(5, 2),
      textAlign: "center",
      fontFamily: PLANOS_FONT,
      fontWeight: 400,
      fontSize: 13,
      color: theme.palette.text.secondary
    },
    featureList: {
      margin: "4px 0 0",
      paddingLeft: 18,
      fontSize: 12,
      fontWeight: 400,
      color: theme.palette.text.secondary,
      lineHeight: 1.65
    },
    dialogPaper: {
      borderRadius: 14,
      fontFamily: PLANOS_FONT,
      fontWeight: 400
    },
    dialogTitle: {
      fontFamily: PLANOS_FONT,
      fontWeight: 400,
      fontSize: 15,
      letterSpacing: "-0.02em"
    },
    priceCell: {
      fontWeight: 400,
      fontSize: 13,
      letterSpacing: "-0.01em"
    }
  };
});
