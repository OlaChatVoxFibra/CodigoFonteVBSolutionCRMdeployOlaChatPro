/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { makeStyles } from "@material-ui/core/styles";

/** Mesmo stack das demais abas em /settings */
export const SETTINGS_FONT =
  '"Helvetica Neue", Helvetica, Arial, sans-serif';

export function brlPrices(prices) {
  const list = Array.isArray(prices) ? prices : [];
  return {
    monthly: list.find((p) => p.currency === "brl" && p.interval === "monthly"),
    annual: list.find((p) => p.currency === "brl" && p.interval === "annual")
  };
}

export const useStripeSettingsPageStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#eaedf0";
  const surfaceBg = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const hoverBg = isDark ? "rgba(255,255,255,0.05)" : "#f8f9fb";
  const hairline = isDark ? "rgba(255,255,255,0.06)" : "rgba(128,128,128,0.12)";

  return {
    root: {
      width: "100%",
      height: "100%",
      fontFamily: SETTINGS_FONT,
      fontWeight: 400,
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      alignSelf: "stretch",
      gap: 0,
      "& *": { fontWeight: "inherit" },
      "& strong, & b": { fontWeight: 400 }
    },
    pageHeader: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap"
    },
    title: {
      fontFamily: SETTINGS_FONT,
      fontWeight: 400,
      fontSize: 14,
      color: theme.palette.text.primary,
      letterSpacing: "-0.01em"
    },
    meta: {
      fontFamily: SETTINGS_FONT,
      fontWeight: 400,
      fontSize: 11.5,
      color: theme.palette.text.secondary,
      marginTop: 2,
      lineHeight: 1.45
    },
    toolbar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap"
    },
    filterGroup: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      flex: 1,
      minWidth: 0,
      maxWidth: "100%"
    },
    searchBox: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      borderRadius: 7,
      background: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
      padding: "3px 8px",
      minWidth: 160,
      height: 30,
      flex: 1,
      maxWidth: 240
    },
    searchInput: {
      fontSize: 11.5,
      fontFamily: SETTINGS_FONT,
      flex: 1,
      "& input": { padding: 0, fontSize: 11.5 },
      "& input::placeholder": {
        color: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af",
        opacity: 1
      }
    },
    filterPill: {
      height: 28,
      borderRadius: 7,
      fontSize: 11,
      fontFamily: SETTINGS_FONT,
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      "& .MuiSelect-select": { padding: "4px 24px 4px 8px", fontSize: 11 },
      "& .MuiOutlinedInput-notchedOutline": { border: "none" },
      "&:before, &:after": { display: "none" }
    },
    dateInput: {
      height: 28,
      borderRadius: 7,
      fontSize: 11,
      fontFamily: SETTINGS_FONT,
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      color: theme.palette.text.primary,
      padding: "0 8px",
      outline: "none",
      width: 120
    },
    iconBtn: {
      width: 28,
      height: 28,
      borderRadius: 7,
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      color: theme.palette.text.secondary,
      padding: 4
    },
    btn: {
      height: 28,
      borderRadius: 7,
      textTransform: "none",
      fontSize: 11,
      fontFamily: SETTINGS_FONT,
      padding: "0 12px",
      boxShadow: "none",
      "&:hover": { boxShadow: "none" }
    },
    /** Único bloco visual — a lista */
    listBlock: {
      borderRadius: 10,
      border: `1px solid ${border}`,
      background: surfaceBg,
      overflow: "hidden",
      overflowX: "auto",
      flex: 1,
      width: "100%",
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      "&::-webkit-scrollbar": { height: 4 },
      "&::-webkit-scrollbar-thumb": {
        background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
        borderRadius: 4
      }
    },
    /** Lista preenchendo toda a área da aba — filtros fixos + scroll só no corpo */
    listBlockFull: {
      borderRadius: 0,
      border: "none",
      background: surfaceBg,
      flex: 1,
      width: "100%",
      maxWidth: "100%",
      minHeight: 0,
      height: "100%",
      alignSelf: "stretch",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
      overflow: "hidden"
    },
    tableScrollArea: {
      flex: 1,
      minHeight: 0,
      width: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      "&::-webkit-scrollbar": { width: 6, height: 6 },
      "&::-webkit-scrollbar-thumb": {
        background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
        borderRadius: 4
      }
    },
    /** Cabeçalho da tabela fixo abaixo dos filtros — só o corpo rola */
    tableHeadFixed: {
      flexShrink: 0,
      width: "100%",
      minWidth: 0,
      overflow: "hidden",
      borderBottom: `1px solid ${border}`,
      background: isDark ? "rgba(28,28,30,0.98)" : "#fafbfc",
      boxSizing: "border-box",
      "& table": {
        marginBottom: 0
      },
      "& .MuiTableCell-head": {
        borderBottom: "none"
      }
    },
    table: {
      width: "100%",
      maxWidth: "100%",
      tableLayout: "fixed",
      borderCollapse: "collapse",
      "& .MuiTableCell-root": {
        overflow: "hidden",
        maxWidth: 0
      },
      "& .MuiTableCell-head": {
        fontSize: 10,
        fontWeight: 400,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
        borderBottom: `1px solid ${border}`,
        padding: "5px 6px",
        whiteSpace: "normal",
        lineHeight: 1.25,
        fontFamily: SETTINGS_FONT,
        background: isDark ? "rgba(255,255,255,0.02)" : "#fafbfc",
        overflow: "hidden"
      },
      "& .MuiTableCell-body": {
        fontSize: 11.5,
        fontWeight: 400,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${border}`,
        padding: "5px 6px",
        fontFamily: SETTINGS_FONT,
        verticalAlign: "middle",
        overflow: "hidden",
        wordBreak: "break-word"
      },
      "& tbody tr:last-child td": { borderBottom: "none" },
      "& tbody tr:hover": { background: hoverBg },
      "& .MuiTableCell-stickyHeader": {
        background: isDark ? "rgba(28,28,30,0.98)" : "#fafbfc",
        zIndex: 2
      }
    },
    /** 1ª linha do thead — títulos das colunas */
    headRow: {
      "& .MuiTableCell-stickyHeader": {
        top: 0,
        zIndex: 3
      }
    },
    cellClip: {
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      maxWidth: "100%"
    },
    cellLimites: {
      maxWidth: "100% !important",
      "& > div": {
        flexWrap: "wrap !important",
        overflowX: "visible !important",
        maxWidth: "100% !important"
      },
      "& .MuiChip-root": {
        maxWidth: "100%",
        height: "auto",
        minHeight: 18
      },
      "& .MuiChip-label": {
        whiteSpace: "normal",
        wordBreak: "break-word"
      }
    },
    tableRow: {
      cursor: "pointer",
      transition: "background 0.12s"
    },
    detailBox: {
      padding: theme.spacing(1.25, 1.5),
      borderTop: `1px solid ${hairline}`,
      background: isDark ? "rgba(255,255,255,0.02)" : "#fafbfc"
    },
    planName: {
      fontSize: 12,
      fontWeight: 400,
      color: theme.palette.text.primary
    },
    subText: {
      fontSize: 10.5,
      color: theme.palette.text.secondary,
      marginTop: 1
    },
    mono: {
      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
      fontSize: 10,
      opacity: 0.55,
      wordBreak: "break-all"
    },
    priceText: {
      fontSize: 12,
      fontWeight: 400,
      whiteSpace: "nowrap"
    },
    priceMuted: {
      fontSize: 10,
      color: theme.palette.text.secondary,
      marginTop: 1
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 400,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: theme.palette.text.secondary,
      margin: theme.spacing(1, 0, 0.5)
    },
    actionBtn: {
      textTransform: "none",
      borderRadius: 7,
      fontFamily: SETTINGS_FONT,
      fontSize: 11,
      fontWeight: 400,
      minWidth: 0,
      padding: "3px 10px",
      boxShadow: "none"
    },
    expandBtn: {
      padding: 3,
      color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)"
    },
    empty: {
      padding: theme.spacing(4, 2),
      textAlign: "center",
      fontSize: 12,
      color: theme.palette.text.secondary
    },
    tag: {
      display: "inline-flex",
      alignItems: "center",
      height: 18,
      borderRadius: 5,
      padding: "0 6px",
      fontSize: 10,
      fontWeight: 400,
      lineHeight: 1,
      whiteSpace: "nowrap",
      fontFamily: SETTINGS_FONT
    },
    tagActive: {
      background: isDark ? "rgba(16,185,129,0.15)" : "#ecfdf5",
      color: isDark ? "#6ee7b7" : "#059669"
    },
    tagInactive: {
      background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2",
      color: isDark ? "#fca5a5" : "#dc2626"
    },
    tagWarning: {
      background: isDark ? "rgba(245,158,11,0.15)" : "#fffbeb",
      color: isDark ? "#fcd34d" : "#d97706"
    },
    tagExpired: {
      background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2",
      color: isDark ? "#fca5a5" : "#dc2626"
    },
    tagNeutral: {
      background: isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6",
      color: isDark ? "rgba(255,255,255,0.75)" : "#6b7280"
    },
    tagStripe: {
      background: isDark ? "rgba(37,99,235,0.55)" : "rgba(59,130,246,0.14)",
      color: isDark ? "#ffffff" : "#2563eb"
    },
    tagStripePlan: {
      background: isDark ? "rgba(11,42,126,0.55)" : "rgba(11,42,126,0.1)",
      color: isDark ? "#ffffff" : "#0B2A7E"
    },
    cardList: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    },
    card: {
      borderRadius: 10,
      border: `1px solid ${border}`,
      background: surfaceBg,
      padding: "10px 12px"
    },
    cardName: { fontSize: 13, fontWeight: 400 },
    cardEmail: {
      fontSize: 11,
      color: theme.palette.text.secondary,
      marginBottom: 6
    },
    cardRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap"
    },
    cardDetail: {
      marginTop: 8,
      paddingTop: 8,
      borderTop: `1px solid ${hairline}`
    },
    dialogPaper: {
      borderRadius: 10,
      fontFamily: SETTINGS_FONT
    },
    dialogTitle: {
      fontFamily: SETTINGS_FONT,
      fontWeight: 400,
      fontSize: 14
    },
    featureList: {
      margin: "4px 0 0",
      paddingLeft: 18,
      fontSize: 11.5,
      color: theme.palette.text.secondary,
      lineHeight: 1.6
    },
    actions: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 10
    },
    editIcon: {
      fontSize: 14,
      color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)"
    },
    tableHeadTools: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    },
    headRefreshIcon: {
      width: 22,
      height: 22,
      padding: 2,
      borderRadius: 5,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      color: theme.palette.text.secondary,
      flexShrink: 0,
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.08)" : hoverBg,
        color: theme.palette.text.primary
      },
      "&.Mui-disabled": {
        opacity: 0.45
      }
    },
    filterBarFixed: {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      width: "100%",
      minWidth: 0,
      padding: "8px 10px",
      borderBottom: `1px solid ${border}`,
      background: isDark ? "rgba(28,28,30,0.98)" : "#fafbfc",
      boxSizing: "border-box"
    },
    filterBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      width: "100%",
      minWidth: 0
    },
    filterActions: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      flexShrink: 0,
      marginLeft: "auto",
      paddingLeft: 8
    },
    colHideLg: {
      [theme.breakpoints.down("lg")]: {
        display: "none"
      }
    },
    colHideMd: {
      [theme.breakpoints.down("md")]: {
        display: "none"
      }
    },
    filterBarMobile: {
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      padding: "8px 10px",
      borderBottom: `1px solid ${border}`,
      background: isDark ? "rgba(28,28,30,0.98)" : "#fafbfc"
    },
    cardListScroll: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
      "&::-webkit-scrollbar": { width: 6 },
      "&::-webkit-scrollbar-thumb": {
        background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
        borderRadius: 4
      }
    }
  };
});
