/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useState, useEffect, useReducer, useRef, useCallback } from "react";
import { isSameDay, parseISO, format } from "date-fns";
import clsx from "clsx";
import { isNil } from "lodash";
import { blue, green } from "@material-ui/core/colors";
import {
  Button,
  Divider,
  Typography,
  IconButton,
  makeStyles
} from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";

import {
  AccessTime,
  Done,
  DoneAll,
  ExpandMore,
  GetApp,
  Facebook,
  Instagram,
  Reply,
    WhatsApp
} from "@material-ui/icons";
import Stars from "@material-ui/icons/Stars";
import LockIcon from '@material-ui/icons/Lock';
import MarkdownWrapper from "../MarkdownWrapper";
import VcardPreview from "../VcardPreview";
import LocationPreview from "../LocationPreview";
import ModalImageCors from "../ModalImageCors";
import MessageOptionsMenu from "../MessageOptionsMenu";
import whatsBackground from "../../assets/wa-background.png";
import whatsBackgroundDark from "../../assets/wa-background-dark.png";
import YouTubePreview from "../ModalYoutubeCors";

/** Minimal stroke icons for ticket action bubbles (chat system events). */
function ActionBubbleGlyph({ type }) {
  const p = {
    width: 19,
    height: 19,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.55,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (type) {
    case "transfered":
      return (
        <svg {...p}>
          <path d="M4 14h12M4 14l3-3M4 14l3 3M20 10H8M20 10l-3-3M20 10l-3 3" />
        </svg>
      );
    case "receivedTransfer":
      return (
        <svg {...p}>
          <path d="M12 3v12M8 11l4 4 4-4M5 21h14" />
        </svg>
      );
    case "lead_created":
      return (
        <svg {...p}>
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M19 8v6M16 11h6" />
        </svg>
      );
    case "activity_created":
    case "agendamento_criado":
    case "consultar_agenda":
      return (
        <svg {...p}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10.5h17" />
        </svg>
      );
    case "consultar_produtos":
      return (
        <svg {...p}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
        </svg>
      );
    case "passar_preco":
      return (
        <svg {...p}>
          <path d="M7 7h10l-5 12-2-5-5-2 2-5zM13.5 4.5L17 8" />
        </svg>
      );
    case "enviar_link":
      return (
        <svg {...p}>
          <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
        </svg>
      );
    case "create":
      return (
        <svg {...p}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "open":
    case "reopen":
      return (
        <svg {...p}>
          <path d="M3 7h5l2-2h6l2 2h5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        </svg>
      );
    case "closed":
      return (
        <svg {...p}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    case "access":
      return (
        <svg {...p}>
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M12 2l2 4 4.5.5-3.2 3.2L16 14l-4 2-4-2-.3-4.3L4.5 6.5 9 6l3-4z" />
        </svg>
      );
  }
}
import PdfPreview from "../PdfPreview";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";
import AdMetaPreview from "../AdMetaPreview";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import SelectMessageCheckbox from "./SelectMessageCheckbox";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { AuthContext } from "../../context/Auth/AuthContext";
import { QueueSelectedContext } from "../../context/QueuesSelected/QueuesSelectedContext";
import AudioModal from "../AudioModal";
import { CircularProgress } from "@material-ui/core";
import { useParams, useHistory } from 'react-router-dom';
import { downloadResource } from "../../utils";
import Template from "./templates";
import InteractiveMessage from "./InteractiveMessage";
import { usePdfViewer } from "../../hooks/usePdfViewer";
import { getBackendUrl } from "../../config";
import { SiOpenai } from "react-icons/si";

const useStyles = makeStyles((theme) => ({
  messagesListWrapper: {
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    width: "100%",
    minWidth: 300,
    minHeight: 200,
  },
  messagesListWrapperFill: {
    flex: 1,
    minHeight: 0,
    height: "100%",
    minWidth: 0,
  },
  messagesListFill: {
    flex: 1,
    minHeight: 0,
  },
  messagesListPaddingCompact: {
    paddingBottom: 8,
  },

  currentTick: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "95%",
    backgroundColor: theme.palette.primary.main,
    margin: "10px",
    borderRadius: "10px",
    boxShadow: "1px 5px 10px #b3b3b3",
  },

  currentTicktText: {
    color: theme.palette.primary,
    fontWeight: 'bold',
    padding: 8,
    alignSelf: "center",
    marginLeft: "0px",
  },

  messagesList: {
    backgroundImage:
      theme.mode === "light" ? `url(${whatsBackground})` : `url(${whatsBackgroundDark})`,
    backgroundColor:
      theme.mode === "light" ? "#e5ddd5" : theme.palette.background.paper,
    backgroundRepeat: "repeat",
    backgroundSize: "380px auto",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    padding: "14px 16px 22px 16px",
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  dragElement: {
    background: 'rgba(255, 255, 255, 0.8)',
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 999999,
    textAlign: "center",
    fontSize: "3em",
    border: "5px dashed #333",
    color: '#333',
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  circleLoading: {
    color: blue[500],
    position: "absolute",
    opacity: "70%",
    top: 0,
    left: "50%",
    marginTop: 12,
  },

  messageLeft: {
    marginRight: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    whiteSpace: "pre-wrap",
    backgroundColor: theme.mode === 'light' ? "#ffffff" : theme.palette.background.paper,
    color: theme.mode === 'light' ? "#303030" : "#ffffff",
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: theme.mode === 'light' ? "0 1px 1px #b3b3b3" : "0 1px 1px #000000"
  },

  quotedContainerLeft: {
    margin: "-3px -80px 6px -6px",
    overflow: "hidden",
    backgroundColor: theme.mode === 'light' ? "#f0f0f0" : theme.palette.inputBackground,
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedMsg: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },

  quotedSideColorLeft: {
    flex: "none",
    width: "4px",
    backgroundColor: "#388aff",
  },

  /** Identificador da IA acima da bolha, alinhado ao canto superior direito */
  aiBubbleMagicWrap: {
    alignSelf: "flex-end",
    marginLeft: 20,
    marginRight: 8,
    marginTop: 0,
    marginBottom: 0,
    maxWidth: "min(88%, 440px)",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  aiAgentTopLabel: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 5,
    marginBottom: 0,
    marginRight: 6,
    padding: "2px 9px 1px 7px",
    borderRadius: "10px 10px 2px 2px",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.02em",
    lineHeight: 1.2,
    color: "#ffffff",
    backgroundColor: theme.mode === "light" ? "#3b82f6" : "#2563eb",
    border: "none",
    boxShadow:
      theme.mode === "light"
        ? "0 1px 4px rgba(37, 99, 235, 0.35)"
        : "0 1px 4px rgba(0, 0, 0, 0.3)",
    flexShrink: 0,
    position: "relative",
    top: 1,
    "& svg": {
      display: "block",
      flexShrink: 0,
      color: "#ffffff",
    },
  },

  messageRightHuman: {
    marginLeft: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },
    whiteSpace: "pre-wrap",
    backgroundColor: theme.mode === "light" ? "#dcf8c6" : "#005c4b",
    color: theme.mode === "light" ? "#303030" : "#ffffff",
    alignSelf: "flex-end",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 0,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: theme.mode === 'light' ? "0 1px 1px #b3b3b3" : "0 1px 1px #000000"
  },

  messageRightAgent: {
    marginLeft: 0,
    marginTop: 0,
    minWidth: 100,
    width: "100%",
    maxWidth: "100%",
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },
    whiteSpace: "pre-wrap",
    backgroundColor: theme.mode === "light" ? "#3b82f6" : "#2563eb",
    color: "#ffffff",
    "& $timestamp": {
      color: "rgba(255, 255, 255, 0.85)",
    },
    "& $forwardMessage": {
      color: "rgba(255, 255, 255, 0.88)",
    },
    "& $ackIcons": {
      color: "rgba(255, 255, 255, 0.9)",
    },
    "& $ackDoneAllIcon": {
      color: "#ffffff",
    },
    "& $messageActionsButton": {
      color: "rgba(255, 255, 255, 0.75)",
    },
    "& a": {
      color: "#dbeafe",
      textDecoration: "underline",
    },
    alignSelf: "stretch",
    width: "100%",
    borderRadius: 12,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 4,
    border:
      theme.mode === "light"
        ? "1px solid rgba(29, 78, 216, 0.5)"
        : "1px solid rgba(96, 165, 250, 0.35)",
    boxShadow:
      theme.mode === "light"
        ? "0 4px 18px rgba(37, 99, 235, 0.22), 0 1px 2px rgba(15, 23, 42, 0.06)"
        : "0 4px 24px rgba(0, 0, 0, 0.35)",
  },

  quotedContainerRightHuman: {
    margin: "-3px -80px 6px -6px",
    overflowY: "hidden",
    backgroundColor: theme.mode === 'light' ? "#cfe9ba" : "#025144",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedContainerRightAgent: {
    margin: "-3px -80px 6px -6px",
    overflowY: "hidden",
    backgroundColor: theme.mode === "light" ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.2)",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedMsgRight: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    whiteSpace: "pre-wrap",
  },

  quotedSideColorRightHuman: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },

  quotedSideColorRightAgent: {
    flex: "none",
    width: "4px",
    backgroundColor: "#0d47a1",
  },

  messageActionsButton: {
    display: "none",
    position: "relative",
    color: "#999",
    zIndex: 1,
    backgroundColor: "inherit",
    opacity: "90%",
    "&:hover, &.Mui-focusVisible": { backgroundColor: "inherit" },
  },

  messageContactName: {
    display: "flex",
    color: "#6bcbef",
    fontWeight: 500,
  },

  textContentItem: {
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  textContentItemDeleted: {
    fontStyle: "italic",
    color: "rgba(0, 0, 0, 0.36)",
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  messageMedia: {
    // ✅ CORREÇÃO: objectFit removido para vídeos funcionarem melhor
    // objectFit: "cover", // Removido pois pode causar problemas em vídeos
    width: 400,
    height: "auto",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    // ✅ CORREÇÃO: Adicionar estilos específicos para vídeo
    "&[controls]": {
      objectFit: "contain", // Para vídeos, usar contain em vez de cover
    }
  },

  timestamp: {
    fontSize: 11,
    position: "absolute",
    bottom: 0,
    right: 5,
    color: "#999",
  },

  forwardMessage: {
    fontSize: 12,
    fontStyle: "italic",
    position: "absolute",
    top: 0,
    left: 5,
    color: "#999",
    display: "flex",
    alignItems: "center"
  },

  dailyTimestamp: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "110px",
    backgroundColor: "#e1f3fb",
    margin: "10px",
    borderRadius: "10px",
    boxShadow: "0 1px 1px #b3b3b3",
  },

  dailyTimestampText: {
    color: "#808888",
    padding: 8,
    alignSelf: "center",
    marginLeft: "0px",
  },

  ackIcons: {
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },

  deletedIcon: {
    fontSize: 18,
    verticalAlign: "middle",
    marginRight: 4,
  },

  ackDoneAllIcon: {
    color: blue[500],
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },

  ackPlayedIcon: {
    color: green[500],
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },
  downloadMedia: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "inherit",
    padding: 10,
    color: theme.mode === "light" ? theme.palette.light : theme.palette.dark,
  },

  messageCenter: {
    marginTop: 5,
    alignItems: "center",
    verticalAlign: "center",
    alignContent: "center",
    backgroundColor: "#E1F5FEEB",
    fontSize: "12px",
    minWidth: 100,
    maxWidth: 270,
    color: "#272727",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: "0 1px 1px #b3b3b3",
  },

  deletedMessage: {
    color: '#f55d65'
  },
  actionBubble: {
    alignSelf: "center",
    margin: "12px 0",
    padding: "14px 18px",
    borderRadius: 18,
    maxWidth: "min(92%, 320px)",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    lineHeight: 1.35,
    backdropFilter: "saturate(180%) blur(20px)",
    WebkitBackdropFilter: "saturate(180%) blur(20px)",
    boxShadow:
      "0 8px 28px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.5)",
    border: "1px solid rgba(255,255,255,0.45)",
    color: "rgba(28,28,32,0.92)",
  },
  actionBubbleIconShell: {
    flexShrink: 0,
    width: 38,
    height: 38,
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.42)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
  },
  actionBubbleBody: {
    flex: 1,
    minWidth: 0,
    textAlign: "left",
  },
  actionBubbleTitle: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "-0.015em",
    lineHeight: 1.35,
  },
  actionBubbleDetail: {
    fontSize: 11.5,
    fontWeight: 500,
    opacity: 0.78,
    marginTop: 4,
    lineHeight: 1.35,
  },
  actionBubbleTime: {
    fontSize: 10.5,
    fontWeight: 500,
    opacity: 0.62,
    marginTop: 8,
    letterSpacing: "0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  actionBubbleTransfered: {
    background:
      "linear-gradient(145deg, rgba(255, 183, 77, 0.38) 0%, rgba(255, 214, 153, 0.22) 55%, rgba(255,255,255,0.15) 100%)",
    borderColor: "rgba(255, 179, 102, 0.35)",
    color: "rgba(45, 35, 20, 0.92)",
  },
  actionBubbleReceivedTransfer: {
    background:
      "linear-gradient(145deg, rgba(100, 181, 246, 0.35) 0%, rgba(66, 165, 245, 0.2) 50%, rgba(255,255,255,0.14) 100%)",
    borderColor: "rgba(66, 165, 245, 0.32)",
    color: "rgba(22, 40, 58, 0.92)",
  },
  actionBubbleLeadCreated: {
    background:
      "linear-gradient(145deg, rgba(129, 199, 132, 0.38) 0%, rgba(165, 214, 167, 0.22) 55%, rgba(255,255,255,0.14) 100%)",
    borderColor: "rgba(102, 187, 106, 0.35)",
    color: "rgba(24, 48, 32, 0.92)",
  },
  actionBubbleActivityCreated: {
    background:
      "linear-gradient(145deg, rgba(121, 134, 203, 0.4) 0%, rgba(159, 168, 218, 0.22) 50%, rgba(255,255,255,0.15) 100%)",
    borderColor: "rgba(121, 134, 203, 0.32)",
    color: "rgba(28, 28, 48, 0.92)",
  },
  actionBubbleConsultarAgenda: {
    background:
      "linear-gradient(145deg, rgba(186, 104, 200, 0.34) 0%, rgba(206, 147, 216, 0.2) 50%, rgba(255,255,255,0.14) 100%)",
    borderColor: "rgba(171, 71, 188, 0.28)",
    color: "rgba(40, 24, 48, 0.92)",
  },
  actionBubbleConsultarProdutos: {
    background:
      "linear-gradient(145deg, rgba(255, 167, 38, 0.32) 0%, rgba(255, 202, 128, 0.2) 50%, rgba(255,255,255,0.14) 100%)",
    borderColor: "rgba(255, 152, 0, 0.3)",
    color: "rgba(52, 32, 12, 0.92)",
  },
  actionBubblePassarPreco: {
    background:
      "linear-gradient(145deg, rgba(239, 83, 80, 0.3) 0%, rgba(255, 138, 128, 0.18) 50%, rgba(255,255,255,0.14) 100%)",
    borderColor: "rgba(229, 115, 115, 0.28)",
    color: "rgba(52, 22, 22, 0.92)",
  },
  actionBubbleDefault: {
    background:
      "linear-gradient(145deg, rgba(144, 164, 174, 0.32) 0%, rgba(189, 189, 189, 0.18) 50%, rgba(255,255,255,0.14) 100%)",
    borderColor: "rgba(120, 144, 156, 0.28)",
    color: "rgba(32, 38, 42, 0.9)",
  }
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_MESSAGES") {
    const messages = action.payload;
    const newMessages = [];

    messages.forEach((message) => {

      const messageIndex = state.findIndex((m) => m.id === message.id);
      if (messageIndex !== -1) {
        state[messageIndex] = message;
      } else {
        newMessages.push(message);
      }
    });

    return [...newMessages, ...state];
  }

  if (action.type === "ADD_MESSAGE") {
    const newMessage = action.payload;
    const messageIndex = state.findIndex((m) => m.id === newMessage.id);

    if (messageIndex !== -1) {
      state[messageIndex] = newMessage;
    } else {
      state.push(newMessage);
    }

    return [...state];
  }

  if (action.type === "UPDATE_MESSAGE") {
    const messageToUpdate = action.payload;
    const messageIndex = state.findIndex((m) => m.id === messageToUpdate.id);

    if (messageIndex !== -1) {
      state[messageIndex] = messageToUpdate;
    }

    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const MessagesList = ({
  isGroup,
  onDrop,
  whatsappId,
  queueId,
  channel,
  ticketStatus,
  ticketIdOverride,
  /** ID numérico do ticket (API); evita perder eventos de socket antes do fetch de mensagens */
  ticketInternalId,
  ticketIsBot = false,
  ticketUseIntegration = false,
  ticketUserId = null,
  fillParent = false
}) => {
  const classes = useStyles();
  const muiTheme = useTheme();
  const [messagesList, dispatch] = useReducer(reducer, []);
  const [logsList, setLogsList] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const history = useHistory();
  const lastMessageRef = useRef();

  const [selectedMessage, setSelectedMessage] = useState({});
  const { setReplyingMessage } = useContext(ReplyMessageContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const messageOptionsMenuOpen = Boolean(anchorEl);
  const params = useParams();
  const ticketId = ticketIdOverride ?? params.ticketId;

  const currentTicketId = useRef(ticketId);
  const currentTicketNumericId = useRef(null);
  /** Evita dar socket.off/on quando ticket.id chega do API — eventos perdidos no meio da troca. */
  const ticketInternalIdRef = useRef(ticketInternalId);
  const logsRefetchAfterAppMessageTimerRef = useRef(null);
  const { getAll } = useCompanySettings();
  const [dragActive, setDragActive] = useState(false);
  const [dragTimeout, setDragTimeout] = useState(null);

  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const [lgpdDeleteMessage, setLGPDDeleteMessage] = useState(false);
  const { selectedQueuesMessage } = useContext(QueueSelectedContext);

  // Hook simplificado para PDF
  const {
    downloadPdf,
    extractPdfInfoFromMessage,
    isPdfUrl
  } = usePdfViewer();

  const { showSelectMessageCheckbox } = useContext(ForwardMessageContext);
  const { user, socket } = useContext(AuthContext);
  const companyId = user.companyId;

  const asBool = (value) =>
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true";

  /** Humano (CRM / espelho WhatsApp): verde. Agente IA / automação: azul. */
  const isOutgoingAgentBubble = (message) => {
    if (!message?.fromMe) return false;

    const rawBody = String(message?.body || "");
    const body = rawBody.replace(/^\u200e\s*/g, "").trim();
    const name = user?.name || "";

    if (asBool(message.fromAgent)) return true;

    if (name && body.startsWith(`*${name}`)) return false;

    const ticketCh = String(channel || "").toLowerCase();
    const isTelegramChannel =
      ticketCh === "telegram" || ticketCh === "telegram_oficial";

    if (isTelegramChannel && !asBool(message.isPrivate)) {
      if (asBool(ticketIsBot) || asBool(ticketUseIntegration)) {
        return true;
      }
      const noHumanAttendant =
        ticketUserId == null || Number(ticketUserId) === 0;
      if (
        noHumanAttendant &&
        (ticketStatus === "open" || ticketStatus === "pending")
      ) {
        return true;
      }
    }

    if (/^\u200e\s*/.test(rawBody)) return true;

    if (asBool(message.isPrivate)) return true;
    return false;
  };
  const backendUrl = getBackendUrl();
  const resolveMediaUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    const u = url.trim();
    if (/^(data:|blob:|https?:\/\/)/i.test(u)) return u;
    if (u.startsWith("public/")) return `${backendUrl}/${u}`;
    if (u.startsWith("./public/")) return `${backendUrl}/${u.replace("./", "")}`;
    if (u.startsWith("/")) return `${backendUrl}${u}`;
    // Arquivos recebidos normalmente são salvos em /public/company{companyId}/<arquivo>
    if (!u.includes("/") && companyId) return `${backendUrl}/public/company${companyId}/${u}`;
    return `${backendUrl}/public/${u}`;
  };
  const pickMediaUrl = (obj) => {
    if (!obj) return "";
    const isInvalidMediaToken = (value) => {
      if (typeof value !== "string") return true;
      const v = value.trim().toLowerCase();
      if (!v) return true;
      if (["image", "imagem", "img", "video", "vídeo", "audio", "document", "documento", "file", "arquivo", "null", "undefined"].includes(v)) {
        return true;
      }
      if (v === "[object object]") return true;
      return false;
    };

    const candidates = [obj.mediaUrl, obj.mediaPath, obj.url];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && !isInvalidMediaToken(candidate)) {
        return candidate;
      }
    }

    // Fallback: nome de arquivo presente na mensagem
    const nameCandidate = obj.mediaName || obj.body;
    if (typeof nameCandidate === "string") {
      const trimmed = nameCandidate.trim();
      if (/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(trimmed)) {
        return trimmed;
      }
    }
    return "";
  };

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    async function fetchData() {
      try {
        const settings = (await getAll(companyId)) || {};
        if (cancelled) return;

        let settinglgpdDeleteMessage;
        let settingEnableLGPD;

        for (const [key, value] of Object.entries(settings)) {
          if (key === "lgpdDeleteMessage") settinglgpdDeleteMessage = value;
          if (key === "enableLGPD") settingEnableLGPD = value;
        }
        if (settingEnableLGPD === "enabled" && settinglgpdDeleteMessage === "enabled") {
          setLGPDDeleteMessage(true);
        }
      } catch (err) {
        if (!cancelled) toastError(err);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
    // getAll vem de hook sem useCallback — evitar dependência para não loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    currentTicketId.current = ticketId;
  }, [ticketId, selectedQueuesMessage]);

  useEffect(() => {
    ticketInternalIdRef.current = ticketInternalId;
    if (ticketInternalId != null && ticketInternalId !== "") {
      currentTicketNumericId.current = Number(ticketInternalId);
    }
  }, [ticketInternalId]);

  const refetchTicketLogs = useCallback(async () => {
    if (!ticketInternalId || ticketInternalId === "" || !user?.companyId) return;
    try {
      const { data } = await api.get(`/tickets-log/${ticketInternalId}`);
      const sorted = [...data].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setLogsList(sorted);
    } catch (err) {
      console.error("Erro ao buscar logs do ticket:", err);
    }
  }, [ticketInternalId, user?.companyId]);

  useEffect(() => {
    refetchTicketLogs();
  }, [refetchTicketLogs]);

  /** Recarrega logs quando o ticket é atualizado (ex.: ação inteligente grava LogTicket) sem F5. */
  useEffect(() => {
    if (!socket || !user?.companyId || !ticketInternalId) return;
    const cid = user.companyId;
    const numericId = Number(ticketInternalId);
    let debounceTimer = null;
    const onCompanyTicket = (data) => {
      if (data.action !== "update" || !data.ticket) return;
      if (Number(data.ticket.id) !== numericId) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        refetchTicketLogs();
      }, 400);
    };
    socket.on(`company-${cid}-ticket`, onCompanyTicket);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      socket.off(`company-${cid}-ticket`, onCompanyTicket);
    };
  }, [socket, user?.companyId, ticketInternalId, refetchTicketLogs]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchMessages = async () => {
        if (ticketId === "undefined") {
          history.push("/tickets");
          return;
        }
        if (isNil(ticketId)) return;
        try {
          const { data } = await api.get("/messages/" + ticketId, {
            params: { pageNumber, selectedQueues: JSON.stringify(selectedQueuesMessage) },
          });

          if (currentTicketId.current === ticketId) {
            dispatch({ type: "LOAD_MESSAGES", payload: data.messages });
            setHasMore(data.hasMore);
            setLoading(false);
            setLoadingMore(false);
            currentTicketNumericId.current =
              (data && data.ticket && data.ticket.id) ||
              (Array.isArray(data.messages) && data.messages.length > 0 ? data.messages[0].ticketId : currentTicketNumericId.current);
          }

          if (pageNumber === 1 && data.messages.length > 1) {
            scrollToBottom();
          }
        } catch (err) {
          setLoading(false);
          toastError(err);
          setLoadingMore(false);
        }
      };

      fetchMessages();
    }, 500);
    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [pageNumber, ticketId, selectedQueuesMessage]);

  useEffect(() => {
    if (ticketId === "undefined") {
      return;
    }
    if (!user?.companyId) {
      return;
    }

    const companyId = user.companyId;

    const connectEventMessagesList = () => {
      socket.emit("joinChatBox", `${ticketId}`);
      const tid = ticketInternalIdRef.current;
      if (tid != null && String(tid) !== String(ticketId)) {
        socket.emit("joinChatBox", `${tid}`);
      }
    }

    const onAppMessageMessagesList = (data) => {
      const eventMessage = data?.message;
      const eventTicketUuid =
        (data && data.ticket && data.ticket.uuid) ||
        (eventMessage && eventMessage.ticket && eventMessage.ticket.uuid) ||
        null;
      const eventTicketId =
        (eventMessage && eventMessage.ticketId) ||
        (eventMessage && eventMessage.ticket && eventMessage.ticket.id) ||
        (data && data.ticket && data.ticket.id) ||
        null;

      const internalFromRef = ticketInternalIdRef.current;
      const numericFromProp =
        internalFromRef != null && internalFromRef !== ""
          ? Number(internalFromRef)
          : null;
      const sameTicket =
        (eventTicketUuid && String(eventTicketUuid) === String(ticketId)) ||
        (currentTicketNumericId.current != null &&
          eventTicketId != null &&
          Number(eventTicketId) === Number(currentTicketNumericId.current)) ||
        (numericFromProp != null &&
          !Number.isNaN(numericFromProp) &&
          eventTicketId != null &&
          Number(eventTicketId) === numericFromProp);

      if (!sameTicket) return;

      if (data.action === "create") {
        if (!eventMessage || eventMessage.id == null) return;
        dispatch({ type: "ADD_MESSAGE", payload: eventMessage });
        scrollToBottom();
        /* Nova mensagem pode vir junto com LogTicket (ex.: enviar_link); atualiza bolhas sem depender só do evento de ticket. */
        if (logsRefetchAfterAppMessageTimerRef.current) {
          clearTimeout(logsRefetchAfterAppMessageTimerRef.current);
        }
        logsRefetchAfterAppMessageTimerRef.current = setTimeout(() => {
          logsRefetchAfterAppMessageTimerRef.current = null;
          refetchTicketLogs();
        }, 450);
        return;
      }

      if (data.action === "update") {
        if (!eventMessage || eventMessage.id == null) return;
        dispatch({ type: "UPDATE_MESSAGE", payload: eventMessage });
        return;
      }

      if (data.action === "delete") {
        if (!data?.messageId) return;
        dispatch({ type: "DELETE_MESSAGE", payload: data.messageId });
      }
    }
    if (!socket) {
      return;
    }
    socket.on("connect", connectEventMessagesList);
    socket.on(`company-${companyId}-appMessage`, onAppMessageMessagesList);

    return () => {
      if (logsRefetchAfterAppMessageTimerRef.current) {
        clearTimeout(logsRefetchAfterAppMessageTimerRef.current);
        logsRefetchAfterAppMessageTimerRef.current = null;
      }
      if (socket) {
        socket.emit("joinChatBoxLeave", `${ticketId}`);
        const tid = ticketInternalIdRef.current;
        if (tid != null && String(tid) !== String(ticketId)) {
          socket.emit("joinChatBoxLeave", `${tid}`);
        }
        socket.off("connect", connectEventMessagesList);
        socket.off(`company-${companyId}-appMessage`, onAppMessageMessagesList);
      }
    };

  }, [ticketId, socket, user.companyId, refetchTicketLogs]);

  useEffect(() => {
    if (!socket || !ticketInternalId || String(ticketInternalId) === String(ticketId)) {
      return;
    }
    socket.emit("joinChatBox", `${ticketInternalId}`);
  }, [socket, ticketInternalId, ticketId]);

  useEffect(() => {
    return () => {
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }
    };
  }, [dragTimeout]);

  const loadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    setPageNumber((prevPageNumber) => prevPageNumber + 1);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (lastMessageRef.current) {
        lastMessageRef.current.scrollIntoView({});
      }
    }, 100);
  };

  const handleScroll = (e) => {
    if (!hasMore) return;
    const { scrollTop } = e.currentTarget;

    if (scrollTop === 0) {
      document.getElementById("messagesList").scrollTop = 1;
    }

    if (loading) {
      return;
    }

    if (scrollTop < 50) {
      loadMore();
    }
  };

  const handleOpenMessageOptionsMenu = (e, message) => {
    setAnchorEl(e.currentTarget);
    setSelectedMessage(message);
  };

  const handleCloseMessageOptionsMenu = (e) => {
    setAnchorEl(null);
  };

  const hanldeReplyMessage = (e, message) => {
    setAnchorEl(null);
    setReplyingMessage(message);
  };

  const getBasename = (filepath) => {
    if (!filepath) return '';
    // Remove query strings e hashes
    const cleanPath = filepath.split('?')[0].split('#')[0];
    // Pega o último segmento após /
    const segments = cleanPath.split('/');
    return segments[segments.length - 1];
  };

  const isInteractiveMetaMessage = (m) => {
    const mt = String(m?.mediaType || "").toLowerCase();
    if (mt === "interactive" || mt === "interative" || mt === "listmessage") {
      return true;
    }
    try {
      const raw =
        typeof m?.dataJson === "string" ? JSON.parse(m.dataJson) : m?.dataJson;
      return Boolean(
        raw?.interactive || raw?.type === "list" || raw?.type === "button"
      );
    } catch {
      return false;
    }
  };

  const checkMessageMedia = (message) => {
    const isAudioMessage = (message) => {
      if (message.mediaType === "audio") {
        console.log("🎵 Detectado como áudio pelo mediaType:", message.mediaType);
        return true;
      }

      if (message.mediaUrl) {
        const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'];
        const url = message.mediaUrl.toLowerCase();
        const hasAudioExtension = audioExtensions.some(ext => url.includes(ext));

        if (hasAudioExtension) {
          console.log("🎵 Detectado como áudio pela URL:", url);
          return true;
        }
      }

      if (message.body && typeof message.body === 'string') {
        const body = message.body.toLowerCase();
        const isAudioBody = body.includes('áudio gravado') ||
          body.includes('audio_') ||
          body.includes('🎵') ||
          body.includes('arquivo de áudio') ||
          body.includes('mensagem de voz');

        if (isAudioBody) {
          console.log("🎵 Detectado como áudio pelo body:", body);
          return true;
        }
      }

      return false;
    };

    const isImageMessage = (m) => {
      try {
        const t = (m.mediaType || "").toLowerCase();
        if (t.includes("image")) return true;
        const any = (m.mediaUrl || m.mediaPath || m.url || m.mediaName || m.body || "").toLowerCase();
        if (["image", "imagem", "foto", "img"].includes(any.trim())) return true;
        if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(any)) return true;
      } catch {}
      return false;
    };

    // Templates
    if (message.mediaType === "template") {
      return <Template message={message} />;
    }

    // Botões / lista / enquete Meta (API Oficial)
    if (isInteractiveMetaMessage(message)) {
      return (
        <InteractiveMessage
          message={message}
          onSelectOption={(_msg, opt) => {
            const title = String(opt?.title || "").trim();
            if (!title) return;
            window.dispatchEvent(
              new CustomEvent("fillComposerMessage", {
                detail: { text: title, send: false }
              })
            );
          }}
        />
      );
    }

    // Localização
    else if (message.mediaType === "locationMessage" && message.body.split('|').length >= 2) {
      let locationParts = message.body.split('|');
      let imageLocation = locationParts[0];
      let linkLocation = locationParts[1];
      let descriptionLocation = locationParts.length > 2 ? locationParts[2] : null;

      return <LocationPreview 
        image={imageLocation} 
        link={linkLocation} 
        description={descriptionLocation} 
      />;
    }

    // Contatos
    else if (message.mediaType === "contactMessage") {
      let array = message.body.split("\n");
      let obj = [];
      let contact = "";
      
      for (let index = 0; index < array.length; index++) {
        const v = array[index];
        let values = v.split(":");
        for (let ind = 0; ind < values.length; ind++) {
          if (values[ind].indexOf("+") !== -1) {
            obj.push({ number: values[ind] });
          }
          if (values[ind].indexOf("FN") !== -1) {
            contact = values[ind + 1];
          }
        }
      }
      
      return <VcardPreview 
        contact={contact} 
        numbers={obj[0]?.number} 
        queueId={message?.ticket?.queueId} 
        whatsappId={message?.ticket?.whatsappId} 
        channel={channel} 
      />;
    }

    else if (message.mediaType === "adMetaPreview") { // Adicionado para renderizar o componente de preview de anúncio
      console.log("Entrou no MetaPreview");
      // ✅ CORREÇÃO: Parse correto dos dados - formato: image|sourceUrl|title|body|messageUser
      let [image, sourceUrl, title, body, messageUser] = message.body.split('|');
      
      // Fallback para messageUser se não estiver presente
      if (!messageUser || messageUser.trim() === "") {
        messageUser = "Olá! Tenho interesse e queria mais informações, por favor.";
      }
      
      return <AdMetaPreview 
        image={image} 
        sourceUrl={sourceUrl} 
        title={title} 
        body={body} 
        messageUser={messageUser} 
      />;
    }

    // PDF e Documentos - SÓ DOWNLOAD
    else if (isPdfUrl(pickMediaUrl(message), message.body, message.mediaType)) {
      
      console.log("📄 Renderizando como documento/PDF:", message.id);
      const pdfInfo = extractPdfInfoFromMessage({
        ...message,
        mediaUrl: pickMediaUrl(message)
      });

      return (
        <PdfPreview
          url={pdfInfo.url}
          filename={pdfInfo.filename}
          size={pdfInfo.size}
          mediaType={pdfInfo.mediaType}
          onDownload={(url, name) => {
            console.log("📥 Download PDF solicitado:", { url, name });
            downloadPdf(url, name);
          }}
        />
      );
    }

    // Áudio
    else if (isAudioMessage(message)) {
      console.log("🎵 Renderizando como áudio:", message.id);
      const audioSrc = pickMediaUrl(message);
      return (
        <div style={{
          width: '100%',
          maxWidth: '300px',
          padding: '8px',
          backgroundColor: 'transparent'
        }}>
          <AudioModal
            url={resolveMediaUrl(audioSrc)}
            message={message}
          />
        </div>
      );
    }

    // Imagens
    else if (isImageMessage(message)) {
      console.log("🖼️ Renderizando como imagem");
      const src = pickMediaUrl(message);
      if (!src) {
        const fallbackCandidates = [];
        if (companyId && message?.id) {
          const base = `${backendUrl}/public/company${companyId}/message/${message.id}`;
          fallbackCandidates.push(`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`);
        }
        fallbackCandidates.push(`${backendUrl}/messages/${message.id}/media`);
        return <ModalImageCors imageUrl="" candidates={fallbackCandidates} />;
      }
      const fallbackCandidates = [`${backendUrl}/messages/${message.id}/media`];
      return <ModalImageCors imageUrl={resolveMediaUrl(src)} candidates={fallbackCandidates} />;
    }

    // Vídeos
    else if (
      String(message.mediaType || "").toLowerCase() === "video" ||
      /\.(mp4|webm|ogg|mov)(\?|$)/i.test(String(pickMediaUrl(message) || "").toLowerCase()) ||
      ["video", "vídeo"].includes(String(message.body || "").toLowerCase().trim())
    ) {
      console.log("🎥 Renderizando como vídeo");
      const videoSrc = resolveMediaUrl(pickMediaUrl(message));
      
      return (
        <div style={{ maxWidth: "400px", width: "100%", position: "relative" }}>
          {/* Loading indicator */}
          {videoLoading && !videoError && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px"
            }}>
              <CircularProgress size={30} />
              <Typography variant="caption" color="textSecondary">
                Carregando vídeo...
              </Typography>
            </div>
          )}
          
          {/* Vídeo player melhorado */}
          <video
            className={classes.messageMedia}
            src={videoSrc}
            controls
            preload="metadata"
            playsInline
            style={{ 
              width: "100%", 
              height: "auto", 
              maxHeight: "300px",
              borderRadius: "8px",
              backgroundColor: "#f0f0f0",
              opacity: videoLoading ? 0.3 : 1,
              transition: "opacity 0.3s ease"
            }}
            onLoadStart={() => {
              console.log("⏳ Iniciando carregamento do vídeo");
              setVideoLoading(true);
              setVideoError(false);
            }}
            onLoadedData={() => {
              console.log("✅ Vídeo carregado e pronto");
              setVideoLoading(false);
            }}
            onCanPlay={() => {
              console.log("✅ Vídeo pronto para reprodução");
              setVideoLoading(false);
            }}
            onError={(e) => {
              console.error("❌ Erro ao carregar vídeo:", e);
              console.log("🔗 URL do vídeo:", videoSrc);
              setVideoLoading(false);
              setVideoError(true);
            }}
          >
            {/* ✅ CORREÇÃO: Múltiplos formatos para compatibilidade */}
            <source src={videoSrc} type="video/mp4" />
            <source src={videoSrc} type="video/webm" />
            <source src={videoSrc} type="video/ogg" />
            
            {/* Fallback para navegadores antigos */}
            Seu navegador não suporta reprodução de vídeo.
          </video>
          
          {/* Error state */}
          {videoError && (
            <div style={{ 
              padding: "20px", 
              textAlign: "center", 
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
              color: "#666",
              marginTop: "8px"
            }}>
              <Typography variant="body2" style={{ marginBottom: "12px" }}>
                ❌ Erro ao carregar vídeo
              </Typography>
              <Button
                startIcon={<GetApp />}
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = message.mediaUrl;
                  link.download = message.body || 'video.mp4';
                  link.click();
                }}
                variant="outlined"
                size="small"
              >
                Baixar Vídeo
              </Button>
            </div>
          )}
        </div>
      );
    }

    // Outros tipos de arquivo
    else if (pickMediaUrl(message)) {
      console.log("📎 Renderizando como download genérico");
      const genericMediaUrl = resolveMediaUrl(pickMediaUrl(message));
      return (
        <>
          <div className={classes.downloadMedia}>
            <Button
              startIcon={<GetApp />}
              variant="outlined"
              onClick={() => downloadPdf(genericMediaUrl, message.body || 'arquivo')}
            >
              Download
            </Button>
          </div>
          <Divider />
        </>
      );
    }

    return null;
  };

  const renderMessageAck = (message) => {
    if (message.ack === 0) {
      return <AccessTime fontSize="small" className={classes.ackIcons} />;
    } else
      if (message.ack === 1) {
        return <Done fontSize="small" className={classes.ackIcons} />;
      } else
        if (message.ack === 2 || message.ack === 3) {
          return <DoneAll fontSize="small" className={classes.ackIcons} />;
        } else
          if (message.ack === 4) {
            return <DoneAll fontSize="small" className={message.mediaType === "audio" ? classes.ackPlayedIcon : classes.ackDoneAllIcon} />;
          } else
            if (message.ack === 5) {
              return <DoneAll fontSize="small" className={classes.ackDoneAllIcon} />
            }
  };

  const renderDailyTimestamps = (item, index, combinedList) => {
    if (item.type !== "message") return null;
    const message = item.data;
    const today = format(new Date(), "dd/MM/yyyy")

    if (index === 0) {
      return (
        <span
          className={classes.dailyTimestamp}
          key={`timestamp-${message.id}`}
        >
          <div className={classes.dailyTimestampText}>
            {today === format(parseISO(message.createdAt), "dd/MM/yyyy") ? "HOJE" : format(parseISO(message.createdAt), "dd/MM/yyyy")}
          </div>
        </span>
      );
    } else
      if (index < combinedList.length - 1) {
        let messageDay = parseISO(message.createdAt);
        let previousItem = combinedList[index - 1];
        if (previousItem.type !== "message") return null;
        let previousMessageDay = parseISO(previousItem.data.createdAt);

        if (!isSameDay(messageDay, previousMessageDay)) {
          return (
            <span
              className={classes.dailyTimestamp}
              key={`timestamp-${message.id}`}
            >
              <div className={classes.dailyTimestampText}>
                {today === format(parseISO(message.createdAt), "dd/MM/yyyy") ? "HOJE" : format(parseISO(message.createdAt), "dd/MM/yyyy")}
              </div>
            </span>
          );
        }
      } else
        if (index === combinedList.length - 1) {
          return (
            <div
              key={`ref-${message.id}`}
              ref={lastMessageRef}
              style={{ float: "left", clear: "both" }}
            />
          );
        }
  };

  const renderTicketsSeparator = (item, index, combinedList) => {
    if (item.type !== "message") return null;
    const message = item.data;
    let lastTicket = index > 0 && combinedList[index - 1].type === "message" ? combinedList[index - 1].data.ticketId : undefined;
    let currentTicket = message.ticketId;

    if (lastTicket !== currentTicket && lastTicket !== undefined) {
      if (message?.ticket?.queue) {
        return (
          <span
            className={classes.currentTick}
            key={`timestamp-${message.id}a`}
          >
            <div
              className={classes.currentTicktText}
              style={{ backgroundColor: message?.ticket?.queue?.color || "grey" }}
            >
              #{i18n.t("ticketsList.called")} {message?.ticketId} - {message?.ticket?.queue?.name}
            </div>

          </span>
        );
      } else {
        return (
          <span
            className={classes.currentTick}
            key={`timestamp-${message.id}b`}
          >
            <div
              className={classes.currentTicktText}
              style={{ backgroundColor: "grey" }}
            >
              #{i18n.t("ticketsList.called")} {message.ticketId} - {i18n.t("ticketsList.noQueue")}
            </div>

          </span>
        );
      }
    }

  };

  const renderMessageDivider = (item, index, combinedList) => {
    if (item.type !== "message") return null;
    if (index < combinedList.length && index > 0) {
      let currentItem = combinedList[index];
      let previousItem = combinedList[index - 1];
      
      if (currentItem.type !== "message" || previousItem.type !== "message") return null;
      
      let messageUser = currentItem.data.fromMe;
      let previousMessageUser = previousItem.data.fromMe;
      if (messageUser !== previousMessageUser) {
        return (

          <span style={{ marginTop: 16 }} key={`divider-${currentItem.data.id}`}></span>
        );
      }
    }
  };

  const renderQuotedMessage = (message) => {

    return (
      <div
        className={clsx(classes.quotedContainerLeft, {
          [isOutgoingAgentBubble(message) ? classes.quotedContainerRightAgent : classes.quotedContainerRightHuman]: message.fromMe,
        })}
      >
        <span
          className={clsx({
            [classes.quotedSideColorLeft]: !message.quotedMsg?.fromMe,
            [classes.quotedSideColorRightHuman]: message.quotedMsg?.fromMe && !isOutgoingAgentBubble(message),
            [classes.quotedSideColorRightAgent]: message.quotedMsg?.fromMe && isOutgoingAgentBubble(message),
          })}
        ></span>
        <div className={classes.quotedMsg}>
          {!message.quotedMsg?.fromMe && (
            <span className={classes.messageContactName}>
              {message.quotedMsg?.contact?.name}
            </span>
          )}

          {message.quotedMsg.mediaType === "audio"
            && (
              <div className={classes.downloadMedia}>
                <AudioModal url={resolveMediaUrl(pickMediaUrl(message.quotedMsg))} />
              </div>
            )
          }
          {message.quotedMsg.mediaType === "video"
            && (
              <div style={{ maxWidth: "300px", width: "100%" }}>
                <video
                  className={classes.messageMedia}
                  src={resolveMediaUrl(pickMediaUrl(message.quotedMsg))}
                  controls
                  preload="metadata"
                  style={{ 
                    width: "100%", 
                    height: "auto", 
                    maxHeight: "200px",
                    borderRadius: "6px",
                    backgroundColor: "#f0f0f0"
                  }}
                  onError={(e) => {
                    console.error("❌ Erro ao carregar vídeo citado:", e);
                  }}
                >
                  <source src={resolveMediaUrl(pickMediaUrl(message.quotedMsg))} type="video/mp4" />
                  <source src={resolveMediaUrl(pickMediaUrl(message.quotedMsg))} type="video/webm" />
                  <source src={resolveMediaUrl(pickMediaUrl(message.quotedMsg))} type="video/ogg" />
                  <div style={{ padding: "10px", textAlign: "center", fontSize: "12px", color: "#999" }}>
                    ❌ Erro ao carregar vídeo
                  </div>
                </video>
              </div>
            )
          }
          {message.quotedMsg.mediaType === "contactMessage"
            && (
              "Contato"
            )
          }
          {message.quotedMsg.mediaType === "application"
            && (
              <div className={classes.downloadMedia}>
                <Button
                  startIcon={<GetApp />}
                  variant="outlined"
                  target="_blank"
                  href={resolveMediaUrl(pickMediaUrl(message.quotedMsg))}
                >
                  Download
                </Button>
              </div>
            )
          }

          {(
            (message.quotedMsg.mediaType && message.quotedMsg.mediaType.toLowerCase().includes("image")) ||
            /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(
              String(
                message.quotedMsg?.mediaUrl ||
                message.quotedMsg?.mediaPath ||
                message.quotedMsg?.url ||
                message.quotedMsg?.mediaName ||
                message.quotedMsg?.body ||
                ""
              )
            )
          ) && (
            (() => {
              const src = pickMediaUrl(message.quotedMsg);
              if (!src) {
                const fallbackCandidates = [];
                if (companyId && message?.quotedMsg?.id) {
                  const base = `${backendUrl}/public/company${companyId}/message/${message.quotedMsg.id}`;
                  fallbackCandidates.push(`${base}.jpg`, `${base}.jpeg`, `${base}.png`, `${base}.webp`);
                }
                if (message?.quotedMsg?.id) {
                  fallbackCandidates.push(`${backendUrl}/messages/${message.quotedMsg.id}/media`);
                }
                return <ModalImageCors imageUrl={src} candidates={fallbackCandidates} />;
              }
              return <ModalImageCors imageUrl={src} />;
            })()
          )}

          {!message.quotedMsg.mediaType === "image" && message.quotedMsg?.body}

        </div>
      </div>
    );
  };

  const handleDrag = event => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === "dragenter" || event.type === "dragover") {
      const hasFiles = event.dataTransfer &&
        event.dataTransfer.types &&
        (event.dataTransfer.types.includes('Files') ||
          event.dataTransfer.types.includes('application/x-moz-file'));

      if (hasFiles) {
        if (dragTimeout) {
          clearTimeout(dragTimeout);
        }

        const timeout = setTimeout(() => {
          if (event.dataTransfer.items && event.dataTransfer.items.length > 0) {
            setDragActive(true);
          }
        }, 100);

        setDragTimeout(timeout);
      }
    } else if (event.type === "dragleave") {
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        setDragTimeout(null);
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX;
      const y = event.clientY;

      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false);
      }
    }
  }

  const isYouTubeLink = (url) => {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  };

  const handleDrop = event => {
    event.preventDefault();
    event.stopPropagation();

    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }

    setDragActive(false);

    if (event.dataTransfer.files &&
      event.dataTransfer.files.length > 0 &&
      event.dataTransfer.files[0] instanceof File) {
      if (onDrop) {
        onDrop(event.dataTransfer.files);
      }
    }
  }
  const xmlRegex = /<([^>]+)>/g;
  const boldRegex = /\*(.*?)\*/g;

  const formatXml = (xmlString) => {
    // Verifica se o XML contém a assinatura com nome do atendente
    if (boldRegex.test(xmlString)) {
      // Formata o texto dentro da assinatura em negrito
      xmlString = xmlString.replace(boldRegex, "**$1**");
    }
    return xmlString;
  };

  const getActionBubbleStyle = (type) => {
    const styles = {
      transfered: classes.actionBubbleTransfered,
      receivedTransfer: classes.actionBubbleReceivedTransfer,
      lead_created: classes.actionBubbleLeadCreated,
      activity_created: classes.actionBubbleActivityCreated,
      consultar_agenda: classes.actionBubbleConsultarAgenda,
      consultar_produtos: classes.actionBubbleConsultarProdutos,
      passar_preco: classes.actionBubblePassarPreco,
      agendamento_criado: classes.actionBubbleActivityCreated,
      enviar_link: classes.actionBubbleConsultarAgenda,
      open: classes.actionBubbleLeadCreated,
      reopen: classes.actionBubbleLeadCreated,
    };
    return styles[type] || classes.actionBubbleDefault;
  };

  const getActionBubbleCopy = (log) => {
    const labels = {
      transfered: "Atendimento transferido",
      receivedTransfer: "Atendimento recebido",
      lead_created: "Lead criado",
      activity_created: "Atividade registrada",
      agendamento_criado: "Agendamento realizado (agente IA)",
      consultar_agenda: "Agenda consultada",
      consultar_produtos: "Produtos consultados",
      passar_preco: "Preço consultado",
      enviar_link: "Link enviado (ação inteligente)",
      create: "Ticket criado",
      open: "Ticket aberto",
      reopen: "Ticket reaberto",
      closed: "Ticket fechado",
      access: "Ticket acessado",
    };

    const title = labels[log.type] || log.type;
    const detailParts = [];

    if (log.type === "transfered" && log.queue) {
      detailParts.push(`Fila: ${log.queue.name}`);
    }
    if (log.type === "receivedTransfer" && log.queue) {
      detailParts.push(`Origem: ${log.queue.name}`);
    }
    if (log.type === "transfered" && log.user) {
      detailParts.push(`Por: ${log.user.name}`);
    }
    if (log.type === "receivedTransfer" && log.user) {
      detailParts.push(`Para: ${log.user.name}`);
    }

    return {
      title,
      detail: detailParts.length ? detailParts.join(" · ") : null,
    };
  };

  const renderActionBubble = (log, index) => {
    const { title, detail } = getActionBubbleCopy(log);
    return (
      <div
        key={`log-${log.id}`}
        className={clsx(classes.actionBubble, getActionBubbleStyle(log.type))}
      >
        <div className={classes.actionBubbleIconShell} aria-hidden>
          <ActionBubbleGlyph type={log.type} />
        </div>
        <div className={classes.actionBubbleBody}>
          <div className={classes.actionBubbleTitle}>{title}</div>
          {detail ? (
            <div className={classes.actionBubbleDetail}>{detail}</div>
          ) : null}
          <div className={classes.actionBubbleTime}>
            {format(parseISO(log.createdAt), "HH:mm")}
          </div>
        </div>
      </div>
    );
  };

  const getCombinedList = () => {
    const combined = [];
    
    messagesList.forEach(msg => {
      combined.push({
        type: "message",
        data: msg,
        createdAt: msg.createdAt
      });
    });
    
    logsList.forEach(log => {
      if (
        [
          "transfered",
          "receivedTransfer",
          "lead_created",
          "activity_created",
          "agendamento_criado",
          "consultar_agenda",
          "consultar_produtos",
          "passar_preco",
          "enviar_link",
          "open",
          "reopen"
        ].includes(log.type)
      ) {
        combined.push({
          type: "log",
          data: log,
          createdAt: log.createdAt
        });
      }
    });
    
    combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    
    return combined;
  };

  const renderMessages = () => {

    if (messagesList.length > 0 || logsList.length > 0) {
      const combinedList = getCombinedList();
      const viewMessagesList = combinedList.map((item, index) => {
        if (item.type === "log") {
          const log = item.data;
          return (
            <React.Fragment key={`log-${log.id}`}>
              {renderActionBubble(log, index)}
            </React.Fragment>
          );
        }

        const message = item.data;
        if (message.mediaType === "call_log") {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(item, index, combinedList)}
              {renderTicketsSeparator(item, index, combinedList)}
              {renderMessageDivider(item, index, combinedList)}
              <div className={classes.messageCenter}>
                <IconButton
                  variant="contained"
                  size="small"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className={classes.messageActionsButton}
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                >
                  <ExpandMore />
                </IconButton>
                {isGroup && (
                  <span className={classes.messageContactName}>
                    {message.contact?.name}
                  </span>
                )}

                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 17" width="20" height="17">
                    <path fill="#df3333" d="M18.2 12.1c-1.5-1.8-5-2.7-8.2-2.7s-6.7 1-8.2 2.7c-.7.8-.3 2.3.2 2.8.2.2.3.3.5.3 1.4 0 3.6-.7 3.6-.7.5-.2.8-.5.8-1v-1.3c.7-1.2 5.4-1.2 6.4-.1l.1.1v1.3c0 .2.1.4.2.6.1.2.3.3.5.4 0 0 2.2.7 3.6.7.2 0 1.4-2 .5-3.1zM5.4 3.2l4.7 4.6 5.8-5.7-.9-.8L10.1 6 6.4 2.3h2.5V1H4.1v4.8h1.3V3.2z"></path>
                  </svg> <span>{i18n.t("ticketsList.missedCall")} {format(parseISO(message.createdAt), "HH:mm")}</span>
                </div>
              </div>
            </React.Fragment>
          );
        }

        if (!message.fromMe) {
          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(item, index, combinedList)}
              {renderTicketsSeparator(item, index, combinedList)}
              {renderMessageDivider(item, index, combinedList)}
              <div
                className={classes.messageLeft}
                title={message.queueId && message.queue?.name}
                onDoubleClick={(e) => hanldeReplyMessage(e, message)}
              >
                {showSelectMessageCheckbox && (
                  <SelectMessageCheckbox
                    message={message}
                  />
                )}
                <IconButton
                  variant="contained"
                  size="small"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className={classes.messageActionsButton}
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                >
                  <ExpandMore />
                </IconButton>

                {message.isForwarded && (
                  <div>
                    <span className={classes.forwardMessage}
                    ><Reply style={{ color: "grey", transform: 'scaleX(-1)' }} /> Encaminhada
                    </span>
                    <br />
                  </div>
                )}
                {isGroup && (
                  <span className={classes.messageContactName}>
                    {message.contact?.name}
                  </span>
                )}
                {isYouTubeLink(message.body) && (
                  <>
                    <YouTubePreview videoUrl={message.body} />
                  </>
                )}

                {!lgpdDeleteMessage && message.isDeleted && (
                  <div>
                    <span className={classes.deletedMessage}
                    >🚫 Essa mensagem foi apagada pelo contato &nbsp;
                    </span>
                  </div>
                )}

                {(message.mediaUrl || message.mediaType === "locationMessage" || message.mediaType === "contactMessage" || message.mediaType === "template" || message.mediaType === "interactive" || message.mediaType === "interative" || message.mediaType === "listMessage" || message.mediaType === "adMetaPreview" || isInteractiveMetaMessage(message)
                ) && checkMessageMedia(message)}

                <div className={clsx(classes.textContentItem, {
                  [classes.textContentItemDeleted]: message.isDeleted,
                })}>
                  {message.quotedMsg && renderQuotedMessage(message)}
                  {
                    message.mediaType !== "adMetaPreview" && (
                      (message.mediaUrl !== null && (message.mediaType === "image" || message.mediaType === "video") && getBasename(message.mediaUrl).trim() !== message.body.trim()) ||
                      message.mediaType !== "audio" &&
                      message.mediaType !== "image" &&
                      message.mediaType !== "video" &&
                      message.mediaType != "reactionMessage" &&
                      message.mediaType != "locationMessage" &&
                      message.mediaType !== "contactMessage" &&
                      message.mediaType !== "template" &&
                      message.mediaType !== "interactive" &&
                      message.mediaType !== "interative" &&
                      message.mediaType !== "listMessage" &&
                      !isInteractiveMetaMessage(message)
                    ) && (
                      <>
                        {xmlRegex.test(message.body) && (
                          <span>{message.body}</span>

                        )}
                        {!xmlRegex.test(message.body) && (
                          <MarkdownWrapper>{(lgpdDeleteMessage && message.isDeleted) ? "🚫 _Mensagem apagada_ " :
                            message.body
                          }</MarkdownWrapper>)}

                      </>

                    )}

                  {message.quotedMsg && message.mediaType === "reactionMessage" && (
                    <>
                      <span style={{ marginLeft: "0px" }}>
                        <MarkdownWrapper>
                          {"" + message?.contact?.name + " reagiu... " + message.body}
                        </MarkdownWrapper>
                      </span>
                    </>
                  )}

                  <span className={classes.timestamp}>
                    {message.isEdited ? "Editada " + format(parseISO(message.createdAt), "HH:mm") : format(parseISO(message.createdAt), "HH:mm")}
                  </span>
                </div>
              </div>
            </React.Fragment>
          );
        } else {
          const outAgent = isOutgoingAgentBubble(message);
          const bubbleClass = outAgent ? classes.messageRightAgent : classes.messageRightHuman;
          const bubble = (
              <div
                className={bubbleClass}
                title={message.queueId && message.queue?.name}
                onDoubleClick={(e) => hanldeReplyMessage(e, message)}
              >
                {showSelectMessageCheckbox && (
                  <SelectMessageCheckbox
                    message={message}
                  />
                )}

                <IconButton
                  variant="contained"
                  size="small"
                  id="messageActionsButton"
                  disabled={message.isDeleted}
                  className={classes.messageActionsButton}
                  onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
                >
                  <ExpandMore />
                </IconButton>
                {message.isForwarded && (
                  <div>
                    <span className={classes.forwardMessage}
                    ><Reply style={{ color: "grey", transform: 'scaleX(-1)' }} /> Encaminhada
                    </span>
                    <br />
                  </div>
                )}
                {isYouTubeLink(message.body) && (
                  <>
                    <YouTubePreview videoUrl={message.body} />
                  </>
                )}
                {!lgpdDeleteMessage && message.isDeleted && (
                  <div>
                    <span className={classes.deletedMessage}
                    >🚫 Essa mensagem foi apagada &nbsp;
                    </span>
                  </div>
                )}
                {(message.mediaUrl || message.mediaType === "locationMessage" || message.mediaType === "contactMessage" || message.mediaType === "template" || message.mediaType === "interactive" || message.mediaType === "interative" || message.mediaType === "listMessage" || isInteractiveMetaMessage(message)
                ) && checkMessageMedia(message)}
                <div
                  className={clsx(classes.textContentItem, {
                    [classes.textContentItemDeleted]: message.isDeleted,
                  })}
                >

                  {message.quotedMsg && renderQuotedMessage(message)}

                  {
                    ((message.mediaType === "image" || message.mediaType === "video") && getBasename(message.mediaUrl) === message.body) ||
                    (message.mediaType !== "audio" && message.mediaType != "reactionMessage" && message.mediaType != "locationMessage" && message.mediaType !== "contactMessage" && message.mediaType !== "template" && message.mediaType !== "interactive" && message.mediaType !== "interative" && message.mediaType !== "listMessage" && !isInteractiveMetaMessage(message)) && (
                      <>
                        {xmlRegex.test(message.body) && (
                          <div>{formatXml(message.body)}</div>

                        )}
                        {!xmlRegex.test(message.body) && (<MarkdownWrapper>{message.body}</MarkdownWrapper>)}

                      </>
                    )}

                  {message.quotedMsg && message.mediaType === "reactionMessage" && (
                    <>
                      <span style={{ marginLeft: "0px" }}>
                        <MarkdownWrapper>
                          {"Você reagiu... " + message.body}
                        </MarkdownWrapper>
                      </span>
                    </>
                  )}

                  <span className={classes.timestamp}>
                    {message.isEdited ? "Editada " + format(parseISO(message.createdAt), "HH:mm") : format(parseISO(message.createdAt), "HH:mm")}
                    {renderMessageAck(message)}
                  </span>
                </div>
              </div>
          );

          return (
            <React.Fragment key={message.id}>
              {renderDailyTimestamps(item, index, combinedList)}
              {renderTicketsSeparator(item, index, combinedList)}
              {renderMessageDivider(item, index, combinedList)}
              {outAgent ? (
                <div className={classes.aiBubbleMagicWrap}>
                  <div
                    className={classes.aiAgentTopLabel}
                    title="Agente de IA"
                    aria-label="Mensagem do agente de IA"
                  >
                    <SiOpenai size={13} style={{ color: "#ffffff" }} />
                    <span>Agente de IA</span>
                  </div>
                  {bubble}
                </div>
              ) : (
                bubble
              )}
            </React.Fragment>
          );
        }
      });
      return viewMessagesList;
    } else {
      return <div>Diga olá para seu novo contato!</div>;
    }
  };
