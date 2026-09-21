/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  makeStyles,
} from "@material-ui/core";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import EmojiEmotionsOutlined from "@mui/icons-material/EmojiEmotionsOutlined";
import MicNoneOutlined from "@mui/icons-material/MicNoneOutlined";
import AttachFileOutlined from "@mui/icons-material/AttachFileOutlined";
import PermMediaOutlined from "@mui/icons-material/PermMediaOutlined";
import ChatBubbleOutlineOutlined from "@mui/icons-material/ChatBubbleOutlineOutlined";
import EventOutlined from "@mui/icons-material/EventOutlined";
import DataObjectOutlined from "@mui/icons-material/DataObjectOutlined";
import StorefrontOutlined from "@mui/icons-material/StorefrontOutlined";
import SendRounded from "@mui/icons-material/SendRounded";
import Reply from "@mui/icons-material/Reply";
import WhatsApp from "@material-ui/icons/WhatsApp";

const ICON = 16;

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const composerText = isDark ? "#f5f5f5" : "#0a0a0a";
  const composerTextMuted = isDark ? "rgba(255,255,255,0.55)" : "rgba(10,10,10,0.5)";
  const composerBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)";

  return {
    toolbar: {
      display: "flex",
      alignItems: "center",
      gap: 0,
      padding: theme.spacing(0.5, 0.75, 0.75),
      borderTop: "none",
      background: isDark ? "#1e1e1e" : "#f8f9fb",
      flexWrap: "nowrap",
      overflow: "hidden",
      minHeight: 40,
    },
    toolsLeft: {
      display: "flex",
      alignItems: "center",
      gap: 0,
      flex: "1 1 auto",
      minWidth: 0,
      overflowX: "auto",
      overflowY: "hidden",
      scrollbarWidth: "none",
      "&::-webkit-scrollbar": { display: "none" },
    },
    aiBtn: {
      padding: 4,
      color: isDark ? "#60a5fa" : "#2563eb",
      "&:hover": {
        backgroundColor: isDark ? "rgba(96,165,250,0.12)" : "rgba(37,99,235,0.08)",
      },
    },
    toolBtn: {
      padding: 4,
      color: composerTextMuted,
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        color: composerText,
      },
    },
    divider: {
      height: 18,
      margin: theme.spacing(0, 0.25),
      flexShrink: 0,
      opacity: 0.45,
      backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)",
    },
    toolsRight: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      flexShrink: 0,
      marginLeft: 4,
    },
    sendBtn: {
      padding: 6,
      borderRadius: 999,
      backgroundColor: isDark ? "#3b82f6" : "#2563eb",
      color: "#fff",
      "&:hover": {
        backgroundColor: isDark ? "#2563eb" : "#1d4ed8",
      },
      "&.Mui-disabled": {
        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
        color: isDark ? "rgba(255,255,255,0.28)" : "#cbd5e1",
      },
    },
    metaBtn: {
      padding: 5,
      color: "#25D366",
      backgroundColor: isDark ? "rgba(37,211,102,0.12)" : "rgba(37,211,102,0.1)",
      "&:hover": {
        backgroundColor: isDark ? "rgba(37,211,102,0.22)" : "rgba(37,211,102,0.18)",
      },
    },
    hiddenInput: {
      display: "none",
    },
  };
});

function ToolIconButton({ title, disabled, className, onClick, children, component }) {
  const btn = (
    <IconButton
      size="small"
      className={className}
      onClick={onClick}
      disabled={disabled}
      component={component}
      type="button"
    >
      {children}
    </IconButton>
  );
  return (
    <Tooltip title={title}>
      {disabled ? <span style={{ display: "inline-flex" }}>{btn}</span> : btn}
    </Tooltip>
  );
}

