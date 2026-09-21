/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Paper, Typography, Divider, Chip } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import clsx from "clsx";
import IntegrationBrandIcon from "./IntegrationBrandIcon";
import McpTagText from "../../components/McpTagText";
import { CONNECTIONS_FONT } from "./connectionsTypography";
import { getConnectionsBorder } from "./connectionsTheme";

/** Toggle decorativo (somente leitura) — dimensões fixas estilo iOS. */
const TOGGLE_W = 36;
const TOGGLE_H = 22;
const TOGGLE_THUMB = 18;
const TOGGLE_TRAVEL = TOGGLE_W - TOGGLE_THUMB - 4;

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const trackOff = isDark ? "rgba(255,255,255,0.18)" : "#e4e4e7";
  const trackOn = "#34C759";

  return {
    card: {
      fontFamily: CONNECTIONS_FONT,
      width: "100%",
      height: "100%",
      minHeight: 248,
      padding: theme.spacing(2.5, 2.75),
      borderRadius: 12,
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      boxSizing: "border-box",
      background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
      border: `1px solid ${getConnectionsBorder(theme)}`,
      boxShadow: "none",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
      "&:hover": {
        borderColor: isDark ? "rgba(255,255,255,0.16)" : "#d4d4d8",
        boxShadow: isDark
          ? "0 8px 28px rgba(0,0,0,0.25)"
          : "0 8px 24px rgba(15,23,42,0.08)",
        transform: "translateY(-1px)",
        "& $viewLink": {
          color: theme.palette.text.primary,
        },
      },
    },
    topRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing(1.5),
      marginBottom: theme.spacing(2),
    },
    brandRow: {
      display: "flex",
      alignItems: "flex-start",
      gap: theme.spacing(1.5),
      minWidth: 0,
      flex: 1,
    },
    titleBlock: {
      minWidth: 0,
      flex: 1,
      paddingTop: 2,
    },
    title: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: 15,
      fontWeight: 400,
      letterSpacing: "-0.02em",
      color: theme.palette.text.primary,
      lineHeight: 1.35,
      wordBreak: "break-word",
    },
    infoLine: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: 11,
      fontWeight: 400,
      color: theme.palette.text.secondary,
      marginTop: 4,
      lineHeight: 1.35,
    },
    statusCol: {
      display: "inline-flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      flexShrink: 0,
      gap: theme.spacing(1),
      minHeight: TOGGLE_H,
    },
    statusToggle: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      width: TOGGLE_W,
      height: TOGGLE_H,
      pointerEvents: "none",
    },
    statusToggleTrack: {
      position: "relative",
      width: TOGGLE_W,
      height: TOGGLE_H,
      borderRadius: TOGGLE_H / 2,
      backgroundColor: trackOff,
      transition: theme.transitions.create("background-color", {
        duration: 200,
      }),
    },
    statusToggleThumb: {
      position: "absolute",
      top: 2,
      left: 2,
      width: TOGGLE_THUMB,
      height: TOGGLE_THUMB,
      borderRadius: "50%",
      backgroundColor: "#ffffff",
      boxShadow: isDark
        ? "0 1px 4px rgba(0,0,0,0.4)"
        : "0 1px 4px rgba(15,23,42,0.15)",
      transition: theme.transitions.create("transform", {
        duration: 200,
      }),
    },
    statusToggleActive: {
      "& $statusToggleTrack": {
        backgroundColor: trackOn,
      },
      "& $statusToggleThumb": {
        transform: `translateX(${TOGGLE_TRAVEL}px)`,
      },
    },
    countChip: {
      height: "22px !important",
      minHeight: 22,
      fontFamily: CONNECTIONS_FONT,
      fontSize: 10,
      fontWeight: 400,
      borderRadius: 6,
      padding: theme.spacing(0, 0.75),
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f4f4f5",
      color: theme.palette.text.secondary,
      border: "none",
      maxWidth: "100%",
      "& .MuiChip-label": {
        paddingLeft: 6,
        paddingRight: 6,
        whiteSpace: "nowrap",
      },
    },
    countChipActive: {
      backgroundColor: isDark ? "rgba(52,199,89,0.22)" : "rgba(52,199,89,0.14)",
      color: isDark ? "#86efac" : "#15803d",
    },
    description: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: 13,
      fontWeight: 400,
      color: theme.palette.text.secondary,
      lineHeight: 1.55,
      marginBottom: theme.spacing(1.5),
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },
    highlights: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(0.5),
      flex: 1,
      marginBottom: theme.spacing(2),
    },
    highlightItem: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: 12,
      fontWeight: 400,
      color: theme.palette.text.secondary,
      lineHeight: 1.45,
      display: "flex",
      alignItems: "flex-start",
      gap: theme.spacing(0.75),
      "&::before": {
        content: '"·"',
        flexShrink: 0,
        color: theme.palette.text.disabled,
      },
    },
    footer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: "auto",
      gap: theme.spacing(1),
    },
    divider: {
      marginBottom: theme.spacing(1.5),
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
    },
    viewLink: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: 13,
      fontWeight: 400,
      color: theme.palette.text.secondary,
      transition: "color 0.15s ease",
    },
    externalBadge: {
      fontSize: 11,
      color: theme.palette.text.secondary,
      fontFamily: CONNECTIONS_FONT,
    },
    cardComingSoon: {
      cursor: "not-allowed",
      opacity: isDark ? 0.72 : 0.78,
      background: isDark ? "rgba(120,120,128,0.06)" : "rgba(0,0,0,0.025)",
      borderStyle: "dashed",
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)",
      boxShadow: "none",
      "&:hover": {
        borderColor: isDark ? "rgba(255,255,255,0.16)" : "#d4d4d8",
        boxShadow: isDark
          ? "0 8px 28px rgba(0,0,0,0.25)"
          : "0 8px 24px rgba(15,23,42,0.08)",
        transform: "translateY(-1px)",
        background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
        "& $soonFooter": {
          color: theme.palette.text.secondary,
        },
      },
      "& $title": {
        color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.48)",
      },
      "& $description, & $highlightItem": {
        color: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.42)",
      },
      "& $infoLine": {
        color: isDark ? "rgba(255,255,255,0.34)" : "rgba(0,0,0,0.4)",
      },
    },
    soonChip: {
      height: 22,
      fontFamily: CONNECTIONS_FONT,
      fontSize: 10,
      fontWeight: 600,
      borderRadius: 6,
      letterSpacing: "0.02em",
      backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
      color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
    },
    mcpChip: {
      height: 22,
      fontFamily: CONNECTIONS_FONT,
      fontSize: 10,
      fontWeight: 600,
      borderRadius: 6,
      letterSpacing: "0.04em",
      backgroundColor: isDark ? "rgba(139,92,246,0.18)" : "rgba(139,92,246,0.12)",
      color: isDark ? "#c4b5fd" : "#6d28d9",
      border: `1px solid ${isDark ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.28)"}`,
    },
    soonFooter: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: 13,
      fontWeight: 400,
      color: theme.palette.text.disabled,
      fontStyle: "normal",
      letterSpacing: "-0.01em",
    },
    iconComingSoon: {
      opacity: 0.92,
      filter: isDark ? "saturate(0.88) brightness(1.05)" : "saturate(0.92) brightness(0.98)",
    },
  };
});

