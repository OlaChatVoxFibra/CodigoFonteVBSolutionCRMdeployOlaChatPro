/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useCallback, useContext, useEffect, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import { add, format, parseISO } from "date-fns";

import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
// import { SocketContext } from "../../context/Socket/SocketContext";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
  Button,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Table,
  TableHead,
  Paper,
  Tooltip,
  Typography,
  CircularProgress,
  Box,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem as MuiMenuItem,
  FormControl,
  InputLabel,
  Grid,
  TextField,
  InputAdornment,
  FormControlLabel,
  Checkbox,
} from "@material-ui/core";
import {
  Edit,
  CheckCircle,
  SignalCellularConnectedNoInternet2Bar,
  SignalCellularConnectedNoInternet0Bar,
  SignalCellular4Bar,
  CropFree,
  DeleteOutline,
  Facebook,
  Instagram,
  WhatsApp,
  Sync,
  Textsms,
} from "@material-ui/icons";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import WebhookIcon from '@mui/icons-material/Webhook';
import TelegramIcon from "@mui/icons-material/Telegram";

import TableRowSkeleton from "../../components/TableRowSkeleton";
import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";
import formatSerializedId from '../../utils/formatSerializedId';
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import { useHistory, useParams } from "react-router-dom/cjs/react-router-dom.min";
import ForbiddenPage from "../../components/ForbiddenPage";
import ConnectionSection from "./ConnectionSection";
import ConnectionListMinimal from "./ConnectionListMinimal";
import ConnectionMinimalButton from "./ConnectionMinimalButton";
import ConnectionsMagicFrame from "./ConnectionsMagicFrame";
import IntegrationConfigManage from "./IntegrationConfigManage";
import { useConnectionsManageStyles } from "./connectionsMagicUi";
import ConnectionsChannelLayout from "./ConnectionsChannelLayout";
import ConnectionsManageToolbar from "./ConnectionsManageToolbar";
import { CONNECTIONS_FONT } from "./connectionsTypography";
import {
  getIntegrationByKey,
  integrationSupportsNewForm,
  integrationUsesConfigManage,
} from "./integrationCatalog";
import { Can } from "../../components/Can";
import useSettings from "../../hooks/useSettings";
import WhatsAppEmbeddedSignupConnect from "../../components/WhatsAppEmbeddedSignup/WhatsAppEmbeddedSignupConnect";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1, 1.5),
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    overflowX: "hidden",
    overflowY: "auto",
    ...theme.scrollbarStyles,
    backgroundColor: theme.palette.listScrollArea,
  },
  tableWrap: {
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden",
  },
  connectionsTable: {
    width: "100%",
    tableLayout: "fixed",
  },
  compactCell: {
    padding: theme.spacing(0.75, 0.5),
    fontSize: "0.8125rem",
    lineHeight: 1.3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle",
  },
  colChannel: { width: "6%" },
  colColor: { width: "7%" },
  colName: { width: "17%" },
  colNumber: { width: "13%" },
  colStatus: { width: "7%" },
  colSession: { width: "22%" },
  colUpdate: { width: "11%" },
  colDefault: { width: "7%" },
  colActions: { width: "10%" },
  sessionCell: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
  },
  colorSwatch: {
    width: 40,
    height: 16,
    alignSelf: "center",
  },
  actionGroup: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  customTableCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tooltip: {
    backgroundColor:
      theme.palette.type === "dark" ? "#454545" : "#f5f5f9",
    color: theme.palette.text.primary,
    fontSize: theme.typography.pxToRem(14),
    border: `1px solid ${
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.12)"
        : "#dadde9"
    }`,
    maxWidth: 450,
  },
  tooltipPopper: {
    textAlign: "center",
  },
  buttonProgress: {
    color: green[500],
  },
}));

