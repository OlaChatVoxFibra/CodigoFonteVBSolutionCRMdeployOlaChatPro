/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { makeStyles } from "@material-ui/core/styles";

export const STRIPE_ADMIN_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** Tags coloridas estilo Apple / Magic UI */
export const TAG_STYLES = {
  users: {
    bg: "rgba(59,130,246,0.14)",
    color: "#2563eb",
    border: "rgba(59,130,246,0.22)"
  },
  connections: {
    bg: "rgba(139,92,246,0.14)",
    color: "#7c3aed",
    border: "rgba(139,92,246,0.22)"
  },
  brain: {
    bg: "rgba(109,40,217,0.14)",
    color: "#6d28d9",
    border: "rgba(109,40,217,0.24)"
  },
  brainAddon: {
    bg: "rgba(236,72,153,0.14)",
    color: "#db2777",
    border: "rgba(236,72,153,0.22)"
  },
  unlimited: {
    bg: "rgba(16,185,129,0.14)",
    color: "#059669",
    border: "rgba(16,185,129,0.22)"
  },
  crm: {
    bg: "rgba(11,42,126,0.12)",
    color: "#0B2A7E",
    border: "rgba(11,42,126,0.2)"
  },
  brainType: {
    bg: "rgba(109,40,217,0.12)",
    color: "#6d28d9",
    border: "rgba(109,40,217,0.22)"
  },
  api: {
    bg: "rgba(20,184,166,0.14)",
    color: "#0d9488",
    border: "rgba(20,184,166,0.22)"
  },
  price: {
    bg: "rgba(245,158,11,0.14)",
    color: "#d97706",
    border: "rgba(245,158,11,0.22)"
  },
  active: {
    bg: "rgba(59,130,246,0.14)",
    color: "#2563eb",
    border: "rgba(59,130,246,0.22)"
  },
  warning: {
    bg: "rgba(245,158,11,0.14)",
    color: "#d97706",
    border: "rgba(245,158,11,0.22)"
  },
  danger: {
    bg: "rgba(239,68,68,0.12)",
    color: "#dc2626",
    border: "rgba(239,68,68,0.2)"
  }
};

/** Tags no modo escuro — texto branco sobre fundo azul/escuro legível */
export const TAG_STYLES_DARK = {
  users: { bg: "rgba(37,99,235,0.5)", color: "#ffffff", border: "rgba(147,197,253,0.35)" },
  connections: { bg: "rgba(109,40,217,0.5)", color: "#ffffff", border: "rgba(196,181,253,0.35)" },
  brain: { bg: "rgba(109,40,217,0.55)", color: "#ffffff", border: "rgba(196,181,253,0.35)" },
  brainAddon: { bg: "rgba(219,39,119,0.45)", color: "#ffffff", border: "rgba(251,207,232,0.35)" },
  unlimited: { bg: "rgba(5,150,105,0.45)", color: "#ffffff", border: "rgba(110,231,183,0.35)" },
  crm: { bg: "rgba(11,42,126,0.65)", color: "#ffffff", border: "rgba(147,197,253,0.35)" },
  brainType: { bg: "rgba(109,40,217,0.55)", color: "#ffffff", border: "rgba(196,181,253,0.35)" },
  api: { bg: "rgba(13,148,136,0.45)", color: "#ffffff", border: "rgba(153,246,228,0.35)" },
  price: { bg: "rgba(217,119,6,0.45)", color: "#ffffff", border: "rgba(253,230,138,0.35)" },
  active: { bg: "rgba(37,99,235,0.5)", color: "#ffffff", border: "rgba(147,197,253,0.35)" },
  warning: { bg: "rgba(217,119,6,0.45)", color: "#ffffff", border: "rgba(253,230,138,0.35)" },
  danger: { bg: "rgba(220,38,38,0.45)", color: "#ffffff", border: "rgba(254,202,202,0.35)" }
};

export function tagStyle(key, isDark = false, opts = {}) {
  const light = opts.lightWeight === true;
  const palette = isDark ? TAG_STYLES_DARK : TAG_STYLES;
  const s = palette[key] || palette.users || TAG_STYLES[key] || TAG_STYLES.users;
  return {
    height: light ? 17 : 18,
    fontSize: light ? 9 : 9,
    fontWeight: light ? 400 : 600,
    letterSpacing: "-0.01em",
    borderRadius: 999,
    backgroundColor: s.bg,
    color: s.color,
    border: `1px solid ${s.border}`,
    margin: 0,
    flexShrink: 0
  };
}

export const tagRowStyle = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: 4,
  overflowX: "auto",
  maxWidth: "100%"
};

export const tagLabelStyle = {
  fontSize: 9,
  fontWeight: 400,
  paddingLeft: 2,
  paddingRight: 2,
  lineHeight: 1.2,
  whiteSpace: "nowrap"
};

