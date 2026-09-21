/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    wrap: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 10
    },
    label: {
      fontSize: 11.5,
      color: isDark ? "rgba(255,255,255,0.55)" : "#86868b",
      letterSpacing: "-0.01em",
      textAlign: "center"
    },
    phone: {
      width: "100%",
      maxWidth: 268,
      borderRadius: 36,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
      background: isDark ? "#1c1c1e" : "#111",
      padding: 10,
      boxShadow: isDark
        ? "0 12px 40px rgba(0,0,0,0.45)"
        : "0 16px 48px rgba(0,0,0,0.18)"
    },
    notch: {
      width: 96,
      height: 8,
      borderRadius: 8,
      background: isDark ? "#0a0a0a" : "#000",
      margin: "4px auto 8px"
    },
    screen: {
      borderRadius: 28,
      overflow: "hidden",
      background: "#e5ddd5",
      height: 460,
      display: "flex",
      flexDirection: "column"
    },
    header: {
      background: "#075e54",
      color: "#fff",
      padding: "10px 12px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      minHeight: 56
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.2)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      flexShrink: 0
    },
    headerText: {
      minWidth: 0,
      flex: 1
    },
    agentName: {
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.2,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    },
    contactName: {
      fontSize: 11,
      opacity: 0.85
    },
    chat: {
      flex: 1,
      overflow: "auto",
      padding: "12px 10px",
      display: "flex",
      flexDirection: "column",
      gap: 8
    },
    bubble: {
      alignSelf: "flex-start",
      maxWidth: "88%",
      background: "#fff",
      borderRadius: "0 10px 10px 10px",
      padding: "8px 10px",
      boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      fontSize: 13,
      lineHeight: 1.45,
      color: "#111"
    },
    mediaHint: {
      fontSize: 11,
      color: "#667",
      marginTop: 6,
      fontStyle: "italic"
    },
    footerBar: {
      background: "#f0f0f0",
      padding: "8px 10px",
      borderTop: "1px solid rgba(0,0,0,0.06)"
    },
    inputFake: {
      height: 32,
      borderRadius: 18,
      background: "#fff",
      border: "1px solid rgba(0,0,0,0.08)"
    }
  };
});

export default function WhatsAppIphonePreview({
  message = "",
  agentName = "Seu agente",
  contactName = "Cliente",
  avatarUrl = "",
  showImages = false,
  showDocument = false,
  label = "Como a mensagem aparece"
}) {
  const classes = useStyles();
  const text = String(message || "").trim() || "…";

  return (
    <Box className={classes.wrap}>
      <Typography className={classes.label}>{label}</Typography>
      <Box className={classes.phone}>
        <Box className={classes.notch} />
        <Box className={classes.screen}>
          <Box className={classes.header}>
            <Box
              className={classes.avatar}
              style={
                avatarUrl
                  ? { backgroundImage: `url(${avatarUrl})` }
                  : undefined
              }
            />
            <Box className={classes.headerText}>
              <Typography className={classes.agentName}>{agentName}</Typography>
              <Typography className={classes.contactName}>{contactName}</Typography>
            </Box>
          </Box>
          <Box className={classes.chat}>
            <Box className={classes.bubble}>
              {text}
              {showImages ? (
                <Typography className={classes.mediaHint}>📷 Imagem(ns) do produto</Typography>
              ) : null}
              {showDocument ? (
                <Typography className={classes.mediaHint}>📄 Documento anexado</Typography>
              ) : null}
            </Box>
          </Box>
          <Box className={classes.footerBar}>
            <Box className={classes.inputFake} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
