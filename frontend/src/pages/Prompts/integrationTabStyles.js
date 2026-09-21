/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { makeStyles } from "@material-ui/core/styles";

/** Estilos necessários para IntegrationTab (extraídos do módulo legado). */
export const useIntegrationTabStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    mainPaper: {
      flex: 1,
      padding: theme.spacing(1, 2),
      overflow: "visible",
      ...(isDark ? { backgroundColor: theme.palette.listScrollArea } : {})
    },
    mainPaperTight: { paddingTop: theme.spacing(0) },
    labelSmall: {
      fontSize: 12,
      color: isDark ? theme.palette.text.secondary : "#6b7280",
      marginBottom: 4,
      display: "block"
    },
    inputDense: {
      marginTop: 2,
      marginBottom: 4,
      "& .MuiOutlinedInput-root": {
        backgroundColor: isDark ? theme.palette.inputBackground : "#fff",
        borderRadius: 10
      },
      "& .MuiOutlinedInput-input": {
        padding: "6px 10px",
        fontSize: 12,
        lineHeight: 1.4,
        ...(isDark ? { color: theme.palette.text.primary } : {})
      },
      "& .MuiOutlinedInput-inputMultiline": {
        fontSize: 12,
        lineHeight: 1.4,
        ...(isDark ? { color: theme.palette.text.primary } : {})
      },
      ...(isDark
        ? {
            "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.2)"
            },
            "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.28)"
            },
            "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.4)"
            },
            "& .MuiInputLabel-outlined": {
              fontSize: 12,
              color: theme.palette.text.secondary
            },
            "& .MuiInputLabel-outlined.Mui-focused": { color: theme.palette.text.primary }
          }
        : {}),
      ...(!isDark ? { "& .MuiInputLabel-outlined": { fontSize: 12 } } : {}),
      "& input::placeholder": { fontSize: 12, opacity: isDark ? 0.55 : 0.8 },
      "& textarea::placeholder": { fontSize: 12, opacity: isDark ? 0.55 : 0.8 }
    },
    selectWhite: {
      "& .MuiOutlinedInput-root": {
        backgroundColor: isDark ? theme.palette.inputBackground : "#fff",
        borderRadius: 10
      },
      "& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline": {
        borderColor: isDark ? "rgba(255,255,255,0.2)" : "#e5e7eb"
      },
      "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: isDark ? "rgba(255,255,255,0.28)" : "#d1d5db"
      },
      "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
        borderColor: isDark ? "rgba(255,255,255,0.4)" : "#cbd5e1"
      },
      "& .MuiSelect-select": {
        backgroundColor: isDark ? theme.palette.inputBackground : "#fff",
        fontSize: 13,
        ...(isDark ? { color: theme.palette.text.primary } : {})
      },
      ...(isDark
        ? {
            "& .MuiInputLabel-outlined": { color: theme.palette.text.secondary },
            "& .MuiInputLabel-outlined.Mui-focused": { color: theme.palette.text.primary }
          }
        : {})
    },
    switchRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 8,
      backgroundColor: isDark ? theme.palette.inputBackground : "#fff",
      border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #e5e7eb",
      borderRadius: 10
    },
    formFooterBar: {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      marginTop: theme.spacing(1)
    },
    rightModelCard: {
      background: "transparent",
      border: "none",
      borderRadius: 0,
      padding: 0,
      boxShadow: "none",
      width: "100%",
      boxSizing: "border-box"
    },
    rightSection: {
      borderTop: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #f1f5f9",
      marginTop: 10,
      paddingTop: 10
    },
    priceRow: { display: "flex", justifyContent: "space-between", fontSize: 12 },
    statusBadgeOk: {
      display: "inline-block",
      padding: "4px 8px",
      borderRadius: 8,
      background: isDark ? "rgba(34, 197, 94, 0.18)" : "#E6F4EA",
      color: isDark ? "#86efac" : "#1E7E34",
      fontSize: 12,
      fontWeight: 600
    },
    statusBadgeWarn: {
      display: "inline-block",
      padding: "4px 8px",
      borderRadius: 8,
      background: isDark ? "rgba(251, 191, 36, 0.15)" : "#FFF4E5",
      color: isDark ? "#fcd34d" : "#8A6D3B",
      fontSize: 12,
      fontWeight: 600
    },
    statusRow: {
      display: "flex",
      gap: theme.spacing(2),
      alignItems: "center",
      marginTop: theme.spacing(1)
    },
    modelGuideHeader: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 8
    },
    modelGuideTitle: {
      fontWeight: 600,
      fontSize: 12,
      lineHeight: 1.35,
      color: isDark ? theme.palette.text.primary : "#111827"
    },
    modelGuideIntro: {
      fontSize: 11,
      lineHeight: 1.45,
      color: isDark ? theme.palette.text.secondary : "#6b7280",
      marginTop: 2
    },
    modelGuideSteps: {
      margin: 0,
      paddingLeft: 18,
      fontSize: 11,
      lineHeight: 1.5,
      color: isDark ? theme.palette.text.secondary : "#4b5563",
      "& li": { marginBottom: 6 },
      "& li:last-child": { marginBottom: 0 }
    },
    modelGuideFootnote: {
      marginTop: 8,
      fontSize: 11,
      lineHeight: 1.45,
      color: isDark ? theme.palette.text.secondary : "#6b7280"
    },
    providerSubheader: {
      display: "flex",
      alignItems: "center",
      lineHeight: 1.45,
      padding: theme.spacing(1.25, 2, 0.5),
      marginTop: theme.spacing(0.75),
      backgroundColor: isDark ? theme.palette.background.default : theme.palette.background.paper,
      "&:first-of-type": {
        marginTop: 0,
        paddingTop: theme.spacing(1)
      }
    },
    modelMenuItem: {
      minHeight: 44,
      padding: theme.spacing(1.25, 2)
    },
    integrationTabRoot: { paddingTop: theme.spacing(1) }
  };
});
