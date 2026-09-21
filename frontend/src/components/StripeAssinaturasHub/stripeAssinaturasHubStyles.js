/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { makeStyles } from "@material-ui/core/styles";
import { PLANOS_FONT } from "../StripePlanosHub/stripePlanosHubStyles";

export { PLANOS_FONT };

export const useStripeAssinaturasHubStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const hairline = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  const hairlineSoft = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.035)";
  const border = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.06)";
  const surface = isDark ? "rgba(28,28,30,0.78)" : "rgba(255,255,255,0.92)";

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
      lineHeight: 1.5
    },
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      padding: theme.spacing(1.5, 2.5),
      flexWrap: "wrap",
      borderBottom: `1px solid ${hairlineSoft}`,
      [theme.breakpoints.down("xs")]: {
        flexDirection: "column",
        alignItems: "stretch"
      }
    },
    filterGroup: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      flex: 1
    },
    searchBox: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      borderRadius: 8,
      background: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
      padding: "4px 10px",
      minWidth: 160,
      height: 32,
      flex: 1,
      maxWidth: 240,
      border: `1px solid ${hairlineSoft}`,
      [theme.breakpoints.down("xs")]: { maxWidth: "100%" }
    },
    searchInput: {
      fontSize: 12,
      fontFamily: PLANOS_FONT,
      flex: 1,
      "& input": { padding: 0, fontSize: 12 },
      "& input::placeholder": {
        color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.35)",
        opacity: 1
      }
    },
    filterPill: {
      height: 32,
      borderRadius: 8,
      fontSize: 12,
      fontFamily: PLANOS_FONT,
      border: `1px solid ${hairlineSoft}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
      "& .MuiSelect-select": { padding: "5px 28px 5px 10px", fontSize: 12 },
      "& .MuiOutlinedInput-notchedOutline": { border: "none" },
      "&:before, &:after": { display: "none" }
    },
    dateInput: {
      height: 32,
      borderRadius: 8,
      fontSize: 12,
      fontFamily: PLANOS_FONT,
      border: `1px solid ${hairlineSoft}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
      color: theme.palette.text.primary,
      padding: "0 10px",
      outline: "none",
      width: 130
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      border: `1px solid ${hairlineSoft}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.8)",
      color: theme.palette.text.secondary
    },
    addBtn: {
      height: 32,
      borderRadius: 8,
      textTransform: "none",
      fontSize: 12,
      fontFamily: PLANOS_FONT,
      padding: "0 14px",
      boxShadow: "none",
      "&:hover": { boxShadow: "none" }
    },
    tableWrap: {
      overflowX: "auto",
      "&::-webkit-scrollbar": { height: 4 },
      "&::-webkit-scrollbar-thumb": {
        background: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)",
        borderRadius: 4
      }
    },
    table: {
      minWidth: 900,
      fontFamily: PLANOS_FONT,
      "& .MuiTableCell-head": {
        fontSize: 10,
        fontWeight: 400,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.45)",
        borderBottom: `1px solid ${hairline}`,
        padding: "8px 16px",
        whiteSpace: "nowrap",
        background: "transparent"
      },
      "& .MuiTableCell-body": {
        fontSize: 13,
        fontWeight: 400,
        letterSpacing: "-0.01em",
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${hairlineSoft}`,
        padding: "10px 16px"
      },
      "& tbody tr:last-child td": { borderBottom: "none" },
      "& tbody tr:hover": {
        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.015)"
      }
    },
    tableRow: {
      cursor: "pointer",
      transition: "background 0.15s ease"
    },
    tag: {
      display: "inline-flex",
      alignItems: "center",
      height: 20,
      borderRadius: 6,
      padding: "0 7px",
      fontSize: 10,
      fontWeight: 400,
      letterSpacing: "0.01em",
      lineHeight: 1,
      whiteSpace: "nowrap",
      fontFamily: PLANOS_FONT
    },
    tagActive: {
      background: isDark ? "rgba(5,150,105,0.4)" : "rgba(16,185,129,0.12)",
      color: isDark ? "#ffffff" : "#059669"
    },
    tagInactive: {
      background: isDark ? "rgba(220,38,38,0.4)" : "rgba(239,68,68,0.1)",
      color: isDark ? "#ffffff" : "#dc2626"
    },
    tagWarning: {
      background: isDark ? "rgba(217,119,6,0.4)" : "rgba(245,158,11,0.12)",
      color: isDark ? "#ffffff" : "#d97706"
    },
    tagExpired: {
      background: isDark ? "rgba(220,38,38,0.4)" : "rgba(239,68,68,0.1)",
      color: isDark ? "#ffffff" : "#dc2626"
    },
    tagNeutral: {
      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
      color: isDark ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.55)"
    },
    tagStripe: {
      background: isDark ? "rgba(37,99,235,0.55)" : "rgba(59,130,246,0.12)",
      color: isDark ? "#ffffff" : "#2563eb"
    },
    tagStripePlan: {
      background: isDark ? "rgba(11,42,126,0.65)" : "rgba(11,42,126,0.1)",
      color: isDark ? "#ffffff" : "#0B2A7E"
    },
    subText: {
      fontSize: 11,
      color: theme.palette.text.secondary,
      marginTop: 2
    },
    planName: {
      fontWeight: 400,
      fontSize: 13,
      letterSpacing: "-0.01em",
      color: theme.palette.text.primary
    },
    editIcon: {
      fontSize: 14,
      color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.25)"
    },
    cardList: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: theme.spacing(1.5, 2)
    },
    card: {
      borderRadius: 12,
      border: `1px solid ${hairlineSoft}`,
      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(248,250,252,0.8)",
      padding: "12px 14px",
      cursor: "pointer"
    },
    cardName: {
      fontSize: 13,
      fontWeight: 400,
      letterSpacing: "-0.01em"
    },
    cardEmail: {
      fontSize: 11,
      color: theme.palette.text.secondary,
      marginBottom: 8
    },
    cardRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap"
    },
    detailBox: {
      padding: theme.spacing(1.75, 2.5),
      borderTop: `1px solid ${hairlineSoft}`,
      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(248,250,252,0.6)"
    },
    sectionLabel: {
      fontFamily: PLANOS_FONT,
      fontSize: 10,
      fontWeight: 400,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.45)",
      marginBottom: 4,
      marginTop: 12
    },
    mono: {
      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
      fontSize: 10,
      color: theme.palette.text.secondary,
      wordBreak: "break-all"
    },
    actions: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    actionBtn: {
      textTransform: "none",
      fontSize: 11,
      fontFamily: PLANOS_FONT,
      fontWeight: 400,
      borderRadius: 8,
      padding: "3px 10px",
      minHeight: 28
    },
    dialogPaper: {
      borderRadius: 14,
      fontFamily: PLANOS_FONT
    },
    expandBtn: {
      padding: 3,
      color: isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.4)"
    },
    cardDetail: {
      marginTop: 10,
      paddingTop: 10,
      borderTop: `1px solid ${hairlineSoft}`
    }
  };
});
