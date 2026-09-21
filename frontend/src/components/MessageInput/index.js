/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";
import "emoji-mart/css/emoji-mart.css";
import { Picker } from "emoji-mart";
import { useMediaQuery, useTheme } from "@material-ui/core";
import { isNil } from "lodash";
import { Fade } from "@material-ui/core";
import {
  CircularProgress,
  ClickAwayListener,
  IconButton,
  InputBase,
  makeStyles,
  Paper,
  Hidden,
  Menu,
  MenuItem,
  Tooltip,
  Fab,
  Chip,
  Box,
  Divider,
  Typography,
} from "@material-ui/core";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import TextField from "@material-ui/core/TextField";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import Popover from "@material-ui/core/Popover";
import { blue, green, pink, grey } from "@material-ui/core/colors";
import {
  AttachFile,
  CheckCircleOutline,
  Clear,
  Comment,
  Create,
  Description,
  HighlightOff,
  Person,
  Reply,
  Duo,
  Timer,
  WhatsApp,
  Info,
  AccountTree
} from "@material-ui/icons";
import TelegramIcon from "@mui/icons-material/Telegram";
import SendRounded from "@mui/icons-material/SendRounded";
import MicNoneOutlined from "@mui/icons-material/MicNoneOutlined";
import EmojiEmotionsOutlined from "@mui/icons-material/EmojiEmotionsOutlined";
import PermMediaOutlined from "@mui/icons-material/PermMediaOutlined";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";

import {
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatStrikethrough as FormatStrikethroughIcon,
  Code as CodeIcon,
  FormatListNumbered as FormatListNumberedIcon,
  FormatListBulleted as FormatListBulletedIcon,
  FormatQuote as FormatQuoteIcon,
  FormatClear as FormatClearIcon,
} from "@material-ui/icons";

import AddRounded from "@mui/icons-material/AddRounded";
import { CameraAlt } from "@material-ui/icons";
import Button from "@material-ui/core/Button";
import MicRecorder from "mic-recorder-to-mp3";
import clsx from "clsx";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import api, { openApi } from "../../services/api";
import RecordingTimer from "./RecordingTimer";

import useQuickMessages from "../../hooks/useQuickMessages";
import { isString, isEmpty } from "lodash";
import ContactSendModal from "../ContactSendModal";
import CameraModal from "../CameraModal";

import useCompanySettings from "../../hooks/useSettings/companySettings";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";
import MessageUploadMedias from "../MessageUploadMedias";
import { EditMessageContext } from "../../context/EditingMessage/EditingMessageContext";
import ScheduleModal from "../ScheduleModal";
import usePlans from "../../hooks/usePlans";
import TemplateModal from "../TemplateMetaModal";
import MetaInteractiveComposerModal from "../MetaOfficial/MetaInteractiveComposerModal";
import MetaOfficialComposerMenu from "../MetaOfficial/MetaOfficialComposerMenu";
import MetaOfficialInsightsPanel from "../MetaOfficial/MetaOfficialInsightsPanel";
import TriggerFlowModal from "../TriggerFlowModal";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import MessageInputComposerToolbar from "./MessageInputComposerToolbar";
import {
  DEFAULT_MESSAGE_VARIABLES,
  buildMessageVariableContext,
  expandMessageVariables,
  filterMessageVariables,
  getActiveVariableQuery,
  insertVariableToken,
  formatProductPriceLine,
} from "./messageInputComposerUtils";
import inventoryService from "../../services/inventoryService";


const Mp3Recorder = new MicRecorder({
  bitRate: 128,
  sampleRate: 44100
});

const isMobileDevice = () => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

