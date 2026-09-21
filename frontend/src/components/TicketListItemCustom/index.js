/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import { green, grey } from "@material-ui/core/colors";
import { i18n } from "../../translate/i18n";
import { shouldShowAiAgentPreview } from "../../utils/ticketAiAgentPreview";

import api from "../../services/api";
import { contactProfileNumber } from "../../utils/contactProfileNumber";
import MarkdownWrapper from "../MarkdownWrapper";
import { List, Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import { v4 as uuidv4 } from "uuid";
import { buildAcceptTicketPayload } from "../../utils/acceptTicketPayload";
import { getBackendUrl } from "../../config";

import GroupIcon from "@material-ui/icons/Group";
import ContactTag from "../ContactTag";
import NotionTag from "../ui/NotionTag";
import ConnectionIcon from "../ConnectionIcon";
import AcceptTicketWithouSelectQueue from "../AcceptTicketWithoutQueueModal";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import ShowTicketOpen from "../ShowTicketOpenModal";
import FinalizacaoVendaModal from "../FinalizacaoVendaModal";
import { isNil } from "lodash";
import { toast } from "react-toastify";
import { Add } from "@material-ui/icons";
import CheckRounded from "@mui/icons-material/CheckRounded";
import ArrowOutwardRounded from "@mui/icons-material/ArrowOutwardRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import VisibilityIcon from "@material-ui/icons/Visibility"; // Ícone de spy
import useCompanySettings from "../../hooks/useSettings/companySettings";
import NewTicketModal from "../NewTicketModal";
import { SiOpenai } from "react-icons/si";
import { renderAcceptedTicketGreeting } from "../../utils/variableUtils";
import {
  Avatar,
  Badge,
  Box,
  IconButton,
  ListItemAvatar,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Typography,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  DialogContent,
  Divider,
} from "@material-ui/core";

import {
  HELVETICA_NEUE,
  getTopbarMain,
  getTopbarContrast,
  getTopbarHover,
} from "../../utils/appleModalTheme";

const useStyles = makeStyles((theme) => {
  const topbar = getTopbarMain(theme);
  const topbarHover = getTopbarHover(theme);
  const topbarContrast = getTopbarContrast(theme);
  const isDark = theme.palette.type === "dark";

  return {
  ticket: {
    position: "relative",
    backgroundColor: "transparent",
    borderBottom: theme.palette.type === "dark" ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 4,
    paddingRight: 72,
    width: "100%",
    boxSizing: "border-box",
    alignItems: "flex-start",
    transition: "background-color 0.12s ease",
    "&:hover": {
      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    },
    "&.Mui-focusVisible": {
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    },
    "&.Mui-selected": {
      backgroundColor: isDark
        ? "rgba(255,255,255,0.08) !important"
        : "rgba(0,0,0,0.05) !important",
      boxShadow: "none",
    },
    "&.Mui-selected:hover": {
      backgroundColor: isDark
        ? "rgba(255,255,255,0.08) !important"
        : "rgba(0,0,0,0.05) !important",
    },
    [theme.breakpoints.down("xs")]: {
      paddingRight: 64,
    },
  },
  ticketNameRow: {
    display: "flex",
    alignItems: "flex-start",
    width: "100%",
    minWidth: 0,
  },
  ticketNameLead: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    flex: "1 1 auto",
    flexWrap: "wrap",
    overflow: "visible",
  },
  ticketNameTextWrap: {
    minWidth: 0,
    flex: "1 1 auto",
  },
  channelIconWrap: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 0,
    overflow: "visible",
  },
  ticketNameText: {
    flex: "1 1 0",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: isDark ? theme.palette.text.primary : "rgba(0, 0, 0, 0.87)",
  },
  ticketPreviewBlock: {
    width: "100%",
    minWidth: 0,
    marginTop: 2,
    paddingRight: 2,
    boxSizing: "border-box",
  },
  ticketMessageRow: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    width: "100%",
    minWidth: 0,
    minHeight: 15,
  },
  ticketMessageText: {
    flex: "1 1 auto",
    minWidth: 0,
    lineHeight: 1.35,
  },
  ticketTagRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 3,
    rowGap: 2,
    marginTop: 2,
    width: "100%",
    minWidth: 0,
    overflow: "visible",
  },

  pendingTicket: {
    cursor: "unset",
  },
  noTicketsDiv: {
    display: "flex",
    height: "100px",
    margin: 40,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  newMessagesCount: {
    justifySelf: "flex-end",
    textAlign: "right",
    position: "relative",
    top: 0,
    color: "green",
    fontWeight: "bold",
    marginRight: "4px",
    borderRadius: 0,
  },
  unreadWithIcon: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    verticalAlign: "middle",
  },
  unreadWithIconCompact: {
    gap: 3,
  },
  noTicketsText: {
    textAlign: "center",
    color: "rgb(104, 121, 146)",
    fontSize: "14px",
    lineHeight: "1.4",
  },
  noTicketsTitle: {
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0px",
  },

  contactNameWrapper: {
    display: "flex",
    justifyContent: "space-between",
    marginLeft: "2px",
    fontWeight: 500,
    color: isDark ? theme.palette.text.primary : "rgba(0, 0, 0, 0.87)",
  },

  lastMessageTime: {
    textAlign: "right",
    color: isDark ? grey[400] : grey[600],
    fontSize: 10,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },

  lastMessageTimeUnread: {
    textAlign: "right",
    color: green[700],
    fontWeight: 500,
    fontSize: 10,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
  },

  closedBadge: {
    alignSelf: "center",
    justifySelf: "flex-end",
    marginRight: 32,
    marginLeft: "auto",
  },

  contactLastMessage: {
    margin: 0,
    color: isDark ? theme.palette.text.secondary : "rgba(0,0,0,0.65)",
    fontSize: 11,
  },

  contactLastMessageUnread: {
    margin: 0,
    fontWeight: 500,
    color: isDark ? theme.palette.text.primary : "rgba(0,0,0,0.82)",
    fontSize: 11,
  },

  badgeStyle: {
    color: "white",
    backgroundColor: green[500],
  },

  agentPreview: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 6px",
    border: "1px solid #0cb7f2",
    borderRadius: 8,
    backgroundColor: "rgba(12,183,242,0.06)",
    marginRight: 6
  },
  agentPreviewBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    color: "#0cb7f2",
    fontWeight: 600,
    fontSize: "0.72rem"
  },
  agentPreviewText: {
    color: "inherit"
  },

  ticketSidebarColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 2,
    minWidth: 96,
    maxWidth: 120,
    flexShrink: 0,
    paddingTop: 0,
  },
  ticketIconRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "nowrap",
    gap: 2,
    width: "auto",
    maxWidth: "none",
    flexShrink: 0,
  },
  ticketQuickIcon: {
    padding: 4,
    borderRadius: 10,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.045)",
    transition: "background-color 0.15s ease, transform 0.12s ease",
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
    },
    "&:active": {
      transform: "scale(0.96)",
    },
  },
  ticketQuickIconSuccess: {
    color: theme.palette.type === "dark" ? "#8bc99a" : "#1d7a3c",
  },
  ticketQuickIconTransfer: {
    color: theme.palette.type === "dark" ? "#a8b0ff" : "#5c6bc0",
  },
  ticketQuickIconDanger: {
    color: theme.palette.type === "dark" ? "#f28b82" : "#c62828",
  },
  ticketQuickIconNeutral: {
    color: theme.palette.type === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)",
  },

  ticketQueueColor: {
    flex: "none",
    height: "100%",
    position: "absolute",
    top: "0%",
    left: "0%",
  },

  ticketInfo: {
    position: "relative",
    top: -8,
  },
  ticketInfo1: {
    position: "relative",
    top: 8,
    right: 0,
  },
  Radiusdot: {
    "& .MuiBadge-badge": {
      borderRadius: 2,
      position: "inherit",
      height: 16,
      margin: 2,
      padding: 3,
    },
    "& .MuiBadge-anchorOriginTopRightRectangle": {
      transform: "scale(1) translate(0%, -40%)",
    },
  },
  connectionIcon: {},

  // Estilos para o modal da imagem
  imageModal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  imageModalContent: {
    outline: "none",
    maxWidth: "90vw",
    maxHeight: "90vh",
  },
  expandedImage: {
    width: "100%",
    height: "auto",
    maxWidth: "500px",
    borderRadius: theme.spacing(1),
  },
  finalizeDialogPaper: {
    borderRadius: 20,
    maxWidth: 320,
    width: "calc(100% - 32px)",
    margin: 16,
    overflow: "hidden",
    fontFamily: HELVETICA_NEUE,
    fontWeight: 400,
    backgroundColor: isDark
      ? "rgba(44,44,46,0.88)"
      : "rgba(255,255,255,0.92)",
    backdropFilter: "saturate(200%) blur(28px)",
    WebkitBackdropFilter: "saturate(200%) blur(28px)",
    boxShadow: isDark
      ? "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)"
      : "0 24px 64px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.95)",
    border: isDark
      ? "0.5px solid rgba(255,255,255,0.12)"
      : "0.5px solid rgba(255,255,255,0.8)",
  },
  finalizeDialogTitle: {
    textAlign: "center",
    padding: theme.spacing(2.25, 2, 0.25),
    fontFamily: HELVETICA_NEUE,
    fontSize: 15,
    fontWeight: 400,
    letterSpacing: "-0.03em",
    lineHeight: 1.35,
    color: theme.palette.text.primary,
  },
  finalizeDialogActions: {
    display: "flex",
    flexDirection: "row",
    gap: theme.spacing(0.75),
    padding: theme.spacing(1.25, 1.5, 1.75),
    justifyContent: "stretch",
    borderTop: isDark
      ? "0.5px solid rgba(255,255,255,0.08)"
      : "0.5px solid rgba(60,60,67,0.1)",
    "& > button": {
      flex: 1,
      margin: 0,
      minWidth: 0,
      textTransform: "none",
      borderRadius: 12,
      fontFamily: HELVETICA_NEUE,
      fontSize: 13,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      padding: "8px 12px",
      minHeight: 36,
      boxShadow: "none",
    },
    "& > button:first-child": {
      color: theme.palette.text.primary,
      backgroundColor: isDark
        ? "rgba(120,120,128,0.28)"
        : "rgba(120,120,128,0.16)",
      border: "none",
      "&:hover": {
        backgroundColor: isDark
          ? "rgba(120,120,128,0.36)"
          : "rgba(120,120,128,0.22)",
      },
    },
    "& > button.MuiButton-contained": {
      backgroundColor: topbar,
      color: topbarContrast,
      "&:hover": {
        backgroundColor: topbarHover,
      },
    },
  },
  clickableAvatar: {
    cursor: "pointer",
    "&:hover": {
      opacity: 0.8,
    },
  },
  avatarWrap: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarConnBadge: {
    position: "absolute",
    right: -3,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: theme.palette.type === "dark" ? theme.palette.background.paper : "#fff",
    boxShadow:
      theme.palette.type === "dark"
        ? "0 1px 3px rgba(0,0,0,0.45)"
        : "0 1px 2px rgba(15,23,42,0.22)",
    zIndex: 2,
    "& svg": {
      width: 12,
      height: 12
    }
  },

  ticketCompact: {
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 2,
    paddingRight: 50,
    [theme.breakpoints.down("xs")]: {
      paddingRight: 46,
    },
  },
  ticketSidebarColumnCompact: {
    minWidth: 68,
    maxWidth: 76,
    gap: 1,
  },
  ticketQuickIconCompact: {
    padding: 2,
    borderRadius: 8,
  },
  ticketIconRowCompact: {
    gap: 1,
  },
  avatarConnBadgeCompact: {
    width: 11,
    height: 11,
    right: -2,
    bottom: -1,
    "& svg": {
      width: 9,
      height: 9,
    },
  },
  lastMessageTimeCompact: {
    fontSize: 9,
  },
  contactLastMessageCompact: {
    fontSize: 9,
  },
  contactLastMessageUnreadCompact: {
    fontSize: 9,
  },
  newMessagesCountCompact: {
    "& .MuiBadge-badge": {
      minWidth: 14,
      height: 14,
      fontSize: 9,
      padding: "0 3px",
    },
  },
  };
});

