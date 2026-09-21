/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { makeStyles } from "@material-ui/core/styles";

/** Card lateral (guia API Key / resumo do modelo) — OpenAI, Claude e Gemini. */
export const useIntegrationAsideCardStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const surface = isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)";
  return {
    root: {
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      borderRadius: 14,
      border: `1px solid ${border}`,
      background: surface,
      padding: theme.spacing(2, 2.25),
      display: "flex",
      flexDirection: "column",
      [theme.breakpoints.down("sm")]: {
        padding: theme.spacing(1.75, 1.5)
      }
    },
    rootCompact: {
      padding: theme.spacing(1.75, 2),
      "& $head": {
        marginBottom: theme.spacing(1.25),
        paddingBottom: theme.spacing(1)
      },
      "& $steps": {
        gap: theme.spacing(1.125)
      },
      "& $ideBuildCallout": {
        marginTop: 4,
        padding: "8px 10px"
      },
      "& $ideBuildLabel": {
        marginBottom: 4
      },
      "& $stepBody": {
        lineHeight: 1.45
      },
      "& $ideBuildText": {
        lineHeight: 1.45,
        fontSize: "0.75rem"
      }
    },
    head: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1.25),
      marginBottom: theme.spacing(1.75),
      paddingBottom: theme.spacing(1.25),
      borderBottom: `1px solid ${border}`
    },
    headTitle: {
      fontWeight: 600,
      fontSize: "0.9375rem",
      letterSpacing: "-0.02em",
      lineHeight: 1.3
    },
    headSub: {
      fontSize: "0.75rem",
      color: theme.palette.text.secondary,
      lineHeight: 1.4,
      marginTop: 2
    },
    steps: {
      margin: 0,
      padding: 0,
      listStyle: "none",
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(1.5)
    },
    step: {
      display: "flex",
      gap: theme.spacing(1.25),
      alignItems: "flex-start"
    },
    stepNum: {
      flexShrink: 0,
      width: 22,
      height: 22,
      borderRadius: 7,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.6875rem",
      fontWeight: 700,
      lineHeight: 1,
      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
      color: theme.palette.text.secondary
    },
    stepTitle: {
      fontWeight: 600,
      fontSize: "0.8125rem",
      lineHeight: 1.35,
      marginBottom: 2
    },
    stepBody: {
      fontSize: "0.8125rem",
      lineHeight: 1.5,
      color: theme.palette.text.secondary,
      "& a": {
        color: theme.palette.primary.main,
        fontWeight: 500,
        textDecoration: "none",
        "&:hover": { textDecoration: "underline" }
      }
    },
    footnote: {
      marginTop: theme.spacing(1.75),
      paddingTop: theme.spacing(1.25),
      borderTop: `1px solid ${border}`,
      fontSize: "0.75rem",
      lineHeight: 1.45,
      color: theme.palette.text.secondary
    },
    ideBuildCallout: {
      marginTop: 8,
      padding: "10px 12px",
      borderRadius: 10,
      background: isDark ? "rgba(62,207,142,0.1)" : "rgba(62,207,142,0.07)",
      border: `1px solid ${isDark ? "rgba(62,207,142,0.28)" : "rgba(62,207,142,0.2)"}`,
      boxShadow: isDark
        ? "inset 0 1px 0 rgba(255,255,255,0.04)"
        : "inset 0 1px 0 rgba(255,255,255,0.65)"
    },
    ideBuildLabel: {
      display: "inline-block",
      fontSize: "0.625rem",
      fontWeight: 700,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: isDark ? "#86efac" : "#059669",
      marginBottom: 6
    },
    ideBuildText: {
      fontSize: "0.8125rem",
      lineHeight: 1.5,
      color: theme.palette.text.secondary
    }
  };
});