import {
  getTopbarMain,
  getTopbarContrast,
  getTopbarHover,
  appleSelectMenuProps,
  appleMenuItemProps,
} from "../../utils/appleModalTheme";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const topbar = getTopbarMain(theme);
  const topbarHover = getTopbarHover(theme);
  const topbarContrast = getTopbarContrast(theme);
  const composerSurface = isDark ? "#1e1e1e" : "#f8f9fb";
  const composerText = isDark ? "#f5f5f5" : "#0a0a0a";
  const composerTextMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(10,10,10,0.45)";
  const composerPlaceholder = isDark ? "rgba(255,255,255,0.42)" : "#9ca3af";
  const composerBorder = "transparent";
  const composerInputBorder = "transparent";

  return {
  mainWrapper: {
    background: "transparent",
    backgroundColor: "transparent",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    width: "100%",
    boxSizing: "border-box",
    borderTop: "none",
    flexShrink: 0,
    marginTop: "auto",
    boxShadow: "none",
    [theme.breakpoints.down("sm")]: {
      position: "fixed",
      bottom: 0,
      width: "100%",
    },
  },
  mainWrapperEdge: {
    backgroundColor: composerSurface,
    borderRadius: 0,
  },
  avatar: {
    width: "50px",
    height: "50px",
    borderRadius: "25%",
  },
  dropInfo: {
    background: "#eee",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    padding: 15,
    left: 0,
    right: 0,
  },
  dropInfoOut: {
    display: "none",
  },
  gridFiles: {
    maxHeight: "100%",
    overflow: "scroll",
  },
  newMessageBox: {
    position: "relative",
    background: "transparent",
    width: "100%",
    maxWidth: "100%",
    display: "flex",
    padding: 0,
    alignItems: "stretch",
    margin: 0,
    alignSelf: "stretch",
    boxSizing: "border-box",
    flexShrink: 0,
    overflow: "visible",
  },
  newMessageBoxEdge: {
    padding: 0,
    width: "100%",
    maxWidth: "100%",
    margin: 0,
    alignSelf: "stretch",
  },
  composerCardEdge: {
    borderRadius: 0,
  },
  messageInputFieldContainer: {
    position: "relative",
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "visible",
  },
  messageInputWrapper: {
    padding: "4px 10px",
    marginRight: 0,
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.07)" : "#ffffff",
    display: "flex",
    alignItems: "center",
    borderRadius: 20,
    border: "none",
    boxShadow:
      theme.palette.type === "dark"
        ? "0 1px 3px rgba(0,0,0,0.28)"
        : "0 1px 3px rgba(15,23,42,0.08)",
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    overflow: "visible",
    position: "relative",
    zIndex: 10,
    transition: "box-shadow 0.2s ease",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    "&:focus-within": {
      boxShadow:
        theme.palette.type === "dark"
          ? "0 0 0 1px rgba(255,255,255,0.14), 0 2px 8px rgba(0,0,0,0.2)"
          : "0 2px 8px rgba(99,102,241,0.15), 0 0 0 2px rgba(99,102,241,0.12)",
    },
  },

  messageInputWrapperPrivate: {
    padding: 6,
    marginRight: 7,
    background: "#F0E68C",
    display: "flex",
    borderRadius: 20,
    flex: 1,
    position: "relative",
    overflow: "visible",
    zIndex: 10,
  },

  messageInputWrapperPending: {
    padding: 6,
    marginRight: 7,
    background: "#FFE0B2",
    display: "flex",
    borderRadius: 20,
    flex: 1,
    position: "relative",
    overflow: "visible",
    border: "2px solid #FF9800",
    zIndex: 10,
  },
  messageInput: {
    paddingLeft: 6,
    paddingRight: 4,
    flex: 1,
    border: "none",
    fontSize: 12,
    lineHeight: 1.35,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    letterSpacing: "-0.01em",
    minWidth: 0,
    height: 32,
    overflow: "hidden",
    resize: "none",
  },
  messageInputPrivate: {
    paddingLeft: 8,
    flex: 1,
    border: "none",
    color: grey[800],
    fontSize: 12,
    lineHeight: 1.35,
    minWidth: 0,
    height: 32,
    overflow: "hidden",
  },
  messageInputPending: {
    paddingLeft: 8,
    flex: 1,
    border: "none",
    color: "#E65100",
    fontWeight: 500,
    fontSize: 12,
    lineHeight: 1.35,
    minWidth: 0,
    height: 32,
    overflow: "hidden",
  },
  sendMessageIcons: {
    color: theme.palette.type === "dark" ? "rgba(255,255,255,0.65)" : "#64748b",
  },
  sendIconActive: {
    color: theme.palette.type === "dark" ? "#60a5fa" : "#2563eb",
  },
  sendIconIdle: {
    color: theme.palette.type === "dark" ? "rgba(255,255,255,0.34)" : "#9ca3af",
  },
  sendActionButton: {
    padding: 6,
    borderRadius: 999,
    transition: "background-color 0.15s ease, transform 0.12s ease",
    "&:hover": {
      backgroundColor: theme.palette.type === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.04)",
    },
  },
  ForwardMessageIcons: {
    color: grey[700],
    transform: "scaleX(-1)",
  },
  uploadInput: {
    display: "none",
  },
  viewMediaInputWrapper: {
    maxHeight: "100%",
    display: "flex",
    padding: "10px 13px",
    position: "relative",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor:
      theme.mode === "light"
        ? "#ffffff"
        : theme.palette.sidebarMenuBackground || theme.palette.background.paper,
    borderTop:
      theme.mode === "light"
        ? "1px solid rgba(0, 0, 0, 0.12)"
        : "1px solid rgba(255, 255, 255, 0.08)",
  },
  emojiBox: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    marginBottom: 8,
    zIndex: 1300,
    maxWidth: "min(100vw - 24px, 352px)",
    boxShadow: theme.shadows[8],
    borderRadius: 8,
    overflow: "hidden",
  },
  newMessageLeadingActions: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: 4,
  },
  circleLoading: {
    color: green[500],
    opacity: "70%",
    position: "absolute",
    top: "20%",
    left: "50%",
    marginLeft: -12,
  },
  audioLoading: {
    color: green[500],
    opacity: "70%",
  },
  recorderWrapper: {
    display: "flex",
    alignItems: "center",
    alignContent: "middle",
  },
  micSendActionsRow: {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
    gap: 0,
  },
  cancelAudioIcon: {
    color: "red",
  },
  sendAudioIcon: {
    color: "green",
  },
  replyginMsgWrapper: {
    display: "flex",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingLeft: 73,
    paddingRight: 7,
    backgroundColor: theme.palette.optionsBackground,
  },
  replyginMsgContainer: {
    flex: 1,
    marginRight: 5,
    overflowY: "hidden",
    backgroundColor: theme.mode === "light" ? "#f0f0f0" : theme.palette.inputBackground,
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },
  replyginMsgBody: {
    padding: 10,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },
  replyginContactMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },
  replyginSelfMsgSideColor: {
    flex: "none",
    width: "4px",
    backgroundColor: "#6bcbef",
  },
  floatingFormatMenu: {
    position: 'fixed',
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[8],
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '4px',
    border: `1px solid ${theme.palette.divider}`,
  },

  formatIconButton: {
    padding: '6px',
    borderRadius: '4px',
    minWidth: '32px',
    height: '32px',
  },
  messageContactName: {
    display: "flex",
    color: "#6bcbef",
    fontWeight: 500,
  },
  messageQuickAnswersWrapper: {
    margin: 0,
    position: "absolute",
    bottom: "100%", // ✅ Posicionar acima do input
    background: theme.palette.background.default,
    padding: 0,
    border: "none",
    left: 0,
    right: 0, // ✅ Usar right: 0 em vez de width: 100%
    maxHeight: "200px",
    overflowY: "auto",
    overflowX: "hidden",
    boxShadow: "0 -4px 16px rgba(0, 0, 0, 0.15)",
    borderRadius: "8px 8px 0 0",
    zIndex: 1300,
    "&::-webkit-scrollbar": {
      width: "6px",
    },
    "&::-webkit-scrollbar-track": {
      background: "transparent",
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: theme.palette.action.disabled,
      borderRadius: "3px",
      "&:hover": {
        backgroundColor: theme.palette.action.hover,
      },
    },
    "& li": {
      listStyle: "none",
      "& a": {
        display: "block",
        padding: "8px",
        textOverflow: "ellipsis",
        overflow: "hidden",
        maxHeight: "auto",
        "&:hover": {
          background: theme.palette.background.paper,
          cursor: "pointer",
        },
      },
    },
  },
  quickAnswerItem: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1.5),
    minHeight: "48px",
    cursor: "pointer", // ✅ Adicionar cursor pointer
    borderRadius: "4px", // ✅ Bordas arredondadas
    margin: "2px 4px", // ✅ Pequena margem
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
    transition: "all 0.2s ease-in-out",
  },

  // ✅ NOVO: Estilo para item selecionado via teclado
  quickAnswerItemSelected: {
    backgroundColor: theme.palette.primary.light + "30", // ✅ Cor semi-transparente
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    fontWeight: 500,
  },

  // ✅ NOVO: Indicador de scroll
  quickAnswersScrollIndicator: {
    textAlign: "center",
    padding: theme.spacing(1),
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    fontStyle: "italic",
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  messageQuickAnswersWrapperItem: {
    listStyle: "none",
  },
  quickAnswerItemDisabled: {
    opacity: 0.65,
    cursor: "default",
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  quickAnswerText: {
    flex: 1,
    textOverflow: "ellipsis",
    overflow: "hidden",
  },
  mediaTypeChip: {
    height: 20,
    fontSize: "0.7rem",
  },
  invertedFabMenu: {
    border: "none",
    borderRadius: 50,
    boxShadow: "none",
    padding: theme.spacing(1),
    backgroundColor: "transparent",
    color: "grey",
    "&:hover": {
      backgroundColor: "transparent",
    },
    "&:disabled": {
      backgroundColor: "transparent !important",
    },
  },
  invertedFabMenuMP: {
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    width: theme.spacing(4),
    height: theme.spacing(4),
    backgroundColor: "transparent",
    color: blue[800],
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  invertedFabMenuCont: {
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    minHeight: "auto",
    width: theme.spacing(4),
    height: theme.spacing(4),
    backgroundColor: "transparent",
    color: blue[500],
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  invertedFabMenuMeet: {
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    minHeight: "auto",
    width: theme.spacing(4),
    height: theme.spacing(4),
    backgroundColor: "transparent",
    color: green[500],
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  invertedFabMenuDoc: {
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    width: theme.spacing(4),
    height: theme.spacing(4),
    backgroundColor: "transparent",
    color: "#7f66ff",
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  invertedFabMenuCamera: {
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    width: theme.spacing(4),
    height: theme.spacing(4),
    backgroundColor: "transparent",
    color: pink[500],
    "&:hover": {
      backgroundColor: "transparent",
    },
  },
  aiIconWrapper: {
    width: theme.spacing(4.5),
    height: theme.spacing(4.5),
    borderRadius: "50%",
    backgroundColor: "#E6F0FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  aiIcon: {
    color: theme.palette.primary.main,
  },
  aiInFieldBtn: {
    padding: 6,
    flexShrink: 0,
    color: theme.palette.type === "dark" ? "#7dd3fc" : "#0d9488",
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(125, 211, 252, 0.08)"
          : "rgba(13, 148, 136, 0.08)",
    },
  },
  aiTranslatePaper: {
    width: 272,
    maxWidth: "min(272px, calc(100vw - 24px))",
    borderRadius: 16,
    padding: 0,
    overflow: "hidden",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeight: 400,
    boxShadow: isDark
      ? "0 16px 40px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.1)"
      : "0 16px 40px rgba(15,23,42,0.14), 0 0 0 0.5px rgba(255,255,255,0.9)",
    border: isDark
      ? "0.5px solid rgba(255,255,255,0.12)"
      : "0.5px solid rgba(255,255,255,0.75)",
    backgroundColor: isDark
      ? "rgba(44,44,46,0.92)"
      : "rgba(255,255,255,0.96)",
    backdropFilter: "saturate(180%) blur(20px)",
    WebkitBackdropFilter: "saturate(180%) blur(20px)",
    color: composerText,
  },
  aiTranslatePopoverBody: {
    padding: theme.spacing(1, 1.25, 1.25),
    color: composerText,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeight: 400,
    boxSizing: "border-box",
    "& .MuiFormLabel-root": {
      color: composerTextMuted,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: "0.02em",
      transform: "translate(12px, 10px) scale(1)",
    },
    "& .MuiInputLabel-shrink": {
      transform: "translate(12px, -6px) scale(0.85)",
    },
    "& .MuiOutlinedInput-root": {
      color: composerText,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: 12,
      fontWeight: 400,
      borderRadius: 10,
      backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(120,120,128,0.08)",
    },
    "& .MuiOutlinedInput-input": {
      fontSize: 12,
      fontWeight: 400,
      padding: "8px 10px",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "transparent",
    },
    "& .MuiOutlinedInput-root.Mui-focused": {
      boxShadow: `0 0 0 2px ${topbar}33`,
    },
    "& .MuiSelect-icon": {
      color: composerTextMuted,
      fontSize: 20,
    },
  },
  aiTranslateHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    padding: theme.spacing(1, 1.25, 0.75),
    color: composerText,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: "-0.02em",
    lineHeight: 1.25,
    borderBottom: isDark
      ? "0.5px solid rgba(255,255,255,0.08)"
      : "0.5px solid rgba(60,60,67,0.1)",
  },
  aiTranslateSubtitle: {
    fontSize: 10,
    fontWeight: 400,
    letterSpacing: "-0.01em",
    color: composerTextMuted,
    textAlign: "center",
    lineHeight: 1.3,
    margin: 0,
  },
  aiPromptPaper: {
    width: 328,
    maxWidth: "calc(100vw - 24px)",
    borderRadius: 22,
    padding: 0,
    overflow: "hidden",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeight: 400,
    boxShadow: isDark
      ? "0 24px 64px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.08)"
      : "0 24px 64px rgba(15,23,42,0.18), 0 0 0 0.5px rgba(255,255,255,0.9), inset 0 1px 0 rgba(255,255,255,0.95)",
    border: isDark
      ? "0.5px solid rgba(255,255,255,0.14)"
      : "0.5px solid rgba(255,255,255,0.75)",
    backgroundColor: isDark
      ? "rgba(44,44,46,0.78)"
      : "rgba(255,255,255,0.72)",
    backdropFilter: "saturate(200%) blur(28px)",
    WebkitBackdropFilter: "saturate(200%) blur(28px)",
    color: composerText,
  },
  aiPromptHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    padding: theme.spacing(1.75, 2, 1),
    color: composerText,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: 15,
    fontWeight: 400,
    letterSpacing: "-0.03em",
    lineHeight: 1.25,
    borderBottom: isDark
      ? "0.5px solid rgba(255,255,255,0.08)"
      : "0.5px solid rgba(60,60,67,0.12)",
  },
  aiPromptSubtitle: {
    fontSize: 11,
    fontWeight: 400,
    letterSpacing: "-0.01em",
    color: composerTextMuted,
    textAlign: "center",
    lineHeight: 1.35,
    margin: 0,
  },
  aiPromptTextarea: {
    width: "100%",
    minHeight: 88,
    padding: "11px 13px",
    borderRadius: 14,
    border: "none",
    outline: "none",
    resize: "none",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(120,120,128,0.08)",
    color: composerText,
    fontSize: 13,
    fontWeight: 400,
    lineHeight: 1.5,
    letterSpacing: "-0.01em",
    boxSizing: "border-box",
    transition: "background-color 0.22s ease, box-shadow 0.22s ease",
    "&::placeholder": {
      color: composerTextMuted,
      opacity: 1,
      fontWeight: 400,
    },
    "&:focus": {
      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(120,120,128,0.12)",
      boxShadow: `0 0 0 3px ${topbar}44`,
    },
  },
  aiPromptInput: {
    padding: theme.spacing(1),
    borderRadius: 8,
    margin: theme.spacing(0.5, 0, 1),
    backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
    color: composerText,
  },
  aiPromptPopoverBody: {
    padding: theme.spacing(1.25, 1.5, 1.5),
    color: composerText,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeight: 400,
    "& .MuiFormLabel-root": {
      color: composerTextMuted,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: 11,
      fontWeight: 400,
      letterSpacing: "-0.01em",
    },
    "& .MuiOutlinedInput-root": {
      color: composerText,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: 13,
      fontWeight: 400,
      borderRadius: 12,
      backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(120,120,128,0.08)",
    },
    "& .MuiOutlinedInput-input": {
      fontSize: 13,
      fontWeight: 400,
      padding: "10px 12px",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "transparent",
    },
    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: "transparent",
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: "transparent",
    },
    "& .MuiOutlinedInput-root.Mui-focused": {
      boxShadow: `0 0 0 3px ${topbar}44`,
    },
    "& .MuiSelect-icon": {
      color: composerTextMuted,
    },
    "& .MuiMenuItem-root": {
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: 13,
      fontWeight: 400,
    },
  },
  aiPromptActions: {
    display: "flex",
    justifyContent: "stretch",
    gap: theme.spacing(0.75),
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(0.25),
    borderTop: isDark
      ? "0.5px solid rgba(255,255,255,0.08)"
      : "0.5px solid rgba(60,60,67,0.1)",
    "& > button": {
      flex: 1,
      margin: 0,
      textTransform: "none",
      borderRadius: 12,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: 13,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      minHeight: 36,
      padding: "7px 14px",
      boxShadow: "none",
    },
  },
  aiPromptBtnCancel: {
    color: `${composerText} !important`,
    backgroundColor: isDark ? "rgba(120,120,128,0.24)" : "rgba(120,120,128,0.16)",
    border: "none !important",
    "&:hover": {
      backgroundColor: isDark ? "rgba(120,120,128,0.32)" : "rgba(120,120,128,0.22)",
    },
  },
  aiPromptBtnApply: {
    backgroundColor: `${topbar} !important`,
    color: `${topbarContrast} !important`,
    "&:hover": {
      backgroundColor: `${topbarHover} !important`,
    },
    "&.Mui-disabled": {
      backgroundColor: isDark ? "rgba(120,120,128,0.3) !important" : "rgba(120,120,128,0.25) !important",
      color: "rgba(255,255,255,0.5) !important",
    },
  },
  aiMenuPaper: {
    borderRadius: 14,
    minWidth: 200,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeight: 400,
    padding: theme.spacing(0.5, 0),
    boxShadow: isDark
      ? "0 16px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "0 16px 48px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
    backdropFilter: "saturate(180%) blur(20px)",
    WebkitBackdropFilter: "saturate(180%) blur(20px)",
    "& .MuiMenuItem-root": {
      fontSize: 13,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      padding: "8px 16px",
      borderRadius: 8,
      margin: "2px 8px",
      minHeight: 36,
    },
  },
  flexContainer: {
    display: "flex",
    flex: "1 1 auto",
    flexDirection: "column",
    minWidth: 0,
    alignSelf: "stretch",
    width: "100%",
  },
  composerMobileExtras: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    marginBottom: theme.spacing(0.5),
  },
  flexItem: {
    flex: 1,
    minWidth: 0,
    width: "100%",
    display: "flex",
    alignItems: "stretch",
  },
  composerHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  composerMoreBtn: {
    padding: 4,
    color: composerTextMuted,
  },
  composerExtrasMenuPaper: {
    minWidth: 152,
    maxWidth: 176,
    maxHeight: 220,
    borderRadius: 6,
    "& .MuiMenuItem-root": {
      minHeight: 28,
      padding: "3px 8px",
      fontSize: 11,
      lineHeight: 1.2,
    },
    "& .MuiListItemIcon-root": {
      minWidth: 26,
    },
    "& .MuiDivider-root": {
      marginTop: 1,
      marginBottom: 1,
    },
  },
  composerExtrasMenuIcon: {
    fontSize: 14,
    marginRight: 6,
    verticalAlign: "middle",
    color: "grey",
  },
  pendingAlert: {
    marginBottom: theme.spacing(0.5),
    padding: theme.spacing(0.75, 1.5),
    backgroundColor: "#E3F2FD",
    border: "1px solid #2196F3",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    color: "#1976D2",
    fontSize: "0.75rem",
    lineHeight: 1.35,
  },
  composerColumnWrap: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  composerCard: {
    width: "100%",
    maxWidth: "100%",
    flex: "1 1 auto",
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    borderRadius: 12,
    border: "none",
    backgroundColor: composerSurface,
    color: composerText,
    boxShadow: "none",
    overflow: "hidden",
  },
  composerHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    padding: theme.spacing(0.75, 1.25),
    minHeight: 36,
    backgroundColor: composerSurface,
    color: composerText,
    borderBottom: "none",
  },
  composerChannel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    color: composerText,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  composerAiAssist: {
    textTransform: "none",
    fontSize: 11,
    fontWeight: 500,
    color: isDark ? "#93c5fd" : "#2563eb",
    padding: "2px 6px",
    minWidth: 0,
    flexShrink: 0,
    borderRadius: 6,
    "&:hover": {
      backgroundColor: isDark ? "rgba(96,165,250,0.12)" : "rgba(37,99,235,0.08)",
    },
    "&.Mui-disabled": {
      color: composerTextMuted,
    },
    "& .MuiButton-startIcon": {
      marginRight: 4,
    },
  },
  composerBody: {
    position: "relative",
    flex: "1 1 auto",
    minHeight: 0,
    padding: theme.spacing(0.5, 1.25, 0.25),
    backgroundColor: composerSurface,
    color: composerText,
  },
  composerInputPending: {
    color: isDark ? "#ffb74d" : "#E65100",
    fontWeight: 500,
  },
  composerInput: {
    width: "100%",
    fontSize: 13,
    lineHeight: 1.4,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    color: composerText,
    padding: 0,
    minHeight: 32,
    maxHeight: 120,
    overflow: "auto",
    alignItems: "flex-start",
    "& textarea, & .MuiInputBase-input": {
      width: "100%",
      minHeight: "32px !important",
      padding: "2px 0 !important",
      color: composerText,
      WebkitTextFillColor: composerText,
    },
    "& textarea::placeholder, & .MuiInputBase-input::placeholder": {
      color: composerPlaceholder,
      opacity: 1,
      fontSize: 13,
      WebkitTextFillColor: composerPlaceholder,
    },
    "&.Mui-disabled": {
      color: composerTextMuted,
      "& textarea, & .MuiInputBase-input": {
        color: composerTextMuted,
        WebkitTextFillColor: composerTextMuted,
      },
      "& textarea::placeholder, & .MuiInputBase-input::placeholder": {
        color: composerPlaceholder,
        WebkitTextFillColor: composerPlaceholder,
      },
    },
  },
  variableTokenChip: {
    height: 20,
    fontSize: "0.7rem",
    fontFamily: "ui-monospace, monospace",
  },
  productsPopover: {
    padding: theme.spacing(1),
    minWidth: 280,
    maxWidth: 360,
    maxHeight: 320,
    overflowY: "auto",
  },
  productRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing(0.75, 1),
    borderRadius: 8,
    cursor: "pointer",
    "&:hover": {
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)",
    },
  },
};
});

