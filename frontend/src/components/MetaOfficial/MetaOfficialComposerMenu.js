/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  Box,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Popover,
  Typography,
  makeStyles
} from "@material-ui/core";
import WhatsApp from "@material-ui/icons/WhatsApp";
import DescriptionOutlined from "@material-ui/icons/DescriptionOutlined";
import TouchAppOutlined from "@material-ui/icons/TouchAppOutlined";
import AccessTimeOutlined from "@material-ui/icons/AccessTimeOutlined";
import AssessmentOutlined from "@material-ui/icons/AssessmentOutlined";
import SyncOutlined from "@material-ui/icons/Sync";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    paper: {
      width: 288,
      maxWidth: "calc(100vw - 24px)",
      borderRadius: 12,
      padding: theme.spacing(1, 0, 0.5),
      boxShadow: isDark
        ? "0 12px 40px rgba(0,0,0,0.5)"
        : "0 12px 32px rgba(15,23,42,0.14)",
      border: isDark
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15,23,42,0.08)"
    },
    header: {
      padding: theme.spacing(1, 1.5, 0.75)
    },
    title: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontWeight: 500,
      fontSize: "0.82rem",
      color: "#25D366"
    },
    sessionBox: {
      marginTop: 6,
      padding: theme.spacing(0.75, 1),
      borderRadius: 8,
      fontSize: "0.72rem",
      lineHeight: 1.35,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
      color: theme.palette.text.secondary
    },
    sessionOk: {
      color: isDark ? "#86efac" : "#15803d"
    },
    sessionWarn: {
      color: isDark ? "#fdba74" : "#c2410c"
    },
    sessionDanger: {
      color: isDark ? "#fca5a5" : "#b91c1c"
    },
    listItem: {
      paddingTop: 6,
      paddingBottom: 6,
      "&:hover": {
        backgroundColor: isDark
          ? "rgba(37,211,102,0.1)"
          : "rgba(37,211,102,0.08)"
      }
    },
    listIcon: {
      minWidth: 36,
      color: "#25D366"
    },
    listPrimary: {
      fontSize: "0.8rem",
      fontWeight: 500
    },
    listSecondary: {
      fontSize: "0.68rem"
    }
  };
});

function sessionSummary(session, ticketChannel) {
  const isOficial =
    String(ticketChannel || "").toLowerCase() === "whatsapp_oficial";
  if (!isOficial) {
    return {
      text: "Abra um ticket da conexão WhatsApp API Oficial.",
      classKey: "sessionWarn"
    };
  }
  if (!session) {
    return { text: "API Oficial Meta — recursos disponíveis.", classKey: "" };
  }
  if (!session.hasInbound) {
    return {
      text: "Primeiro contato: use template Meta aprovado.",
      classKey: "sessionWarn"
    };
  }
  if (session.within24h) {
    const hrs = session.hoursRemaining;
    return {
      text:
        hrs != null ? `Janela 24h ativa · ${hrs}h restantes` : "Janela 24h ativa",
      classKey: "sessionOk"
    };
  }
  return {
    text: "Fora da 24h — template obrigatório (botões/enquete bloqueados).",
    classKey: "sessionDanger"
  };
}

/**
 * Menu compacto da API Oficial Meta, ancorado no composer.
 */
export default function MetaOfficialComposerMenu({
  open,
  anchorEl,
  onClose,
  metaWhatsAppSession,
  ticketChannel,
  disabled,
  onSendTemplate,
  onSendInteractive,
  onOpenInsights,
  onSyncTemplates
}) {
  const classes = useStyles();
  const session = sessionSummary(metaWhatsAppSession, ticketChannel);

  const run = (fn, keepAnchor = false) => {
    if (!keepAnchor) onClose?.();
    fn?.();
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      marginThreshold={8}
      disableScrollLock
      PaperProps={{ className: classes.paper, elevation: 8 }}
    >
      <Box className={classes.header}>
        <Typography className={classes.title} component="div">
          <WhatsApp style={{ fontSize: 18 }} />
          WhatsApp API Oficial
        </Typography>
        <Box
          className={`${classes.sessionBox} ${
            session.classKey ? classes[session.classKey] : ""
          }`}
        >
          <AccessTimeOutlined
            style={{ fontSize: 14, verticalAlign: "middle", marginRight: 4 }}
          />
          {session.text}
        </Box>
      </Box>
      <Divider />
      <List dense disablePadding>
        <ListItem
          button
          disabled={disabled}
          className={classes.listItem}
          onClick={() => run(onSendTemplate, true)}
        >
          <ListItemIcon className={classes.listIcon}>
            <DescriptionOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Template Meta"
            secondary="Mensagem aprovada (obrigatório fora da 24h)"
            primaryTypographyProps={{ className: classes.listPrimary }}
            secondaryTypographyProps={{ className: classes.listSecondary }}
          />
        </ListItem>
        <ListItem
          button
          disabled={disabled}
          className={classes.listItem}
          onClick={() => run(onSendInteractive, true)}
        >
          <ListItemIcon className={classes.listIcon}>
            <TouchAppOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Botões / Enquete"
            secondary="Lista interativa (só dentro da janela 24h)"
            primaryTypographyProps={{ className: classes.listPrimary }}
            secondaryTypographyProps={{ className: classes.listSecondary }}
          />
        </ListItem>
        <ListItem
          button
          disabled={disabled}
          className={classes.listItem}
          onClick={() => run(onOpenInsights, true)}
        >
          <ListItemIcon className={classes.listIcon}>
            <AssessmentOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Relatório Meta"
            secondary="Qualidade, limite, token e status Cloud"
            primaryTypographyProps={{ className: classes.listPrimary }}
            secondaryTypographyProps={{ className: classes.listSecondary }}
          />
        </ListItem>
        <ListItem
          button
          disabled={disabled}
          className={classes.listItem}
          onClick={() => run(onSyncTemplates)}
        >
          <ListItemIcon className={classes.listIcon}>
            <SyncOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Sincronizar templates"
            secondary="Atualiza templates APPROVED da WABA"
            primaryTypographyProps={{ className: classes.listPrimary }}
            secondaryTypographyProps={{ className: classes.listSecondary }}
          />
        </ListItem>
      </List>
    </Popover>
  );
}
