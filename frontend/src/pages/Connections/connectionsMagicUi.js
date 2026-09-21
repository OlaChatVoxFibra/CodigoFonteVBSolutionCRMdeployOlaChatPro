/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Tokens visuais — página enxuta, scroll natural, marcação só nos inputs.
 */
import { makeStyles } from "@material-ui/core/styles";
import { getConnectionsBorder, getConnectionsSurface } from "./connectionsTheme";
import { CONNECTIONS_FONT } from "./connectionsTypography";

export const MAGIC_RADIUS = 12;
export const MAGIC_RADIUS_SM = 10;
export const MAGIC_RADIUS_XS = 8;
export const MAGIC_ACCENT_WIDTH = 4;

export const useConnectionsMagicFrameStyles = makeStyles((theme) => ({
  outer: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  outerFluid: {
    flex: "1 1 auto",
    minHeight: 0,
  },
  /** Preenche a coluna do layout (painel /manage) */
  outerFill: {
    flex: "1 1 0",
    minHeight: 0,
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  frameFill: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: "100%",
    margin: 0,
    display: "flex",
    flexDirection: "column",
  },
  frame: {
    width: "100%",
    maxWidth: 720,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    fontFamily: CONNECTIONS_FONT,
    [theme.breakpoints.up("md")]: {
      maxWidth: 680,
    },
  },
  frameWide: {
    maxWidth: 900,
  },
  frameFluid: {
    maxWidth: "100%",
    margin: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    borderRadius: MAGIC_RADIUS,
    border: `1px solid ${getConnectionsBorder(theme)}`,
    background: getConnectionsSurface(theme),
    overflow: "visible",
    boxSizing: "border-box",
  },
  panelBody: {
    overflow: "visible",
    padding: theme.spacing(1, 1.25),
  },
  panelFooter: {
    padding: theme.spacing(0.75, 1.25),
    borderTop: `1px solid ${getConnectionsBorder(theme)}`,
    background: getConnectionsSurface(theme),
  },
  panelForm: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
  },
  /** Formulário criar/editar — fluxo vertical, sem scroll interno */
  embeddedForm: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    gap: theme.spacing(0.75),
    boxSizing: "border-box",
  },
  embeddedBody: {
    overflow: "visible",
    width: "100%",
    padding: theme.spacing(0, 0.25),
    [theme.breakpoints.up("sm")]: {
      padding: theme.spacing(0, 0.5),
    },
  },
  /** Botões Salvar/Voltar — sem painel, borda ou fundo */
  setupBodyWithFooter: {
    width: "100%",
    paddingBottom: theme.spacing(0.5),
  },
  setupStickyFooter: {
    position: "sticky",
    bottom: 0,
    zIndex: 12,
    flexShrink: 0,
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    marginTop: theme.spacing(1),
    padding: theme.spacing(0.75, 0),
    paddingBottom: `calc(${theme.spacing(1)}px + env(safe-area-inset-bottom, 0px))`,
    background: theme.palette.background.default,
    borderTop: `1px solid ${getConnectionsBorder(theme)}`,
    boxSizing: "border-box",
    "& > button, & .MuiButton-root": {
      textTransform: "none",
      borderRadius: 8,
      fontWeight: 400,
      fontFamily: CONNECTIONS_FONT,
      fontSize: "0.8125rem",
    },
  },
  embeddedActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    marginTop: theme.spacing(0.5),
    padding: 0,
    border: "none",
    background: "transparent",
    boxSizing: "border-box",
    "& > footer": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      padding: "0 !important",
      margin: "0 !important",
      border: "none !important",
      background: "transparent !important",
      boxShadow: "none !important",
    },
    "& > button, & .MuiButton-root": {
      textTransform: "none",
      borderRadius: 8,
      fontWeight: 400,
      fontFamily: CONNECTIONS_FONT,
      fontSize: "0.8125rem",
    },
  },
}));

export const useConnectionsMagicCardStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    card: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(0.5),
      padding: theme.spacing(1, 1.25, 1, 1.5),
      paddingLeft: theme.spacing(1.5),
      borderRadius: 0,
      border: "none",
      borderBottom: `1px solid ${getConnectionsBorder(theme)}`,
      background: "transparent",
      "&:last-child": { borderBottom: "none" },
      [theme.breakpoints.up("sm")]: {
        flexDirection: "row",
        alignItems: "center",
        padding: theme.spacing(1.1, 1.25, 1.1, 1.5),
      },
    },
    accentBar: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: MAGIC_ACCENT_WIDTH,
    },
    channelBadge: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: "0.625rem",
      fontWeight: 500,
      letterSpacing: "0.03em",
      textTransform: "uppercase",
      padding: theme.spacing(0.2, 0.6),
      borderRadius: MAGIC_RADIUS_XS,
      lineHeight: 1.3,
      flexShrink: 0,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)"}`,
    },
    listWrap: {
      display: "flex",
      flexDirection: "column",
      gap: 0,
      width: "100%",
    },
    listPanel: {
      borderRadius: MAGIC_RADIUS_SM,
      border: `1px solid ${getConnectionsBorder(theme)}`,
      background: getConnectionsSurface(theme),
      padding: 0,
      overflow: "visible",
      width: "100%",
    },
    wizardAside: {
      width: "100%",
    },
    wizardAsideMobile: {
      borderRadius: MAGIC_RADIUS_SM,
      border: `1px solid ${getConnectionsBorder(theme)}`,
      background: getConnectionsSurface(theme),
      padding: theme.spacing(0.75, 1),
      maxHeight: 128,
      overflowY: "auto",
      marginBottom: theme.spacing(0.75),
      ...theme.scrollbarStylesSoft,
    },
    /** Passo a passo no mobile (criar/editar) — sem scroll interno */
    wizardAsideMobileLean: {
      borderRadius: MAGIC_RADIUS_XS,
      border: "none",
      background: "transparent",
      padding: theme.spacing(0, 0, 0.5),
      marginBottom: theme.spacing(0.5),
      overflow: "visible",
      maxHeight: "none",
    },
  };
});

/** Painel /manage — preenche a viewport de forma enquadrada */
export const useConnectionsManageStyles = makeStyles((theme) => ({
  manageShell: {
    width: "100%",
    maxWidth: "100%",
    flex: "1 1 0",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    gap: theme.spacing(0.75),
  },
  manageBody: {
    flex: "1 1 0",
    minHeight: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxSizing: "border-box",
  },
  manageScroll: {
    flex: "1 1 0",
    minHeight: 0,
    width: "100%",
    overflowX: "hidden",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.75),
    padding: theme.spacing(0, 0.25),
    ...theme.scrollbarStylesSoft,
  },
  manageScrollAi: {
    overflow: "hidden",
    alignItems: "stretch",
    justifyContent: "center"
  },
  manageGrid: {
    width: "100%",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: theme.spacing(0.75),
    alignContent: "start",
    [theme.breakpoints.up("sm")]: {
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    },
  },
}));