const MessageInput = ({
  ticketId,
  ticketStatus,
  droppedFiles,
  contactId,
  ticketChannel,
  metaWhatsAppSession,
  whatsappId,
  disableAutoFocus = false,
  allowAiWhileClosed = false,
  edgeToEdge = false,
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const [mediasUpload, setMediasUpload] = useState([]);
  const isMounted = useRef(true);

  const [inputMessage, setInputMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [interactiveModalOpen, setInteractiveModalOpen] = useState(false);
  const [metaMenuAnchorEl, setMetaMenuAnchorEl] = useState(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [quickAnswers, setQuickAnswer] = useState([]);
  const [typeBar, setTypeBar] = useState(false);
  const inputRef = useRef();
  const [onDragEnter, setOnDragEnter] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const { setReplyingMessage, replyingMessage } =
    useContext(ReplyMessageContext);
  const { setEditingMessage, editingMessage } = useContext(EditMessageContext);
  const { user } = useContext(AuthContext);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const { getPlanCompany } = usePlans();

  const [signMessagePar, setSignMessagePar] = useState(false);
  const { get: getSetting } = useCompanySettings();
  const [signMessage, setSignMessage] = useState(true);
  const [privateMessage, setPrivateMessage] = useState(false);
  const [privateMessageInputVisible, setPrivateMessageInputVisible] =
    useState(false);
  const [senVcardModalOpen, setSenVcardModalOpen] = useState(false);
  const [showModalMedias, setShowModalMedias] = useState(false);
  const [showSchedules, setShowSchedules] = useState(false);
  const [useWhatsappOfficial, setUseWhatsappOfficial] = useState(false);
  const { list: listQuickMessages } = useQuickMessages();

  const isMobile = useMediaQuery("(max-width: 767px)");
  const [placeholderText, setPlaceHolderText] = useState("");

  const [selectedQuickAnswerIndex, setSelectedQuickAnswerIndex] = useState(-1);
  const [isNavigatingQuickAnswers, setIsNavigatingQuickAnswers] = useState(false);
  const [selectedVariableIndex, setSelectedVariableIndex] = useState(-1);
  const [isNavigatingVariables, setIsNavigatingVariables] = useState(false);

  const [triggerFlowModalOpen, setTriggerFlowModalOpen] = useState(false);
  const [flowProcessing, setFlowProcessing] = useState(false);
  const flowProcessingRef = useRef(false);

  const [formatMenuAnchorPosition, setFormatMenuAnchorPosition] = useState(null);
  const [selectedText, setSelectedText] = useState({ text: '', start: 0, end: 0 });
  const [aiMenuAnchor, setAiMenuAnchor] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPromptAnchorEl, setAiPromptAnchorEl] = useState(null);
  const [aiPromptText, setAiPromptText] = useState("");
  const aiPromptInputRef = useRef(null);
  const [aiTranslateOpen, setAiTranslateOpen] = useState(false);
  const [aiTranslateLang, setAiTranslateLang] = useState("pt-BR");
  const newMessageBoxRef = useRef(null);
  const sendingRef = useRef(false);
  const [variableBar, setVariableBar] = useState(false);
  const [productsAnchor, setProductsAnchor] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [contactMeta, setContactMeta] = useState(null);

  const isTicketPending = () => {
    return ticketStatus === "pending";
  };

  useEffect(() => {
    if (isTicketPending()) {
      // Em espera: permitir envio real no WhatsApp (não forçar nota interna)
      setPrivateMessage(false);
      setPrivateMessageInputVisible(false);
    }
  }, [ticketStatus]);

  useEffect(() => {
    setFlowProcessing(false);
    flowProcessingRef.current = false;
  }, [ticketId]);

  useEffect(() => {
    if (!useWhatsappOfficial) return;
    let cancelled = false;
    async function fetchTemplates() {
      try {
        const templates = await api.request({
          url: `/quick-messages/list`,
          method: "GET",
          params: {
            isOficial: "true",
            userId: user.id,
            companyId: user.companyId,
            status: "APPROVED"
          }
        });
        if (!cancelled) setTemplates(templates.data);
      } catch (err) {
        if (!cancelled) toastError(err);
      }
    }
    fetchTemplates();
    return () => {
      cancelled = true;
    };
  }, [useWhatsappOfficial, user.id, user.companyId]);

  useEffect(() => {
    const companyId = user.companyId;
    if (!companyId) return;
    let cancelled = false;
    async function fetchData() {
      try {
        const planConfigs = await getPlanCompany(undefined, companyId);
        if (cancelled) return;
        const plan = planConfigs?.plan;
        if (plan) {
          setShowSchedules(!!plan.useSchedules);
          setUseWhatsappOfficial(!!plan.useWhatsappOfficial);
        }
      } catch (err) {
        if (!cancelled) toastError(err);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.companyId]);

  const handleOpenAIMenu = (e) => setAiMenuAnchor(e.currentTarget);
  const handleCloseAIMenu = () => setAiMenuAnchor(null);
  const handleOpenAiPrompt = () => {
    setAiPromptText("");
    setAiPromptAnchorEl(aiMenuAnchor);
    setAiPromptOpen(true);
    handleCloseAIMenu();
  };
  const handleCloseAiPrompt = () => {
    setAiPromptOpen(false);
    setAiPromptText("");
  };

  useEffect(() => {
    if (aiPromptOpen) {
      // Força foco estável no campo do balão
      const t = setTimeout(() => {
        if (aiPromptInputRef.current) {
          aiPromptInputRef.current.focus();
        }
      }, 0);
      return () => clearTimeout(t);
    }
  }, [aiPromptOpen]);

  const callOpenAITransform = async (systemPrompt, userPrompt) => {
    if (!inputMessage || inputMessage.trim() === "") {
      toast.error("Digite um texto no campo de mensagem antes de usar a IA.");
      handleCloseAIMenu();
      return;
    }
    try {
      setAiLoading(true);
      const { data } = await api.post("/prompt/composer-assist", {
        systemPrompt,
        userPrompt,
      });
      const text = data?.text || "";
      if (text) {
        setInputMessage(text);
        inputRef.current?.focus();
      } else {
        toast.error("A IA não retornou texto. Verifique o modelo em Agente IA → Integração.");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Falha ao usar IA. Verifique a API Key e o modelo em Agente IA → Integração.";
      toast.error(msg);
      console.error(err);
    } finally {
      setAiLoading(false);
      handleCloseAIMenu();
    }
  };

  const handleImproveGrammar = () => {
    callOpenAITransform(
      "Você é um revisor. Corrija apenas gramática e ortografia, mantendo o mesmo tom e intenção. Responda apenas com o texto corrigido, sem comentários.",
      `Texto original:\n${inputMessage}`
    );
  };

  const handleImproveText = () => {
    callOpenAITransform(
      "Você é um editor. Reescreva o texto de forma mais clara, natural e objetiva, mantendo o sentido. Responda apenas com o texto reescrito.",
      `Texto original:\n${inputMessage}`
    );
  };

  const handleCustomPrompt = () => {
    handleOpenAiPrompt();
  };
  const handleRunAiPrompt = () => {
    if (!aiPromptText || aiPromptText.trim() === "") {
      setAiPromptOpen(false);
      return;
    }
    callOpenAITransform(
      "Siga estritamente as instruções do usuário para transformar o texto. Responda somente com o resultado final, sem explicações.",
      `Instruções: ${aiPromptText}\n\nTexto original:\n${inputMessage}`
    );
    setAiPromptOpen(false);
  };

  const handleTranslate = () => {
    setAiPromptAnchorEl(aiMenuAnchor);
    setAiTranslateOpen(true);
    handleCloseAIMenu();
  };
  const handleConfirmTranslate = () => {
    if (!aiTranslateLang) {
      setAiTranslateOpen(false);
      return;
    }
    callOpenAITransform(
      `Traduza o texto para ${aiTranslateLang}. Preserve o sentido e o tom. Responda apenas com o texto traduzido.`,
      `Texto:\n${inputMessage}`
    );
    setAiTranslateOpen(false);
  };

  useEffect(() => {
    if (ticketStatus === "open" || ticketStatus === "group") {
      setPlaceHolderText(
        "Use '/' para respostas rápidas, '*' para variáveis, ':' para emoji"
      );
    } else if (ticketStatus === "pending") {
      setPlaceHolderText("Digite uma mensagem");
    } else {
      setPlaceHolderText(i18n.t("messagesInput.placeholderClosed"));
    }
  }, [ticketStatus]);

  useEffect(() => {
    if (!contactId) {
      setContactMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/contacts/${contactId}`);
        if (!cancelled) setContactMeta(data);
      } catch {
        if (!cancelled) setContactMeta(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const {
    selectedMessages,
    setForwardMessageModalOpen,
    showSelectMessageCheckbox,
  } = useContext(ForwardMessageContext);

  useEffect(() => {
    if (droppedFiles && droppedFiles.length > 0) {
      const selectedMedias = Array.from(droppedFiles);
      setMediasUpload(selectedMedias);
      setShowModalMedias(true);
    }
  }, [droppedFiles]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (disableAutoFocus) return;
    inputRef.current.focus();
    if (editingMessage) {
      setInputMessage(editingMessage.body);
    }
  }, [replyingMessage, editingMessage, disableAutoFocus]);

  useEffect(() => {
    if (disableAutoFocus) return;
    inputRef.current.focus();
    return () => {
      setInputMessage("");
      setShowEmoji(false);
      setMediasUpload([]);
      setReplyingMessage(null);
      if (!isTicketPending()) {
        setPrivateMessage(false);
        setPrivateMessageInputVisible(false);
      }
      setEditingMessage(null);
    };
  }, [ticketId, setReplyingMessage, setEditingMessage, disableAutoFocus]);


  useEffect(() => {
    let isProcessing = false; // ✅ Flag para evitar processamento duplo

    const handleInsertQuickMessage = (event) => {
      // ✅ IMPORTANTE: Evitar processamento duplo
      if (isProcessing) {
        console.log("⚠️ Já processando evento, ignorando...");
        return;
      }

      isProcessing = true;
      console.log("📥 Evento insertQuickMessage recebido:", event.detail);

      const { quickMessage } = event.detail;

      if (!quickMessage) {
        console.error("❌ quickMessage não encontrado no evento");
        isProcessing = false;
        return;
      }

      console.log("🔍 Processando quickMessage:", {
        hasMedia: !!quickMessage.mediaPath,
        mediaType: quickMessage.mediaType,
        message: quickMessage.message,
        ticketId: ticketId
      });

      if (quickMessage.mediaPath) {
        console.log("🎵 Processando resposta rápida com mídia");
        handleQuickAnswersClick({
          value: quickMessage.message || "",
          mediaPath: quickMessage.mediaPath,
          mediaType: quickMessage.mediaType,
          shortcode: quickMessage.shortcode,
          label: `/${quickMessage.shortcode} - ${quickMessage.message}`
        }).finally(() => {
          isProcessing = false; // ✅ Liberar flag após processamento
        });
      } else {
        console.log("📝 Processando resposta rápida de texto");
        const currentText = inputMessage?.trim() || "";
        const newText = currentText
          ? `${currentText}\n\n${quickMessage.message}`
          : quickMessage.message;

        setInputMessage(newText);

        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            const length = newText.length;
            inputRef.current.setSelectionRange(length, length);
          }
          isProcessing = false; // ✅ Liberar flag
        }, 100);
      }
    };

    // ✅ IMPORTANTE: Escutar apenas no window
    window.addEventListener('insertQuickMessage', handleInsertQuickMessage);

    return () => {
      window.removeEventListener('insertQuickMessage', handleInsertQuickMessage);
      isProcessing = false; // ✅ Reset da flag no cleanup
    };
  }, [inputMessage, ticketId, privateMessage]);

  useEffect(() => {
    const handleFillComposer = (event) => {
      const text = String(event?.detail?.text || "").trim();
      if (!text) return;
      setInputMessage(text);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const length = text.length;
          inputRef.current.setSelectionRange(length, length);
        }
      }, 50);
    };
    window.addEventListener("fillComposerMessage", handleFillComposer);
    return () => {
      window.removeEventListener("fillComposerMessage", handleFillComposer);
    };
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (isMounted.current) setOnDragEnter(false);
    }, 1000);
  }, [onDragEnter === true]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const setting = await getSetting({
          column: "sendSignMessage",
        });

        if (!isMounted.current) return;
        if (setting?.sendSignMessage === "enabled") {
          setSignMessagePar(true);
          try {
            const signMessageStorage = JSON.parse(
              localStorage.getItem("persistentSignMessage")
            );
            if (isNil(signMessageStorage)) {
              setSignMessage(true);
            } else {
              setSignMessage(signMessageStorage);
            }
          } catch {
            setSignMessage(true);
          }
        } else if (setting?.sendSignMessage === "dontSend" || setting?.sendSignMessage === "disabled") {
          localStorage.setItem("persistentSignMessage", false);
          setSignMessage(false);
          setSignMessagePar(false);
        } else {
          setSignMessagePar(false);
        }
      } catch (err) {
        toastError(err);
      }
    };
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CORREÇÃO DO ERRO charAt - Função mais robusta
  const safeCapitalizeFirstLetter = (string) => {
    if (!string || typeof string !== 'string') return "";
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // FUNÇÕES PARA TRIGGER FLOW MODAL
  const handleTriggerFlowClick = useCallback(() => {
    console.log("🎯 Abrindo modal de fluxo");

    // 🛡️ RESET PREVENTIVO
    setFlowProcessing(false);
    flowProcessingRef.current = false;

    setTriggerFlowModalOpen(true);
  }, []);

  const handleTriggerFlowClose = useCallback(() => {
    console.log("🚪 Fechando modal");

    setFlowProcessing(false);
    flowProcessingRef.current = false;
    setTriggerFlowModalOpen(false);
  }, []);

  const handleFlowProcessing = useCallback((isProcessing) => {
    console.log("🔄 Flow processing:", isProcessing);
    setFlowProcessing(isProcessing);
    flowProcessingRef.current = isProcessing;

    // 🔥 TIMEOUT SIMPLES: 8 segundos e libera SEM PERGUNTAR
    if (isProcessing) {
      setTimeout(() => {
        console.log("⏰ TIMEOUT - Liberando campo FORÇADO");
        setFlowProcessing(false);
        flowProcessingRef.current = false;
      }, 8000);
    }
  }, []);

  const handleFlowTriggered = useCallback((data) => {
    console.log("✅ Fluxo concluído");

    // 🔥 RESET IMEDIATO - SEM TIMEOUT
    setFlowProcessing(false);
    flowProcessingRef.current = false;
  }, []);


  const scrollPickerItemIntoView = useCallback((containerSelector, index) => {
    setTimeout(() => {
      const container = document.querySelector(containerSelector);
      if (container?.children?.[index]) {
        container.children[index].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, 0);
  }, []);

  const getVariableItemStyle = (index) => ({
    backgroundColor: selectedVariableIndex === index
      ? (theme.mode === "light" ? "#e3f2fd" : "#1e3a5f")
      : "transparent",
    borderLeft:
      selectedVariableIndex === index
        ? `4px solid ${theme.palette.primary.main}`
        : "4px solid transparent",
    transition: "all 0.2s ease-in-out",
  });

  const getQuickAnswerItemStyle = (index) => ({
    backgroundColor: selectedQuickAnswerIndex === index
      ? (theme.mode === 'light' ? '#e3f2fd' : '#1e3a5f')
      : 'transparent',
    borderLeft: selectedQuickAnswerIndex === index
      ? `4px solid ${theme.palette.primary.main}`
      : '4px solid transparent',
  });

  const handleSendLinkVideo = async () => {
    const link = `https://meet.jit.si/${ticketId}`;
    setInputMessage(link);
  };

  const handleSendTemplate = async () => {
    setTemplateModalOpen(true);
  };

  const handleOpenMetaOfficialMenu = (event) => {
    setMetaMenuAnchorEl(event.currentTarget);
  };

  const handleCloseMetaOfficialMenu = () => {
    setMetaMenuAnchorEl(null);
  };

  /** Sempre na toolbar (mesmo padrão dos outros ícones); ações Meta só em API Oficial. */
  const showMetaOfficialComposer = true;

  const handleMetaTemplateFromMenu = () => {
    if (String(ticketChannel || "").toLowerCase() !== "whatsapp_oficial") {
      toast.error(
        "Templates Meta e botões/enquete só funcionam em tickets da conexão WhatsApp API Oficial."
      );
      return;
    }
    handleSendTemplate();
  };

  const handleMetaInteractiveFromMenu = () => {
    if (String(ticketChannel || "").toLowerCase() !== "whatsapp_oficial") {
      toast.error(
        "Templates Meta e botões/enquete só funcionam em tickets da conexão WhatsApp API Oficial."
      );
      return;
    }
    if (
      metaWhatsAppSession?.requiresTemplate ||
      (metaWhatsAppSession?.hasInbound && !metaWhatsAppSession?.within24h)
    ) {
      toast.error(
        "Fora da janela de 24h a Meta bloqueia enquete/botões. Envie um template aprovado."
      );
      return;
    }
    setInteractiveModalOpen(true);
  };

  const handleOpenInsights = () => {
    if (!whatsappId) {
      toast.error("Conexão do ticket não encontrada.");
      return;
    }
    setInsightsOpen(true);
  };

  const handleSyncTemplatesFromMenu = async () => {
    if (!whatsappId) {
      toast.error("Conexão do ticket não encontrada.");
      return;
    }
    try {
      await api.get(`/whatsapp/sync-templates/${whatsappId}`);
      toast.success("Templates sincronizados com a Meta.");
    } catch (err) {
      toastError(err);
    }
  };

  const syncVariableBar = useCallback((message) => {
    const query = getActiveVariableQuery(message);
    if (query === null) {
      setVariableBar(false);
      return;
    }
    const filtered = filterMessageVariables(query);
    if (filtered.length) {
      setVariableBar(filtered);
      setSelectedVariableIndex(0);
    } else {
      setVariableBar([
        { token: "", label: "Nenhuma variável encontrada", disabled: true },
      ]);
      setSelectedVariableIndex(-1);
    }
    setTypeBar(false);
  }, []);

  const syncQuickAnswersBar = useCallback((message) => {
    if (!isString(message) || isEmpty(message)) {
      setTypeBar(false);
      return;
    }
    if (message.charAt(0) !== "/") {
      if (!getActiveVariableQuery(message)) {
        setTypeBar(false);
      }
      return;
    }
    setVariableBar(false);

    const qa = Array.isArray(quickAnswers) ? quickAnswers : [];
    const needle = message.toLowerCase().trim();
    const afterSlash = needle.slice(1);

    if (afterSlash === "" && qa.length === 0) {
      setTypeBar([
        {
          value: "",
          label: "Nenhuma mensagem rápida cadastrada",
          disabled: true,
        },
      ]);
      setSelectedQuickAnswerIndex(-1);
      return;
    }

    const filteredOptions =
      afterSlash === ""
        ? qa
        : qa.filter((m) => {
            const lab = (m.label || "").toLowerCase();
            const sc = String(m.shortcode || "").toLowerCase();
            return (
              lab.includes(afterSlash) ||
              lab.includes(needle) ||
              sc.startsWith(afterSlash)
            );
          });

    if (filteredOptions.length > 0) {
      setTypeBar(filteredOptions);
      setSelectedQuickAnswerIndex(0);
    } else if (afterSlash !== "") {
      setTypeBar([
        {
          value: "",
          label: "Nenhuma resposta rápida encontrada",
          disabled: true,
        },
      ]);
      setSelectedQuickAnswerIndex(-1);
    } else {
      setTypeBar(false);
    }
  }, [quickAnswers]);

  const handleChangeInput = useCallback((e) => {
    const value = e.target.value;
    setInputMessage(value);
    if (value.charAt(0) === "/") {
      syncQuickAnswersBar(value);
    } else {
      syncVariableBar(value);
      if (!getActiveVariableQuery(value)) {
        syncQuickAnswersBar(value);
      }
    }
  }, [syncQuickAnswersBar, syncVariableBar]);

  const handleVariablePick = useCallback((item) => {
    if (!item || item.disabled) return;
    setInputMessage((prev) => insertVariableToken(prev, item.token || item));
    setVariableBar(false);
    setSelectedVariableIndex(-1);
    setIsNavigatingVariables(false);
    inputRef.current?.focus();
  }, []);

  const handleOpenVariablesMenu = useCallback(() => {
    setTypeBar(false);
    const query = getActiveVariableQuery(inputMessage);
    const list =
      query === null ? DEFAULT_MESSAGE_VARIABLES : filterMessageVariables(query);
    setVariableBar(list.length ? list : DEFAULT_MESSAGE_VARIABLES);
    setSelectedVariableIndex(0);
    setInputMessage((prev) => {
      if (getActiveVariableQuery(prev) !== null) return prev;
      const needsSpace = prev.length > 0 && !/\s$/.test(prev);
      return `${prev}${needsSpace ? " " : ""}*`;
    });
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [inputMessage]);

  const loadInventoryForPicker = useCallback(async () => {
    setInventoryLoading(true);
    try {
      const data = await inventoryService.list({ searchParam: "", pageNumber: 1 });
      setInventoryItems(Array.isArray(data?.inventory) ? data.inventory : []);
    } catch (err) {
      toastError(err);
      setInventoryItems([]);
    } finally {
      setInventoryLoading(false);
    }
  }, []);

  const handleOpenProducts = useCallback(
    (event) => {
      setProductsAnchor(event.currentTarget);
      loadInventoryForPicker();
    },
    [loadInventoryForPicker]
  );

  const handleCloseProducts = useCallback(() => {
    setProductsAnchor(null);
  }, []);

  const handlePickProduct = useCallback((item) => {
    const line = formatProductPriceLine(item);
    setInputMessage((prev) => {
      const base = String(prev || "").trim();
      return base ? `${base}\n${line}` : line;
    });
    handleCloseProducts();
    inputRef.current?.focus();
  }, [handleCloseProducts]);

  const handlePrivateMessage = (e) => {
    if (isTicketPending()) {
      return;
    }
    setPrivateMessage(!privateMessage);
    setPrivateMessageInputVisible(!privateMessageInputVisible);
  };

  const getMediaTypeIcon = (mediaType) => {
    switch (mediaType) {
      case 'audio': return '🎵';
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'document': return '📎';
      default: return '📎';
    }
  };

  const getMediaTypeColor = (mediaType) => {
    switch (mediaType) {
      case 'audio': return 'secondary';
      case 'image': return 'primary';
      case 'video': return 'default';
      case 'document': return 'default';
      default: return 'default';
    }
  };

  const handleQuickAnswersClick = useCallback(async (value) => {
    if (!value || value.disabled) {
      return;
    }

    // ✅ IMPORTANTE: Evitar múltiplas execuções simultâneas
    if (loading) {
      console.log("⚠️ Já processando, ignorando clique...");
      return;
    }

    console.log("🎯 handleQuickAnswersClick chamado:", value);
    console.log("📋 ticketId atual:", ticketId);

    if (!ticketId) {
      console.error("❌ ticketId não encontrado");
      toastError("Erro: ID do ticket não encontrado");
      return;
    }

    if (value.mediaPath) {
      try {
        setLoading(true);
        console.log("📥 Baixando mídia:", value.mediaPath);

        const response = await api.get(value.mediaPath, {
          responseType: "blob",
        });

        console.log("✅ Mídia baixada com sucesso, tamanho:", response.data.size);

        const messageBody = value.value && value.value.trim() !== "" ? value.value : "";

        await handleUploadQuickMessageMedia(response.data, messageBody, value.mediaType);

        console.log("✅ Mídia enviada com sucesso");

        setInputMessage("");
        setTypeBar(false);
        return;
      } catch (err) {
        console.error("❌ Erro ao processar mídia:", err);
        toastError(err);
      } finally {
        setLoading(false);
      }
    } else {
      // Para mensagens de texto
      setInputMessage(value.value || "");
      setTypeBar(false);
    }
  }, [loading, ticketId, privateMessage]);

  // Navegação por teclado — variáveis (*) e respostas rápidas (/)
  const handleKeyDown = useCallback((e) => {
    if (variableBar && Array.isArray(variableBar) && variableBar.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setIsNavigatingVariables(true);
          setSelectedVariableIndex((prev) => {
            const nextIndex = prev < variableBar.length - 1 ? prev + 1 : 0;
            scrollPickerItemIntoView('[aria-label="Variáveis da mensagem"]', nextIndex);
            return nextIndex;
          });
          return;
        case "ArrowUp":
          e.preventDefault();
          setIsNavigatingVariables(true);
          setSelectedVariableIndex((prev) => {
            const nextIndex = prev > 0 ? prev - 1 : variableBar.length - 1;
            scrollPickerItemIntoView('[aria-label="Variáveis da mensagem"]', nextIndex);
            return nextIndex;
          });
          return;
        case "Enter":
          if (isNavigatingVariables && selectedVariableIndex >= 0) {
            e.preventDefault();
            handleVariablePick(variableBar[selectedVariableIndex]);
            setSelectedVariableIndex(-1);
            setIsNavigatingVariables(false);
          }
          return;
        case "Escape":
          if (isNavigatingVariables) {
            e.preventDefault();
            setSelectedVariableIndex(-1);
            setIsNavigatingVariables(false);
            setVariableBar(false);
          }
          return;
        case "Tab":
          if (isNavigatingVariables) {
            e.preventDefault();
            setSelectedVariableIndex((prev) =>
              prev < variableBar.length - 1 ? prev + 1 : 0
            );
          }
          return;
        default:
          if (isNavigatingVariables && e.key.length === 1) {
            setSelectedVariableIndex(-1);
            setIsNavigatingVariables(false);
          }
          break;
      }
    }

    if (!typeBar || !Array.isArray(typeBar) || typeBar.length === 0) {
      setSelectedQuickAnswerIndex(-1);
      setIsNavigatingQuickAnswers(false);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setIsNavigatingQuickAnswers(true);
        setSelectedQuickAnswerIndex((prev) => {
          const nextIndex = prev < typeBar.length - 1 ? prev + 1 : 0;
          scrollPickerItemIntoView('[aria-label="Mensagens rápidas"]', nextIndex);
          return nextIndex;
        });
        break;

      case "ArrowUp":
        e.preventDefault();
        setIsNavigatingQuickAnswers(true);
        setSelectedQuickAnswerIndex((prev) => {
          const nextIndex = prev > 0 ? prev - 1 : typeBar.length - 1;
          scrollPickerItemIntoView('[aria-label="Mensagens rápidas"]', nextIndex);
          return nextIndex;
        });
        break;

      case "Enter":
        if (isNavigatingQuickAnswers && selectedQuickAnswerIndex >= 0) {
          e.preventDefault();
          handleQuickAnswersClick(typeBar[selectedQuickAnswerIndex]);
          setSelectedQuickAnswerIndex(-1);
          setIsNavigatingQuickAnswers(false);
        }
        break;

      case "Escape":
        if (isNavigatingQuickAnswers) {
          e.preventDefault();
          setSelectedQuickAnswerIndex(-1);
          setIsNavigatingQuickAnswers(false);
          setTypeBar(false);
        }
        break;

      case "Tab":
        if (isNavigatingQuickAnswers) {
          e.preventDefault();
          setSelectedQuickAnswerIndex((prev) =>
            prev < typeBar.length - 1 ? prev + 1 : 0
          );
        }
        break;

      default:
        if (isNavigatingQuickAnswers && e.key.length === 1) {
          setSelectedQuickAnswerIndex(-1);
          setIsNavigatingQuickAnswers(false);
        }
        break;
    }
  }, [
    typeBar,
    selectedQuickAnswerIndex,
    isNavigatingQuickAnswers,
    variableBar,
    selectedVariableIndex,
    isNavigatingVariables,
    handleVariablePick,
    handleQuickAnswersClick,
    scrollPickerItemIntoView,
  ]);

  useEffect(() => {
    if (!typeBar || !Array.isArray(typeBar) || typeBar.length === 0) {
      setSelectedQuickAnswerIndex(-1);
      setIsNavigatingQuickAnswers(false);
    }
  }, [typeBar]);

  useEffect(() => {
    if (!variableBar || !Array.isArray(variableBar) || variableBar.length === 0) {
      setSelectedVariableIndex(-1);
      setIsNavigatingVariables(false);
    }
  }, [variableBar]);

  const handleUploadQuickMessageMedia = useCallback(async (blob, message, mediaType = null) => {
    console.log("📤 Iniciando upload de mídia:", {
      blobSize: blob.size,
      message,
      mediaType,
      ticketId
    });

    if (!ticketId) {
      throw new Error("ID do ticket não encontrado");
    }

    // ✅ IMPORTANTE: Verificar se já está enviando
    if (loading) {
      console.log("⚠️ Upload já em andamento, ignorando...");
      return;
    }

    try {
      let extension = 'bin';

      if (blob.type) {
        const mimeType = blob.type.split("/")[1];
        extension = mimeType;

        if (blob.type.includes('webm') || blob.type.includes('audio')) {
          extension = blob.type.includes('webm') ? 'webm' : 'mp3';
        }
      } else if (mediaType) {
        const typeExtensionMap = {
          'audio': 'webm',
          'image': 'jpg',
          'video': 'mp4',
          'document': 'pdf'
        };
        extension = typeExtensionMap[mediaType] || 'bin';
      }

      const formData = new FormData();
      const filename = `${new Date().getTime()}.${extension}`;
      formData.append("medias", blob, filename);
      formData.append("typeArch", "quickMessage");

      const body = message && message.trim() !== ""
        ? (privateMessage ? `\u200d${message}` : message)
        : (privateMessage ? `\u200d` : "");

      formData.append("body", body);
      formData.append("fromMe", true);
      formData.append("isPrivate", privateMessage ? "true" : "false");

      console.log("📤 Enviando para:", `/messages/${ticketId}`);

      if (isMounted.current) {
        const response = await api.post(`/messages/${ticketId}`, formData);
        console.log("✅ Upload realizado com sucesso:", response.status);
      }
    } catch (err) {
      console.error("❌ Erro no upload:", err);
      toastError(err);
      throw err;
    }
  }, [ticketId, privateMessage, loading]);

  const handleAddEmoji = (e) => {
    let emoji = e.native;
    setInputMessage((prevState) => prevState + emoji);
  };

  const [modalCameraOpen, setModalCameraOpen] = useState(false);

  const handleCapture = (imageData) => {
    if (imageData) {
      handleUploadCamera(imageData);
    }
  };

  const handleChangeMedias = (e) => {
    if (!e.target.files) {
      return;
    }
    const selectedMedias = Array.from(e.target.files);
    setMediasUpload(selectedMedias);
    setShowModalMedias(true);
  };

  const handleChangeSign = (e) => {
    getStatusSingMessageLocalstogare();
  };

  const handleOpenModalForward = () => {
    if (selectedMessages.length === 0) {
      setForwardMessageModalOpen(false);
      toastError(i18n.t("messagesList.header.notMessage"));
      return;
    }
    setForwardMessageModalOpen(true);
  };

  const getStatusSingMessageLocalstogare = () => {
    const signMessageStorage = JSON.parse(
      localStorage.getItem("persistentSignMessage")
    );
    if (signMessageStorage !== null) {
      if (signMessageStorage) {
        localStorage.setItem("persistentSignMessage", false);
        setSignMessage(false);
      } else {
        localStorage.setItem("persistentSignMessage", true);
        setSignMessage(true);
      }
    } else {
      localStorage.setItem("persistentSignMessage", false);
      setSignMessage(false);
    }
  };

  const handleInputPaste = (e) => {
    if (e.clipboardData.files[0]) {
      const selectedMedias = Array.from(e.clipboardData.files);
      setMediasUpload(selectedMedias);
      setShowModalMedias(true);
    }
  };

  const handleInputDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0]) {
      const selectedMedias = Array.from(e.dataTransfer.files);
      setMediasUpload(selectedMedias);
      setShowModalMedias(true);
    }
  };

  const handleUploadMedia = async (mediasUpload) => {
    setLoading(true);

    if (!mediasUpload.length) {
      console.log("Nenhuma mídia selecionada.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("fromMe", true);
    formData.append("isPrivate", privateMessage ? "true" : "false");
    mediasUpload.forEach((media) => {
      formData.append("body", media.caption);
      formData.append("medias", media.file);
    });

    try {
      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
    }

    setLoading(false);
    setMediasUpload([]);
    setShowModalMedias(false);
    if (!isTicketPending()) {
      setPrivateMessage(false);
      setPrivateMessageInputVisible(false);
    }
  };

  const handleSendContatcMessage = async (vcard) => {
    setSenVcardModalOpen(false);
    setLoading(true);

    if (isNil(vcard)) {
      setLoading(false);
      return;
    }

    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: null,
      quotedMsg: replyingMessage,
      isPrivate: privateMessage ? "true" : "false",
      vCard: vcard,
    };
    try {
      await api.post(`/messages/${ticketId}`, message);
    } catch (err) {
      toastError(err);
    }

    setInputMessage("");
    setShowEmoji(false);
    setLoading(false);
    setReplyingMessage(null);
    setEditingMessage(null);
    if (!isTicketPending()) {
      setPrivateMessage(false);
      setPrivateMessageInputVisible(false);
    }
  };

  const handleSendMessage = useCallback(async () => {
    const text = String(inputMessage || "").trim();
    if (!text) return;
    if (ticketId == null || ticketId === "") {
      toastError("Ticket não disponível para envio.");
      return;
    }
    if (sendingRef.current || loading) return;

    const userName = privateMessage
      ? `${user?.name || "Atendente"} - Mensagem Interna`
      : user?.name || "Atendente";

    const variableContext = buildMessageVariableContext({
      contact: contactMeta,
      user,
      ticketId,
    });
    const resolvedText = expandMessageVariables(text, variableContext);

    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body:
        ((signMessage && !privateMessage) || privateMessage) && !editingMessage
          ? `*${userName}:*\n${resolvedText}`
          : resolvedText,
      quotedMsg: replyingMessage,
      isPrivate: privateMessage ? "true" : "false",
    };

    const quoted = replyingMessage;
    const editing = editingMessage;

    sendingRef.current = true;
    setSending(true);
    setInputMessage("");
    setShowEmoji(false);
    setReplyingMessage(null);
    setEditingMessage(null);
    setAnchorEl(null);

    try {
      const sendConfig = { timeout: 90000 };
      if (editing !== null) {
        await api.post(`/messages/edit/${editing.id}`, message, sendConfig);
      } else {
        await api.post(`/messages/${ticketId}`, message, sendConfig);
      }
      if (!isTicketPending()) {
        setPrivateMessage(false);
        setPrivateMessageInputVisible(false);
      }
    } catch (err) {
      setInputMessage(text);
      setReplyingMessage(quoted);
      setEditingMessage(editing);
      const apiError = err?.response?.data?.error;
      if (err?.code === "ECONNABORTED") {
        toast.error(
          "O WhatsApp demorou para responder. Verifique a conexão e tente de novo.",
          { autoClose: 8000 }
        );
      } else if (apiError === "ERR_SENDING_WAPP_MSG") {
        toast.error(
          "Não foi possível enviar pelo WhatsApp. Confira se a conexão está ativa e o número do contato.",
          { autoClose: 8000 }
        );
      } else if (
        typeof apiError === "string" &&
        (apiError.includes("131005") ||
          apiError.includes("Access denied") ||
          apiError.includes("janela de 24h") ||
          apiError.includes("Template Meta") ||
          apiError.includes("131047"))
      ) {
        toast.error(apiError, { autoClose: 12000 });
      } else if (
        typeof apiError === "string" &&
        (apiError.includes("Instagram:") || apiError.includes("Messenger:"))
      ) {
        toast.error(apiError, { autoClose: 10000 });
      } else {
        toastError(err);
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [
    inputMessage,
    ticketId,
    loading,
    privateMessage,
    signMessage,
    editingMessage,
    replyingMessage,
    user,
    contactMeta,
  ]);

  const handleSendMessageTemplate = async (e) => {
    if (e.id === "") return;
    setLoading(true);

    const message = {
      templateId: e.id,
      variables: e.variables,
      bodyToSave: e.bodyToSave,
      mediaUrl: "",
      quotedMsg: replyingMessage,
    };

    try {
      await api.post(`/messages-template/${ticketId}`, message);
      toast.success("Template enviado com sucesso.");
    } catch (err) {
      const apiError = err?.response?.data?.error;
      const friendly =
        typeof apiError === "string" && apiError.includes("Meta:")
          ? apiError
          : typeof apiError === "string" &&
            (apiError.includes("ERR_SENDING_WAPP_MSG") ||
              apiError.includes("Erro Envio"))
          ? "Não foi possível enviar o template. Confira a conexão API Oficial, o número do contato e se o template está aprovado nesta WABA."
          : null;
      if (friendly) {
        toast.error(friendly, { autoClose: 9000 });
      } else {
        toastError(err);
      }
    } finally {
      setLoading(false);
    }
    setTemplateModalOpen(false);
    setInputMessage("");
    setShowEmoji(false);
    setReplyingMessage(null);
    if (!isTicketPending()) {
      setPrivateMessage(false);
    }
    setEditingMessage(null);
    if (!isTicketPending()) {
      setPrivateMessageInputVisible(false);
    }
    handleMenuItemClick();
  };

  const handleSendInteractive = async ({ interactive, bodyToSave }) => {
    setLoading(true);
    try {
      await api.post(`/messages-interactive/${ticketId}`, {
        interactive,
        bodyToSave
      });
      toast.success("Enquete/botões enviados.");
      setInteractiveModalOpen(false);
    } catch (err) {
      toastError(err);
      // Não relança: evita segundo toast genérico ("Request failed status 400")
    } finally {
      setLoading(false);
    }
  };

  const handleStartRecording = async () => {
    setLoading(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await Mp3Recorder.start();
      setRecording(true);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const companyId = user.companyId;
    if (!companyId || !user.id) return;
    let cancelled = false;
    async function fetchData() {
      try {
        const messages = await listQuickMessages({
          companyId,
          userId: user.id,
          isOficial: ticketChannel === "whatsapp_oficial" ? "true" : "false"
        });
        if (cancelled || !isMounted.current) return;
        const options = messages.map((m) => {
          let truncatedMessage = m.message;
          if (isString(truncatedMessage) && truncatedMessage.length > 90) {
            truncatedMessage = m.message.substring(0, 90) + "...";
          }
          return {
            value: m.message,
            label: `/${m.shortcode} - ${truncatedMessage}`,
            mediaPath: m.mediaPath,
            mediaType: m.mediaType,
            shortcode: m.shortcode
          };
        });
        setQuickAnswer(options);
      } catch (err) {
        if (!cancelled && isMounted.current) toastError(err);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.companyId, user.id, ticketChannel]);

  useEffect(() => {
    syncQuickAnswersBar(inputMessage);
  }, [inputMessage, quickAnswers, syncQuickAnswersBar]);

  useEffect(() => {
    if (!triggerFlowModalOpen && flowProcessing) {
      setFlowProcessing(false);
      flowProcessingRef.current = false;
    }
  }, [triggerFlowModalOpen, flowProcessing]);

  const canComposeInTicket = useCallback(() => {
    if (allowAiWhileClosed) return true;
    if (isTicketPending()) return true;
    return ["open", "group", "chatbot", "lgpd"].includes(ticketStatus);
  }, [allowAiWhileClosed, ticketStatus]);

  const disableOption = useCallback(() => {
    const isFlowProcessing = flowProcessingRef.current || flowProcessing;
    const base = recording || isFlowProcessing;

    return base || !canComposeInTicket();
  }, [recording, flowProcessing, canComposeInTicket]);

  const disableOptionForPending = useCallback(() => {
    const isFlowProcessing = flowProcessingRef.current || flowProcessing;

    return (
      loading ||
      recording ||
      isFlowProcessing || // 🛡️ Usar tanto ref quanto estado
      ticketStatus === "closed"
    );
  }, [loading, recording, flowProcessing, ticketStatus]);

  const handleUploadCamera = async (blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      const filename = `${new Date().getTime()}.png`;
      formData.append("medias", blob, filename);
      formData.append("body", privateMessage ? `\u200d` : "");
      formData.append("fromMe", true);

      await api.post(`/messages/${ticketId}`, formData);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
    setLoading(false);
  };

  // ✅ CORREÇÃO KISS: Apenas otimizar nome do arquivo para mobile
  const handleUploadAudio = async () => {
    setLoading(true);
    try {
      const [, blob] = await Mp3Recorder.stop().getMp3();
      if (blob.size < 10000) {
        setLoading(false);
        setRecording(false);
        return;
      }

      const formData = new FormData();

      // ✅ CORREÇÃO: Nome do arquivo otimizado para mobile
      let filename;
      if (["whatsapp", "whatsapp_oficial"].includes(ticketChannel)) {
        // Para WhatsApp, usar formato mais compatível com mobile
        filename = isMobileDevice()
          ? `audio_${new Date().getTime()}.ogg`  // OGG para mobile
          : `audio_${new Date().getTime()}.mp3`; // MP3 para desktop
      } else {
        filename = `${new Date().getTime()}.m4a`;
      }

      formData.append("medias", blob, filename);
      formData.append("body", "🎵 Mensagem de voz"); // ✅ Body mais claro
      formData.append("fromMe", true);
      formData.append("isPrivate", privateMessage ? "true" : "false");

      console.log(`📤 Enviando áudio: ${filename} (${blob.size} bytes)`);

      if (isMounted.current) {
        await api.post(`/messages/${ticketId}`, formData);
      }
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRecording(false);
      }
    }
  };

  const handleCloseModalMedias = () => {
    setShowModalMedias(false);
  };

  const handleCancelAudio = async () => {
    try {
      await Mp3Recorder.stop().getMp3();
      setRecording(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuItemClick = (event) => {
    setAnchorEl(null);
  };

  const handleSendContactModalOpen = async () => {
    handleMenuItemClick();
    setSenVcardModalOpen(true);
  };

  const handleCameraModalOpen = async () => {
    handleMenuItemClick();
    setModalCameraOpen(true);
  };

  const handleCancelSelection = () => {
    setMediasUpload([]);
    setShowModalMedias(false);
  };

  const checkForSelectedText = useCallback(() => {
    if (inputRef.current) {
      const start = inputRef.current.selectionStart;
      const end = inputRef.current.selectionEnd;

      if (start !== end && start !== null && end !== null) {
        const selectedText = inputMessage.substring(start, end);
        if (selectedText.trim() !== '') {
          // Para InputBase, calcular posição baseada no elemento
          const inputRect = inputRef.current.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

          setSelectedText({
            text: selectedText,
            start: start,
            end: end
          });

          setFormatMenuAnchorPosition({
            x: inputRect.left + inputRect.width / 2,
            y: inputRect.top + scrollTop - 10 // Posicionar acima do input
          });

          return true;
        }
      }
    }

    setFormatMenuAnchorPosition(null);
    return false;
  }, [inputMessage]);

  const handleCloseFormatMenu = useCallback(() => {
    setFormatMenuAnchorPosition(null);
  }, []);

  // Aplica a formatação ao texto selecionado
  const handleFormatText = useCallback((formatType) => {
    const { text, start, end } = selectedText;
    let formattedText = '';

    switch (formatType) {
      case 'bold':
        formattedText = `*${text}*`;
        break;
      case 'italic':
        formattedText = `_${text}_`;
        break;
      case 'strikethrough':
        formattedText = `~${text}~`;
        break;
      case 'code':
        formattedText = `\`${text}\``;
        break;
      case 'numberedList':
        formattedText = text.split('\n')
          .map((line, index) => `${index + 1}. ${line}`)
          .join('\n');
        break;
      case 'bulletList':
        formattedText = text.split('\n')
          .map(line => `• ${line}`)
          .join('\n');
        break;
      case 'quote':
        formattedText = text.split('\n')
          .map(line => `> ${line}`)
          .join('\n');
        break;
      case 'clear':
        formattedText = text
          .replace(/\*([^*]+)\*/g, '$1')  // remove negrito
          .replace(/_([^_]+)_/g, '$1')    // remove itálico
          .replace(/~([^~]+)~/g, '$1')    // remove tachado
          .replace(/`([^`]+)`/g, '$1')    // remove código
          .replace(/^\d+\.\s/gm, '')      // remove numeração de lista
          .replace(/^•\s/gm, '')          // remove marcadores de lista
          .replace(/^>\s/gm, '');         // remove citação
        break;
      default:
        formattedText = text;
    }

    // Substitui o texto selecionado pelo texto formatado
    const newInputMessage =
      inputMessage.substring(0, start) +
      formattedText +
      inputMessage.substring(end);

    setInputMessage(newInputMessage);

    // Fecha o menu após a formatação
    handleCloseFormatMenu();

    // Define o foco e a posição do cursor após a operação
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursorPosition = start + formattedText.length;
        inputRef.current.selectionStart = newCursorPosition;
        inputRef.current.selectionEnd = newCursorPosition;
      }
    }, 100);
  }, [selectedText, inputMessage, handleCloseFormatMenu]);

  // Handlers para detectar seleção de texto
  const handleSelectText = useCallback(() => {
    checkForSelectedText();
  }, [checkForSelectedText]);

  const handleMouseUp = useCallback(() => {
    checkForSelectedText();
  }, [checkForSelectedText]);

  const handleKeyUp = useCallback((e) => {
    // Teclas que podem alterar a seleção
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Shift') {
      checkForSelectedText();
    }
  }, [checkForSelectedText]);

  const renderReplyingMessage = (message) => {
    return (
      <div className={classes.replyginMsgWrapper}>
        <div className={classes.replyginMsgContainer}>
          <span
            className={clsx(classes.replyginContactMsgSideColor, {
              [classes.replyginSelfMsgSideColor]: !message.fromMe,
            })}
          ></span>
          {replyingMessage && (
            <div className={classes.replyginMsgBody}>
              {!message.fromMe && (
                <span className={classes.messageContactName}>
                  {message.contact?.name}
                </span>
              )}
              {message.body}
            </div>
          )}
        </div>
        <IconButton
          aria-label="showRecorder"
          component="span"
          disabled={disableOptionForPending()}
          onClick={() => {
            setReplyingMessage(null);
            setEditingMessage(null);
            setInputMessage("");
          }}
        >
          <Clear className={classes.sendMessageIcons} />
        </IconButton>
      </div>
    );
  };

  const renderFlowProcessingAlert = () => {
    if (!flowProcessing) return null;

    return (
      <Box className={classes.pendingAlert} style={{ backgroundColor: "#E8F5E8", borderColor: "#4CAF50" }}>
        <CircularProgress size={14} style={{ marginRight: 8 }} />
        <span>Fluxo em execução — envio pausado.</span>
      </Box>
    );
  };

  const TextFormatMenu = () => {
    const isMenuOpen = Boolean(formatMenuAnchorPosition);
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    if (!isMenuOpen) return null;

    return (
      <ClickAwayListener onClickAway={handleCloseFormatMenu}>
        <Fade in={isMenuOpen}>
          <div
            className={classes.floatingFormatMenu}
            style={{
              top: formatMenuAnchorPosition ? formatMenuAnchorPosition.y - 50 : 0,
              left: formatMenuAnchorPosition ? formatMenuAnchorPosition.x : 0,
            }}
          >
            <Tooltip title="Negrito">
              <IconButton
                className={classes.formatIconButton}
                disabled={disableOptionForPending()}
                onClick={() => handleFormatText('bold')}
                size="small"
              >
                <FormatBoldIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Itálico">
              <IconButton
                className={classes.formatIconButton}
                disabled={disableOptionForPending()}
                onClick={() => handleFormatText('italic')}
                size="small"
              >
                <FormatItalicIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Tachado">
              <IconButton
                className={classes.formatIconButton}
                disabled={disableOptionForPending()}
                onClick={() => handleFormatText('strikethrough')}
                size="small"
              >
                <FormatStrikethroughIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Código">
              <IconButton
                className={classes.formatIconButton}
                disabled={disableOptionForPending()}
                onClick={() => handleFormatText('code')}
                size="small"
              >
                <CodeIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Lista Numerada">
              <IconButton
                className={classes.formatIconButton}
                disabled={disableOptionForPending()}
                onClick={() => handleFormatText('numberedList')}
                size="small"
              >
                <FormatListNumberedIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Lista com Marcadores">
              <IconButton
                className={classes.formatIconButton}
                disabled={disableOptionForPending()}
                onClick={() => handleFormatText('bulletList')}
                size="small"
              >
                <FormatListBulletedIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Citação">
              <IconButton
                className={classes.formatIconButton}
                disabled={disableOptionForPending()}
                onClick={() => handleFormatText('quote')}
                size="small"
              >
                <FormatQuoteIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Limpar Formatação">
              <IconButton
                className={classes.formatIconButton}
                disabled={disableOptionForPending()}
                onClick={() => handleFormatText('clear')}
                size="small"
              >
                <FormatClearIcon fontSize={isMobile ? "small" : "medium"} />
              </IconButton>
            </Tooltip>
          </div>
        </Fade>
      </ClickAwayListener>
    );
  };

  const renderPendingAlert = () => {
    if (!isTicketPending()) return null;

    return (
      <Box className={classes.pendingAlert}>
        <Info style={{ fontSize: 16 }} />
        <span>Ticket em espera — clique em Aceitar para assumir. Mensagens já saem no WhatsApp.</span>
      </Box>
    );
  };

  const renderVariablesBar = () => {
    if (!variableBar || !Array.isArray(variableBar) || variableBar.length === 0) {
      return null;
    }

    return (
      <Box
        component="ul"
        className={classes.messageQuickAnswersWrapper}
        role="listbox"
        aria-label="Variáveis da mensagem"
      >
        {variableBar.map((item, index) => {
          const isSelected = selectedVariableIndex === index;
          return (
          <li key={`${item.token || item.label}-${index}`} className={classes.messageQuickAnswersWrapperItem}>
            <div
              className={clsx(
                classes.quickAnswerItem,
                isSelected && classes.quickAnswerItemSelected,
                item.disabled && classes.quickAnswerItemDisabled
              )}
              style={{
                ...getVariableItemStyle(index),
                ...(isSelected &&
                  !item.disabled && {
                    backgroundColor: theme.palette.primary.light + "20",
                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                    transform: "translateX(2px)",
                  }),
              }}
              onClick={() => !item.disabled && handleVariablePick(item)}
            >
              <Box className={classes.quickAnswerText}>{item.label}</Box>
              {item.token ? (
                <Chip
                  size="small"
                  label={item.token}
                  color="primary"
                  variant="outlined"
                  className={classes.variableTokenChip}
                />
              ) : null}
            </div>
          </li>
          );
        })}

        {variableBar.length > 4 && !variableBar[0]?.disabled && (
          <li style={{ listStyle: "none" }}>
            <div className={classes.quickAnswersScrollIndicator}>
              {variableBar.length} variáveis • use ↑↓ para navegar
            </div>
          </li>
        )}
      </Box>
    );
  };

  const channelLabel = () => {
    const ch = String(ticketChannel || "whatsapp").toLowerCase();
    if (ch === "telegram_oficial") return "Telegram Oficial";
    if (ch === "telegram") return "Telegram Bot";
    if (ch.includes("whatsapp")) return "WhatsApp";
    if (ch.includes("instagram")) return "Instagram";
    if (ch.includes("facebook")) return "Facebook";
    return ch.toUpperCase();
  };

  const renderComposerChannelIcon = () => {
    const ch = String(ticketChannel || "whatsapp").toLowerCase();
    if (ch === "telegram_oficial" || ch === "telegram") {
      return <TelegramIcon style={{ fontSize: 16, color: "#0088cc" }} />;
    }
    return <WhatsApp style={{ fontSize: 16, color: "#25D366" }} />;
  };

  const renderComposerExtrasMenu = () => (
    <Menu
      id="composer-extras-menu"
      keepMounted
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleMenuItemClick}
      getContentAnchorEl={null}
      anchorOrigin={{ vertical: "top", horizontal: "left" }}
      transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      PaperProps={{ className: classes.composerExtrasMenuPaper }}
      MenuListProps={{ dense: true }}
    >
      <MenuItem
        onClick={() => {
          handleMenuItemClick();
          handlePrivateMessage();
        }}
      >
        <Comment className={classes.composerExtrasMenuIcon} />
        {i18n.t("messageInput.tooltip.privateMessage")}
      </MenuItem>
      <Divider light component="li" />
      <MenuItem onClick={handleMenuItemClick}>
        <input
          multiple
          type="file"
          id="upload-img-button-mobile"
          accept="image/*, video/*, audio/* "
          disabled={disableOption()}
          className={classes.uploadInput}
          onChange={handleChangeMedias}
        />
        <label htmlFor="upload-img-button-mobile">
          <PermMediaOutlined className={classes.composerExtrasMenuIcon} />
          {i18n.t("messageInput.type.imageVideo")}
        </label>
      </MenuItem>
      <MenuItem onClick={handleCameraModalOpen} disabled={disableOption()}>
        <CameraAlt className={classes.composerExtrasMenuIcon} />
        {i18n.t("messageInput.type.cam")}
      </MenuItem>
      <MenuItem onClick={handleMenuItemClick}>
        <input
          multiple
          type="file"
          id="upload-doc-button-mobile"
          accept="application/*, text/*, .odt, .ods, .odp, .odg, .xml, .ofx, .zip, .rar, .7z, .tar, .gz, .bz2, .msg, .key, .numbers, .pages"
          disabled={disableOption()}
          className={classes.uploadInput}
          onChange={handleChangeMedias}
        />
        <label htmlFor="upload-doc-button-mobile">
          <Description className={classes.composerExtrasMenuIcon} />
          Documento
        </label>
      </MenuItem>
      <MenuItem onClick={handleSendContactModalOpen} disabled={disableOption()}>
        <Person className={classes.composerExtrasMenuIcon} />
        {i18n.t("messageInput.type.contact")}
      </MenuItem>
      <MenuItem onClick={handleSendLinkVideo} disabled={disableOption()}>
        <Duo className={classes.composerExtrasMenuIcon} />
        {i18n.t("messageInput.type.meet")}
      </MenuItem>
      <Divider light component="li" />
      {signMessagePar && (
        <MenuItem
          onClick={() => {
            handleMenuItemClick();
            handleChangeSign();
          }}
        >
          <Create
            className={classes.composerExtrasMenuIcon}
            style={{ color: signMessage ? undefined : "grey" }}
          />
          {i18n.t("messageInput.tooltip.signature")}
        </MenuItem>
      )}
      {showSchedules && (
        <MenuItem
          onClick={() => {
            handleMenuItemClick();
            setAppointmentModalOpen(true);
          }}
          disabled={loading || isTicketPending()}
        >
          <Timer className={classes.composerExtrasMenuIcon} />
          {i18n.t("tickets.buttons.scredule")}
        </MenuItem>
      )}
      <Divider light component="li" />
      {ticketStatus === "open" && (
        <MenuItem
          onClick={() => {
            handleMenuItemClick();
            handleTriggerFlowClick();
          }}
          disabled={disableOption()}
        >
          <AccountTree className={classes.composerExtrasMenuIcon} />
          Automação · disparar fluxo
        </MenuItem>
      )}
    </Menu>
  );

  const renderMetaSessionBanner = () => null;

  const renderComposerShell = (inputClassName, inputDisabled, isPrivateShell = false) => (
    <div className={classes.composerColumnWrap}>
    {renderMetaSessionBanner()}
    <div className={clsx(classes.composerCard, edgeToEdge && classes.composerCardEdge)}>
      <div className={classes.composerHeader}>
        <span className={classes.composerChannel}>
          {renderComposerChannelIcon()}
          {channelLabel()}
        </span>
        <div className={classes.composerHeaderRight}>
          {!isPrivateShell && !isTicketPending() && (
            <IconButton
              size="small"
              className={classes.composerMoreBtn}
              aria-controls="composer-extras-menu"
              aria-haspopup="true"
              onClick={handleOpenMenuClick}
              disabled={inputDisabled}
            >
              <MoreVertRounded style={{ fontSize: 18 }} />
            </IconButton>
          )}
          <Button
            size="small"
            className={classes.composerAiAssist}
            startIcon={
              aiLoading ? (
                <CircularProgress size={12} color="inherit" />
              ) : (
                <AutoAwesomeOutlinedIcon style={{ fontSize: 14 }} />
              )
            }
            onClick={handleOpenAIMenu}
            disabled={inputDisabled || aiLoading}
          >
            {aiLoading ? "Processando…" : "AI Assist"}
          </Button>
        </div>
      </div>
      <div className={classes.composerBody}>
        {showEmoji && (
          <div className={classes.emojiBox}>
            <ClickAwayListener onClickAway={() => setShowEmoji(false)}>
              <Picker
                perLine={16}
                theme={theme.palette.type === "dark" ? "dark" : "light"}
                showPreview={false}
                showSkinTones={false}
                onSelect={handleAddEmoji}
              />
            </ClickAwayListener>
          </div>
        )}
        <InputBase
          inputRef={(input) => {
            if (input) {
              inputRef.current = input;
              if (!disableAutoFocus && !aiPromptOpen) input.focus();
            }
          }}
          className={inputClassName}
          placeholder={
            isPrivateShell
              ? isTicketPending()
                ? "Mensagem interna…"
                : i18n.t("messagesInput.placeholderPrivateMessage")
              : placeholderText
          }
          multiline
          minRows={1}
          maxRows={4}
          value={safeCapitalizeFirstLetter(inputMessage)}
          onChange={handleChangeInput}
          disabled={inputDisabled}
          onPaste={(e) => {
            (ticketStatus === "open" || ticketStatus === "group" || isTicketPending()) &&
              handleInputPaste(e);
          }}
          onKeyDown={handleComposerKeyDown}
          onKeyUp={handleKeyUp}
          onMouseUp={handleMouseUp}
          onSelect={handleSelectText}
          onKeyPress={handleInputKeyPress}
          spellCheck
        />
      {recording ? (
        <div className={classes.recorderWrapper} style={{ padding: "8px 12px" }}>
          <IconButton aria-label="cancelRecording" disabled={loading} onClick={handleCancelAudio}>
            <HighlightOff className={classes.cancelAudioIcon} />
          </IconButton>
          {loading ? <CircularProgress className={classes.audioLoading} size={24} /> : <RecordingTimer />}
          <IconButton aria-label="sendRecordedAudio" onClick={handleUploadAudio} disabled={loading}>
            <CheckCircleOutline className={classes.sendAudioIcon} />
          </IconButton>
        </div>
      ) : (
        <MessageInputComposerToolbar
          disabled={inputDisabled}
          recording={recording}
          loading={loading}
          sending={sending}
          inputMessage={inputMessage}
          showSelectMessageCheckbox={showSelectMessageCheckbox}
          onOpenAi={handleOpenAIMenu}
          onToggleEmoji={() => setShowEmoji((v) => !v)}
          onStartRecording={handleStartRecording}
          onSend={handleSendMessage}
          onForward={handleOpenModalForward}
          onPrivateNote={handlePrivateMessage}
          onSchedule={() => setAppointmentModalOpen(true)}
          onOpenVariables={handleOpenVariablesMenu}
          onOpenProducts={handleOpenProducts}
          onFileImageChange={handleChangeMedias}
          onFileDocChange={handleChangeMedias}
          fileImageId={isPrivateShell ? "composer-upload-img-private" : "composer-upload-img-main"}
          fileDocId={isPrivateShell ? "composer-upload-doc-private" : "composer-upload-doc-main"}
          showMetaOfficial={showMetaOfficialComposer && !isPrivateShell}
          onOpenMetaOfficial={handleOpenMetaOfficialMenu}
        />
      )}
      </div>
    </div>
    </div>
  );

  const renderQuickAnswersBar = () => {
    if (!typeBar || !Array.isArray(typeBar) || typeBar.length === 0) {
      return null;
    }

    return (
      <Box
        component="ul"
        className={classes.messageQuickAnswersWrapper}
        role="listbox"
        aria-label="Mensagens rápidas"
      >
        {typeBar.map((value, index) => {
          const isSelected = selectedQuickAnswerIndex === index;
          return (
            <li
              className={classes.messageQuickAnswersWrapperItem}
              key={`${value.shortcode || "qa"}-${index}`}
              role="option"
              aria-selected={isSelected}
              style={{ listStyle: "none" }}
            >
              <div
                className={clsx(
                  classes.quickAnswerItem,
                  isSelected && classes.quickAnswerItemSelected,
                  value.disabled && classes.quickAnswerItemDisabled
                )}
                style={{
                  ...getQuickAnswerItemStyle(index),
                  ...(isSelected &&
                    !value.disabled && {
                      backgroundColor: theme.palette.primary.light + "20",
                      borderLeft: `4px solid ${theme.palette.primary.main}`,
                      transform: "translateX(2px)",
                    }),
                }}
                onClick={() => handleQuickAnswersClick(value)}
              >
                <Box className={classes.quickAnswerText}>{value.label}</Box>
                {value.mediaType && (
                  <Chip
                    size="small"
                    label={`${getMediaTypeIcon(value.mediaType)} ${value.mediaType}`}
                    color={getMediaTypeColor(value.mediaType)}
                    className={classes.mediaTypeChip}
                  />
                )}
              </div>
            </li>
          );
        })}

        {typeBar.length > 4 && !typeBar[0]?.disabled && (
          <li style={{ listStyle: "none" }}>
            <div className={classes.quickAnswersScrollIndicator}>
              {typeBar.length} respostas • use ↑↓ para navegar
            </div>
          </li>
        )}
      </Box>
    );
  };

  const handleComposerEnter = useCallback(
    (e) => {
      if (loading || sending || e.shiftKey || e.key !== "Enter") return;

      if (
        variableBar &&
        Array.isArray(variableBar) &&
        variableBar.length > 0 &&
        !variableBar[0]?.disabled
      ) {
        if (isNavigatingVariables && selectedVariableIndex >= 0) {
          return;
        }
        e.preventDefault();
        const pick =
          selectedVariableIndex >= 0
            ? variableBar[selectedVariableIndex]
            : variableBar.find((v) => !v.disabled) || variableBar[0];
        handleVariablePick(pick);
        return;
      }

      if (
        typeBar &&
        Array.isArray(typeBar) &&
        typeBar.length > 0 &&
        !typeBar[0]?.disabled
      ) {
        if (isNavigatingQuickAnswers && selectedQuickAnswerIndex >= 0) {
          return;
        }
        e.preventDefault();
        const selected =
          selectedQuickAnswerIndex >= 0
            ? typeBar[selectedQuickAnswerIndex]
            : typeBar[0];
        handleQuickAnswersClick(selected);
        return;
      }

      if (!isNavigatingQuickAnswers) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [
      loading,
      sending,
      variableBar,
      typeBar,
      isNavigatingVariables,
      selectedVariableIndex,
      isNavigatingQuickAnswers,
      selectedQuickAnswerIndex,
      handleVariablePick,
      handleQuickAnswersClick,
      handleSendMessage,
    ]
  );

  const handleComposerKeyDown = useCallback(
    (e) => {
      handleKeyDown(e);
      if (!e.defaultPrevented) {
        handleComposerEnter(e);
      }
    },
    [handleKeyDown, handleComposerEnter]
  );

  const handleInputKeyPress = (e) => {
    handleComposerEnter(e);
  };

  if (mediasUpload.length > 0) {
    return (
      <Paper
        elevation={0}
        square
        className={classes.viewMediaInputWrapper}
        onDragEnter={() => setOnDragEnter(true)}
        onDrop={(e) => handleInputDrop(e)}
      >
        {showModalMedias && (
          <MessageUploadMedias
            isOpen={showModalMedias}
            files={mediasUpload}
            onClose={handleCloseModalMedias}
            onSend={handleUploadMedia}
            onCancelSelection={handleCancelSelection}
          />
        )}
      </Paper>
    );
  } else {
    return (
      <>
        {templateModalOpen && (
          <TemplateModal
            open={templateModalOpen}
            anchorEl={metaMenuAnchorEl}
            handleClose={() => {
              setTemplateModalOpen(false);
              setMetaMenuAnchorEl(null);
            }}
            onSelectTemplate={(e) => handleSendMessageTemplate(e)}
            templates={templates}
          />
        )}
        {interactiveModalOpen && (
          <MetaInteractiveComposerModal
            open={interactiveModalOpen}
            anchorEl={metaMenuAnchorEl}
            onClose={() => {
              setInteractiveModalOpen(false);
              setMetaMenuAnchorEl(null);
            }}
            onSend={handleSendInteractive}
          />
        )}
        <MetaOfficialComposerMenu
          open={
            Boolean(metaMenuAnchorEl) &&
            !interactiveModalOpen &&
            !insightsOpen &&
            !templateModalOpen
          }
          anchorEl={metaMenuAnchorEl}
          onClose={handleCloseMetaOfficialMenu}
          metaWhatsAppSession={metaWhatsAppSession}
          ticketChannel={ticketChannel}
          disabled={disableOption()}
          onSendTemplate={handleMetaTemplateFromMenu}
          onSendInteractive={handleMetaInteractiveFromMenu}
          onOpenInsights={handleOpenInsights}
          onSyncTemplates={handleSyncTemplatesFromMenu}
        />
        <MetaOfficialInsightsPanel
          open={insightsOpen}
          anchorEl={metaMenuAnchorEl}
          onClose={() => {
            setInsightsOpen(false);
            setMetaMenuAnchorEl(null);
          }}
          whatsappId={whatsappId}
        />
        {modalCameraOpen && (
          <CameraModal
            isOpen={modalCameraOpen}
            onRequestClose={() => setModalCameraOpen(false)}
            onCapture={handleCapture}
          />
        )}
        {senVcardModalOpen && (
          <ContactSendModal
            modalOpen={senVcardModalOpen}
            onClose={(c) => {
              handleSendContatcMessage(c);
            }}
          />
        )}

        {/* NOVO MODAL DE TRIGGER FLOW */}
        {triggerFlowModalOpen && (
          <TriggerFlowModal
            open={triggerFlowModalOpen}
            onClose={handleTriggerFlowClose}
            ticketId={ticketId}
            ticketStatus={ticketStatus}
            onFlowTriggered={handleFlowTriggered}
            onFlowProcessing={handleFlowProcessing}
          />
        )}

        <Paper
          square
          elevation={0}
          className={clsx(classes.mainWrapper, edgeToEdge && classes.mainWrapperEdge)}
          onDragEnter={() => setOnDragEnter(true)}
          onDrop={(e) => handleInputDrop(e)}
        >
          {renderPendingAlert()}
          {renderFlowProcessingAlert()}

          {(replyingMessage && renderReplyingMessage(replyingMessage)) ||
            (editingMessage && renderReplyingMessage(editingMessage))}
            <div
              className={clsx(classes.newMessageBox, edgeToEdge && classes.newMessageBoxEdge)}
              ref={newMessageBoxRef}
            >
            <div className={classes.flexContainer}>
              {(privateMessageInputVisible && !isTicketPending()) && (
                <div className={classes.flexItem}>
                  <div className={classes.messageInputFieldContainer}>
                    {renderQuickAnswersBar()}
                    {renderVariablesBar()}
                    {renderComposerShell(
                      classes.composerInput,
                      disableOption(),
                      true
                    )}
                  </div>
                </div>
              )}
              {(!privateMessageInputVisible || isTicketPending()) && (
                <div className={classes.flexItem}>
                  <div className={classes.messageInputFieldContainer}>
                    {renderQuickAnswersBar()}
                    {renderVariablesBar()}
                    {renderComposerShell(classes.composerInput, disableOption(), false)}
                  </div>
                </div>
              )}
            </div>

            {renderComposerExtrasMenu()}

            <Popover
              open={Boolean(productsAnchor)}
              anchorEl={productsAnchor}
              onClose={handleCloseProducts}
              anchorOrigin={{ vertical: "top", horizontal: "left" }}
              transformOrigin={{ vertical: "bottom", horizontal: "left" }}
              PaperProps={{ className: classes.productsPopover }}
            >
              <Typography variant="caption" color="textSecondary" style={{ padding: "4px 8px", display: "block" }}>
                Produtos · lista de preços
              </Typography>
              {inventoryLoading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={22} />
                </Box>
              ) : inventoryItems.length === 0 ? (
                <Typography variant="body2" style={{ padding: 8 }}>
                  Nenhum produto cadastrado.
                </Typography>
              ) : (
                inventoryItems.slice(0, 40).map((item) => (
                  <div
                    key={item.id || item.name}
                    className={classes.productRow}
                    onClick={() => handlePickProduct(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handlePickProduct(item)}
                  >
                    <Typography variant="body2" style={{ fontWeight: 500 }}>
                      {item.name || item.product}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {item.price != null
                        ? new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(Number(item.price))
                        : "—"}
                    </Typography>
                  </div>
                ))
              )}
            </Popover>

            {appointmentModalOpen && (
              <ScheduleModal
                open={appointmentModalOpen}
                onClose={() => setAppointmentModalOpen(false)}
                message={inputMessage}
                contactId={contactId}
                fromMessageInput={true}
                user={user}
              />
            )}

            <Menu
              anchorEl={aiMenuAnchor}
              keepMounted
              open={Boolean(aiMenuAnchor)}
              onClose={handleCloseAIMenu}
              PaperProps={{ className: classes.aiMenuPaper, style: { zIndex: 2100 } }}
            >
              <MenuItem onClick={handleImproveGrammar} disabled={aiLoading}>
                Melhorar gramática
              </MenuItem>
              <MenuItem onClick={handleImproveText} disabled={aiLoading}>
                Melhorar texto
              </MenuItem>
              <MenuItem onClick={handleCustomPrompt} disabled={aiLoading}>
                Prompt (pedir um texto)
              </MenuItem>
              <MenuItem onClick={handleTranslate} disabled={aiLoading}>
                Traduzir
              </MenuItem>
            </Menu>
            <Popover
              open={aiPromptOpen}
              onClose={handleCloseAiPrompt}
              anchorEl={aiPromptAnchorEl || newMessageBoxRef.current}
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
              transformOrigin={{ vertical: "bottom", horizontal: "center" }}
              PaperProps={{ className: classes.aiPromptPaper, style: { zIndex: 2100 } }}
              keepMounted
              disableEnforceFocus
              disableAutoFocus
              disableRestoreFocus
              TransitionProps={{
                timeout: 220,
                onEntering: () => {
                  if (aiPromptInputRef.current) {
                    aiPromptInputRef.current.focus();
                  }
                },
              }}
              onKeyDownCapture={(e) => e.stopPropagation()}
              onKeyUpCapture={(e) => e.stopPropagation()}
              onMouseDownCapture={(e) => e.stopPropagation()}
            >
              <div className={classes.aiPromptHeader}>
                <span>Prompt do Agente</span>
                <p className={classes.aiPromptSubtitle}>
                  Descreva o que a IA deve gerar ou alterar no texto
                </p>
              </div>
              <div className={classes.aiPromptPopoverBody}>
                <textarea
                  ref={aiPromptInputRef}
                  className={classes.aiPromptTextarea}
                  placeholder="Descreva o que a IA deve fazer…"
                  value={aiPromptText}
                  onChange={(e) => setAiPromptText(e.target.value)}
                  rows={4}
                  autoFocus
                  onKeyDownCapture={(e) => e.stopPropagation()}
                  onKeyUpCapture={(e) => e.stopPropagation()}
                  onKeyPressCapture={(e) => e.stopPropagation()}
                  onFocusCapture={(e) => e.stopPropagation()}
                  onMouseDownCapture={(e) => e.stopPropagation()}
                  onBlur={() => {
                    if (aiPromptOpen && aiPromptInputRef.current) {
                      setTimeout(() => {
                        aiPromptInputRef.current && aiPromptInputRef.current.focus();
                      }, 0);
                    }
                  }}
                />
                <div className={classes.aiPromptActions}>
                  <Button
                    size="small"
                    className={classes.aiPromptBtnCancel}
                    onClick={handleCloseAiPrompt}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="small"
                    className={classes.aiPromptBtnApply}
                    variant="contained"
                    disableElevation
                    onClick={handleRunAiPrompt}
                    disabled={aiLoading}
                  >
                    {aiLoading ? "Processando…" : "Aplicar"}
                  </Button>
                </div>
              </div>
            </Popover>

            <Popover
              open={aiTranslateOpen}
              onClose={() => setAiTranslateOpen(false)}
              anchorEl={aiPromptAnchorEl || newMessageBoxRef.current}
              anchorOrigin={{ vertical: "top", horizontal: "center" }}
              transformOrigin={{ vertical: "bottom", horizontal: "center" }}
              PaperProps={{ className: classes.aiTranslatePaper, style: { zIndex: 2100 } }}
              keepMounted
              disableEnforceFocus
              disableAutoFocus
              disableRestoreFocus
              onKeyDownCapture={(e) => e.stopPropagation()}
              onKeyUpCapture={(e) => e.stopPropagation()}
            >
              <div className={classes.aiTranslateHeader}>
                <span>Traduzir</span>
                <p className={classes.aiTranslateSubtitle}>Escolha o idioma de destino</p>
              </div>
              <div className={classes.aiTranslatePopoverBody}>
                <FormControl fullWidth variant="outlined" size="small">
                  <InputLabel id="translate-select-label-msginput">Idioma</InputLabel>
                  <Select
                    labelId="translate-select-label-msginput"
                    label="Idioma"
                    value={aiTranslateLang}
                    onChange={(e) => setAiTranslateLang(e.target.value)}
                    MenuProps={{
                      ...appleSelectMenuProps(theme),
                      disablePortal: true,
                      anchorOrigin: { vertical: "bottom", horizontal: "left" },
                      transformOrigin: { vertical: "top", horizontal: "left" },
                      PaperProps: {
                        ...appleSelectMenuProps(theme).PaperProps,
                        style: {
                          ...appleSelectMenuProps(theme).PaperProps?.style,
                          maxHeight: 200,
                          maxWidth: "min(240px, calc(100vw - 32px))",
                          width: "min(240px, calc(100vw - 32px))",
                        },
                      },
                      MenuListProps: {
                        ...appleSelectMenuProps(theme).MenuListProps,
                        style: {
                          ...appleSelectMenuProps(theme).MenuListProps?.style,
                          maxHeight: 188,
                          padding: "4px 0",
                        },
                        onKeyDown: (e) => e.stopPropagation(),
                      },
                    }}
                  >
                    <MenuItem value="pt-BR" {...appleMenuItemProps}>Português (Brasil)</MenuItem>
                    <MenuItem value="en">Inglês</MenuItem>
                    <MenuItem value="es">Espanhol</MenuItem>
                    <MenuItem value="fr">Francês</MenuItem>
                    <MenuItem value="de">Alemão</MenuItem>
                    <MenuItem value="it">Italiano</MenuItem>
                    <MenuItem value="ru">Russo</MenuItem>
                    <MenuItem value="zh-CN">Chinês (Simplificado)</MenuItem>
                    <MenuItem value="zh-TW">Chinês (Tradicional)</MenuItem>
                    <MenuItem value="ja">Japonês</MenuItem>
                    <MenuItem value="ko">Coreano</MenuItem>
                    <MenuItem value="ar">Árabe</MenuItem>
                    <MenuItem value="hi">Hindi</MenuItem>
                    <MenuItem value="tr">Turco</MenuItem>
                    <MenuItem value="nl">Holandês</MenuItem>
                    <MenuItem value="pl">Polonês</MenuItem>
                    <MenuItem value="sv">Sueco</MenuItem>
                    <MenuItem value="no">Norueguês</MenuItem>
                    <MenuItem value="da">Dinamarquês</MenuItem>
                    <MenuItem value="fi">Finlandês</MenuItem>
                    <MenuItem value="he">Hebraico</MenuItem>
                    <MenuItem value="el">Grego</MenuItem>
                    <MenuItem value="id">Indonésio</MenuItem>
                    <MenuItem value="th">Tailandês</MenuItem>
                    <MenuItem value="vi">Vietnamita</MenuItem>
                    <MenuItem value="uk">Ucraniano</MenuItem>
                    <MenuItem value="ro">Romeno</MenuItem>
                    <MenuItem value="cs">Tcheco</MenuItem>
                    <MenuItem value="hu">Húngaro</MenuItem>
                    <MenuItem value="sk">Eslovaco</MenuItem>
                    <MenuItem value="bg">Búlgaro</MenuItem>
                    <MenuItem value="hr">Croata</MenuItem>
                    <MenuItem value="sr">Sérvio</MenuItem>
                    <MenuItem value="ms">Malaio</MenuItem>
                    <MenuItem value="fa">Persa</MenuItem>
                    <MenuItem value="ur">Urdu</MenuItem>
                    <MenuItem value="bn">Bengali</MenuItem>
                    <MenuItem value="ta">Tâmil</MenuItem>
                  </Select>
                </FormControl>
                <div className={classes.aiTranslateActions}>
                  <Button
                    size="small"
                    className={classes.aiPromptBtnCancel}
                    onClick={() => setAiTranslateOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="small"
                    className={classes.aiPromptBtnApply}
                    variant="contained"
                    disableElevation
                    onClick={handleConfirmTranslate}
                    disabled={aiLoading}
                  >
                    {aiLoading ? "Processando…" : "Traduzir"}
                  </Button>
                </div>
              </div>
            </Popover>

            {/* Menu de formatação que aparece quando texto é selecionado */}
            <TextFormatMenu />

          </div>
        </Paper>
      </>
    );
  }
};

export default MessageInput;

