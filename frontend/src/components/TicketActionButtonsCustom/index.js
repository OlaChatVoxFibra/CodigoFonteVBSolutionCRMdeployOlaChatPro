/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useState, useEffect, useRef, useCallback } from "react";
import { useHistory } from "react-router-dom";

import { Can } from "../Can";
import { makeStyles } from "@material-ui/core/styles";
import { IconButton, Menu, CircularProgress, ListItemIcon, Divider } from "@material-ui/core";
import {
  DeviceHubOutlined,
  History,
  PictureAsPdf,
  FileCopy as FileCopyIcon,
  Add,
} from "@material-ui/icons";
import BoltOutlined from "@mui/icons-material/BoltOutlined";
import TaskAltOutlined from "@mui/icons-material/TaskAltOutlined";
import UndoOutlined from "@mui/icons-material/UndoOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import MoreVertRounded from "@mui/icons-material/MoreVertRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import { v4 as uuidv4 } from "uuid";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
// import TicketOptionsMenu from "../TicketOptionsMenu";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import Tooltip from "@material-ui/core/Tooltip";
import ConfirmationModal from "../ConfirmationModal";
import * as Yup from "yup";
import { Formik, Form } from "formik";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";

import Button from "@material-ui/core/Button";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import AcceptTicketWithouSelectQueue from "../AcceptTicketWithoutQueueModal";
import NewTicketModal from "../NewTicketModal";

//icones
import CreateEventDrawer from "../CreateEventDrawer";
import MenuItem from "@material-ui/core/MenuItem";
import ShowTicketOpen from "../ShowTicketOpenModal";
import { toast } from "react-toastify";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import ShowTicketLogModal from "../../components/ShowTicketLogModal";
import TicketMessagesDialog from "../TicketMessagesDialog";
import { useTheme } from "@material-ui/styles";
import html2pdf from "html2pdf.js/dist/html2pdf.min.js";
import FinalizacaoVendaModal from "../FinalizacaoVendaModal";
import QuickMessageModal from "../QuickMessageModal";
import { Phone } from "@material-ui/icons";
import TagModal from "../TagModal";
import CreateLeadSaleModal from "../CreateLeadSaleModal";
import CreateActivityModal from "../CreateActivityModal";
import LeadCompanyModal from "../LeadCompanyModal";
import ContactModal from "../ContactModal";
import convertedLeadsService from "../../services/convertedLeadsService";
import { renderAcceptedTicketGreeting } from "../../utils/variableUtils";
import { buildAcceptTicketPayload } from "../../utils/acceptTicketPayload";
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
  actionButtons: {
    marginRight: 6,
    maxWidth: "100%",
    flex: "0 1 auto",
    alignSelf: "center",
    marginLeft: "auto",
    // flexBasis: "50%",
    display: "flex",
    whiteSpace: "nowrap",
    overflow: "visible",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    "& > *": {
      margin: theme.spacing(0.5),
    },
    "@media (max-width: 600px)": {
      flexWrap: "wrap",
      rowGap: theme.spacing(0.5),
      "& > *": {
        margin: theme.spacing(0.25),
      },
    },
    "& .MuiButton-root": {
      minWidth: "auto",
      padding: "2px 6px",
      fontSize: "0.66rem",
      lineHeight: 1.0,
      maxWidth: 140
    },
    "& .MuiButton-label": {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    },
    "& .MuiIconButton-root": {
      padding: 4,
    },
    "& .MuiSvgIcon-root": {
      fontSize: 18,
    },
    "@media (max-width: 480px)": {
      "& .MuiButton-root": {
        padding: "2px 4px",
        fontSize: "0.6rem",
        maxWidth: 110
      }
    }
  },
  bottomButtonVisibilityIcon: {
    padding: 2,
    color: theme.mode === "light" ? theme.palette.primary.main : "#FFF",
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
  };
});

const SessionSchema = Yup.object().shape({
  ratingId: Yup.string().required("Avaliação obrigatória"),
});

