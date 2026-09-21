/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import moment from "moment";
import { makeStyles, Box, Typography } from "@material-ui/core";
import PhoneIcon from "@material-ui/icons/Phone";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  label: {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: theme.palette.text.secondary,
    marginBottom: 4,
    textAlign: "center",
    width: "100%",
  },
  iphoneFrame: {
    width: "100%",
    maxWidth: 220,
    margin: "0 auto",
    position: "relative",
    borderRadius: 28,
    padding: 2,
    background: "linear-gradient(145deg, #2c2c2e 0%, #1c1c1e 100%)",
    boxShadow: "0 12px 28px -10px rgba(0,0,0,0.22)",
    border: "1.5px solid #3a3a3c",
  },
  iphoneFrameCompact: {
    maxWidth: 168,
    borderRadius: 22,
    padding: 2,
    boxShadow: "0 8px 20px -8px rgba(0,0,0,0.18)",
  },
  iphoneNotch: {
    position: "absolute",
    top: 2,
    left: "50%",
    transform: "translateX(-50%)",
    width: 68,
    height: 14,
    borderRadius: 12,
    backgroundColor: "#000",
    zIndex: 2,
  },
  iphoneNotchCompact: {
    width: 52,
    height: 11,
    borderRadius: 10,
  },
  iphoneScreen: {
    width: "100%",
    height: 300,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#e5ddd5",
    display: "flex",
    flexDirection: "column",
  },
  iphoneScreenCompact: {
    height: 220,
    borderRadius: 16,
  },
  statusBar: {
    height: 16,
    padding: "2px 8px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#075e54",
    color: "#fff",
    fontSize: 9,
  },
  statusBarCompact: {
    height: 13,
    fontSize: 8,
    padding: "1px 6px 0",
  },
  waHeader: {
    background: "#075e54",
    color: "#fff",
    padding: "7px 9px",
    display: "flex",
    alignItems: "center",
    gap: 7,
  },
  waHeaderCompact: {
    padding: "5px 7px",
    gap: 5,
  },
  waAvatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    overflow: "hidden",
    flexShrink: 0,
  },
  waAvatarCompact: {
    width: 22,
    height: 22,
  },
  waAvatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  waHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  waHeaderTitle: {
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.1,
  },
  waHeaderTitleCompact: {
    fontSize: 11,
  },
  waHeaderSub: {
    fontSize: 10,
    opacity: 0.9,
  },
  waHeaderSubCompact: {
    fontSize: 9,
  },
  chat: {
    flex: 1,
    overflowY: "auto",
    padding: "7px 9px 10px",
    backgroundImage:
      'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0L30 60M0 30L60 30\' stroke=\'%23d4cdc4\' stroke-width=\'0.5\' fill=\'none\'/%3E%3C/svg%3E")',
  },
  chatCompact: {
    padding: "5px 7px 8px",
  },
  dateTag: {
    textAlign: "center",
    marginBottom: 6,
    "& span": {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: 7,
      backgroundColor: "rgba(0,0,0,0.12)",
      color: "rgba(0,0,0,0.65)",
      fontSize: 10,
      fontWeight: 500,
    },
  },
  dateTagCompact: {
    marginBottom: 4,
    "& span": {
      fontSize: 9,
      padding: "2px 8px",
    },
  },
  bubbleIn: {
    maxWidth: "90%",
    marginBottom: 5,
    padding: "7px 9px",
    borderRadius: "10px 10px 10px 3px",
    backgroundColor: "#fff",
    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
    fontSize: 12,
    lineHeight: 1.38,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    color: "#111827",
  },
  bubbleInCompact: {
    fontSize: 10,
    padding: "5px 7px",
    marginBottom: 4,
  },
  bubbleOut: {
    maxWidth: "68%",
    marginLeft: "auto",
    marginBottom: 5,
    padding: "7px 9px",
    borderRadius: "10px 10px 3px 10px",
    backgroundColor: "#dcf8c6",
    boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)",
    fontSize: 12,
    lineHeight: 1.35,
    color: "#111827",
  },
  bubbleOutCompact: {
    fontSize: 10,
    padding: "5px 7px",
  },
  bubbleTime: {
    fontSize: 9,
    color: "rgba(0,0,0,0.42)",
    marginTop: 2,
    textAlign: "right",
  },
  bubbleTimeCompact: {
    fontSize: 8,
  },
  waFooter: {
    padding: "4px 6px",
    backgroundColor: "#f0f0f0",
    borderTop: "1px solid rgba(0,0,0,0.08)",
  },
  waFooterCompact: {
    padding: "3px 5px",
  },
  waFooterInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: "4px 8px",
    fontSize: 10,
    border: "1px solid rgba(0,0,0,0.06)",
    color: "#bbb",
  },
  waFooterInputCompact: {
    fontSize: 9,
    padding: "3px 6px",
    borderRadius: 10,
  },
  emptyHint: {
    fontSize: 10,
    color: theme.palette.text.secondary,
    textAlign: "center",
    padding: 14,
    lineHeight: 1.4,
  },
  emptyHintCompact: {
    fontSize: 9,
    padding: 10,
  },
  farewellBadge: {
    textAlign: "center",
    marginBottom: 5,
    "& span": {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 6,
      backgroundColor: "rgba(220,38,38,0.12)",
      color: "#b91c1c",
      fontSize: 9,
      fontWeight: 600,
    },
  },
}));