const TicketListItemCustom = ({ setTabOpen, ticket, compact = false }) => {
  const classes = useStyles();
  const quickIconSize = compact ? 13 : 17;
  const quickIconSizeSm = compact ? 12 : 16;
  const avatarSize = compact ? 26 : 34;
  const channelIconSize = compact ? 8 : 10;
  const theme = useTheme();
  const history = useHistory();
  const backendUrl = getBackendUrl();
  const [avatarSrc, setAvatarSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [
    acceptTicketWithouSelectQueueOpen,
    setAcceptTicketWithouSelectQueueOpen,
  ] = useState(false);
  const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);

  const [openAlert, setOpenAlert] = useState(false);
  const [userTicketOpen, setUserTicketOpen] = useState("");
  const [queueTicketOpen, setQueueTicketOpen] = useState("");

  // Estados para o modal de finalização de venda
  const [openFinalizacaoVenda, setOpenFinalizacaoVenda] = useState(false);
  const [finalizacaoTipo, setFinalizacaoTipo] = useState(null);
  const [ticketDataToFinalize, setTicketDataToFinalize] = useState(null);
  const [showFinalizacaoOptions, setShowFinalizacaoOptions] = useState(false);

  const [imageModalOpen, setImageModalOpen] = useState(false); // Estado para o modal da imagem

  const { ticketId } = useParams();
  const isMounted = useRef(true);
  const { setCurrentTicket } = useContext(TicketsContext);
  const { user } = useContext(AuthContext);

  const { get: getSetting } = useCompanySettings();

  const isLastMessageIncoming = ticket?.fromMe === false;
  const showAiPreview = shouldShowAiAgentPreview(ticket);
  const finalizacaoComValorVendaAtiva =
    user?.finalizacaoComValorVendaAtiva === true ||
    user?.finalizacaoComValorVendaAtiva === "true";
  const shouldUseFinalizacaoComValorVenda = finalizacaoComValorVendaAtiva;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Função para abrir modal da imagem
  const handleImageClick = (e) => {
    e.stopPropagation(); // Prevenir que o clique no avatar selecione o ticket
    if (ticket?.contact?.urlPicture || ticket?.contact?.profilePicUrl) {
      setImageModalOpen(true);
    }
  };

  // Função para fechar modal da imagem
  const handleImageModalClose = () => {
    setImageModalOpen(false);
  };

  const handleOpenAcceptTicketWithouSelectQueue = useCallback(() => {
    setAcceptTicketWithouSelectQueueOpen(true);
  }, []);

  const handleCloseTicket = async (id) => {
    // Verificar se a finalização com valor de venda está ativa
    if (shouldUseFinalizacaoComValorVenda) {
      // Se estiver ativa, abrir o modal de finalização de venda
      setFinalizacaoTipo("comDespedida");
      setOpenFinalizacaoVenda(true);
      handleSelectTicket(ticket);
      history.push(`/tickets/${ticket.uuid}`);
    } else {
      // Comportamento original
      const setting = await getSetting({
        column: "requiredTag",
      });

      const closePayload = {
        status: "closed",
        userId: user?.id || null,
        sendFarewellMessage: false,
        amountUsedBotQueues: 0,
      };

      if (setting.requiredTag === "enabled") {
        //verificar se tem uma tag
        try {
          const contactTags = await api.get(
            `/contactTags/${ticket.contact.id}`
          );
          if (!contactTags.data.tags) {
            toast.warning(i18n.t("messagesList.header.buttons.requiredTag"));
          } else {
            const { data } = await api.put(`/tickets/${id}`, closePayload);

            if (isMounted.current) {
              setLoading(false);
            }

            if (data?.status === "closed") {
              setTabOpen("closed");
            }
            setCurrentTicket({ id: null, code: null });
            history.push(`/tickets/`);
          }
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      } else {
        setLoading(true);
        try {
          const { data } = await api.put(`/tickets/${id}`, closePayload);
          if (data?.status === "closed") {
            setTabOpen("closed");
          }
          setCurrentTicket({ id: null, code: null });
        } catch (err) {
          toastError(err);
        }
        if (isMounted.current) {
          setLoading(false);
        }

        history.push(`/tickets/`);
      }
    }
  };

  const handleCloseIgnoreTicket = async (id) => {
    setLoading(true);
    try {
      const { data } = await api.put(`/tickets/${id}`, {
        status: "closed",
        userId: user?.id || null,
        sendFarewellMessage: false,
        amountUsedBotQueues: 0,
      });
      if (data?.status === "closed") {
        setTabOpen("closed");
      }
      setCurrentTicket({ id: null, code: null });
    } catch (err) {
      toastError(err);
    }
    if (isMounted.current) {
      setLoading(false);
    }

    history.push(`/tickets/`);
  };

  const truncate = (str, len) => {
    if (!isNil(str)) {
      if (str.length > len) {
        return str.substring(0, len) + "...";
      }
      return str;
    }
  };

  const handleCloseTransferTicketModal = useCallback(() => {
    if (isMounted.current) {
      setTransferTicketModalOpen(false);
    }
  }, []);

  const handleOpenTransferModal = () => {
    setLoading(true);
    setTransferTicketModalOpen(true);
    if (isMounted.current) {
      setLoading(false);
    }
    handleSelectTicket(ticket);
    history.push(`/tickets/${ticket.uuid}`);
  };

  const handleOpenNewTicketModal = () => {
    setNewTicketModalOpen(true);
  };

  const handleCloseNewTicketModal = (newTicket) => {
    setNewTicketModalOpen(false);
    if (newTicket) {
      // Se um novo ticket foi criado, redirecionar para ele
      handleSelectTicket(newTicket);
      history.push(`/tickets/${newTicket.uuid}`);
    }
  };

  const handleAcepptTicket = async (id) => {
    setLoading(true);
    try {
      const payload =
        ticket.status === "pending"
          ? buildAcceptTicketPayload(ticket, user?.id)
          : {
              userId: user?.id,
              isBot: false,
              useIntegration: false,
              integrationId: null,
              status: ticket.status,
            };
      const otherTicket = await api.put(`/tickets/${id}`, payload);

      if (otherTicket.data.id !== ticket.id) {
        if (otherTicket.data.userId !== user?.id) {
          setOpenAlert(true);
          setUserTicketOpen(otherTicket.data.user.name);
          setQueueTicketOpen(otherTicket.data.queue.name);
        } else {
          setLoading(false);
          setTabOpen(ticket.isGroup ? "group" : "open");
          handleSelectTicket(otherTicket.data);
          history.push(`/tickets/${otherTicket.data.uuid}`);
        }
      } else {
        let setting;

        try {
          setting = await getSetting({
            column: "sendGreetingAccepted",
          });
        } catch (err) {
          toastError(err);
        }

        if (
          setting.sendGreetingAccepted === "enabled" &&
          (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")
        ) {
          handleSendMessage(ticket.id);
        }
        if (isMounted.current) {
          setLoading(false);
        }

        setTabOpen(ticket.isGroup ? "group" : "open");
        handleSelectTicket(ticket);
        history.push(`/tickets/${ticket.uuid}`);
      }
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };

  const handleSendMessage = async (id) => {
    let setting;

    try {
      setting = await getSetting({
        column: "greetingAcceptedMessage",
      });
    } catch (err) {
      toastError(err);
    }
    if (!setting.greetingAcceptedMessage) {
      toast.warning(
        i18n.t("messagesList.header.buttons.greetingAcceptedMessage")
      );
      return;
    }
    const msg = renderAcceptedTicketGreeting(
      `${setting.greetingAcceptedMessage}`,
      user
    );
    const message = {
      read: 1,
      fromMe: true,
      mediaUrl: "",
      body: `${msg.trim()}`,
    };
    try {
      await api.post(`/messages/${id}`, message);
    } catch (err) {
      toastError(err);
    }
  };

  const handleCloseAlert = useCallback(() => {
    setOpenAlert(false);
    setLoading(false);
  }, []);

  const handleSelectTicket = (ticket) => {
    const code = uuidv4();
    const { id, uuid } = ticket;
    setCurrentTicket({ id, uuid, code });
  };

  const handleUpdateTicketStatusWithData = async (
    ticketData,
    sendFarewellMessage,
    finalizacaoMessage
  ) => {
    try {
      const { data } = await api.put(`/tickets/${ticket.id}`, {
        ...ticketData,
        sendFarewellMessage,
        finalizacaoMessage,
      });
      if (ticketData?.status === "closed") {
        toast.success(
          sendFarewellMessage
            ? "Ticket finalizado e mensagem de despedida enviada!"
            : "Ticket finalizado sem mensagem de despedida!"
        );
      } else {
        toast.success("Ticket atualizado com sucesso!");
      }
      if (data?.status === "closed") {
        setTabOpen("closed");
        setCurrentTicket({ id: null, code: null });
        history.push(`/tickets/`);
      } else if (ticketData?.status === "closed") {
        setCurrentTicket({ id: null, code: null });
        history.push(`/tickets/`);
      }
    } catch (err) {
      toastError(err);
    }
  };

  // Função para espionar ticket chatbot
  const handleSpyTicket = () => {
    handleSelectTicket(ticket);
    history.push(`/tickets/${ticket.uuid}`);
  };

  // Lógica de permissão para mensagens pending - MOVIDA PARA DEPOIS DE TODAS AS FUNÇÕES
  const shouldBlurMessages = ticket.status === "pending" && user?.allowSeeMessagesInPendingTickets === "disabled";

  const wrapAiPreview = (node) => {
    if (!showAiPreview || shouldBlurMessages) return node;
    const unread = Number(ticket.unreadMessages) > 0;
    const style = {
      color:
        theme.palette.type === "dark"
          ? unread
            ? "#38bdf8"
            : "#7dd3fc"
          : unread
          ? "#0369a1"
          : "#0284c7",
      fontWeight: unread ? 600 : 500,
    };
    return <span style={style}>{node}</span>;
  };

  const wrapCustomerPreview = (node) => {
    if (!isLastMessageIncoming || !ticket.lastMessage || shouldBlurMessages) return node;
    const unread = Number(ticket.unreadMessages) > 0;
    const style = {
      color:
        theme.palette.type === "dark"
          ? unread
            ? theme.palette.text.primary
            : theme.palette.text.secondary
          : unread
          ? "rgba(0,0,0,0.88)"
          : "rgba(0,0,0,0.68)",
      fontWeight: unread ? 600 : 500,
    };
    return <span style={style}>{node}</span>;
  };

  const wrapLastMessagePreview = (node) =>
    showAiPreview ? wrapAiPreview(node) : wrapCustomerPreview(node);

  // Função para renderizar a mensagem com base na permissão - MOVIDA PARA DEPOIS DE TODAS AS FUNÇÕES
  const renderLastMessage = () => {
    if (shouldBlurMessages) {
      return (
        <MarkdownWrapper>
          {i18n.t("tickets.messageHidden") || "Mensagem oculta"}
        </MarkdownWrapper>
      );
    }

    if (!ticket.lastMessage) {
      return <br />;
    }

    if (ticket.lastMessage.includes("data:image/png;base64")) {
      return wrapLastMessagePreview(<MarkdownWrapper>Localização</MarkdownWrapper>);
    }

    if (ticket.lastMessage.includes("BEGIN:VCARD")) {
      return wrapLastMessagePreview(<MarkdownWrapper>Contato</MarkdownWrapper>);
    }

    return wrapLastMessagePreview(
      <MarkdownWrapper>{truncate(ticket.lastMessage, 40)}</MarkdownWrapper>
    );
  };

  const resolveImageUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    const u = url.trim();
    if (/^(data:|blob:|https?:\/\/)/i.test(u)) return u;
    if (u.startsWith("/")) return `${backendUrl}${u}`;
    return `${backendUrl}/public/${u}`;
  };

  useEffect(() => {
    const initial = resolveImageUrl(ticket?.contact?.urlPicture || ticket?.contact?.profilePicUrl);
    setAvatarSrc(initial);
    if ((!(ticket?.contact?.urlPicture || ticket?.contact?.profilePicUrl) || ticket?.contact?.urlPicture === "") && ticket?.contact?.number) {
      const num = contactProfileNumber(ticket.channel, ticket.contact.number);
      api.get(`/contacts/profile/${encodeURIComponent(num)}`, {
        params: {
          channel: ticket.channel,
          whatsappId: ticket.whatsappId
        }
      }).then(({ data }) => {
        if (data?.urlPicture || data?.profilePicUrl) {
          const candidate = data?.urlPicture || data?.profilePicUrl;
          setAvatarSrc(resolveImageUrl(candidate));
        }
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket?.contact?.urlPicture, ticket?.contact?.profilePicUrl, ticket?.contact?.number, ticket?.channel]);

  return (
    <React.Fragment key={ticket.id}>
      {openAlert && (
        <ShowTicketOpen
          isOpen={openAlert}
          handleClose={handleCloseAlert}
          user={userTicketOpen}
          queue={queueTicketOpen}
        />
      )}
      {acceptTicketWithouSelectQueueOpen && (
        <AcceptTicketWithouSelectQueue
          modalOpen={acceptTicketWithouSelectQueueOpen}
          onClose={(e) => setAcceptTicketWithouSelectQueueOpen(false)}
          ticketId={ticket.id}
          ticket={ticket}
        />
      )}
      {transferTicketModalOpen && (
        <TransferTicketModalCustom
          modalOpen={transferTicketModalOpen}
          onClose={handleCloseTransferTicketModal}
          ticketid={ticket.id}
          ticket={ticket}
        />
      )}
      {newTicketModalOpen && (
        <NewTicketModal
          modalOpen={newTicketModalOpen}
          onClose={handleCloseNewTicketModal}
          initialContact={ticket.contact}
        />
      )}
      <ListItem
        button
        dense
        onClick={(e) => {
          console.log("e", e);
          const isCheckboxClicked =
            (e.target.tagName.toLowerCase() === "input" &&
              e.target.type === "checkbox") ||
            (e.target.tagName.toLowerCase() === "svg" &&
              e.target.type === undefined) ||
            (e.target.tagName.toLowerCase() === "path" &&
              e.target.type === undefined);

          if (isCheckboxClicked) return;

          handleSelectTicket(ticket);
        }}
        selected={ticketId && ticketId === ticket.uuid}
        className={clsx(classes.ticket, {
          [classes.pendingTicket]: ticket.status === "pending",
          [classes.ticketCompact]: compact,
        })}
      >
        <ListItemAvatar
          style={{
            marginLeft: compact ? 1 : 2,
            minWidth: compact ? 28 : 36,
            marginRight: compact ? 4 : 6,
            marginTop: compact ? 4 : 6,
            display: "flex",
            alignItems: "center",
          }}
        >
          <span className={classes.avatarWrap}>
            <Avatar
              style={{
                width: `${avatarSize}px`,
                height: `${avatarSize}px`,
                borderRadius: "50%",
              }}
              src={avatarSrc || resolveImageUrl(ticket?.contact?.urlPicture || ticket?.contact?.profilePicUrl)}
              className={classes.clickableAvatar}
              onClick={handleImageClick}
              onError={async (e) => {
                e.target.onerror = null;
                try {
                  if (ticket?.contact?.number) {
                    const num = contactProfileNumber(
                      ticket.channel,
                      ticket.contact.number
                    );
                    const resp = await api.get(`/contacts/profile/${encodeURIComponent(num)}`, {
                      params: {
                        channel: ticket.channel,
                        whatsappId: ticket.whatsappId
                      }
                    });
                    const url = resp?.data?.urlPicture || resp?.data?.profilePicUrl;
                    if (url) {
                      const finalUrl = resolveImageUrl(url);
                      setAvatarSrc(finalUrl);
                      e.target.src = finalUrl;
                      return;
                    }
                  }
                } catch (_) {}
                e.target.src = `${backendUrl}/public/app/noimage.png`;
              }}
            />
            {ticket.channel ? (
              <span
                className={clsx(classes.avatarConnBadge, {
                  [classes.avatarConnBadgeCompact]: compact,
                })}
              >
                <ConnectionIcon
                  width={channelIconSize}
                  height={channelIconSize}
                  className={classes.connectionIcon}
                  connectionType={ticket.channel}
                />
              </span>
            ) : null}
          </span>
        </ListItemAvatar>
        <ListItemText
          disableTypography
          primary={
            <Box className={classes.ticketNameRow}>
              <Box className={classes.ticketNameLead}>
                {ticket.isGroup && ticket.channel === "whatsapp" && (
                  <GroupIcon
                    fontSize="small"
                    style={{
                      color: grey[700],
                      flexShrink: 0,
                    }}
                  />
                )}
                <Box className={classes.ticketNameTextWrap}>
                  <Typography
                    noWrap
                    component="span"
                    variant="body2"
                    className={classes.ticketNameText}
                    style={{
                      fontSize: compact ? 10 : 11,
                      fontWeight: 400,
                      fontFamily: HELVETICA_NEUE,
                    }}
                  >
                    {truncate(ticket.contact?.name, 64)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          }
          secondary={
            <Box className={classes.ticketPreviewBlock}>
              <Box className={classes.ticketMessageRow}>
                <Typography
                  className={clsx(
                    classes.ticketMessageText,
                    Number(ticket.unreadMessages) > 0
                      ? clsx(
                          classes.contactLastMessageUnread,
                          compact && classes.contactLastMessageUnreadCompact
                        )
                      : clsx(
                          classes.contactLastMessage,
                          compact && classes.contactLastMessageCompact
                        )
                  )}
                  noWrap
                  component="div"
                  variant="body2"
                >
                  {renderLastMessage()}
                </Typography>
                <span
                  className={clsx(classes.unreadWithIcon, {
                    [classes.unreadWithIconCompact]: compact,
                  })}
                >
                  <Badge
                    className={clsx(classes.newMessagesCount, {
                      [classes.newMessagesCountCompact]: compact,
                    })}
                    badgeContent={shouldBlurMessages ? "?" : ticket.unreadMessages}
                    classes={{
                      badge: classes.badgeStyle,
                    }}
                  />
                </span>
              </Box>
              {!compact ? (
              <Box className={classes.ticketTagRow}>
                {showAiPreview ? (
                  <NotionTag
                    fullLabel
                    neutral
                    accentColor="#0ea5e9"
                    label="Agente de IA"
                    title="Agente de IA"
                    icon={<SiOpenai size={8} style={{ flexShrink: 0 }} />}
                  />
                ) : null}
                {ticket?.whatsapp ? (
                  <NotionTag
                    fullLabel
                    label={ticket.whatsapp?.name}
                    color={
                      ticket.channel === "whatsapp"
                        ? ticket.whatsapp?.color || "#25D366"
                        : ticket.channel === "facebook"
                        ? "#4267B2"
                        : "#E1306C"
                    }
                    title={ticket.whatsapp?.name}
                  />
                ) : null}
                <NotionTag
                  fullLabel
                  label={
                    ticket.queueId
                      ? ticket.queue?.name
                      : ticket.status === "lgpd"
                      ? "LGPD"
                      : i18n.t("momentsUser.noqueue")
                  }
                  color={ticket.queue?.color || "#9ca3af"}
                  title={
                    ticket.queueId
                      ? ticket.queue?.name
                      : ticket.status === "lgpd"
                      ? "LGPD"
                      : i18n.t("momentsUser.noqueue")
                  }
                />
                {ticket?.user ? (
                  <NotionTag
                    fullLabel
                    label={ticket.user?.name}
                    color="#64748b"
                    title={ticket.user?.name}
                  />
                ) : null}
                {ticket?.contact?.tags?.map((tag) => (
                  <ContactTag tag={tag} key={`ticket-contact-tag-${ticket.id}-${tag.id}`} />
                ))}
                {ticket.tags?.map((tag) => (
                  <ContactTag tag={tag} key={`ticket-tag-${ticket.id}-${tag.id}`} />
                ))}
              </Box>
              ) : null}
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <Box
            className={clsx(classes.ticketSidebarColumn, {
              [classes.ticketSidebarColumnCompact]: compact,
            })}
          >
            {ticket.lastMessage && (
              <Typography
                className={clsx(
                  Number(ticket.unreadMessages) > 0
                    ? classes.lastMessageTimeUnread
                    : classes.lastMessageTime,
                  compact && classes.lastMessageTimeCompact
                )}
                component="span"
                variant="caption"
              >
                {isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
                  <>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
                ) : (
                  <>{format(parseISO(ticket.updatedAt), "dd/MM/yyyy")}</>
                )}
              </Typography>
            )}
            <Box
              className={clsx(classes.ticketIconRow, {
                [classes.ticketIconRowCompact]: compact,
              })}
            >
              {ticket.status === "chatbot" && (
                <Tooltip title="Espiar conversa do chatbot">
                  <IconButton
                    size="small"
                    className={clsx(classes.ticketQuickIcon, classes.ticketQuickIconNeutral, {
                      [classes.ticketQuickIconCompact]: compact,
                    })}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpyTicket();
                    }}
                    disabled={loading}
                  >
                    <VisibilityIcon style={{ fontSize: quickIconSize }} />
                  </IconButton>
                </Tooltip>
              )}
              {ticket.status !== "chatbot" && (
                <>
                  {ticket.status === "pending" &&
                    (ticket.queueId === null || ticket.queueId === undefined) && (
                      <Tooltip title={i18n.t("ticketsList.buttons.accept")}>
                        <IconButton
                          size="small"
                          className={clsx(classes.ticketQuickIcon, classes.ticketQuickIconSuccess, {
                            [classes.ticketQuickIconCompact]: compact,
                          })}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAcceptTicketWithouSelectQueue();
                          }}
                          disabled={loading}
                        >
                          <CheckRounded style={{ fontSize: quickIconSize }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  {ticket.status === "pending" && ticket.queueId !== null && (
                    <Tooltip title="Assumir Humano">
                      <IconButton
                        size="small"
                        className={clsx(classes.ticketQuickIcon, classes.ticketQuickIconSuccess, {
                          [classes.ticketQuickIconCompact]: compact,
                        })}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcepptTicket(ticket.id);
                        }}
                        disabled={loading}
                      >
                        <CheckRounded style={{ fontSize: quickIconSize }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {ticket.status === "open" && ticket.isBot === true && (
                    <Tooltip title="Assumir Humano">
                      <IconButton
                        size="small"
                        className={clsx(classes.ticketQuickIcon, classes.ticketQuickIconSuccess, {
                          [classes.ticketQuickIconCompact]: compact,
                        })}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcepptTicket(ticket.id);
                        }}
                        disabled={loading}
                      >
                        <CheckRounded style={{ fontSize: quickIconSize }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {(ticket.status === "pending" ||
                    ticket.status === "open" ||
                    ticket.status === "group") && (
                    <Tooltip title={i18n.t("ticketsList.buttons.transfer")}>
                      <IconButton
                        size="small"
                        className={clsx(classes.ticketQuickIcon, classes.ticketQuickIconTransfer, {
                          [classes.ticketQuickIconCompact]: compact,
                        })}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTransferModal();
                        }}
                        disabled={loading}
                      >
                        <ArrowOutwardRounded style={{ fontSize: quickIconSize }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {(ticket.status === "open" ||
                    ticket.status === "group" ||
                    (ticket.status === "pending" && ticket.isBot === true)) && (
                    <Tooltip title={i18n.t("ticketsList.buttons.closed")}>
                      <IconButton
                        size="small"
                        className={clsx(classes.ticketQuickIcon, classes.ticketQuickIconDanger, {
                          [classes.ticketQuickIconCompact]: compact,
                        })}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTicket(ticket.id);
                        }}
                        disabled={loading}
                      >
                        <CloseRounded style={{ fontSize: quickIconSize }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {(ticket.status === "pending" || ticket.status === "lgpd") &&
                    (user.userClosePendingTicket === "enabled" || user.profile === "admin") &&
                    !(ticket.status === "pending" && ticket.isBot === true) && (
                      <Tooltip title={i18n.t("ticketsList.buttons.ignore")}>
                        <IconButton
                          size="small"
                          className={clsx(classes.ticketQuickIcon, classes.ticketQuickIconDanger, {
                          [classes.ticketQuickIconCompact]: compact,
                        })}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseIgnoreTicket(ticket.id);
                          }}
                          disabled={loading}
                        >
                          <CloseRounded style={{ fontSize: quickIconSizeSm }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  {ticket.status === "closed" && (
                    <Tooltip title="Criar Novo Ticket">
                      <IconButton
                        size="small"
                        className={clsx(classes.ticketQuickIcon, classes.ticketQuickIconSuccess, {
                          [classes.ticketQuickIconCompact]: compact,
                        })}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNewTicketModal();
                        }}
                        disabled={loading}
                      >
                        <Add style={{ fontSize: quickIconSize }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              )}
            </Box>
          </Box>
        </ListItemSecondaryAction>
      </ListItem>
      {!compact ? (
      <Divider
        variant="fullWidth"
        style={{
          marginTop: 0,
          marginBottom: 0,
          marginLeft: 0,
          width: "100%",
          height: 1,
          backgroundColor:
            theme.palette.type === "dark"
              ? "rgba(255,255,255,0.04)"
              : "rgba(60,60,67,0.06)",
        }}
      />
      ) : null}

      {/* Modal de Finalização de Venda */}
      {openFinalizacaoVenda && (
        <FinalizacaoVendaModal
          open={openFinalizacaoVenda}
          onClose={() => setOpenFinalizacaoVenda(false)}
          ticket={ticket}
          onFinalizar={(ticketData) => {
            setOpenFinalizacaoVenda(false);
            setTicketDataToFinalize(ticketData);
            setShowFinalizacaoOptions(true);
          }}
        />
      )}

      {/* Modal de Opções de Finalização */}
      {showFinalizacaoOptions && (
        <Dialog
          open={showFinalizacaoOptions}
          onClose={() => setShowFinalizacaoOptions(false)}
          aria-labelledby="finalizacao-options-title"
          PaperProps={{ className: classes.finalizeDialogPaper }}
        >
          <DialogTitle
            id="finalizacao-options-title"
            className={classes.finalizeDialogTitle}
            disableTypography
          >
            Como deseja finalizar?
          </DialogTitle>
          <DialogActions className={classes.finalizeDialogActions}>
            <Button
              size="small"
              variant="outlined"
              onClick={async () => {
                setShowFinalizacaoOptions(false);
                await handleUpdateTicketStatusWithData(
                  ticketDataToFinalize,
                  false,
                  null
                );
              }}
            >
              {i18n.t("messagesList.header.dialogRatingWithoutFarewellMsg")}
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              disableElevation
              onClick={async () => {
                setShowFinalizacaoOptions(false);
                await handleUpdateTicketStatusWithData(
                  ticketDataToFinalize,
                  true,
                  null
                );
              }}
            >
              {i18n.t("messagesList.header.dialogRatingCancel")}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Modal da Imagem */}
      <Dialog
        open={imageModalOpen}
        onClose={handleImageModalClose}
        className={classes.imageModal}
        maxWidth="md"
        fullWidth
      >
        <DialogContent className={classes.imageModalContent}>
          <img 
            src={ticket?.contact?.urlPicture} 
            alt={ticket?.contact?.name || "Foto do contato"}
            className={classes.expandedImage}
          />
        </DialogContent>
      </Dialog>
    </React.Fragment>
  );
};

export default TicketListItemCustom;