function CircularProgressWithLabel(props) {
  return (
    <Box position="relative" display="inline-flex">
      <CircularProgress variant="determinate" {...props} />
      <Box
        top={0}
        left={0}
        bottom={0}
        right={0}
        position="absolute"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Typography
          variant="caption"
          component="div"
          color="textSecondary"
        >{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  );
}

const CustomToolTip = ({ title, content, children }) => {
  const classes = useStyles();

  return (
    <Tooltip
      arrow
      classes={{
        tooltip: classes.tooltip,
        popper: classes.tooltipPopper,
      }}
      title={
        <React.Fragment>
          <Typography gutterBottom color="inherit">
            {title}
          </Typography>
          {content && <Typography>{content}</Typography>}
        </React.Fragment>
      }
    >
      {children}
    </Tooltip>
  );
};

const IconChannel = (channel) => {
  switch (channel) {
    case "facebook":
      return <Facebook style={{ color: "#3b5998" }} />;
    case "instagram":
      return <Instagram style={{ color: "#e1306c" }} />;
    case "whatsapp":
      return <WhatsApp style={{ color: "#25d366" }} />;
    case "whatsapp_oficial":
      return <WhatsApp style={{ color: "#25d366" }} />;
    case "sms":
      return <Textsms style={{ color: "#1976d2" }} />;
    case "telegram":
      return <TelegramIcon style={{ color: "#0088cc" }} />;
    case "telegram_oficial":
      return <TelegramIcon style={{ color: "#229ED9" }} />;
    default:
      return <Textsms style={{ color: "#9e9e9e" }} />;
  }
};

const smsProviderLabel = (whatsApp) => {
  if (whatsApp?.channel !== "sms") return null;
  const p = (whatsApp.provider || "vonage").toLowerCase();
  return p === "twilio" ? "Twilio" : "Vonage";
};

const ConnectionsTypePage = () => {
  const classes = useStyles();
  const manageClasses = useConnectionsManageStyles();
  const history = useHistory();
  const { integrationKey } = useParams();
  const integration = getIntegrationByKey(integrationKey);

  useEffect(() => {
    if (integrationKey && !integration) {
      history.replace("/connections");
    }
  }, [integrationKey, integration, history]);

  const { whatsApps, loading, fetchWhatsApps, removeWhatsAppById } = useContext(WhatsAppsContext);
  const [searchParam, setSearchParam] = useState("");
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [newConnMenuOpen, setNewConnMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const [statusImport, setStatusImport] = useState([]);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
  const [channel, setChannel] = useState("whatsapp");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingWhatsAppId, setDeletingWhatsAppId] = useState(null);
  const deleteSpinnerFailsafeRef = useRef(null);
  const confirmationModalInitialState = {
    action: "",
    title: "",
    message: "",
    whatsAppId: "",
    open: false,
  };
  const [confirmModalInfo, setConfirmModalInfo] = useState(confirmationModalInitialState);
  /** Evita action/whatsAppId vazios por closure desatualizada no modal de confirmação */
  const confirmPayloadRef = useRef({ action: "", whatsAppId: "" });
  const [planConfig, setPlanConfig] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [sourceConnection, setSourceConnection] = useState("");
  const [targetConnection, setTargetConnection] = useState("");
  const [transferProgressModalOpen, setTransferProgressModalOpen] = useState(false);
  const [transferProgress, setTransferProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [syncingTemplatesId, setSyncingTemplatesId] = useState(null);

  const { user, socket } = useContext(AuthContext);
  const companyId = user?.companyId;

  const normalizedWhatsApps = useMemo(() => {
    return (whatsApps || []).map((w) => {
      if (
        (w.channel === "telegram" || w.channel === "sms" || w.channel === "linkedin") &&
        w.status === "OPENING"
      ) {
        return { ...w, status: "CONNECTED" };
      }
      return w;
    });
  }, [whatsApps]);

  const typeFilteredWhatsApps = useMemo(() => {
    if (!integration?.channels?.length) return [];
    return normalizedWhatsApps.filter((w) =>
      integration.channels.includes(w.channel || "whatsapp")
    );
  }, [normalizedWhatsApps, integration]);

  const filteredWhatsApps = useMemo(() => {
    const list = typeFilteredWhatsApps;
    if (!searchParam?.trim()) return list;
    const q = searchParam.trim().toLowerCase();
    return list.filter((w) => {
      const provider = w.channel === "sms" ? smsProviderLabel(w) : "";
      const haystack = [
        w.name,
        w.number,
        w.phone_number,
        w.channel,
        w.provider,
        provider,
        w.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [typeFilteredWhatsApps, searchParam]);

  useEffect(() => {
    if (!integrationKey) {
      history.replace("/connections");
      return;
    }
    if (!integration) {
      history.replace("/connections");
      return;
    }
    if (integration.comingSoon) {
      history.replace("/connections");
      return;
    }
    if (
      integration.externalPath &&
      integration.key !== "email" &&
      integration.key !== "openai"
    ) {
      history.replace(integration.externalPath);
    }
  }, [integrationKey, integration, history]);

  const { getPlanCompany } = usePlans();
  const { get: getSetting, update: updateSetting } = useSettings();

  useEffect(() => {
    async function fetchData() {
      if (!companyId) return;
      try {
        const planConfigs = await getPlanCompany(undefined, companyId);
        setPlanConfig(planConfigs);
      } catch (err) {
        // ignora erro silenciosamente na montagem inicial
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleOpenNewConnectionMenu = () => {
    const pos = { top: window.innerHeight - 80, left: window.innerWidth - 80 };
    setMenuPosition(pos);
    setNewConnMenuOpen(true);
  };

  const handleCloseNewConnectionMenu = () => {
    setNewConnMenuOpen(false);
    setMenuPosition(null);
  };

  const reconnectTelegramOficial = async (connectionId) => {
    try {
      const { data } = await api.post(
        `/telegram-user/connection/${connectionId}/reconnect`
      );
      toast.success(
        data?.number
          ? `Sessão reconectada: ${data.number}`
          : "Sessão Telegram Oficial reconectada."
      );
      if (typeof fetchWhatsApps === "function") fetchWhatsApps({ silent: true });
    } catch (err) {
      toastError(err);
    }
  };

  const handleReconfigureTelegramWebhook = async (connectionId) => {
    try {
      const { data } = await api.post(`/telegram/connection/${connectionId}/webhook`);
      const bot = data?.botLabel || "@VBSolution_bot";
      if (data?.webhookConfigured && data?.deliveryMode === "polling") {
        if (Number(data?.syncedUpdates) > 0) {
          toast.success(
            `${data.syncedUpdates} mensagem(ns) do Telegram sincronizada(s). Veja Tickets → Aguardando.`,
            { autoClose: 12000 }
          );
        } else {
          toast.success(
            `Recebimento ativo (dev). No Telegram abra o chat com ${bot} (não conversa com pessoa) e envie /start ou uma mensagem.`,
            { autoClose: 14000 }
          );
        }
      } else if (data?.webhookConfigured) {
        toast.success("Webhook Telegram registrado com sucesso.");
      } else if (data?.deliveryMode === "polling") {
        toast.warning(
          data?.webhookError ||
            "Não foi possível iniciar o polling. Verifique o token do bot.",
          { autoClose: 12000 }
        );
      } else {
        toast.warning(
          data?.webhookError ||
            "Não foi possível registrar o webhook. Defina BACKEND_URL ou TELEGRAM_WEBHOOK_URL com HTTPS público.",
          { autoClose: 12000 }
        );
      }
      if (typeof fetchWhatsApps === "function") fetchWhatsApps({ silent: true });
    } catch (err) {
      const msg =
        err?.response?.data?.webhookError ||
        err?.response?.data?.error ||
        err?.response?.data?.message;
      if (msg) {
        toast.warning(msg, { autoClose: 12000 });
        if (typeof fetchWhatsApps === "function") fetchWhatsApps({ silent: true });
        return;
      }
      toastError(err);
    }
  };

  const handleCopyTelegramWebhook = (url) => {
    if (!url) {
      toast.warning("Webhook ainda não configurado. Salve a conexão Telegram primeiro.");
      return;
    }
    navigator.clipboard.writeText(url);
    toast.success("Webhook copiado.");
  };

  const handleCopySmsWebhook = (url) => {
    if (!url) {
      toast.warning("Webhook ainda não configurado. Salve a conexão SMS primeiro.");
      return;
    }
    navigator.clipboard.writeText(url);
    toast.success("Webhook copiado.");
  };

  const handleCopyLinkedInWebhook = (url) => {
    if (!url) {
      toast.warning("Webhook ainda não configurado. Salve a conexão LinkedIn primeiro.");
      return;
    }
    navigator.clipboard.writeText(url);
    toast.success("Webhook copiado.");
  };

  useEffect(() => {
    // const socket = socketManager.GetSocket();

    socket.on(`importMessages-${user.companyId}`, (data) => {
      if (data.action === "refresh") {
        setStatusImport([]);
        history.go(0);
      }
      if (data.action === "update") {
        setStatusImport(data.status);
      }
    });

    socket.on(`transferTickets-${user.companyId}`, (data) => {
      if (data.action === "progress") {
        setTransferProgress({
          current: data.current,
          total: data.total,
          percentage: Math.round((data.current / data.total) * 100)
        });
      }
      if (data.action === "completed") {
        setTransferProgressModalOpen(false);
        setTransferProgress({ current: 0, total: 0, percentage: 0 });
        toast.success(`Transferência concluída! ${data.transferred} tickets transferidos com sucesso.`);
        handleCloseTransferModal();
      }
      if (data.action === "error") {
        setTransferProgressModalOpen(false);
        setTransferProgress({ current: 0, total: 0, percentage: 0 });
        toast.error("Erro na transferência de tickets.");
      }
    });

    /* return () => {
      socket.disconnect();
    }; */
  }, [whatsApps]);

  const handleStartWhatsAppSession = async (whatsAppId) => {
    try {
      await api.post(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleRequestNewQrCode = async (whatsAppId) => {
    try {
      await api.put(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const managePath = integration
    ? `/connections/${integration.key}/manage`
    : "/connections";
  const channelLandingPath = integration
    ? `/connections/${integration.key}`
    : "/connections";

  const goToChannelSetup = (whatsAppId) => {
    if (!integration?.key) return;
    if (whatsAppId) {
      history.push(`/connections/${integration.key}/edit/${whatsAppId}`);
      return;
    }
    history.push(`/connections/${integration.key}/new`);
  };

  const handleOpenWhatsAppModal = (ch = "whatsapp") => {
    setChannel(ch);
    setSelectedWhatsApp(null);
    goToChannelSetup();
  };

  const handleCloseWhatsAppModal = useCallback(() => {
    setWhatsAppModalOpen(false);
    setSelectedWhatsApp(null);
  }, [setSelectedWhatsApp, setWhatsAppModalOpen]);

  const handleOpenQrModal = (whatsApp) => {
    setSelectedWhatsApp(whatsApp);
    setQrModalOpen(true);
  };

  const handleCloseQrModal = useCallback(() => {
    setSelectedWhatsApp(null);
    setQrModalOpen(false);
  }, [setQrModalOpen, setSelectedWhatsApp]);

  const handleEditWhatsApp = (whatsApp) => {
    if (
      whatsApp.channel === "sms" ||
      whatsApp.channel === "telegram" ||
      whatsApp.channel === "telegram_oficial" ||
      whatsApp.channel === "linkedin" ||
      whatsApp.channel === "whatsapp" ||
      whatsApp.channel === "whatsapp_oficial" ||
      whatsApp.channel === "facebook" ||
      whatsApp.channel === "instagram"
    ) {
      goToChannelSetup(whatsApp.id);
      return;
    }
    setChannel(whatsApp.channel);
    setSelectedWhatsApp(whatsApp);
    setWhatsAppModalOpen(true);
  };

  const openCreateForIntegration = () => {
    if (!integration?.key) return;
    goToChannelSetup();
  };

  const handleSyncTemplates = async (whatsAppId) => {
    if (syncingTemplatesId != null) return;
    setSyncingTemplatesId(whatsAppId);
    try {
      const { data } = await api.get(`/whatsapp/sync-templates/${whatsAppId}`);
      const count = Array.isArray(data?.data) ? data.data.length : 0;
      toast.success(
        count > 0
          ? `${count} template(s) sincronizado(s) com sucesso.`
          : "Sincronização concluída (nenhum template encontrado na Meta)."
      );
    } catch (err) {
      let msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Erro ao sincronizar templates da API oficial.";
      if (String(msg).includes("ERR_META_TOKEN_INVALID")) {
        msg =
          "Token Meta inválido ou expirado. Edite a conexão e cole um token permanente novo do Meta Business.";
      }
      toast.error(msg, { autoClose: 8000 });
    } finally {
      setSyncingTemplatesId(null);
    }
  };

  const handleRepairWaba = async (whatsAppId) => {
    try {
      const { data } = await api.post(`/whatsapp/${whatsAppId}/repair-oficial`);
      if (data?.tokenValid === false) {
        toast.warning(
          data?.tokenError ||
            "Webhook atualizado, mas o token Meta ainda está inválido. Edite a conexão.",
          { autoClose: 10000 }
        );
      } else if (data?.wabaSubscription?.success === false) {
        toast.warning(
          data?.wabaSubscription?.error ||
            "Falha ao inscrever webhooks na WABA — mensagens do cliente não chegam.",
          { autoClose: 12000 }
        );
      } else if (
        data?.cloudRegistration?.success === false &&
        data?.phoneCloudStatus !== "CONNECTED"
      ) {
        toast.warning(
          data?.cloudRegistration?.error ||
            "Webhook OK, mas falha ao registrar número na Cloud API (erro 133010 ao enviar).",
          { autoClose: 12000 }
        );
      } else if (
        data?.cloudRegistration?.success === false &&
        data?.phoneCloudStatus === "CONNECTED"
      ) {
        toast.success(
          `Webhook reparado. Número já Conectado na Meta — pode testar recebimento. (${data?.cloudRegistration?.error || ""})`,
          { autoClose: 10000 }
        );
      } else {
        const apps = data?.subscribedAppsCount ?? 0;
        const reg = data?.cloudRegistration?.skipped
          ? "número já conectado na Meta (SMB)"
          : data?.cloudRegistration?.alreadyRegistered
            ? "número já registrado"
            : data?.cloudRegistration?.success
              ? "número registrado na Cloud API"
              : "";
        toast.success(
          `Conexão reparada — ${apps} app(s) no webhook WABA${reg ? `, ${reg}` : ""}. Status Meta: ${data?.phoneCloudStatus || "—"}`,
          { autoClose: 8000 }
        );
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Não foi possível reparar a conexão oficial."
      );
    }
  };

  const handleCopyWebhook = (url) => {
    navigator.clipboard.writeText(url); // Copia o token para a área de transferência    
  };

  const openInNewTab = url => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteConnectionImmediately = async (id) => {
    if (id == null || id === "") return;
    if (deleteSpinnerFailsafeRef.current) {
      clearTimeout(deleteSpinnerFailsafeRef.current);
      deleteSpinnerFailsafeRef.current = null;
    }
    setDeletingWhatsAppId(id);
    if (typeof removeWhatsAppById === "function") {
      // Feedback otimista para não deixar o usuário preso no loading enquanto o backend finaliza.
      removeWhatsAppById(id);
    }
    toast.success(i18n.t("connections.toasts.deleted"), { autoClose: 1800 });
    const idNum = Number(id);
    deleteSpinnerFailsafeRef.current = setTimeout(() => {
      deleteSpinnerFailsafeRef.current = null;
      setDeletingWhatsAppId((cur) => (Number(cur) === idNum ? null : cur));
      toast.error(
        i18n.t("connections.toasts.deleteTimeout") ||
          "A exclusão demorou demais. Verifique o backend e tente novamente."
      );
      if (typeof fetchWhatsApps === "function") fetchWhatsApps({ silent: true });
    }, 60000);

    try {
      const conn = whatsApps?.find((w) => Number(w.id) === Number(id));
      const deleteUrl =
        conn?.channel === "sms"
          ? `/sms/${id}`
          : conn?.channel === "telegram"
            ? `/telegram/${id}`
            : conn?.channel === "linkedin"
              ? `/linkedin/${id}`
              : `/whatsapp/${id}`;
      await api.delete(deleteUrl, { timeout: 90000 });
    } catch (err) {
      toastError(err);
    } finally {
      // Garante sincronização final com backend (inclusive rollback em caso de erro).
      if (typeof fetchWhatsApps === "function") await fetchWhatsApps({ silent: true });
      if (deleteSpinnerFailsafeRef.current) {
        clearTimeout(deleteSpinnerFailsafeRef.current);
        deleteSpinnerFailsafeRef.current = null;
      }
      setDeletingWhatsAppId(null);
    }
  };

  const handleOpenConfirmationModal = (action, whatsAppId) => {
    confirmPayloadRef.current = {
      action: action || "",
      whatsAppId: whatsAppId != null && whatsAppId !== "" ? whatsAppId : ""
    };

    if (action === "disconnect") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.disconnectTitle"),
        message: i18n.t("connections.confirmationModal.disconnectMessage"),
        whatsAppId: whatsAppId,
      });
    }

    if (action === "closedImported") {
      setConfirmModalInfo({
        action: action,
        title: i18n.t("connections.confirmationModal.closedImportedTitle"),
        message: i18n.t("connections.confirmationModal.closedImportedMessage"),
        whatsAppId: whatsAppId,
      });
    }

    setConfirmModalOpen(true);
  };

  const handleSubmitConfirmationModal = async () => {
    const snap = confirmPayloadRef.current;
    const action = snap.action || confirmModalInfo.action;
    const rawId =
      snap.whatsAppId !== "" && snap.whatsAppId != null
        ? snap.whatsAppId
        : confirmModalInfo.whatsAppId;

    if (action === "disconnect") {
      try {
        await api.delete(`/whatsappsession/${rawId}`);
        if (typeof fetchWhatsApps === "function") await fetchWhatsApps({ silent: true });
      } catch (err) {
        toastError(err);
      }
    }

    if (action === "closedImported") {
      try {
        await api.post(`/closedimported/${rawId}`);
        toast.success(i18n.t("connections.toasts.closedimported"));
        if (typeof fetchWhatsApps === "function") await fetchWhatsApps({ silent: true });
      } catch (err) {
        toastError(err);
      }
    }

    confirmPayloadRef.current = { action: "", whatsAppId: "" };
    setConfirmModalInfo(confirmationModalInitialState);
  };


  const renderImportButton = (whatsApp) => {
    if (whatsApp?.statusImportMessages === "renderButtonCloseTickets") {
      return (
        <Button
          style={{ marginLeft: 12 }}
          size="small"
          variant="outlined"
          color="primary"
          onClick={() => {
            handleOpenConfirmationModal("closedImported", whatsApp.id);
          }}
        >
          {i18n.t("connections.buttons.closedImported")}
        </Button>
      );
    }

    if (whatsApp?.importOldMessages) {
      let isTimeStamp = !isNaN(
        new Date(Math.floor(whatsApp?.statusImportMessages)).getTime()
      );

      if (isTimeStamp) {
        const ultimoStatus = new Date(
          Math.floor(whatsApp?.statusImportMessages)
        ).getTime();
        const dataLimite = +add(ultimoStatus, { seconds: +35 }).getTime();
        if (dataLimite > new Date().getTime()) {
          return (
            <>
              <Button
                disabled
                style={{ marginLeft: 12 }}
                size="small"
                endIcon={
                  <CircularProgress
                    size={12}
                    className={classes.buttonProgress}
                  />
                }
                variant="outlined"
                color="primary"
              >
                {i18n.t("connections.buttons.preparing")}
              </Button>
            </>
          );
        }
      }
    }
  };

  const renderActionButtons = (whatsApp) => {
    return (
      <div className={`${classes.sessionCell} ${classes.actionGroup}`}>
        {whatsApp.channel === "whatsapp" && whatsApp.status === "qrcode" && (
          <Can
            role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
            perform="connections-page:addConnection"
            yes={() => (
              <ConnectionMinimalButton
                variant="accent"
                onClick={() => handleOpenQrModal(whatsApp)}
              >
                {i18n.t("connections.buttons.qrcode")}
              </ConnectionMinimalButton>
            )}
          />
        )}
        {whatsApp.channel === "whatsapp" && whatsApp.status === "DISCONNECTED" && (
          <Can
            role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
            perform="connections-page:addConnection"
            yes={() => (
              <>
                <ConnectionMinimalButton
                  variant="primary"
                  onClick={() => handleStartWhatsAppSession(whatsApp.id)}
                >
                  {i18n.t("connections.buttons.tryAgain")}
                </ConnectionMinimalButton>
                <ConnectionMinimalButton
                  onClick={() => handleRequestNewQrCode(whatsApp.id)}
                >
                  {i18n.t("connections.buttons.newQr")}
                </ConnectionMinimalButton>
              </>
            )}
          />
        )}
        {(whatsApp.channel === "whatsapp" && (whatsApp.status === "CONNECTED" ||
          whatsApp.status === "PAIRING" ||
          whatsApp.status === "TIMEOUT")) && (
            <Can
              role={user.profile}
              perform="connections-page:addConnection"
              yes={() => (
                <>
                  <ConnectionMinimalButton
                    onClick={() => {
                      handleOpenConfirmationModal("disconnect", whatsApp.id);
                    }}
                  >
                    {i18n.t("connections.buttons.disconnect")}
                  </ConnectionMinimalButton>

                  {renderImportButton(whatsApp)}
                </>
              )}
            />
          )}
        {(whatsApp.channel === "whatsapp" && whatsApp.status === "OPENING") && (
          <Button size="small" variant="outlined" disabled color="default">
            {i18n.t("connections.buttons.connecting")}
          </Button>
        )}
        {((whatsApp.channel === "facebook" || whatsApp.channel === "instagram") && whatsApp.status === "CONNECTED") && (
          <span style={{ fontSize: 12, color: green[500] }}>
            {i18n.t("connections.toolTips.connected.title")}
          </span>
        )}
        {whatsApp.channel === "sms" && whatsApp.status === "CONNECTED" && (
          <span style={{ fontSize: 12, color: green[500] }}>
            SMS conectado
          </span>
        )}
        {whatsApp.channel === "telegram_oficial" && (
          <>
            {(whatsApp.status === "CONNECTED" || whatsApp.hasMtprotoSession) && (
              <span style={{ fontSize: 11, color: green[500] }}>
                TG conta conectada
              </span>
            )}
            {whatsApp.status === "PAIRING" && (
              <span style={{ fontSize: 11, color: "#ed6c02" }}>Aguardando código</span>
            )}
            {(whatsApp.status === "DISCONNECTED" || !whatsApp.status) &&
              !whatsApp.hasMtprotoSession && (
              <span style={{ fontSize: 11, color: "#757575" }}>Login pendente</span>
            )}
            <Can
              role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
              perform="connections-page:addConnection"
              yes={() => (
                <ConnectionMinimalButton
                  variant="primary"
                  onClick={() => goToChannelSetup(whatsApp.id)}
                >
                  Login
                </ConnectionMinimalButton>
              )}
            />
            {(whatsApp.status === "CONNECTED" || whatsApp.hasMtprotoSession) && (
              <Can
                role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
                perform="connections-page:addConnection"
                yes={() => (
                  <ConnectionMinimalButton
                    onClick={() => reconnectTelegramOficial(whatsApp.id)}
                  >
                    Reconectar
                  </ConnectionMinimalButton>
                )}
              />
            )}
          </>
        )}
        {whatsApp.channel === "linkedin" && whatsApp.status === "CONNECTED" && (
          <span style={{ fontSize: 11, color: green[500] }}>LinkedIn conectado</span>
        )}
        {whatsApp.channel === "telegram" && whatsApp.status === "CONNECTED" && (
          <>
            <span style={{ fontSize: 11, color: green[500] }}>TG Bot conectado</span>
            <Can
              role={user.profile === "user" && user.allowConnections === "enabled" ? "admin" : user.profile}
              perform="connections-page:addConnection"
              yes={() => (
                <Tooltip title="Ativar recebimento Telegram (webhook HTTPS ou polling local)">
                  <ConnectionMinimalButton
                    variant="primary"
                    onClick={() => handleReconfigureTelegramWebhook(whatsApp.id)}
                  >
                    Webhook
                  </ConnectionMinimalButton>
                </Tooltip>
              )}
            />
          </>
        )}
      </div>
    );
  };

  const renderStatusToolTips = (whatsApp) => {
    return (
      <div className={classes.customTableCell}>
        {whatsApp.status === "DISCONNECTED" && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.disconnected.title")}
            content={i18n.t("connections.toolTips.disconnected.content")}
          >
            <SignalCellularConnectedNoInternet0Bar color="secondary" />
          </CustomToolTip>
        )}
        {whatsApp.status === "OPENING" &&
          (whatsApp.channel === "whatsapp" || !whatsApp.channel) && (
          <CircularProgress size={24} className={classes.buttonProgress} />
        )}
        {whatsApp.status === "OPENING" &&
          (whatsApp.channel === "telegram" ||
            whatsApp.channel === "sms" ||
            whatsApp.channel === "linkedin") && (
          <CustomToolTip
            title="Webhook pendente"
            content="A conexão está ativa, mas o webhook inbound pode não estar registrado. Clique em Webhook ou salve novamente com BACKEND_URL HTTPS."
          >
            <SignalCellularConnectedNoInternet2Bar style={{ color: "#ed6c02" }} />
          </CustomToolTip>
        )}
        {whatsApp.status === "qrcode" && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.qrcode.title")}
            content={i18n.t("connections.toolTips.qrcode.content")}
          >
            <CropFree />
          </CustomToolTip>
        )}
        {(whatsApp.status === "CONNECTED" ||
          (whatsApp.channel === "telegram_oficial" && whatsApp.hasMtprotoSession)) && (
          <CustomToolTip title={i18n.t("connections.toolTips.connected.title")}>
            <SignalCellular4Bar style={{ color: green[500] }} />
          </CustomToolTip>
        )}
        {whatsApp.status === "PAIRING" && whatsApp.channel === "telegram_oficial" && (
          <CustomToolTip
            title="Login Telegram pendente"
            content="Abra a conexão, envie o código SMS/app e confirme o login MTProto."
          >
            <SignalCellularConnectedNoInternet2Bar style={{ color: "#ed6c02" }} />
          </CustomToolTip>
        )}
        {(whatsApp.status === "TIMEOUT" ||
          (whatsApp.status === "PAIRING" && whatsApp.channel !== "telegram_oficial")) && (
          <CustomToolTip
            title={i18n.t("connections.toolTips.timeout.title")}
            content={i18n.t("connections.toolTips.timeout.content")}
          >
            <SignalCellularConnectedNoInternet2Bar color="secondary" />
          </CustomToolTip>
        )}
      </div>
    );
  };

  const restartWhatsapps = async () => {

    try {
      await api.post(`/whatsapp-restart/`);
      toast.success(i18n.t("connections.waitConnection"));
    } catch (err) {
      toastError(err);
    }
  }

  const handleOpenTransferModal = () => {
    setTransferModalOpen(true);
  };

  const handleCloseTransferModal = () => {
    setTransferModalOpen(false);
    setSourceConnection("");
    setTargetConnection("");
  };

  const handleCloseTransferProgressModal = () => {
    setTransferProgressModalOpen(false);
    setTransferProgress({ current: 0, total: 0, percentage: 0 });
  };

  const handleTransferTickets = async () => {
    if (!sourceConnection || !targetConnection) {
      toast.error("Selecione as conexões de origem e destino");
      return;
    }

    if (sourceConnection === targetConnection) {
      toast.error("As conexões de origem e destino devem ser diferentes");
      return;
    }

    try {
      const response = await api.post(`/transfer-tickets`, {
        sourceConnectionId: sourceConnection,
        targetConnectionId: targetConnection
      });

      if (response.data.requiresProgress) {
        setTransferModalOpen(false);
        setTransferProgressModalOpen(true);
        setTransferProgress({ current: 0, total: response.data.totalTickets, percentage: 0 });
      } else {
        toast.success(`Tickets transferidos com sucesso! ${response.data.transferred || 0} tickets transferidos.`);
        handleCloseTransferModal();
      }
    } catch (err) {
      toastError(err);
    }
  };

  if (!integration) {
    return null;
  }

  return (
    <>
      <ConfirmationModal
        title={confirmModalInfo.title}
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={handleSubmitConfirmationModal}
      >
        {confirmModalInfo.message}
      </ConfirmationModal>
      <QrcodeModal
        open={qrModalOpen}
        onClose={handleCloseQrModal}
        whatsAppId={!selectedWhatsApp ? "" : selectedWhatsApp.id}
        companyId={selectedWhatsApp?.companyId}
      />
      <Dialog
        open={transferModalOpen}
        onClose={handleCloseTransferModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Transferência de Tickets</DialogTitle>
        <DialogContent>
          <Typography variant="body1" style={{ marginBottom: 24, lineHeight: 1.6 }}>
            Para transferir os tickets, selecione a conexão de <strong>origem</strong> (de onde os tickets serão movidos) 
            e a conexão de <strong>destino</strong> (para onde os tickets serão transferidos). 
            Todos os atendimentos ativos da conexão de origem serão movidos para a conexão de destino.
          </Typography>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
            <FormControl fullWidth>
              <InputLabel>Origem</InputLabel>
              <Select
                value={sourceConnection}
                onChange={(e) => setSourceConnection(e.target.value)}
                label="Origem"
              >
                {whatsApps.map((whatsApp) => (
                  <MuiMenuItem key={whatsApp.id} value={whatsApp.id}>
                    {whatsApp.name}
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>

            <div style={{ fontSize: 24, color: '#4caf50', fontWeight: 'bold' }}>
              Ã¢â€ â€™
            </div>

            <FormControl fullWidth>
              <InputLabel>Destino</InputLabel>
              <Select
                value={targetConnection}
                onChange={(e) => setTargetConnection(e.target.value)}
                label="Destino"
              >
                {whatsApps.map((whatsApp) => (
                  <MuiMenuItem key={whatsApp.id} value={whatsApp.id}>
                    {whatsApp.name}
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTransferModal} color="default">
            CANCELAR
          </Button>
          <Button onClick={handleTransferTickets} color="primary" variant="contained">
            TRANSFERIR
                     </Button>
         </DialogActions>
       </Dialog>
       <Dialog
         open={transferProgressModalOpen}
         onClose={handleCloseTransferProgressModal}
         maxWidth="sm"
         fullWidth
         disableBackdropClick
         disableEscapeKeyDown
       >
         <DialogTitle>Transferindo Tickets</DialogTitle>
         <DialogContent>
           <div style={{ textAlign: 'center', padding: '20px 0' }}>
             <Typography variant="h6" style={{ marginBottom: 16 }}>
               Progresso da Transferência
             </Typography>
             
             <Box position="relative" display="inline-flex" marginBottom={2}>
               <CircularProgress 
                 variant="determinate" 
                 value={transferProgress.percentage} 
                 size={80}
                 thickness={4}
               />
               <Box
                 top={0}
                 left={0}
                 bottom={0}
                 right={0}
                 position="absolute"
                 display="flex"
                 alignItems="center"
                 justifyContent="center"
               >
                 <Typography variant="caption" component="div" color="textSecondary" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                   {transferProgress.percentage}%
                 </Typography>
               </Box>
             </Box>

             <Typography variant="body1" style={{ marginTop: 16 }}>
               {transferProgress.current} de {transferProgress.total} tickets transferidos
             </Typography>
             
             <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
               Por favor, aguarde enquanto os tickets são transferidos...
             </Typography>
           </div>
         </DialogContent>
       </Dialog>
      {user.profile === "user" && user.allowConnections === "disabled" ?
        <ForbiddenPage />
        :
        <>
      <ConnectionsChannelLayout
        integration={integration}
        manageActive
        managePath={managePath}
      >
        <ConnectionsMagicFrame noPanel formPanel fill>
        <Box className={manageClasses.manageShell}>
        <ConnectionsManageToolbar
          searchValue={searchParam}
          onSearchChange={setSearchParam}
          searchPlaceholder={`Buscar em ${integration?.label || "conexões"}...`}
          onCreateConnection={
            integrationSupportsNewForm(integration?.key)
              ? () => goToChannelSetup()
              : undefined
          }
          createLabel="Criar conexão"
        />

        <Box className={manageClasses.manageBody}>
        <Box
          className={`${manageClasses.manageScroll}${
            integrationUsesConfigManage(integration)
              ? ` ${manageClasses.manageScrollAi}`
              : ""
          }`}
        >
        {integrationUsesConfigManage(integration) ? (
          <IntegrationConfigManage integrationKey={integration.key} />
        ) : (
        <>
        {integration?.key === "whatsapp-oficial" ? (
          <Box px={0.5}>
            <WhatsAppEmbeddedSignupConnect
              onSuccess={async () => {
                if (typeof fetchWhatsApps === "function") {
                  await fetchWhatsApps({ silent: true });
                }
              }}
            />
          </Box>
        ) : null}

          {
            statusImport?.all ? (
              <>
                <div style={{ margin: "auto", marginBottom: 12 }}>
                  <Card className={classes.root}>
                    <CardContent className={classes.content}>
                      <Typography component="h5" variant="h5">

                        {statusImport?.this === -1 ? i18n.t("connections.buttons.preparing") : i18n.t("connections.buttons.importing")}

                      </Typography>
                      {statusImport?.this === -1 ?
                        <Typography component="h6" variant="h6" align="center">

                          <CircularProgress
                            size={24}
                          />

                        </Typography>
                        :
                        <>
                          <Typography component="h6" variant="h6" align="center">
                            {`${i18n.t(`connections.typography.processed`)} ${statusImport?.this} ${i18n.t(`connections.typography.in`)} ${statusImport?.all}  ${i18n.t(`connections.typography.date`)}: ${statusImport?.date} `}
                          </Typography>
                          <Typography align="center">
                            <CircularProgressWithLabel
                              style={{ margin: "auto" }}
                              value={(statusImport?.this / statusImport?.all) * 100}
                            />
                          </Typography>
                        </>
                      }
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null
          }

          <ConnectionSection noPadding flat>
            <ConnectionListMinimal
              connections={filteredWhatsApps}
              loading={loading}
              emptyLabel={`Nenhuma conexão ainda. Use + para criar a primeira${
                integration?.label ? ` em ${integration.label}` : ""
              }.`}
              user={user}
              formatNumber={formatSerializedId}
              renderStatusToolTips={renderStatusToolTips}
              renderActionButtons={renderActionButtons}
              onEdit={handleEditWhatsApp}
              onDelete={handleDeleteConnectionImmediately}
              deletingWhatsAppId={deletingWhatsAppId}
              extraActions={(whatsApp) => (
                <>
                  {whatsApp.channel === "sms" && (
                    <Tooltip title="Copiar webhook SMS">
                      <IconButton
                        size="small"
                        onClick={() => handleCopySmsWebhook(whatsApp.waba_webhook)}
                      >
                        <WebhookIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {whatsApp.channel === "telegram" && (
                    <Tooltip title="Copiar webhook Telegram">
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleCopyTelegramWebhook(whatsApp.waba_webhook)
                        }
                      >
                        <WebhookIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {whatsApp.channel === "linkedin" && (
                    <Tooltip title="Copiar webhook LinkedIn">
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleCopyLinkedInWebhook(whatsApp.waba_webhook)
                        }
                      >
                        <WebhookIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {whatsApp.channel === "whatsapp_oficial" && (
                    <>
                      <Tooltip title="Sincronizar templates">
                        <IconButton
                          size="small"
                          disabled={syncingTemplatesId === whatsApp.id}
                          onClick={() => handleSyncTemplates(whatsApp.id)}
                        >
                          {syncingTemplatesId === whatsApp.id ? (
                            <CircularProgress size={18} />
                          ) : (
                            <Sync fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reparar webhook (atualiza URL no banco)">
                        <IconButton
                          size="small"
                          onClick={() => handleRepairWaba(whatsApp.id)}
                        >
                          <CloudSyncIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copiar webhook Meta">
                        <IconButton
                          size="small"
                          onClick={() => {
                            handleCopyWebhook(whatsApp.waba_webhook);
                            toast.info("URL do webhook copiada.", { autoClose: 2000 });
                          }}
                        >
                          <WebhookIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </>
              )}
            />
          </ConnectionSection>
        </>
        )}
        </Box>
        </Box>
        </Box>
        </ConnectionsMagicFrame>

      </ConnectionsChannelLayout>
        </>
      }
    </>
  );
};

export default ConnectionsTypePage;