export const tagLabelStyleBold = {
  ...tagLabelStyle,
  fontWeight: 600
};

export const useStripeAdminHubStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const surface = isDark ? "rgba(28,28,30,0.72)" : "rgba(255,255,255,0.88)";
  const detailBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(248,250,252,0.95)";

  return {
    root: {
      width: "100%",
      fontFamily: STRIPE_ADMIN_FONT
    },
    paper: {
      borderRadius: 16,
      border: `1px solid ${border}`,
      background: surface,
      backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)",
      overflow: "hidden",
      marginBottom: theme.spacing(1.5),
      boxShadow: isDark
        ? "0 8px 32px rgba(0,0,0,0.24)"
        : "0 4px 24px rgba(15,23,42,0.06), 0 0 0 0.5px rgba(255,255,255,0.8) inset"
    },
    head: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: theme.spacing(2, 2.25),
      flexWrap: "wrap",
      borderBottom: `1px solid ${border}`
    },
    title: {
      fontFamily: STRIPE_ADMIN_FONT,
      fontWeight: 650,
      fontSize: 16,
      letterSpacing: "-0.025em"
    },
    meta: {
      fontFamily: STRIPE_ADMIN_FONT,
      fontSize: 12,
      color: theme.palette.text.secondary,
      marginTop: 2,
      lineHeight: 1.45
    },
    sectionHead: {
      padding: theme.spacing(1.5, 2.25, 0.75),
      display: "flex",
      alignItems: "center",
      gap: 8
    },
    sectionTitle: {
      fontFamily: STRIPE_ADMIN_FONT,
      fontSize: 12,
      fontWeight: 650,
      letterSpacing: "-0.01em",
      color: theme.palette.text.primary
    },
    sectionLine: {
      flex: 1,
      height: 1,
      background: border
    },
    listTable: {
      fontFamily: STRIPE_ADMIN_FONT,
      "& th": {
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: theme.palette.text.secondary,
        borderBottom: `1px solid ${border}`,
        padding: theme.spacing(1.25, 2)
      },
      "& td": {
        fontSize: 13,
        letterSpacing: "-0.01em",
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)"}`,
        padding: theme.spacing(1.25, 2),
        verticalAlign: "middle"
      },
      "& tbody tr:hover": {
        background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)"
      }
    },
    detailBox: {
      padding: theme.spacing(2, 2.25),
      borderTop: `1px solid ${border}`,
      background: detailBg
    },
    planName: {
      fontWeight: 650,
      fontSize: 13,
      letterSpacing: "-0.02em"
    },
    subText: {
      fontSize: 11,
      color: theme.palette.text.secondary,
      marginTop: 2
    },
    mono: {
      fontFamily: "ui-monospace, SF Mono, Menlo, monospace",
      fontSize: 10,
      wordBreak: "break-all",
      opacity: 0.75
    },
    priceMain: {
      fontWeight: 650,
      fontSize: 13,
      letterSpacing: "-0.02em"
    },
    priceSub: {
      fontSize: 11,
      color: theme.palette.text.secondary,
      marginTop: 2
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 650,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: theme.palette.text.secondary,
      margin: theme.spacing(2, 0, 1)
    },
    select: {
      fontFamily: STRIPE_ADMIN_FONT,
      fontSize: 13,
      minWidth: 140,
      height: 36,
      borderRadius: 10,
      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.9)",
      boxShadow: isDark ? "none" : "0 1px 2px rgba(15,23,42,0.04)"
    },
    refreshBtn: {
      textTransform: "none",
      borderRadius: 10,
      fontFamily: STRIPE_ADMIN_FONT,
      fontWeight: 500,
      fontSize: 13,
      letterSpacing: "-0.01em",
      boxShadow: "none"
    },
    actionBtn: {
      textTransform: "none",
      borderRadius: 8,
      fontFamily: STRIPE_ADMIN_FONT,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: "-0.01em",
      minWidth: 0,
      padding: "4px 10px"
    },
    iconBtn: {
      borderRadius: 8,
      padding: 6,
      color: theme.palette.text.secondary,
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        color: theme.palette.text.primary
      }
    },
    empty: {
      padding: theme.spacing(5, 2),
      textAlign: "center",
      fontFamily: STRIPE_ADMIN_FONT,
      fontSize: 13,
      color: theme.palette.text.secondary
    },
    actions: {
      display: "flex",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12
    },
    featureList: {
      margin: "6px 0 0",
      paddingLeft: 18,
      fontSize: 12,
      color: theme.palette.text.secondary,
      lineHeight: 1.6
    },
    dialogPaper: {
      borderRadius: 16,
      fontFamily: STRIPE_ADMIN_FONT
    }
  };
});
