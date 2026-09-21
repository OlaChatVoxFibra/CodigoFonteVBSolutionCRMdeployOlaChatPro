/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Chip,
  makeStyles,
} from "@material-ui/core";
import { Edit, DeleteOutline, CheckCircle } from "@material-ui/icons";
import { green } from "@material-ui/core/colors";
import { format, parseISO } from "date-fns";
import IntegrationBrandIcon, { getBrandVisualByChannel } from "./IntegrationBrandIcon";
import { Can } from "../../components/Can";
import { CONNECTIONS_FONT } from "./connectionsTypography";
import {
  getConnectionStatusLabel,
} from "./connectionsTheme";
import { useConnectionsMagicCardStyles } from "./connectionsMagicUi";

const CHANNEL_LABELS = {
  whatsapp: "WhatsApp Web",
  whatsapp_oficial: "WhatsApp API Oficial",
  telegram: "Telegram Bot",
  telegram_oficial: "Telegram Oficial",
  sms: "SMS",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

const CHANNEL_BADGE = {
  whatsapp: "WA Web",
  whatsapp_oficial: "WA API",
  telegram: "TG Bot",
  telegram_oficial: "TG Oficial",
  sms: "SMS",
  facebook: "Meta",
  instagram: "Meta",
  linkedin: "IN",
};

const useStyles = makeStyles((theme) => ({
    headRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1.25),
      minWidth: 0,
      flex: 1,
    },
    brandCol: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: theme.spacing(0.75),
      flexShrink: 0,
    },
    main: {
      flex: 1,
      minWidth: 0,
    },
    name: {
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 500,
      fontSize: "0.875rem",
      letterSpacing: "-0.02em",
      color: theme.palette.text.primary,
      lineHeight: 1.25,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    meta: {
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 400,
      fontSize: "0.75rem",
      color: theme.palette.text.secondary,
      marginTop: 4,
      lineHeight: 1.4,
    },
    metaLine2: {
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 400,
      fontSize: "0.6875rem",
      color: theme.palette.text.disabled,
      marginTop: 2,
    },
    chips: {
      display: "flex",
      flexWrap: "wrap",
      gap: theme.spacing(0.5),
      marginTop: theme.spacing(0.5),
      alignItems: "center",
    },
    chip: {
      height: 18,
      fontSize: 10,
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 400,
      borderRadius: 5,
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(255,255,255,0.06)"
          : "#f4f4f5",
      color: theme.palette.text.secondary,
    },
    statusChipConnected: {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(37,211,102,0.18)"
          : "rgba(37,211,102,0.12)",
      color: theme.palette.type === "dark" ? "#86efac" : "#15803d",
    },
    statusChipWarn: {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(237,108,2,0.18)"
          : "rgba(237,108,2,0.1)",
      color: theme.palette.type === "dark" ? "#fdba74" : "#c2410c",
    },
    bottomRow: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing(0.75),
      width: "100%",
      [theme.breakpoints.up("sm")]: {
        width: "auto",
        flex: "0 0 auto",
        flexDirection: "column",
        alignItems: "flex-end",
        maxWidth: 300,
        marginLeft: theme.spacing(0.75),
      },
    },
    statusCol: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(0.75),
      flexShrink: 0,
    },
    sessionCol: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing(0.5),
      justifyContent: "flex-start",
      [theme.breakpoints.up("sm")]: {
        justifyContent: "flex-end",
      },
    },
    actions: {
      display: "flex",
      alignItems: "center",
      gap: 2,
      flexShrink: 0,
    },
    empty: {
      padding: theme.spacing(4, 2),
      textAlign: "center",
      color: theme.palette.text.secondary,
      fontSize: "0.875rem",
      fontFamily: CONNECTIONS_FONT,
    },
    defaultIcon: {
      fontSize: 16,
      marginLeft: 4,
      verticalAlign: "middle",
    },
    iconBtn: {
      color: theme.palette.text.secondary,
      "&:hover": {
        color: theme.palette.text.primary,
        backgroundColor:
          theme.palette.type === "dark"
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.04)",
      },
    },
  }));

function buildMetaLine(whatsApp, formatNumber) {
  const parts = [];
  const num =
    whatsApp.channel === "whatsapp_oficial"
      ? whatsApp.phone_number
      : whatsApp.number;
  if (num && formatNumber) {
    parts.push(formatNumber(num));
  } else if (num) {
    parts.push(num);
  }
  if (whatsApp.botUsername) {
    parts.push(`@${whatsApp.botUsername.replace(/^@/, "")}`);
  }
  return parts.join(" · ") || null;
}

function metaQualityLabel(rating) {
  if (!rating) return null;
  const r = String(rating).toUpperCase();
  if (r === "GREEN") return "Qualidade: Alta";
  if (r === "YELLOW") return "Qualidade: Média";
  if (r === "RED") return "Qualidade: Baixa";
  return `Qualidade: ${rating}`;
}