const TicketActionButtonsCustom = ({
  ticket,
  contact,
  onQuickMessageSelect,
  // , showSelectMessageCheckbox,
  // selectedMessages,
  // forwardMessageModalOpen,
  // setForwardMessageModalOpen
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const history = useHistory();
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const { setCurrentTicket, setTabOpen } = useContext(TicketsContext);
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false);
  const [
    acceptTicketWithouSelectQueueOpen,
    setAcceptTicketWithouSelectQueueOpen,
  ] = useState(false);
  const [showTicketLogOpen, setShowTicketLogOpen] = useState(false);
  const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);
  const [disableBot, setDisableBot] = useState(ticket.contact.disableBot);

  const [showSchedules, setShowSchedules] = useState(false);
  const [enableIntegration, setEnableIntegration] = useState(
    ticket.useIntegration
  );

  const [openAlert, setOpenAlert] = useState(false);
  const [userTicketOpen, setUserTicketOpen] = useState("");
  const [queueTicketOpen, setQueueTicketOpen] = useState("");
  const [logTicket, setLogTicket] = useState([]);

  const [showWavoipCall, setShowWavoipCall] = useState(false);

  const { get: getSetting } = useCompanySettings();
  const { getPlanCompany } = usePlans();

  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [showTestButton, setShowTestButton] = useState(false);
  const [exportedToPDF, setExportedToPDF] = useState(false);
  const [linkingWallet, setLinkingWallet] = useState(false);

  const [openFinalizacaoVenda, setOpenFinalizacaoVenda] = useState(false);
  const [ticketDataToFinalize, setTicketDataToFinalize] = useState(null);
  const [showFinalizacaoOptions, setShowFinalizacaoOptions] = useState(false);
  const [finalizacaoTipo, setFinalizacaoTipo] = useState(null); // 'semDespedida' ou 'comDespedida'
  const [directTicketsToWallets, setDirectTicketsToWallets] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createActivityOpen, setCreateActivityOpen] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Estados para copiar telefone e respostas rápidas
  const [quickMessageModalOpen, setQuickMessageModalOpen] = useState(false);

  const finalizacaoComValorVendaAtiva =
    user?.finalizacaoComValorVendaAtiva === true ||
    user?.finalizacaoComValorVendaAtiva === "true";
  const shouldUseFinalizacaoComValorVenda = finalizacaoComValorVendaAtiva;

  useEffect(() => {
    fetchData();
    checkWhatsAppTriggerIntegration();
    fetchDirectTicketsToWalletsSetting();

    // Cleanup function to set isMounted to false when the component unmounts
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = async () => {
    const companyId = user.companyId;
    try {
      const planConfigs = await getPlanCompany(undefined, companyId);
      const plan = planConfigs?.plan;
      if (isMounted.current) {
        setShowSchedules(!!plan?.useSchedules);
        setShowWavoipCall(!!plan?.wavoip);
        setOpenTicketMessageDialog(false);
        setDisableBot(ticket.contact.disableBot);
        setShowTicketLogOpen(false);
      }
    } catch (err) {
      toastError(err);
    }
  };

  const checkWhatsAppTriggerIntegration = async () => {
    try {
      const { data } = await api.get(`/whatsapp/${ticket.whatsappId}`);
      if (isMounted.current) {
        setShowTestButton(data.triggerIntegrationOnClose === true);
      }
    } catch (err) {
      console.error(err);
      if (isMounted.current) {
        setShowTestButton(false);
      }
    }
  };

  const fetchDirectTicketsToWalletsSetting = async () => {
    try {
      const setting = await getSetting({
        column: "DirectTicketsToWallets"
      });
      if (isMounted.current) {
        setDirectTicketsToWallets(setting.DirectTicketsToWallets);
      }
    } catch (err) {
      console.error(err);
      if (isMounted.current) {
        setDirectTicketsToWallets(false);
      }
    }
  };

  // Função para copiar telefone
  const handleCopyPhone = async () => {
    try {
      if (!contact?.number) {
        toast.error(i18n.t("ticketInfo.noPhone"));
        return;
      }

      // Remove todos os caracteres não numéricos e copia o número puro
      const phoneNumber = contact.number.replace(/\D/g, '');

      // Verifica se tem pelo menos 8 dígitos (número mínimo válido)
      if (phoneNumber.length >= 8) {
        await navigator.clipboard.writeText(phoneNumber);
        toast.success(i18n.t("ticketInfo.phonecopied"));
      } else {
        toast.error(i18n.t("ticketInfo.invalidPhoneFormat"));
      }
    } catch (err) {
      console.error('Erro ao copiar telefone:', err);
      toast.error(i18n.t("ticketInfo.copyError"));
    }
  };

  // Funções para respostas rápidas
  const handleOpenQuickMessageModal = () => {
    setQuickMessageModalOpen(true);
  };

  const handleCloseQuickMessageModal = () => {
    setQuickMessageModalOpen(false);
  };

  const handleQuickMessageSelect = useCallback((selectedMessage) => {
    console.log("🎯 Resposta rápida selecionada:", selectedMessage);

    handleCloseQuickMessageModal();

    if (selectedMessage.mediaPath) {
      const event = new CustomEvent('insertQuickMessage', {
        detail: {
          quickMessage: {
            id: selectedMessage.id,
            message: selectedMessage.message || "",
            shortcode: selectedMessage.shortcode || "",
            mediaPath: selectedMessage.mediaPath,
            mediaType: selectedMessage.mediaType,
            value: selectedMessage.message || ""
          }
        },
        bubbles: false
      });

      window.dispatchEvent(event);
    } else {
      // Para texto, também usar evento
      const event = new CustomEvent('insertQuickMessage', {
        detail: {
          quickMessage: {
            id: selectedMessage.id,
            message: selectedMessage.message || "",
            shortcode: selectedMessage.shortcode || "",
            mediaPath: null,
            mediaType: null,
            value: selectedMessage.message || ""
          }
        },
        bubbles: false
      });

      window.dispatchEvent(event);
    }
  }, []);

  const handleClickOpen = async (e) => {
    const setting = await getSetting({
      column: "requiredTag",
    });

    if (setting?.requiredTag === "enabled") {
      //verificar se tem uma tag
      try {
        const contactTags = await api.get(`/contactTags/${ticket.contact.id}`);
        if (!contactTags.data.tags) {
          toast.warning(i18n.t("messagesList.header.buttons.requiredTag"));
        } else {
          setOpen(true);
          // handleUpdateTicketStatus(e, "closed", user?.id);
        }
      } catch (err) {
        toastError(err);
      }
    } else {
      setOpen(true);
      // handleUpdateTicketStatus(e, "closed", user?.id);
    }
  };

  const handleClose = () => {
    formRef.current.resetForm();
    setOpen(false);
  };

  const handleCloseAlert = () => {
    setOpenAlert(false);
    setLoading(false);
  };
  const handleOpenAcceptTicketWithouSelectQueue = async () => {
    setAcceptTicketWithouSelectQueueOpen(true);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuOpen(false);
  };

  const handleOpenTransferModal = (e) => {
    handleCloseMenu();
    setTransferTicketModalOpen(true);
    if (typeof handleClose == "function") handleClose();
  };

  const handleOpenConfirmationModal = (e) => {
    setConfirmationOpen(true);
    if (typeof handleClose == "function") handleClose();
  };

  const handleCloseTicketWithoutFarewellMsg = async () => {
    setLoading(true);
    try {
      const { data } = await api.put(`/tickets/${ticket.id}`, {
        status: "closed",
        userId: user?.id || null,
        sendFarewellMessage: false,
        amountUsedBotQueues: 0,
      });

      setLoading(false);
      if (data?.status === "closed") {
        setTabOpen("closed");
      }
      setCurrentTicket({ id: null, code: null });
      history.push("/tickets");
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };

  const handleExportPDF = async () => {
    setOpenTicketMessageDialog(true);
    handleCloseMenu();
  };

  const handleEnableIntegration = async () => {
    setLoading(true);
    try {
      await api.put(`/tickets/${ticket.id}`, {
        useIntegration: !enableIntegration,
      });
      setEnableIntegration(!enableIntegration);

      setLoading(false);
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };

  const handleShowLogTicket = async () => {
    setShowTicketLogOpen(true);
  };

  const handleContactToggleDisableBot = async () => {
    const { id } = ticket.contact;

    try {
      const { data } = await api.put(`/contacts/toggleDisableBot/${id}`);
      ticket.contact.disableBot = data.disableBot;
      setDisableBot(data.disableBot);
    } catch (err) {
      toastError(err);
    }
  };

  const handleCloseTransferTicketModal = () => {
    setTransferTicketModalOpen(false);
  };

  const handleOpenNewTicketModal = () => {
    setNewTicketModalOpen(true);
  };

  const handleCloseNewTicketModal = (newTicket) => {
    setNewTicketModalOpen(false);
    if (newTicket) {
      // Se um novo ticket foi criado, redirecionar para ele
      setCurrentTicket({ id: newTicket.id, uuid: newTicket.uuid, code: uuidv4() });
      history.push(`/tickets/${newTicket.uuid}`);
    }
  };

  const handleOpenEventDrawer = () => {
    setEventDrawerOpen(true);
    handleCloseMenu();
  };

  const handleCloseEventDrawer = () => {
    setEventDrawerOpen(false);
  };

  const handleSaveCompanyFromTicket = async (payload) => {
    try {
      await convertedLeadsService.create(payload);
      toast.success("Empresa criada com sucesso.");
      setCompanyModalOpen(false);
    } catch (err) {
      toastError(err);
    }
  };

  const handleDeleteTicket = async () => {
    try {
      await api.delete(`/tickets/${ticket.id}`);
      history.push("/tickets");
    } catch (err) {
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
    ); //`{{ms}} *{{name}}*, ${i18n.t("mainDrawer.appBar.user.myName")} *${user?.name}* ${i18n.t("mainDrawer.appBar.user.continuity")}.`;
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

  const handleUpdateTicketStatus = async (e, status, userId, options = {}) => {
    setLoading(true);
    try {
      const payload =
        (status === "open" || status === "group") && ticket.status === "pending"
          ? buildAcceptTicketPayload(ticket, userId)
          : status === "closed"
          ? {
              status,
              userId: userId || null,
              sendFarewellMessage: options.sendFarewellMessage === true,
              amountUsedBotQueues: 0,
            }
          : { status, userId: userId || null };
      const { data } = await api.put(`/tickets/${ticket.id}`, payload);

      let setting;

      try {
        setting = await getSetting({
          column: "sendGreetingAccepted",
        });
      } catch (err) {
        toastError(err);
      }

      if (
        setting?.sendGreetingAccepted === "enabled" &&
        (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled") &&
        ticket.status === "pending"
      ) {
        handleSendMessage(ticket.id);
      }

      if (isMounted.current) {
        setLoading(false);
      }

      if (status === "open" || status === "group") {
        setCurrentTicket({ ...ticket, code: "#" + status });
        setTimeout(() => {
          history.push("/tickets");
        }, 0);

        setTimeout(() => {
          history.push(`/tickets/${ticket.uuid}`);
          setTabOpen(status);
        }, 10);
      } else {
        setCurrentTicket({ id: null, code: null });
        if (data?.status === "closed") {
          setTabOpen("closed");
        }
        history.push("/tickets");
      }
    } catch (err) {
      if (isMounted.current) {
        setLoading(false);
      }
      toastError(err);
    }
  };

  const handleAcepptTicket = async (id) => {
    setLoading(true);
    try {
      const otherTicket = await api.put(
        `/tickets/${id}`,
        buildAcceptTicketPayload(ticket, user?.id)
      );
      if (otherTicket.data.id !== ticket.id) {
        if (otherTicket.data.userId !== user?.id) {
          if (isMounted.current) {
            setOpenAlert(true);
            setUserTicketOpen(otherTicket.data.user.name);
            setQueueTicketOpen(otherTicket.data.queue.name);
            setTabOpen(otherTicket.isGroup ? "group" : "open");
          }
        } else {
          if (isMounted.current) {
            setLoading(false);
            setTabOpen(otherTicket.isGroup ? "group" : "open");
          }
          history.push(`/tickets/${otherTicket.data.uuid}`);
        }
      } else {
        if (isMounted.current) {
          setLoading(false);
        }
        history.push("/tickets");
        setTimeout(() => {
          history.push(`/tickets/${ticket.uuid}`);
          setTabOpen(ticket.isGroup ? "group" : "open");
        }, 1000);
      }
    } catch (err) {
      if (isMounted.current) {
        setLoading(false);
      }
      toastError(err);
    }
  };

  //Wavoip historic
  const saveHistoricalLink = async (payload) => {
    console.log('payload request historical', JSON.stringify(payload));
    const callHistorical = await api.post(`/call/historical/wavoip`, payload);
  }
  //Wavoip conect
  const handleOpenWavoipCall = async () => {
    if (!ticket?.whatsapp?.wavoip || !ticket?.contact?.number) {
      toastError("Erro: Token ou número de telefone não disponível.");
      return;
    }

    const token = String(ticket.whatsapp.wavoip).trim();
    const phone = String(ticket.contact.number || "").replace(/\D/g, "");
    const name = String(ticket.contact.name || "").trim();
    const params = new URLSearchParams({
      token,
      phone,
      name,
      start_if_ready: "true",
      close_after_call: "true",
    });
    const url = `https://app.wavoip.com/call?${params.toString()}`;

    try {
      await saveHistoricalLink({
        "user_id": ticket?.user?.id || null,
        "token_wavoip": token,
        "whatsapp_id": ticket?.whatsapp?.id || null,
        "contact_id": ticket?.contact?.id || null,
        "company_id": ticket?.company?.id || null,
        "phone_to": phone,
        "name": name,
        "url": url,
        "createdAt": new Date()
      });

    } catch (e) {
      console.log('erro ao tentar salvar historico', e)
    }

    window.open(url, "wavoip", "toolbar=no,scrollbars=no,resizable=no,top=500,left=500,width=500,height=700");
  };

  const handleExportToPDF = () => {
    const messagesListElement = document.getElementById("messagesList");
    const headerElement = document.getElementById("TicketHeader");

    const pdfOptions = {
      margin: 1,
      filename: `${i18n.t("whatsappModalRel.form.reportFilename")}${ticket.id
        }.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    if (messagesListElement && headerElement) {
      const headerClone = headerElement.cloneNode(true);
      const messagesListClone = messagesListElement.cloneNode(true);

      const containerElement = document.createElement("div");
      containerElement.appendChild(headerClone);
      containerElement.appendChild(messagesListClone);

      return html2pdf().from(containerElement).set(pdfOptions).output("blob");
    } else {
      toast.error(i18n.t("whatsappModalRel.form.elementNotFoundForExport"));
      return null;
    }
  };

  const handleTestButton = async () => {
    try {
      if (ticket?.whatsapp?.integrationTypeId) {
        const { data: integration } = await api.get(
          `/queueIntegration/${ticket.whatsapp.integrationTypeId}`
        );

        if (integration) {
          await api.post(`/queueIntegration/testsession`, {
            integrationId: ticket.whatsapp.integrationTypeId,
            ticketId: ticket.id,
            contactId: ticket.contactId,
            body: ticket.lastMessage?.body || "",
            status: "closed",
          });

          if (isMounted.current) {
            toast.success(i18n.t("ticketList.success.integrationTriggered"));
          }
        }
      }

      await handleUpdateTicketStatus(
        null,
        "closed",
        user?.id,
        ticket?.queue?.id
      );

      if (isMounted.current) {
        handleClose();
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleLinkToWallet = async () => {
    if (!ticket.contactId) {
      toast.error(i18n.t("contactModal.saveFirst"));
      return;
    }

    setLinkingWallet(true);
    try {
      if (!user.queues || user.queues.length === 0) {
        toast.error(i18n.t("contactModal.walletError"));
        return;
      }

      // Usa a primeira fila do usuário
      const userQueue = user.queues[0];

      await api.put(`/contacts/wallet/${ticket.contactId}`, {
        wallets: {
          userId: user.id,
          queueId: ticket.queueId || userQueue.id,
        },
      });

      toast.success(i18n.t("contactModal.walletLinked"));
    } catch (err) {
      toastError(err);
    } finally {
      setLinkingWallet(false);
    }
  };

  const handleFinalizarTicket = async (tipo) => {
    if (shouldUseFinalizacaoComValorVenda) {
      setFinalizacaoTipo(tipo);
      setOpenFinalizacaoVenda(true);
    } else {
      if (tipo === "semDespedida") {
        handleCloseTicketWithoutFarewellMsg();
      } else {
        handleUpdateTicketStatus(null, "closed", user?.id, {
          sendFarewellMessage: true,
        });
      }
    }
  };

  const handleClickResolver = () => {
    if (shouldUseFinalizacaoComValorVenda) {
      setFinalizacaoTipo("comDespedida");
      setOpenFinalizacaoVenda(true);
    } else {
      setOpen(true);
    }
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
        setCurrentTicket({ id: null, code: null });
        setTabOpen("closed");
        history.push("/tickets");
      } else if (ticketData?.status === "closed") {
        setCurrentTicket({ id: null, code: null });
        history.push("/tickets");
      }
    } catch (err) {
      toastError(err);
    }
  };

  // Tooltip dinâmico para copiar telefone
  const getCopyPhoneTooltip = () => {
    const usePrefixWhenCopy = localStorage.getItem('usePrefixWhenCopy') === 'true';
    const prefix = localStorage.getItem('contactCopyPrefix') || '';

    let copyTooltip = i18n.t("ticketInfo.copyPhone");
    if (usePrefixWhenCopy && prefix) {
      copyTooltip = `Copiar telefone com prefixo (${prefix})`;
    }
    return copyTooltip;
  };

  return (
    <>
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
      {showTicketLogOpen && (
        <ShowTicketLogModal
          isOpen={showTicketLogOpen}
          handleClose={(e) => setShowTicketLogOpen(false)}
          ticketId={ticket.id}
        />
      )}
      {openTicketMessageDialog && (
        <TicketMessagesDialog
          open={openTicketMessageDialog}
          handleClose={() => setOpenTicketMessageDialog(false)}
          ticketId={ticket.id}
        />
      )}

      {quickMessageModalOpen && (
        <QuickMessageModal
          open={quickMessageModalOpen}
          onClose={handleCloseQuickMessageModal}
          onSelect={handleQuickMessageSelect}
          companyId={user?.companyId}
          userId={user?.id}
        />
      )}

      {newTicketModalOpen && (
        <NewTicketModal
          modalOpen={newTicketModalOpen}
          onClose={handleCloseNewTicketModal}
          initialContact={contact}
        />
      )}

      <div className={classes.actionButtons}>
        {showWavoipCall && (
          <IconButton color="secondary" onClick={handleOpenWavoipCall}>
            <Phone />
          </IconButton>
        )}
        {ticket.status === "closed" && (
          <ButtonWithSpinner
            loading={loading}
            startIcon={<Add />}
            size="small"
            onClick={handleOpenNewTicketModal}
          >
            Criar Novo Ticket
          </ButtonWithSpinner>
        )}
        {ticket.status === "pending" &&
          (ticket.queueId === null || ticket.queueId === undefined) && (
            <ButtonWithSpinner
              loading={loading}
              size="small"
              variant="contained"
              onClick={(e) => handleOpenAcceptTicketWithouSelectQueue()}
            >
              {i18n.t("messagesList.header.buttons.accept")}
            </ButtonWithSpinner>
          )}
        {ticket.status === "pending" && ticket.queueId !== null && (
          <ButtonWithSpinner
            loading={loading}
            size="small"
            variant="contained"
            onClick={(e) => handleUpdateTicketStatus(e, "open", user?.id)}
          >
            {i18n.t("messagesList.header.buttons.accept")}
          </ButtonWithSpinner>
        )}

        <Tooltip title="Ações do ticket">
          <IconButton
            aria-label="Ações do ticket"
            aria-controls="ticket-actions-menu"
            aria-haspopup="true"
            onClick={handleMenu}
            color="inherit"
            style={{ padding: 6 }}
          >
            <MoreVertRounded style={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
        <Menu
          id="ticket-actions-menu"
          anchorEl={anchorEl}
          getContentAnchorEl={null}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          keepMounted
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          open={menuOpen}
          onClose={handleCloseMenu}
        >
          {(ticket.status === "open" || ticket.status === "group") && (
            <>
              <MenuItem
                onClick={() => {
                  handleCloseMenu();
                  handleOpenQuickMessageModal();
                }}
              >
                <ListItemIcon style={{ minWidth: 32 }}>
                  <BoltOutlined style={{ fontSize: 18 }} />
                </ListItemIcon>
                {i18n.t("ticketInfo.quickMessages")}
              </MenuItem>
              <MenuItem
                onClick={(e) => {
                  handleCloseMenu();
                  handleUpdateTicketStatus(e, "pending", null);
                }}
              >
                <ListItemIcon style={{ minWidth: 32 }}>
                  <UndoOutlined style={{ fontSize: 18 }} />
                </ListItemIcon>
                {i18n.t("tickets.buttons.returnQueue")}
              </MenuItem>
              <MenuItem onClick={handleOpenTransferModal}>
                <ListItemIcon style={{ minWidth: 32 }}>
                  <SwapHorizOutlinedIcon style={{ fontSize: 18 }} />
                </ListItemIcon>
                {i18n.t("transferTicketModal.title")}
              </MenuItem>
              {(ticket.status === "open" || ticket.status === "group") && ticket.isBot === true && (
                <MenuItem
                  onClick={async () => {
                    handleCloseMenu();
                    await handleUpdateTicketStatusWithData(
                      { status: "open", userId: user?.id, isBot: false },
                      false,
                      null
                    );
                  }}
                >
                  <ListItemIcon style={{ minWidth: 32 }}>
                    <PersonOutlineRounded style={{ fontSize: 18 }} />
                  </ListItemIcon>
                  Assumir humano
                </MenuItem>
              )}
              {directTicketsToWallets &&
                !(ticket.contact?.contactWallets && ticket.contact.contactWallets.length > 0) && (
                  <MenuItem
                    onClick={() => {
                      handleCloseMenu();
                      handleLinkToWallet();
                    }}
                    disabled={linkingWallet}
                  >
                    <ListItemIcon style={{ minWidth: 32 }}>
                      {linkingWallet ? (
                        <CircularProgress size={18} />
                      ) : (
                        <AccountBalanceWalletOutlined style={{ fontSize: 18 }} />
                      )}
                    </ListItemIcon>
                    Vincular à minha carteira
                  </MenuItem>
                )}
              <Divider />
            </>
          )}
          <MenuItem onClick={() => { setCreateLeadOpen(true); handleCloseMenu(); }}>
            Criar Lead
          </MenuItem>
          <MenuItem onClick={() => { setCreateActivityOpen(true); handleCloseMenu(); }}>
            Criar Atividade
          </MenuItem>
          <MenuItem onClick={() => { setContactModalOpen(true); handleCloseMenu(); }}>
            Criar Contato
          </MenuItem>
          <MenuItem onClick={() => { setCompanyModalOpen(true); handleCloseMenu(); }}>
            Criar Empresa
          </MenuItem>
          <MenuItem onClick={handleOpenEventDrawer}>
            Criar Agendamento
          </MenuItem>
        </Menu>

        {confirmationOpen && (
          <ConfirmationModal
            title={`${i18n.t(
              "ticketOptionsMenu.confirmationModal.title"
            )} #${ticket.id}?`}
            open={confirmationOpen}
            onClose={setConfirmationOpen}
            onConfirm={handleDeleteTicket}
          >
            {i18n.t("ticketOptionsMenu.confirmationModal.message")}
          </ConfirmationModal>
        )}
        {transferTicketModalOpen && (
          <TransferTicketModalCustom
            modalOpen={transferTicketModalOpen}
            onClose={handleCloseTransferTicketModal}
            ticketid={ticket.id}
            ticket={ticket}
          />
        )}
      </div>
      <>
        {!shouldUseFinalizacaoComValorVenda && (
            <Formik
              enableReinitialize={true}
              validationSchema={SessionSchema}
              innerRef={formRef}
              onSubmit={(values, actions) => {
                setTimeout(() => {
                  actions.setSubmitting(false);
                  actions.resetForm();
                }, 400);
              }}
            >
              {({
                values,
                touched,
                errors,
                isSubmitting,
                setFieldValue,
                resetForm,
              }) => (
                <Dialog
                  open={open}
                  onClose={handleClose}
                  aria-labelledby="alert-dialog-title"
                  aria-describedby="alert-dialog-description"
                  PaperProps={{ className: classes.finalizeDialogPaper }}
                >
                  <DialogTitle
                    id="alert-dialog-title"
                    className={classes.finalizeDialogTitle}
                    disableTypography
                  >
                    Como deseja finalizar?
                  </DialogTitle>
                  <Form>
                    <DialogActions className={classes.finalizeDialogActions}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleFinalizarTicket("semDespedida")}
                      >
                        {i18n.t(
                          "messagesList.header.dialogRatingWithoutFarewellMsg"
                        )}
                      </Button>

                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        disableElevation
                        onClick={() => handleFinalizarTicket("comDespedida")}
                      >
                        {i18n.t("messagesList.header.dialogRatingCancel")}
                      </Button>

                      {showTestButton && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          disableElevation
                          onClick={handleTestButton}
                          style={{ flex: "1 1 100%" }}
                        >
                          {i18n.t(
                            "whatsappModalRel.form.resolveAndTriggerIntegration"
                          )}
                        </Button>
                      )}
                    </DialogActions>
                  </Form>
                </Dialog>
              )}
            </Formik>
          )}
      </>
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
      {tagModalOpen && (
        <TagModal
          open={tagModalOpen}
          onClose={() => setTagModalOpen(false)}
        />
      )}
      <CreateLeadSaleModal
        open={createLeadOpen}
        onClose={() => setCreateLeadOpen(false)}
        hideTicketPreview
        lead={{
          contactId: contact?.id || null,
          name: contact?.name || "",
          phone: contact?.number || "",
          email: contact?.email || ""
        }}
        onSave={() => {
          toast.success("Lead criado com sucesso.");
          setCreateLeadOpen(false);
        }}
      />
      <CreateActivityModal
        open={createActivityOpen}
        onClose={() => setCreateActivityOpen(false)}
        onSave={() => setCreateActivityOpen(false)}
        activity={{
          title: contact?.name ? `Atividade para ${contact.name}` : "",
          contactId: contact?.id || null
        }}
      />
      <LeadCompanyModal
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        initialValues={{
          contactId: contact?.id || null,
          phone: contact?.number || "",
          email: contact?.email || ""
        }}
        onSave={handleSaveCompanyFromTicket}
      />
      <ContactModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        contactId={null}
        initialValues={{
          name: contact?.name || "",
          number: contact?.number || "",
          email: contact?.email || ""
        }}
        onSave={() => setContactModalOpen(false)}
      />
      <CreateEventDrawer
        open={eventDrawerOpen}
        onClose={handleCloseEventDrawer}
        initialDate={new Date()}
        initialContactId={contact?.id || null}
        initialPhone={contact?.number || ""}
      />
    </>
  );
};

export default TicketActionButtonsCustom;