const shouldBlurMessages = ticketStatus === "pending" && user.allowSeeMessagesInPendingTickets === "disabled";

  return (
    <div
      className={clsx(classes.messagesListWrapper, fillParent && classes.messagesListWrapperFill)}
      onDragEnter={handleDrag}
    >
      {dragActive && <div className={classes.dragElement} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>Solte o arquivo aqui</div>}
      <MessageOptionsMenu
        message={selectedMessage}
        anchorEl={anchorEl}
        menuOpen={messageOptionsMenuOpen}
        handleClose={handleCloseMessageOptionsMenu}
        isGroup={isGroup}
        whatsappId={whatsappId}
        queueId={queueId}
      />
      

<div
  id="messagesList"
  className={clsx(
    classes.messagesList,
    fillParent && classes.messagesListFill,
    fillParent && classes.messagesListPaddingCompact
  )}
  onScroll={handleScroll}
  style={{
    filter: shouldBlurMessages ? "blur(4px)" : "none",
    pointerEvents: shouldBlurMessages ? "none" : "auto"
  }}
>
  {messagesList.length > 0 ? renderMessages() : []}
</div>

      {(channel !== "whatsapp" &&
        channel !== "whatsapp_oficial" &&
        channel !== "telegram" &&
        channel !== "telegram_oficial" &&
        channel !== "linkedin" &&
        channel !== undefined) && (
        <div
          style={{
            width: "100%",
            display: "flex",
            padding: "10px",
            alignItems: "center",
            backgroundColor:
              channel === "sms"
                ? "#E3F2FD"
                : channel === "telegram" || channel === "telegram_oficial"
                  ? "#E3F7FD"
                  : channel === "linkedin"
                    ? "#E8F4FC"
                    : "#E1F3FB",
          }}
        >
          {channel === "facebook" ? (
            <Facebook />
          ) : channel === "instagram" ? (
            <Instagram />
          ) : channel === "sms" ? (
            <span style={{ marginRight: 8, fontWeight: 600 }}>SMS</span>
          ) : channel === "telegram" || channel === "telegram_oficial" ? (
            <span style={{ marginRight: 8, fontWeight: 600, color: "#0088cc" }}>TG</span>
          ) : channel === "linkedin" ? (
            <span style={{ marginRight: 8, fontWeight: 600, color: "#0A66C2" }}>IN</span>
          ) : (
            <WhatsApp />
          )}

          <span>
            {channel === "sms"
              ? "Atendimento por SMS (Vonage/Twilio). Respostas do contato chegam nesta conversa."
              : channel === "telegram_oficial"
                ? "Atendimento por Telegram (conta real / MTProto). Mensagens da conta logada viram tickets."
                : channel === "telegram"
                  ? "Atendimento por Telegram Bot API. O contato precisa ter iniciado conversa com o bot."
                  : channel === "linkedin"
                    ? "Atendimento por LinkedIn Messaging API. Novas DMs geram tickets com ícone LinkedIn; o agente de IA pode responder nesta conversa."
                    : "Você tem 24h para responder após receber uma mensagem, de acordo com as políticas da Meta."}
          </span>
        </div>
      )}
      
      {loading && (
        <div>
          <CircularProgress className={classes.circleLoading} />
        </div>
      )}
    </div>
  );
};

export default MessagesList;