function smsProviderLabel(whatsApp) {
  if (whatsApp?.channel !== "sms") return null;
  const p = (whatsApp.provider || "vonage").toLowerCase();
  return p === "twilio" ? "Twilio" : "Vonage";
}

function statusChipClass(status, classes) {
  if (status === "CONNECTED") return classes.statusChipConnected;
  if (status === "PAIRING" || status === "qrcode" || status === "OPENING") {
    return classes.statusChipWarn;
  }
  return "";
}

function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== "string") return `rgba(0,122,255,${alpha})`;
  const h = hex.replace("#", "");
  if (h.length < 6) return `rgba(0,122,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function ConnectionListMinimal({
  connections = [],
  loading,
  emptyLabel,
  user,
  formatNumber,
  renderStatusToolTips,
  renderActionButtons,
  onEdit,
  onDelete,
  deletingWhatsAppId,
  extraActions,
}) {
  const classes = useStyles();
  const magic = useConnectionsMagicCardStyles();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!connections.length) {
    return (
      <Typography className={classes.empty} component="p">
        {emptyLabel}
      </Typography>
    );
  }

  return (
    <Box className={magic.listPanel}>
      <Box className={magic.listWrap}>
        {connections.map((whatsApp) => {
          const visual = getBrandVisualByChannel(whatsApp.channel);
          const accent = whatsApp.color || visual.accent || "#007aff";
          const statusLabel = getConnectionStatusLabel(whatsApp);
          const channelLabel =
            CHANNEL_LABELS[whatsApp.channel] || whatsApp.channel;
          const provider = smsProviderLabel(whatsApp);
          const metaPrimary = buildMetaLine(whatsApp, formatNumber);
          const updatedStr = whatsApp.updatedAt
            ? format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")
            : null;

          return (
            <Box key={whatsApp.id} className={magic.card}>
              <span
                className={magic.accentBar}
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <Box className={classes.headRow}>
                <Box className={classes.brandCol}>
                  <IntegrationBrandIcon
                    brandKey={visual.brandKey}
                    variant="list"
                    background={visual.iconBg}
                  />
                  <span
                    className={magic.channelBadge}
                    style={{
                      color: accent,
                      backgroundColor: hexToRgba(accent, 0.12),
                      borderColor: hexToRgba(accent, 0.28),
                    }}
                  >
                    {CHANNEL_BADGE[whatsApp.channel] || channelLabel}
                  </span>
                </Box>
                <Box className={classes.main}>
                  <Typography className={classes.name} component="div">
                    {whatsApp.name}
                    {whatsApp.isDefault ? (
                      <CheckCircle
                        className={classes.defaultIcon}
                        style={{ color: green[500] }}
                      />
                    ) : null}
                  </Typography>
                  {metaPrimary ? (
                    <Typography className={classes.meta} component="div">
                      {metaPrimary}
                    </Typography>
                  ) : null}
                  <Typography className={classes.metaLine2} component="div">
                    {[provider, updatedStr && `Atualizado ${updatedStr}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </Typography>
                  <Box className={classes.chips}>
                    <Chip
                      size="small"
                      label={statusLabel}
                      className={`${classes.chip} ${statusChipClass(
                        whatsApp.status,
                        classes
                      )}`}
                    />
                    {whatsApp.isDefault ? (
                      <Chip size="small" label="Padrão" className={classes.chip} />
                    ) : null}
                    {whatsApp.channel === "whatsapp_oficial" &&
                    metaQualityLabel(whatsApp.meta_quality_rating) ? (
                      <Chip
                        size="small"
                        label={metaQualityLabel(whatsApp.meta_quality_rating)}
                        className={classes.chip}
                      />
                    ) : null}
                    {whatsApp.channel === "whatsapp_oficial" &&
                    whatsApp.meta_messaging_limit ? (
                      <Chip
                        size="small"
                        label={`Limite: ${whatsApp.meta_messaging_limit}`}
                        className={classes.chip}
                      />
                    ) : null}
                  </Box>
                </Box>
              </Box>

              <Box className={classes.bottomRow}>
                <Box className={classes.statusCol}>
                  {renderStatusToolTips(whatsApp)}
                </Box>
                <Box className={classes.sessionCol}>
                  {renderActionButtons(whatsApp)}
                </Box>
                <Can
                  role={user.profile}
                  perform="connections-page:addConnection"
                  yes={() => (
                    <Box className={classes.actions}>
                      {typeof extraActions === "function"
                        ? extraActions(whatsApp)
                        : null}
                      <IconButton
                        size="small"
                        className={classes.iconBtn}
                        onClick={() => onEdit(whatsApp)}
                        aria-label="Editar"
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        className={classes.iconBtn}
                        disabled={
                          Number(deletingWhatsAppId) === Number(whatsApp.id)
                        }
                        onClick={() => onDelete(whatsApp.id)}
                        aria-label="Excluir"
                      >
                        {Number(deletingWhatsAppId) === Number(whatsApp.id) ? (
                          <CircularProgress size={18} />
                        ) : (
                          <DeleteOutline fontSize="small" />
                        )}
                      </IconButton>
                    </Box>
                  )}
                />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