const buildMenuText = (headerText, queues) => {
  const header = (headerText || i18n.t("whatsappModal.wizard.menuPlaceholder")).trim();
  const lines = queues.map(
    (q, index) => `*[ ${index + 1} ]* - ${q.name || `Fila ${index + 1}`}`
  );
  lines.push("*[ Sair ]* - Encerrar");
  return [header, ...lines].join("\n");
};

export default function ConnectionQueuePreview({
  mode = "menu",
  headerText,
  queues = [],
  greetingText,
  farewellText,
  connectionName,
  compact = false,
  label,
}) {
  const classes = useStyles();
  const time = moment().format("HH:mm");
  const brand = connectionName || "VB";
  const firstQueue = queues[0];
  const menuText =
    mode === "menu" ? buildMenuText(headerText, queues) : greetingText?.trim();
  const hasContent =
    mode === "direct"
      ? Boolean(firstQueue)
      : mode === "simple"
      ? Boolean(greetingText?.trim())
      : mode === "farewell"
      ? Boolean(farewellText?.trim())
      : Boolean(menuText?.length && queues.length >= 2);

  const messageText =
    mode === "farewell" ? farewellText?.trim() : greetingText?.trim();

  return (
    <Box className={classes.root}>
      {label && <Typography className={classes.label}>{label}</Typography>}
      <Box
        className={`${classes.iphoneFrame} ${
          compact ? classes.iphoneFrameCompact : ""
        }`}
      >
        <Box
          className={`${classes.iphoneNotch} ${
            compact ? classes.iphoneNotchCompact : ""
          }`}
        />
        <Box
          className={`${classes.iphoneScreen} ${
            compact ? classes.iphoneScreenCompact : ""
          }`}
        >
          <Box
            className={`${classes.statusBar} ${
              compact ? classes.statusBarCompact : ""
            }`}
          >
            <span>09:41</span>
            <span>WhatsApp</span>
            <span>100%</span>
          </Box>
          <Box
            className={`${classes.waHeader} ${
              compact ? classes.waHeaderCompact : ""
            }`}
          >
            <Box
              className={`${classes.waAvatar} ${
                compact ? classes.waAvatarCompact : ""
              }`}
            >
              <img src="/favicon.png" alt="" className={classes.waAvatarImg} />
            </Box>
            <Box className={classes.waHeaderText}>
              <div
                className={`${classes.waHeaderTitle} ${
                  compact ? classes.waHeaderTitleCompact : ""
                }`}
              >
                {brand}
              </div>
              <div
                className={`${classes.waHeaderSub} ${
                  compact ? classes.waHeaderSubCompact : ""
                }`}
              >
                online
              </div>
            </Box>
            <PhoneIcon style={{ fontSize: compact ? 14 : 16, color: "#fff" }} />
          </Box>
          <Box
            className={`${classes.chat} ${compact ? classes.chatCompact : ""}`}
          >
            {mode === "farewell" && (
              <Box className={classes.farewellBadge}>
                <span>{i18n.t("whatsappModal.wizard.previewFarewellBadge")}</span>
              </Box>
            )}
            <Box
              className={`${classes.dateTag} ${
                compact ? classes.dateTagCompact : ""
              }`}
            >
              <span>{i18n.t("whatsappModal.wizard.previewToday")}</span>
            </Box>
            {!hasContent ? (
              <Typography
                className={`${classes.emptyHint} ${
                  compact ? classes.emptyHintCompact : ""
                }`}
              >
                {i18n.t("whatsappModal.wizard.previewEmptyShort")}
              </Typography>
            ) : (
              <>
                {mode === "menu" && (
                  <>
                    <Box
                      className={`${classes.bubbleIn} ${
                        compact ? classes.bubbleInCompact : ""
                      }`}
                    >
                      {menuText}
                      <div
                        className={`${classes.bubbleTime} ${
                          compact ? classes.bubbleTimeCompact : ""
                        }`}
                      >
                        {time}
                      </div>
                    </Box>
                    <Box
                      className={`${classes.bubbleOut} ${
                        compact ? classes.bubbleOutCompact : ""
                      }`}
                    >
                      1
                      <div
                        className={`${classes.bubbleTime} ${
                          compact ? classes.bubbleTimeCompact : ""
                        }`}
                      >
                        {time}
                      </div>
                    </Box>
                  </>
                )}
                {mode === "direct" && firstQueue && (
                  <Box
                    className={`${classes.bubbleIn} ${
                      compact ? classes.bubbleInCompact : ""
                    }`}
                  >
                    {greetingText?.trim() ||
                      i18n.t("whatsappModal.wizard.previewDirectShort", {
                        queue: firstQueue.name,
                      })}
                    <div
                      className={`${classes.bubbleTime} ${
                        compact ? classes.bubbleTimeCompact : ""
                      }`}
                    >
                      {time}
                    </div>
                  </Box>
                )}
                {(mode === "simple" || mode === "farewell") && messageText && (
                  <Box
                    className={`${classes.bubbleIn} ${
                      compact ? classes.bubbleInCompact : ""
                    }`}
                  >
                    {messageText}
                    <div
                      className={`${classes.bubbleTime} ${
                        compact ? classes.bubbleTimeCompact : ""
                      }`}
                    >
                      {time}
                    </div>
                  </Box>
                )}
              </>
            )}
          </Box>
          <Box
            className={`${classes.waFooter} ${
              compact ? classes.waFooterCompact : ""
            }`}
          >
            <Box
              className={`${classes.waFooterInput} ${
                compact ? classes.waFooterInputCompact : ""
              }`}
            >
              {i18n.t("whatsappModal.wizard.previewTypeMessage")}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