export default function IntegrationHubCard({
  integration,
  visual,
  count,
  disabled,
  onClick,
}) {
  const classes = useStyles();
  const isActive = count > 0;
  const highlights = integration.highlights || [];
  const comingSoon = Boolean(integration.comingSoon);
  const isLocked = disabled || comingSoon;
  const isConfigIntegration =
    integration.platformIntegration ||
    ["openai", "claude", "gemini", "figma", "github", "supabase"].includes(
      integration.key
    );

  return (
    <Paper
      className={`${classes.card} ${comingSoon ? classes.cardComingSoon : ""}`}
      elevation={0}
      onClick={isLocked ? undefined : onClick}
      style={
        disabled && !comingSoon
          ? { opacity: 0.45, pointerEvents: "none", cursor: "not-allowed" }
          : undefined
      }
    >
      <Box className={classes.topRow}>
        <Box className={classes.brandRow}>
          <span className={comingSoon ? classes.iconComingSoon : undefined}>
            <IntegrationBrandIcon
              brandKey={visual.brandKey}
              variant="hub"
              accentColor={visual.accent}
              plain
            />
          </span>
          <Box className={classes.titleBlock}>
            <Typography className={classes.title} component="h3">
              {integration.label}
            </Typography>
            {integration.infoLine ? (
              <Typography className={classes.infoLine} component="div">
                {integration.infoLine}
              </Typography>
            ) : null}
          </Box>
        </Box>
        {comingSoon ? (
          <Box className={classes.statusCol}>
            {integration.mcp ? (
              <Chip size="small" label="MCP" className={classes.mcpChip} />
            ) : null}
            <Chip size="small" label="Em breve" className={classes.soonChip} />
          </Box>
        ) : !integration.externalPath ? (
          <Box className={classes.statusCol}>
            <Chip
              size="small"
              label={
                count === 0
                  ? isConfigIntegration
                    ? "Disponível"
                    : "Nenhuma"
                  : count === 1
                    ? "1 conexão"
                    : `${count} conexões`
              }
              className={`${classes.countChip} ${
                isActive ? classes.countChipActive : ""
              }`}
            />
            <span
              className={clsx(
                classes.statusToggle,
                isActive && classes.statusToggleActive
              )}
              aria-hidden
            >
              <span className={classes.statusToggleTrack}>
                <span className={classes.statusToggleThumb} />
              </span>
            </span>
          </Box>
        ) : null}
      </Box>

      <Typography className={classes.description} component="div">
        <McpTagText text={integration.description} />
      </Typography>

      {highlights.length > 0 ? (
        <Box className={classes.highlights}>
          {highlights.slice(0, 3).map((line) => (
            <Typography key={line} className={classes.highlightItem} component="div">
              {line}
            </Typography>
          ))}
        </Box>
      ) : null}

      <Divider className={classes.divider} />
      <Box className={classes.footer}>
        {integration.externalPath ? (
          <Typography className={classes.externalBadge}>Módulo externo</Typography>
        ) : comingSoon ? (
          <Typography className={classes.externalBadge}>
            {integration.mcp
              ? "Model Context Protocol"
              : integration.comingSoonProvider || "Google"}
          </Typography>
        ) : (
          <span />
        )}
        <Typography
          className={comingSoon ? classes.soonFooter : classes.viewLink}
        >
          {comingSoon
            ? "Em breve"
            : integration.externalPath
              ? "Abrir módulo →"
              : "Administrar →"}
        </Typography>
      </Box>
    </Paper>
  );
}