export default function MessageInputComposerToolbar({
  disabled,
  recording,
  loading,
  sending,
  inputMessage,
  showSelectMessageCheckbox,
  onOpenAi,
  onToggleEmoji,
  onStartRecording,
  onSend,
  onForward,
  onPrivateNote,
  onSchedule,
  onOpenVariables,
  onOpenProducts,
  onFileImageChange,
  onFileDocChange,
  fileImageId = "composer-upload-img",
  fileDocId = "composer-upload-doc",
  showMetaOfficial = false,
  onOpenMetaOfficial,
}) {
  const classes = useStyles();
  const hasText = Boolean(String(inputMessage || "").trim());
  const canSend = hasText && !loading && !sending;

  const fireSend = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (loading || sending) return;
    if (showSelectMessageCheckbox) {
      onForward?.();
      return;
    }
    if (!hasText || !onSend) return;
    onSend();
  };

  return (
    <div className={classes.toolbar}>
      <div className={classes.toolsLeft}>
        <ToolIconButton
          title="IA Prompts"
          className={classes.aiBtn}
          onClick={onOpenAi}
          disabled={disabled}
        >
          <AutoAwesomeOutlinedIcon style={{ fontSize: ICON }} />
        </ToolIconButton>
        {showMetaOfficial && (
          <ToolIconButton
            title="WhatsApp API Oficial"
            className={classes.toolBtn}
            onClick={onOpenMetaOfficial}
            disabled={disabled}
          >
            <WhatsApp style={{ fontSize: ICON, color: "#25D366" }} />
          </ToolIconButton>
        )}
        <Divider orientation="vertical" className={classes.divider} />
        <ToolIconButton title="Emoji" className={classes.toolBtn} onClick={onToggleEmoji} disabled={disabled}>
          <EmojiEmotionsOutlined style={{ fontSize: ICON }} />
        </ToolIconButton>
        <ToolIconButton
          title="Áudio"
          className={classes.toolBtn}
          onClick={onStartRecording}
          disabled={disabled || recording}
        >
          <MicNoneOutlined style={{ fontSize: ICON }} />
        </ToolIconButton>
        <Tooltip title="Arquivo">
          <span style={{ display: "inline-flex" }}>
            <label htmlFor={fileDocId}>
              <input
                multiple
                type="file"
                id={fileDocId}
                className={classes.hiddenInput}
                disabled={disabled}
                onChange={onFileDocChange}
                accept="application/*, text/*, .pdf, .doc, .docx, .xls, .xlsx, .zip"
              />
              <IconButton size="small" className={classes.toolBtn} component="span" disabled={disabled} type="button">
                <AttachFileOutlined style={{ fontSize: ICON }} />
              </IconButton>
            </label>
          </span>
        </Tooltip>
        <Tooltip title="Foto ou vídeo">
          <span style={{ display: "inline-flex" }}>
            <label htmlFor={fileImageId}>
              <input
                multiple
                type="file"
                id={fileImageId}
                className={classes.hiddenInput}
                disabled={disabled}
                onChange={onFileImageChange}
                accept="image/*, video/*"
              />
              <IconButton size="small" className={classes.toolBtn} component="span" disabled={disabled} type="button">
                <PermMediaOutlined style={{ fontSize: ICON }} />
              </IconButton>
            </label>
          </span>
        </Tooltip>
        <ToolIconButton title="Anotação interna" className={classes.toolBtn} onClick={onPrivateNote} disabled={disabled}>
          <ChatBubbleOutlineOutlined style={{ fontSize: ICON }} />
        </ToolIconButton>
        <ToolIconButton title="Agendamento" className={classes.toolBtn} onClick={onSchedule} disabled={disabled}>
          <EventOutlined style={{ fontSize: ICON }} />
        </ToolIconButton>
        <ToolIconButton title="Variáveis (*)" className={classes.toolBtn} onClick={onOpenVariables} disabled={disabled}>
          <DataObjectOutlined style={{ fontSize: ICON }} />
        </ToolIconButton>
        <ToolIconButton title="Produtos / lista de preços" className={classes.toolBtn} onClick={onOpenProducts} disabled={disabled}>
          <StorefrontOutlined style={{ fontSize: ICON }} />
        </ToolIconButton>
      </div>
      <div className={classes.toolsRight}>
        <IconButton
          type="button"
          size="small"
          className={classes.sendBtn}
          onClick={fireSend}
          disabled={
            loading ||
            disabled ||
            (!showSelectMessageCheckbox && !hasText && !sending)
          }
          aria-label="enviar"
        >
          {sending ? (
            <CircularProgress size={16} color="inherit" />
          ) : showSelectMessageCheckbox ? (
            <Reply style={{ fontSize: 18, transform: "scaleX(-1)" }} />
          ) : (
            <SendRounded style={{ fontSize: 18 }} />
          )}
        </IconButton>
      </div>
    </div>
  );
}
