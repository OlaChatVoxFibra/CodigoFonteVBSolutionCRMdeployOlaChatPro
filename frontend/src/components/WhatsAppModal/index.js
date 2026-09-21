/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useRef, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form } from "formik";
import { toast } from "react-toastify";
import { isNil } from "lodash";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import moment from "moment";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
} from "@material-ui/core";
import ConnectionsMagicFrame from "../../pages/Connections/ConnectionsMagicFrame";
import { useConnectionsMagicFrameStyles } from "../../pages/Connections/connectionsMagicUi";

import api from "../../services/api";
import anthropicIntegrationService from "../../services/anthropicIntegrationService";
import {
  connectionAgentLabel,
  parseConnectionAgentValueForSave,
  whatsappAgentValueFromRecord
} from "../../utils/connectionAgentValue";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import getRandomHexColor from "../../utils/getRandomHexColor";
import {
  WizardStepIndicator,
  WizardStep1,
  WizardStep2,
  WizardStep4,
  WizardFooter,
  WizardModalHeader,
  STEP,
} from "./ConnectionWizardSteps";
import QueueModal from "../QueueModal";

const HELVETICA =
  '"Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    fontFamily: HELVETICA,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  pageEmbeddedRoot: {
    width: "100%",
    height: "auto",
    display: "block",
    flexWrap: "nowrap",
    gap: 0,
  },
  appleDialog: {
    "& .MuiDialog-container": {
      alignItems: "center",
      justifyContent: "center",
    },
    "& .MuiDialog-paper": {
      borderRadius: 16,
      fontFamily: HELVETICA,
      width: 580,
      maxWidth: 580,
      minWidth: 580,
      height: 560,
      maxHeight: 560,
      minHeight: 560,
      margin: 0,
      position: "relative",
      top: "auto",
      left: "auto",
      transform: "none",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    "& form": {
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      height: "100%",
    },
    "& .MuiDialogContent-root": {
      flex: 1,
      padding: 0,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    "& .MuiDialogActions-root": {
      padding: 0,
      flexShrink: 0,
      width: "100%",
      display: "block",
    },
  },
  wizardShell: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    flex: 1,
  },
  wizardStepsTrack: {
    flexShrink: 0,
    minHeight: 46,
    maxHeight: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  wizardBody: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    display: "flex",
    justifyContent: "center",
    alignItems: "stretch",
    padding: theme.spacing(0, 2),
  },
  wizardStepPanel: {
    flex: 1,
    width: "100%",
    maxWidth: "100%",
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
    padding: theme.spacing(1, 0, 1.5),
    ...theme.scrollbarStyles,
    "& > *": {
      width: "100%",
    },
  },
  wizardStepPanelCentered: {
    justifyContent: "center",
  },
  /** Etapa 2 (Filas) — conteúdo mais abaixo e centralizado para o rodapé fixo */
  wizardStepPanelQueues: {
    justifyContent: "flex-start",
    alignItems: "stretch",
    overflow: "visible",
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1.5),
    "& > *": {
      width: "100%",
      maxWidth: "100%",
      marginLeft: "auto",
      marginRight: "auto",
    },
  },
  pageWizardBodyQueues: {
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    minHeight: 220,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(0.5),
    boxSizing: "border-box",
  },
  pageWizardStepPanelQueues: {
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(1),
    width: "100%",
    maxWidth: "100%",
    marginLeft: "auto",
    marginRight: "auto",
  },
  wizardStepPanelCompact: {
    overflow: "visible",
    justifyContent: "flex-start",
    padding: theme.spacing(0.25, 0, 0),
  },
  appleDialogStep1: {
    "& .MuiDialog-paper": {
      height: 600,
      maxHeight: 600,
      minHeight: 600,
    },
  },
  appleDialogQueues: {
    "& .MuiDialog-paper": {
      width: 780,
      maxWidth: "92vw",
      minWidth: 300,
      height: 520,
      maxHeight: "88vh",
      minHeight: 420,
    },
  },
  appleDialogQuestion: {
    "& .MuiDialog-paper": {
      height: 600,
      maxHeight: 600,
      minHeight: 600,
    },
  },
  pageShell: {
    width: "100%",
    maxWidth: "100%",
    borderRadius: 0,
    overflow: "visible",
    border: "none",
    backgroundColor: "transparent",
    boxShadow: "none",
    boxSizing: "border-box",
  },
  pageForm: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: 0,
  },
  pageBody: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    width: "100%",
  },
  pageWizardBody: {
    flex: "0 0 auto",
    minHeight: 0,
    overflow: "visible",
    display: "flex",
    justifyContent: "stretch",
    alignItems: "stretch",
    padding: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  pageWizardStepPanel: {
    overflow: "visible",
    padding: theme.spacing(0, 0, 0.25),
    flex: "0 0 auto",
  },
  pageStepsTrack: {
    paddingLeft: 0,
    paddingRight: 0,
    marginBottom: theme.spacing(0.5),
    flexShrink: 0,
    minHeight: 40,
    maxHeight: 40,
  },
  pageFooter: {
    flexShrink: 0,
    borderTop: `1px solid ${
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.08)"
        : "rgba(15,23,42,0.06)"
    }`,
    backgroundColor: "transparent",
    padding: theme.spacing(2, 0, 0),
    marginTop: theme.spacing(1),
    width: "100%",
    boxSizing: "border-box",
  },
  embeddedDialog: {
    position: "relative",
    zIndex: 1,
    "& .MuiBackdrop-root": {
      display: "none",
    },
    "& .MuiDialog-container": {
      position: "relative",
      height: "auto",
      alignItems: "stretch",
    },
    "& .MuiDialog-paper": {
      margin: 0,
      maxWidth: "100%",
      width: "100%",
      minWidth: 0,
      height: "auto",
      maxHeight: "none",
      minHeight: 520,
      borderRadius: 0,
      boxShadow: "none",
      background: "transparent",
      position: "relative",
      top: "auto",
      left: "auto",
      transform: "none",
    },
    "& form": {
      display: "flex",
      flexDirection: "column",
      minHeight: 520,
    },
    "& .MuiDialogContent-root": {
      flex: 1,
      padding: 0,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
    },
    "& .MuiDialogActions-root": {
      padding: 0,
      flexShrink: 0,
      width: "100%",
      display: "block",
    },
  },
  appleBtn: {
    fontFamily: HELVETICA,
    fontSize: 14,
    fontWeight: 500,
    textTransform: "none",
    borderRadius: 10,
    minWidth: 120,
    padding: "8px 20px",
    boxShadow: "none",
  },
  appleBtnPrimary: {
    backgroundColor: theme.palette.type === "dark" ? "#fff" : "#1d1d1f",
    color: theme.palette.type === "dark" ? "#1d1d1f" : "#fff",
    "&:hover": {
      backgroundColor: theme.palette.type === "dark" ? "#e8e8ed" : "#333",
      boxShadow: "none",
    },
  },
  appleBtnSecondary: {
    border: `1px solid ${theme.palette.type === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"}`,
    color: theme.palette.text.primary,
    backgroundColor: "transparent",
  },
  sectionLabel: {
    fontFamily: HELVETICA,
    fontSize: 13,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(2),
    letterSpacing: "-0.01em",
  },
  wizardSteps: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(1, 1.5, 0),
    gap: 0,
    flexWrap: "wrap",
  },
  wizardStepItem: {
    display: "flex",
    alignItems: "center",
    position: "relative",
  },
  wizardDot: {
    width: 24,
    height: 24,
    fontSize: 10,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 600,
    fontFamily: HELVETICA,
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.1)" : "#e8e8ed",
    color: theme.palette.text.secondary,
    transition: "all 0.2s ease",
  },
  wizardDotActive: {
    background: theme.palette.type === "dark" ? "#fff" : "#1d1d1f",
    color: theme.palette.type === "dark" ? "#1d1d1f" : "#fff",
  },
  wizardDotDone: {
    background: "#34c759",
    color: "#fff",
  },
  wizardLabel: {
    fontFamily: HELVETICA,
    fontSize: 10,
    marginLeft: 4,
    marginRight: 6,
    color: theme.palette.text.secondary,
  },
  wizardLabelActive: {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  wizardLine: {
    width: 16,
    height: 2,
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.15)" : "#e0e0e0",
    marginRight: 4,
    borderRadius: 1,
  },
  wizardLineDone: {
    background: "#34c759",
  },

  multFieldLine: {
    marginTop: 12,
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },

  btnWrapper: {
    position: "relative",
  },
  importMessage: {
    marginTop: 12,
    marginBottom: 12,
    paddingBottom: 20,
    paddingTop: 3,
    padding: 12,
    border: "solid grey 2px",
    borderRadius: 4,
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },

  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },
  tokenRefresh: {
    minWidth: "auto",
    display: "flex", // Torna o botÃ£o flexÃ­vel para alinhar o conteÃºdo
    alignItems: "center", // Alinha verticalmente ao centro
    justifyContent: "center", // Alinha horizontalmente ao centro
  },
  colorAdorment: {
    width: 20,
    height: 20,
  },
  formControl: {
    width: 220,
    // paddingTop: 14
  },
  colorField: {
    width: 150,
  },
}));

const SessionSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
});

const WhatsAppModal = ({
  open,
  onClose,
  whatsAppId,
  channel,
  onConnectionSaved,
  embeddedPage = false,
}) => {
  const classes = useStyles();
  const magicFrame = useConnectionsMagicFrameStyles();
  const [autoToken, setAutoToken] = useState("");

  const inputFileRef = useRef(null);

  const [attachment, setAttachment] = useState(null);
  const [attachmentName, setAttachmentName] = useState("");

  const initialState = {
    name: "",
    greetingMessage: "",
    sendQueueEntryMessage: "inherit",
    complationMessage: "",
    outOfHoursMessage: "",
    ratingMessage: "",
    isDefault: false,
    token: "",
    maxUseBotQueues: 3,
    provider: "beta",
    expiresTicket: 0,
    allowGroup: false,
    enableImportMessage: false,
    groupAsTicket: "disabled",
    timeUseBotQueues: "0",
    timeSendQueue: "0",
    sendIdQueue: 0,
    expiresTicketNPS: "0",
    expiresInactiveMessage: "",
    timeInactiveMessage: "",
    inactiveMessage: "",
    maxUseBotQueuesNPS: 3,
    whenExpiresTicket: 0,
    timeCreateNewTicket: 0,
    greetingMediaAttachment: "",
    importRecentMessages: "",
    importOldMessages: "",
    importOldMessagesGroups: "",
    integrationId: "",
    collectiveVacationEnd: "",
    collectiveVacationStart: "",
    collectiveVacationMessage: "",
    queueIdImportMessages: null,
    isOficial: false,
    phone_number_id: "",
    waba_id: "",
    send_token: "",
    business_id: "",
    phone_number: "",
    color: getRandomHexColor(),
    flowInactiveTime: 0,
    flowIdInactiveTime: 0,
    timeAwaitActiveFlowId: 0,
    maxUseInactiveTime: 1,
    timeToReturnQueue: 0,
    triggerIntegrationOnClose: true,
    wavoip: "",
    queuesEnabled: false,
    sendGreetingMessage: false,
    sendFarewellMessage: false,
    queueEntryMessage:
      "Você está na fila *{{queue}}*. Em breve será atendido!",
  };
  const [whatsApp, setWhatsApp] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [queues, setQueues] = useState([]);
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [enableImportMessage, setEnableImportMessage] = useState(false);
  const [importOldMessagesGroups, setImportOldMessagesGroups] = useState(false);
  const [closedTicketsPostImported, setClosedTicketsPostImported] =
    useState(false);
  const [importOldMessages, setImportOldMessages] = useState(
    moment().add(-1, "days").format("YYYY-MM-DDTHH:mm")
  );
  const [importRecentMessages, setImportRecentMessages] = useState(
    moment().add(-1, "minutes").format("YYYY-MM-DDTHH:mm")
  );
  const [copied, setCopied] = useState(false);
  const [integrations, setIntegrations] = useState([]);
  const [schedulesEnabled, setSchedulesEnabled] = useState(false);
  const [NPSEnabled, setNPSEnabled] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const { user } = useContext(AuthContext);
  const [isOficial, setIsOficial] = useState(false);
  const [useWhatsappOfficial, setUseWhatsappOfficial] = useState(false);
  const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [createdWhatsAppId, setCreatedWhatsAppId] = useState(null);
  const [wizardSaving, setWizardSaving] = useState(false);

  const effectiveWhatsAppId = whatsAppId || createdWhatsAppId;

  const isOfficialChannel =
    channel === "whatsapp_oficial" || isOficial;

  const [schedules, setSchedules] = useState([
    {
      weekday: i18n.t("queueModal.serviceHours.monday"),
      weekdayEn: "monday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.tuesday"),
      weekdayEn: "tuesday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.wednesday"),
      weekdayEn: "wednesday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.thursday"),
      weekdayEn: "thursday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.friday"),
      weekdayEn: "friday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: "SÃ¡bado",
      weekdayEn: "saturday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: "Domingo",
      weekdayEn: "sunday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
  ]);

  const { get: getSetting } = useCompanySettings();
  const { getPlanCompany } = usePlans();

  const [selectedPrompt, setSelectedPrompt] = useState("__none__");
  const [triggerIntegrationOnClose, setTriggerIntegrationOnClose] =
    useState(true);
  const [integrationType, setIntegrationType] = useState("n8n");
  const [integrationTypeId, setIntegrationTypeId] = useState(null);

  const [prompts, setPrompts] = useState([]);
  const [connectionAgents, setConnectionAgents] = useState([]);

  const [webhooks, setWebhooks] = useState([]);
  const [flowIdNotPhrase, setFlowIdNotPhrase] = useState();
  const [flowIdWelcome, setFlowIdWelcome] = useState();
  const [flowIdInactiveTime, setFlowIdInactiveTime] = useState();
  const [timeAwaitActiveFlowId, setTimeAwaitActiveFlowId] = useState();
  const [showWavoipCall, setShowWavoipCall] = useState(false);
  useEffect(() => {
    if (!open) return;
    setWizardStep(STEP.BASIC);
    if (!whatsAppId) {
      const oficial = channel === "whatsapp_oficial";
      setIsOficial(oficial);
      if (oficial) {
        setWhatsApp((prev) => ({ ...prev, isOficial: true }));
      }
    }
  }, [open, whatsAppId, channel]);

  useEffect(() => {
    if (!whatsAppId && !whatsApp.token) {
      setAutoToken(generateRandomCode(30));
    } else if (whatsAppId && !whatsApp.token) {
      setAutoToken(generateRandomCode(30));
    } else {
      setAutoToken(whatsApp.token);
    }
  }, [whatsAppId, whatsApp.token]);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      const companyId = user?.companyId;
      if (!companyId) return;
      try {
        const planConfigs = await getPlanCompany(undefined, companyId);
        if (cancelled) return;
        const plan = planConfigs?.plan;
        setShowIntegrations(!!plan?.useIntegrations);
        setUseWhatsappOfficial(!!plan?.useWhatsappOfficial);
        setShowWavoipCall(!!plan?.wavoip);
      } catch (err) {
        if (!cancelled) toastError(err);
      }
    }
    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      try {
        let page = 1;
        let all = [];
        let hasMore = true;
        while (hasMore && !cancelled) {
          const { data } = await api.get("/prompt", { params: { pageNumber: String(page) } });
          const chunk = Array.isArray(data?.prompts) ? data.prompts : [];
          all = all.concat(chunk);
          hasMore = !!data?.hasMore;
          page += 1;
          if (page > 200) break;
        }
        if (!cancelled) setPrompts(all);
      } catch (err) {
        if (!cancelled) {
          toastError(err);
          setPrompts([]);
        }
      }
      try {
        const opts = await anthropicIntegrationService.getConnectionAgentOptions();
        if (!cancelled) {
          const openAi = Array.isArray(opts?.openAiAgents) ? opts.openAiAgents : [];
          const claude = Array.isArray(opts?.claudeAgents) ? opts.claudeAgents : [];
          setConnectionAgents([...openAi, ...claude]);
        }
      } catch {
        if (!cancelled) setConnectionAgents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, whatsAppId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/flowbuilder");
        setWebhooks(Array.isArray(data?.flows) ? data.flows : []);
      } catch (err) {
        toastError(err);
        setWebhooks([]);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingSchedules = await getSetting({
          column: "scheduleType",
        });
        setSchedulesEnabled(settingSchedules?.scheduleType === "connection");
        const settingNPS = await getSetting({
          column: "userRating",
        });
        setNPSEnabled(settingNPS?.userRating === "enabled");
      } catch (err) {
        toastError(err);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnableImportMessage = async (e) => {
    setEnableImportMessage(e.target.checked);
  };

  const handleEnableIsOficial = async (e) => {
    setIsOficial(e.target.checked);
  };

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        const { data } = await api.get(`whatsapp/${whatsAppId}?session=0`);

        if (data && data?.flowIdNotPhrase) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.flowIdNotPhrase}`
          );
          const selectedFlowIdNotPhrase = flowDefault?.flow.id;
          setFlowIdNotPhrase(selectedFlowIdNotPhrase);
        }

        if (data && data?.flowIdWelcome) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.flowIdWelcome}`
          );
          const selectedFlowIdWelcome = flowDefault?.flow.id;
          setFlowIdWelcome(selectedFlowIdWelcome);
        }

        if (data && data?.flowIdInactiveTime) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.flowIdInactiveTime}`
          );
          const selectedFlowIdInactiveTime = flowDefault?.flow.id;
          setFlowIdInactiveTime(selectedFlowIdInactiveTime);
        }

        if (data && data?.timeAwaitActiveFlowId) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.timeAwaitActiveFlowId}`
          );
          const selectedTimeAwaitActiveFlowId = flowDefault?.flow.id;
          setTimeAwaitActiveFlowId(selectedTimeAwaitActiveFlowId);
        }

        setWhatsApp({
          ...initialState,
          ...data,
          queuesEnabled: data.queuesEnabled !== false,
          sendGreetingMessage: Boolean(data.sendGreetingMessage),
          sendFarewellMessage: Boolean(data.sendFarewellMessage),
        });
        setIsOficial(!!data.isOficial || data.channel === "whatsapp_oficial");
        setAttachmentName(data.greetingMediaAttachment);
        setAutoToken(data.token);
        setSelectedPrompt(whatsappAgentValueFromRecord(data));
        const whatsQueueIds = Array.isArray(data.queues)
          ? data.queues.map((queue) => queue.id)
          : [];
        setSelectedQueueIds(whatsQueueIds);
        if (Array.isArray(data.schedules) && data.schedules.length > 0) {
          setSchedules(data.schedules);
        }
        if (!isNil(data?.importOldMessages)) {
          setEnableImportMessage(true);
          setImportOldMessages(data?.importOldMessages);
          setImportRecentMessages(data?.importRecentMessages);
          setClosedTicketsPostImported(data?.closedTicketsPostImported);
          setImportOldMessagesGroups(data?.importOldMessagesGroups);
        }
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  const reloadQueues = async () => {
    try {
      const { data } = await api.get("/queue");
      setQueues(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    reloadQueues();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/queueIntegration");
        setIntegrations(Array.isArray(data?.queueIntegrations) ? data.queueIntegrations : []);
      } catch (err) {
        toastError(err);
        setIntegrations([]);
      }
    })();
  }, []);

  const handleChangeQueue = (newIds) => {
    setSelectedQueueIds((prev) => {
      const kept = prev.filter((id) => newIds.includes(id));
      const added = newIds.filter((id) => !prev.includes(id));
      return [...kept, ...added];
    });
  };

  const handleReorderQueue = (index, direction) => {
    setSelectedQueueIds((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return prev;
      }
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleChangePrompt = (e) => {
    setSelectedPrompt(e.target.value);
  };

  const handleChange = (e) => {
    setTriggerIntegrationOnClose(e.target.value);
  };

  const handleIntegrationTypeChange = (e) => {
    setIntegrationType(e.target.value);
    setIntegrationTypeId(e.target.value);
  };

  const handleSaveWhatsApp = async (values, options = {}) => {
    const { closeOnSuccess = true, showToast = true } = options;
    const saveId = effectiveWhatsAppId;

    if (!saveId) setAutoToken(generateRandomCode(30));

    const hasNpsContent =
      values.ratingMessage && String(values.ratingMessage).trim().length > 0;
    if (NPSEnabled && hasNpsContent) {
      if (
        values.expiresTicketNPS === "0" ||
        values.expiresTicketNPS === "" ||
        values.expiresTicketNPS === 0
      ) {
        toastError(i18n.t("whatsappModal.errorExpiresNPS"));
        return;
      }
    }

    if (values.timeSendQueue === "") values.timeSendQueue = "0";

    if (
      (values.sendIdQueue === 0 ||
        values.sendIdQueue === "" ||
        isNil(values.sendIdQueue)) &&
      values.timeSendQueue !== 0 &&
      values.timeSendQueue !== "0"
    ) {
      toastError(i18n.t("whatsappModal.errorSendQueue"));
      return;
    }

    const agentFields = parseConnectionAgentValueForSave(selectedPrompt);

    const whatsappData = {
      ...values,
      flowIdWelcome: flowIdWelcome ? flowIdWelcome : null,
      flowIdInactiveTime: flowIdInactiveTime ? flowIdInactiveTime : null,
      flowIdNotPhrase: flowIdNotPhrase ? flowIdNotPhrase : null,
      timeAwaitActiveFlowId: timeAwaitActiveFlowId
        ? timeAwaitActiveFlowId
        : null,
      queueIds: selectedQueueIds,
      importOldMessages: enableImportMessage ? importOldMessages : null,
      importRecentMessages: enableImportMessage ? importRecentMessages : null,
      importOldMessagesGroups: importOldMessagesGroups
        ? importOldMessagesGroups
        : null,
      closedTicketsPostImported: closedTicketsPostImported
        ? closedTicketsPostImported
        : null,
      token: autoToken ? autoToken : null,
      schedules,
      connectionAgent: agentFields.connectionAgent,
      agentDisabled: agentFields.agentDisabled,
      channel,
      isOficial: channel === "whatsapp_oficial" || isOficial,
      triggerIntegrationOnClose: triggerIntegrationOnClose,
      integrationTypeId: triggerIntegrationOnClose ? integrationTypeId : null,
      color: values.color ? values.color : getRandomHexColor(),
      wavoip: values.wavoip ? values.wavoip : null,
    };
    delete whatsappData["queues"];
    delete whatsappData["session"];

    try {
      let savedId = saveId;

      if (saveId) {
        if (
          enableImportMessage &&
          whatsApp?.status === "CONNECTED"
        ) {
          try {
            setWhatsApp({ ...whatsApp, status: "qrcode" });
            await api.delete(`/whatsappsession/${whatsApp.id}`);
          } catch (err) {
            toastError(err);
          }
        }

        await api.put(`/whatsapp/${saveId}`, whatsappData);
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/whatsapp/${saveId}/media-upload`, formData);
        }
        if (!attachmentName && whatsApp.greetingMediaAttachment !== null) {
          await api.delete(`/whatsapp/${saveId}/media-upload`);
        }
      } else {
        const { data } = await api.post("/whatsapp", whatsappData);
        savedId = data.id;
        setCreatedWhatsAppId(data.id);
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/whatsapp/${data.id}/media-upload`, formData);
        }
      }

      if (typeof onConnectionSaved === "function") {
        onConnectionSaved(savedId);
      }
      if (showToast) {
        toast.success(i18n.t("whatsappModal.success"));
      }
      if (closeOnSuccess) {
        handleClose();
      }
      return savedId;
    } catch (err) {
      toastError(err);
      return null;
    }
  };

  function generateRandomCode(length) {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyvz0123456789";
    let code = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      code += charset.charAt(randomIndex);
    }
    return code;
  }

  const handleRefreshToken = () => {
    setAutoToken(generateRandomCode(30));
  };

  const handleChangeFlowIdNotPhrase = (e) => {
    console.log(e.target.value);
    setFlowIdNotPhrase(e.target.value);
  };

  const handleChangeFlowIdWelcome = (e) => {
    setFlowIdWelcome(e.target.value);
  };

  const handleChangeFlowIdInactiveTime = (e) => {
    setFlowIdInactiveTime(e.target.value);
  };

  const handleChangeTimeAwaitActiveFlowId = (e) => {
    setTimeAwaitActiveFlowId(e.target.value);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(autoToken); // Copia o token para a Ã¡rea de transferÃªncia
    setCopied(true); // Define o estado de cÃ³pia como verdadeiro
  };

  const handleSaveSchedules = async (values) => {
    toast.success("Clique em salvar para registar as alteraÃ§Ãµes");
    setSchedules(values);
  };

  const handleClose = () => {
    onClose();
    setWhatsApp(initialState);
    setEnableImportMessage(false);
    setAttachment(null);
    setAttachmentName("");
    setCopied(false);
    setSelectedPrompt("__none__");
    setWizardStep(1);
    setCreatedWhatsAppId(null);
    setWizardSaving(false);
  };

  const handleEmbeddedSignupSuccess = (wa) => {
    if (!wa) return;
    setCreatedWhatsAppId(wa.id);
    if (typeof onConnectionSaved === "function") {
      onConnectionSaved();
    }
  };

  const validateWizardStep = (step, values) => {
    if (step === STEP.BASIC) {
      if (!values.name || values.name.trim().length < 2) {
        toast.error("Informe o nome da conexão.");
        return false;
      }
      if (isOfficialChannel) {
        const required = [
          "phone_number_id",
          "waba_id",
          "business_id",
          "phone_number",
          "send_token",
        ];
        const missing = required.filter((k) => !values[k] || !String(values[k]).trim());
        if (missing.length) {
          toast.error("Preencha todos os campos da API Oficial.");
          return false;
        }
      }
    }
    if (step === STEP.QUEUES) {
      if (values.queuesEnabled) {
        if (!selectedQueueIds.length) {
          toast.error("Selecione ao menos uma fila.");
          return false;
        }
        if (selectedQueueIds.length >= 2 && !values.greetingMessage?.trim()) {
          toast.error("Informe o texto do menu de filas.");
          return false;
        }
      }
    }
    return true;
  };

  const handleWizardNext = async (values, submitForm, isSubmitting, setFieldValue) => {
    if (!validateWizardStep(wizardStep, values)) return;
    if (wizardStep === STEP.BASIC) {
      setWizardStep(STEP.QUEUES);
      return;
    }
    if (wizardStep === STEP.QUEUES) {
      if (wizardSaving || isSubmitting) return;
      setWizardSaving(true);
      try {
        const savedId = await handleSaveWhatsApp(values, {
          closeOnSuccess: false,
          showToast: false,
        });
        if (!savedId) return;
        const hasExtras = NPSEnabled || user.showFlow === "enabled";
        if (hasExtras) {
          setWizardStep(STEP.NPS);
        } else {
          toast.success(i18n.t("whatsappModal.success"));
          handleClose();
        }
      } finally {
        setWizardSaving(false);
      }
      return;
    }
    if (wizardStep === STEP.NPS && !isSubmitting) {
      submitForm();
    }
  };

  const handleWizardBack = () => {
    setWizardStep((s) => Math.max(STEP.BASIC, s - 1));
  };

  const handleWizardSkip = (isSubmitting, submitForm) => {
    if (wizardStep === STEP.NPS && !isSubmitting) {
      submitForm();
    }
  };

  const handleFileUpload = () => {
    const file = inputFileRef.current.files[0];
    setAttachment(file);
    setAttachmentName(file.name);
    inputFileRef.current.value = null;
  };

  const handleDeleFile = () => {
    setAttachment(null);
    setAttachmentName(null);
  };

  const formikBlock = (
    <Formik
      initialValues={whatsApp}
      enableReinitialize={true}
      validationSchema={SessionSchema}
      onSubmit={(values, actions) => {
        setTimeout(() => {
          handleSaveWhatsApp(values);
          actions.setSubmitting(false);
        }, 400);
      }}
    >
      {({ values, touched, errors, isSubmitting, submitForm, setFieldValue }) => {
        const footer = (
          <WizardFooter
            wizardStep={wizardStep}
            isSubmitting={isSubmitting || wizardSaving}
            isEdit={!!whatsAppId}
            embedded={embeddedPage}
            onClose={handleClose}
            onBack={handleWizardBack}
            onNext={() =>
              handleWizardNext(values, submitForm, isSubmitting, setFieldValue)
            }
            onSkip={() => handleWizardSkip(isSubmitting, submitForm)}
            onSubmit={() => !isSubmitting && submitForm()}
            NPSEnabled={NPSEnabled}
            showFlow={user.showFlow === "enabled"}
          />
        );
        const body = (
          <>
            {!embeddedPage ? (
              <WizardModalHeader
                isOfficialChannel={isOfficialChannel}
                channel={channel}
                onClose={handleClose}
                isEdit={!!whatsAppId}
              />
            ) : null}
            <Box
              className={
                embeddedPage ? classes.pageStepsTrack : classes.wizardStepsTrack
              }
            >
              <WizardStepIndicator
                step={wizardStep}
                classes={classes}
                NPSEnabled={NPSEnabled}
                showFlow={user.showFlow === "enabled"}
              />
            </Box>
            <Box
              className={`${
                embeddedPage ? classes.pageWizardBody : classes.wizardBody
              } ${
                embeddedPage && wizardStep === STEP.QUEUES
                  ? classes.pageWizardBodyQueues
                  : ""
              }`}
            >
              <Box
                className={`${classes.wizardStepPanel} ${
                  embeddedPage ? classes.pageWizardStepPanel : ""
                } ${
                  wizardStep === STEP.BASIC ? classes.wizardStepPanelCompact : ""
                } ${
                  wizardStep === STEP.QUEUES
                    ? `${
                        embeddedPage
                          ? classes.pageWizardStepPanelQueues
                          : classes.wizardStepPanelQueues
                      }`
                    : ""
                }`}
              >
                {wizardStep === STEP.BASIC && (
                  <WizardStep1
                    values={values}
                    touched={touched}
                    errors={errors}
                    isOfficialChannel={isOfficialChannel}
                    enableImportMessage={enableImportMessage}
                    handleEnableImportMessage={handleEnableImportMessage}
                    importOldMessagesGroups={importOldMessagesGroups}
                    setImportOldMessagesGroups={setImportOldMessagesGroups}
                    closedTicketsPostImported={closedTicketsPostImported}
                    setClosedTicketsPostImported={setClosedTicketsPostImported}
                    importOldMessages={importOldMessages}
                    setImportOldMessages={setImportOldMessages}
                    importRecentMessages={importRecentMessages}
                    setImportRecentMessages={setImportRecentMessages}
                    queues={queues}
                    colorPickerModalOpen={colorPickerModalOpen}
                    setColorPickerModalOpen={setColorPickerModalOpen}
                    setWhatsApp={setWhatsApp}
                    whatsAppId={effectiveWhatsAppId}
                    onEmbeddedSignupSuccess={handleEmbeddedSignupSuccess}
                  />
                )}
                {wizardStep === STEP.QUEUES && (
                  <WizardStep2
                    values={values}
                    setFieldValue={setFieldValue}
                    selectedQueueIds={selectedQueueIds}
                    handleChangeQueue={handleChangeQueue}
                    onReorderQueues={handleReorderQueue}
                    queues={queues}
                    onAddQueue={() => setQueueModalOpen(true)}
                    selectedPrompt={selectedPrompt}
                    handleChangePrompt={handleChangePrompt}
                    prompts={connectionAgents.length ? connectionAgents : prompts}
                    connectionAgents={connectionAgents}
                  />
                )}
                {wizardStep === STEP.NPS && (
                  <WizardStep4
                    touched={touched}
                    errors={errors}
                    NPSEnabled={NPSEnabled}
                    showFlow={user.showFlow === "enabled"}
                    webhooks={webhooks}
                    flowIdWelcome={flowIdWelcome}
                    flowIdNotPhrase={flowIdNotPhrase}
                    handleChangeFlowIdWelcome={handleChangeFlowIdWelcome}
                    handleChangeFlowIdNotPhrase={handleChangeFlowIdNotPhrase}
                  />
                )}
              </Box>
            </Box>
          </>
        );
        if (embeddedPage) {
          return (
            <ConnectionsMagicFrame fluid noPanel formPanel>
              <Form className={magicFrame.embeddedForm}>
                <Box className={magicFrame.embeddedBody}>{body}</Box>
                <Box className={magicFrame.setupStickyFooter}>{footer}</Box>
              </Form>
            </ConnectionsMagicFrame>
          );
        }
        return (
          <Form>
            <DialogContent className={classes.wizardShell}>{body}</DialogContent>
            <DialogActions>{footer}</DialogActions>
          </Form>
        );
      }}
    </Formik>
  );

  if (embeddedPage) {
    if (!open) return null;
    return (
      <div className={`${classes.root} ${classes.pageEmbeddedRoot}`}>
        <QueueModal
          open={queueModalOpen}
          onClose={() => setQueueModalOpen(false)}
          onEdit={() => reloadQueues()}
        />
        {formikBlock}
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <QueueModal
        open={queueModalOpen}
        onClose={() => setQueueModalOpen(false)}
        onEdit={() => reloadQueues()}
      />
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth={false}
        scroll="paper"
        className={`${classes.appleDialog}${
          wizardStep === STEP.BASIC ? ` ${classes.appleDialogStep1}` : ""
        }${wizardStep === STEP.QUEUES ? ` ${classes.appleDialogQueues}` : ""}`}
        disableBackdropClick={!whatsAppId}
      >
        {formikBlock}
      </Dialog>
    </div>
  );
};

export default React.memo(WhatsAppModal);
