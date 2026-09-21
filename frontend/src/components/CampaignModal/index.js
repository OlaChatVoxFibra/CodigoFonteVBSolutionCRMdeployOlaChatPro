/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useRef, useContext, useMemo } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { head } from "lodash";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import Chip from '@material-ui/core/Chip';
import RepeatIcon from '@material-ui/icons/Repeat';
import VisibilityIcon from '@material-ui/icons/Visibility';
import MicIcon from "@material-ui/icons/Mic";
import PhoneIcon from "@material-ui/icons/Phone";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import { isNil } from "lodash";
import { i18n } from "../../translate/i18n";
import moment from "moment";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import MetaOfficialTemplateSelector from "../MetaOfficial/MetaOfficialTemplateSelector";
import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  FormControlLabel,
  Switch,
  Typography,
  Collapse,
  List,
  ListItem,
  ListItemText,
  FormHelperText,
  Card,
  CardContent,
  Checkbox,
  FormGroup,
  Stepper,
  Step,
  StepLabel,
} from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import ConfirmationModal from "../ConfirmationModal";
import UserStatusIcon from "../UserModal/statusIcon";
import Autocomplete, { createFilterOptions } from "@material-ui/lab/Autocomplete";
import useQueues from "../../hooks/useQueues";
import AudioRecorder from "../AudioRecorder";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },
  extraAttr: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  recurrenceCard: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
  },
  previewCard: {
    marginTop: theme.spacing(1),
    maxHeight: 200,
    overflow: 'auto',
  },
  messageTabs: {
    width: '100%',
    background: theme.palette.type === "dark" ? theme.palette.background.default : theme.palette.grey[50],
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
  },
  outlinePrimaryButton: {
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
  },
  tabItem: {
    minWidth: 0,
    maxWidth: 'none',
    flex: '1 1 0',
    padding: theme.spacing(1, 0.5),
    fontSize: 13
  },
  recurrenceIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  mediaContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(1)
  },
  mediaOptions: {
    display: 'flex',
    gap: theme.spacing(1),
    justifyContent: 'flex-start',
    flexWrap: 'wrap'
  },
  mediaInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1),
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius
  },
  footerStepper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%'
  },
  dialogPaperSmall: {
    width: 1000,
    minWidth: 320,
    maxWidth: '95vw',
    margin: '0 auto',
    borderRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden'
  },
  dialogContentScrollable: {
    maxHeight: '75vh',
    overflowY: 'auto'
  },
  /* Layout step Template: form à esquerda, preview à direita */
  templateStepRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    alignItems: 'flex-start',
  },
  templateFormColumn: {
    flex: '1 1 400px',
    minWidth: 0,
  },
  templatePreviewColumn: {
    flex: '0 0 320px',
    [theme.breakpoints.down('sm')]: {
      flex: '1 1 100%',
    },
  },
  /* iPhone frame (mockup) */
  iphoneFrame: {
    width: 280,
    margin: '0 auto',
    position: 'relative',
    borderRadius: 36,
    padding: 4,
    paddingTop: 4,
    paddingBottom: 4,
    background: 'linear-gradient(145deg, #2c2c2e 0%, #1c1c1e 100%)',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
    border: '2px solid #3a3a3c',
  },
  iphoneNotch: {
    position: 'absolute',
    top: 4,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 90,
    height: 20,
    borderRadius: 16,
    backgroundColor: '#000',
    margin: '0 auto',
    zIndex: 2,
  },
  iphoneScreen: {
    width: '100%',
    height: 480,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#e5ddd5',
    display: 'flex',
    flexDirection: 'column',
  },
  iphoneStatusBar: {
    height: 18,
    padding: '2px 10px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#075e54',
    color: '#fff',
    fontSize: 10,
    opacity: 0.9,
  },
  whatsappPreviewHeader: {
    background: '#075e54',
    color: '#fff',
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderBottom: '1px solid rgba(0,0,0,0.2)',
  },
  whatsappHeaderAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    backgroundColor: '#128c7e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    overflow: 'hidden',
    flexShrink: 0,
  },
  whatsappHeaderAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  whatsappHeaderText: {
    display: 'flex',
    flexDirection: 'column',
  },
  whatsappHeaderTitle: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.1,
  },
  whatsappHeaderSubtitle: {
    fontSize: 11,
    opacity: 0.9,
  },
  whatsappHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  whatsappHeaderPhoneBtn: {
    color: '#fff',
    padding: 6,
    '& .MuiSvgIcon-root': { fontSize: 20 },
  },
  whatsappDateTag: {
    display: 'block',
    textAlign: 'center',
    marginBottom: 8,
    '& span': {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: 8,
      backgroundColor: 'rgba(0,0,0,0.12)',
      color: 'rgba(0,0,0,0.7)',
      fontSize: 12,
      fontWeight: 500,
    },
  },
  whatsappPreviewChat: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 10px 16px',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 0L30 60M0 30L60 30\' stroke=\'%23d4cdc4\' stroke-width=\'0.5\' fill=\'none\'/%3E%3C/svg%3E")',
    backgroundColor: '#e5ddd5',
  },
  whatsappBubble: {
    maxWidth: '85%',
    marginLeft: 'auto',
    marginBottom: 3,
    padding: '6px 10px',
    borderRadius: 16,
    borderTopRightRadius: 4,
    backgroundColor: '#dcf8c6',
    boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
    fontSize: 13,
    lineHeight: 1.35,
    wordBreak: 'break-word',
    textAlign: 'left',
  },
  whatsappPreviewFooter: {
    padding: '6px 8px',
    backgroundColor: '#f0f0f0',
    borderTop: '1px solid rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  whatsappFooterInput: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: '6px 10px',
    fontSize: 12,
    border: '1px solid rgba(0,0,0,0.08)',
    outline: 'none',
    color: 'rgba(0,0,0,0.87)',
    '&::placeholder': { color: '#999' },
  },
  whatsappBubbleTime: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.45)',
    marginTop: 1,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  whatsappBubbleWithIcon: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  contactListToolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    alignItems: 'center',
    marginBottom: theme.spacing(2)
  },
  contactRow: {
    cursor: 'pointer',
    padding: theme.spacing(1.5, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    '&:hover': {
      backgroundColor: theme.palette.action.hover
    }
  },
  contactRowCheckbox: {
    padding: 4,
    '& .MuiIconButton-label': {
      width: 22,
      height: 22
    },
    '& .MuiSvgIcon-root': {
      width: 24,
      height: 24
    }
  },
  contactListScroll: {
    maxHeight: 320,
    overflowY: 'auto',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius
  },
  contactTagChip: {
    marginLeft: theme.spacing(1),
    fontSize: '0.75rem'
  },
  intervalNotice: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1.5),
    backgroundColor: theme.palette.warning?.light || '#fff3e0',
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.875rem'
  }
}));

const MESSAGE_INTERVAL_OPTIONS = [
  { value: 10, label: '10 segundos' },
  { value: 20, label: '20 segundos' },
  { value: 30, label: '30 segundos' },
  { value: 45, label: '45 segundos' },
  { value: 60, label: '60 segundos' },
  { value: 120, label: '2 minutos' },
  { value: 180, label: '3 minutos' },
  { value: 240, label: '4 minutos' },
  { value: 300, label: '5 minutos' }
];

// Variáveis dinâmicas disponíveis para campanhas (espelhando /email)
const campaignVariables = [
  { token: "{nome}", label: "Nome do contato" },
  { token: "{email}", label: "Email do contato" },
  { token: "{telefone}", label: "Telefone do contato" },
  { token: "{numero}", label: "Número do contato" },
  { token: "{empresa}", label: "Nome da empresa" },
  { token: "{razao_social}", label: "Razão social" },
  { token: "{endereco}", label: "Endereço" },
  { token: "{data}", label: "Data atual (DD/MM/AAAA)" },
  { token: "{hora}", label: "Hora atual (HH:mm)" },
  { token: "{produto}", label: "Produto" },
  { token: "{valor}", label: "Valor" },
  { token: "{vencimento}", label: "Vencimento" },
  { token: "{cargo}", label: "Cargo" }
];


// No CampaignModal.js - Atualizar o schema de validação

const CampaignSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
  isRecurring: Yup.boolean().default(false),
  recurrenceType: Yup.string().when('isRecurring', {
    is: true,
    then: Yup.string().oneOf(['minutely', 'hourly', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']).required('Tipo de recorrência é obrigatório'),
    otherwise: Yup.string().nullable()
  }),
  recurrenceInterval: Yup.number().when('isRecurring', {
    is: true,
    then: Yup.number().min(1, 'Intervalo deve ser maior que 0').required('Intervalo é obrigatório'),
    otherwise: Yup.number().nullable()
  }),
  // CORREÇÃO: Validar como array mas permitir vazio
  recurrenceDaysOfWeek: Yup.array().when(['isRecurring', 'recurrenceType'], {
    is: (isRecurring, recurrenceType) => isRecurring && recurrenceType === 'weekly',
    then: Yup.array().min(1, 'Selecione pelo menos um dia da semana').required(),
    otherwise: Yup.array().nullable()
  }),
  recurrenceDayOfMonth: Yup.number().when(['isRecurring', 'recurrenceType'], {
    is: (isRecurring, recurrenceType) => isRecurring && recurrenceType === 'monthly',
    then: Yup.number().min(1, 'Dia deve ser entre 1 e 31').max(31, 'Dia deve ser entre 1 e 31').required('Dia do mês é obrigatório'),
    otherwise: Yup.number().nullable()
  }),
  recurrenceEndDate: Yup.date().when('isRecurring', {
    is: true,
    then: Yup.date().min(new Date(), 'Data final deve ser futura').nullable(),
    otherwise: Yup.date().nullable()
  }),
  maxExecutions: Yup.number().when('isRecurring', {
    is: true,
    then: Yup.number().min(1, 'Número máximo deve ser maior que 0').nullable(),
    otherwise: Yup.number().nullable()
  })
});

const CampaignModal = ({
  open,
  onClose,
  campaignId,
  initialValues,
  onSave,
  resetPagination,
  onSendNowStart,
  forceWhatsappOficial = false,
}) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const { user, socket } = useContext(AuthContext);
  const { companyId } = user;

  const initialState = {
    name: "",
    message1: "",
    message2: "",
    message3: "",
    message4: "",
    message5: "",
    confirmationMessage1: "",
    confirmationMessage2: "",
    confirmationMessage3: "",
    confirmationMessage4: "",
    confirmationMessage5: "",
    status: "INATIVA",
    confirmation: false,
    scheduledAt: "",
    contactListId: "",
    tagListId: "Nenhuma",
    companyId,
    statusTicket: "closed",
    openTicket: "disabled",
    // Novos campos de recorrência
    isRecurring: false,
    recurrenceType: "",
    recurrenceInterval: 1,
    recurrenceDaysOfWeek: [],
    recurrenceDayOfMonth: 1,
    recurrenceEndDate: "",
    maxExecutions: null,
  };

  const [currentField, setCurrentField] = useState(null);

  const [campaign, setCampaign] = useState(initialState);
  const [whatsapps, setWhatsapps] = useState([]);
  const [selectedWhatsapps, setSelectedWhatsapps] = useState([]);
 const [whatsappId, setWhatsappId] = useState(null);
  const [contactLists, setContactLists] = useState([]);
  const [tagLists, setTagLists] = useState([]);
  const [messageTab, setMessageTab] = useState(0);
  const [attachment, setAttachment] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [campaignEditable, setCampaignEditable] = useState(true);
  const [previewExecutions, setPreviewExecutions] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const attachmentFile = useRef(null);
  const [activeStep, setActiveStep] = useState(0);

  const [options, setOptions] = useState([]);
  const [queues, setQueues] = useState([]);
  const [allQueues, setAllQueues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const { findAll: findAllQueues } = useQueues();
  // Seleção direta de contatos
  const [contactsOptions, setContactsOptions] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsSearch, setContactsSearch] = useState("");
  const [loadingAllContacts, setLoadingAllContacts] = useState(false);
  const hasPreloadedAllContacts = React.useRef(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [sendingProgress, setSendingProgress] = useState({
    visible: false,
    total: 0,
    delivered: 0,
    campaignId: null
  });
  const deliveredShippingIdsRef = useRef(new Set());
  const sendNowInProgressRef = useRef(false);
  const [sendNowInProgress, setSendNowInProgress] = useState(false);
  const [messageIntervalSeconds, setMessageIntervalSeconds] = useState(30);
  const [contactFilterTagId, setContactFilterTagId] = useState("");
  const [metaTemplateSelection, setMetaTemplateSelection] = useState(null);
  const [metaTemplateIds, setMetaTemplateIds] = useState([]);

  const selectedWhatsappChannel = useMemo(() => {
    const w = (whatsapps || []).find((x) => Number(x.id) === Number(whatsappId));
    return w?.channel || null;
  }, [whatsapps, whatsappId]);

  const uniqueContactLists = useMemo(() => {
    const seen = new Set();
    return (contactLists || []).filter((l) => {
      const key = String(l?.name || "").trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [contactLists]);

  const filteredContactsForList = useMemo(() => {
    let list = contactsOptions || [];

    // Garantir filtro de tag também no front, independente do backend
    if (contactFilterTagId) {
      list = list.filter((c) =>
        Array.isArray(c.tags) &&
        c.tags.some((t) => String(t.id) === String(contactFilterTagId))
      );
    }

    if (!contactsSearch.trim()) return list;

    const q = contactsSearch.trim().toLowerCase();
    return list.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const number = (c.number || "").toLowerCase();
      const tagsStr = (c.tags || []).map((t) => (t.name || "").toLowerCase()).join(" ");
      return name.includes(q) || number.includes(q) || tagsStr.includes(q);
    });
  }, [contactsOptions, contactsSearch, contactFilterTagId]);

  // Opções para dias da semana
  const daysOfWeekOptions = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
  ];

  // Função para preview das execuções
  const handlePreviewRecurrence = async (values) => {
    if (!values.isRecurring || !values.recurrenceType || !values.scheduledAt) {
      setPreviewExecutions([]);
      return;
    }

    try {
      const params = {
        recurrenceType: values.recurrenceType,
        recurrenceInterval: values.recurrenceInterval,
        recurrenceDaysOfWeek: JSON.stringify(values.recurrenceDaysOfWeek),
        recurrenceDayOfMonth: values.recurrenceDayOfMonth,
      };

      if (campaignId) {
        const { data } = await api.get(`/campaigns/${campaignId}/recurrence-preview`, { params });
        setPreviewExecutions(data.executions);
      } else {
        // Para campanhas novas, calcular localmente ou usar endpoint genérico
        const mockExecutions = calculateMockExecutions(values);
        setPreviewExecutions(mockExecutions);
      }
    } catch (err) {
      console.error('Erro ao buscar preview:', err);
    }
  };

  // Função auxiliar para calcular execuções mock
  const calculateMockExecutions = (values) => {
    const executions = [];
    let currentDate = moment(values.scheduledAt);
    
    for (let i = 0; i < 5; i++) {
      executions.push(currentDate.format('DD/MM/YYYY HH:mm'));
      
      switch (values.recurrenceType) {
        case 'minutely':
          currentDate = currentDate.clone().add(values.recurrenceInterval, 'minutes');
          break;
        case 'hourly':
          currentDate = currentDate.clone().add(values.recurrenceInterval, 'hours');
          break;
        case 'daily':
          currentDate = currentDate.clone().add(values.recurrenceInterval, 'days');
          break;
        case 'weekly':
          currentDate = currentDate.clone().add(values.recurrenceInterval, 'weeks');
          break;
        case 'biweekly':
          currentDate = currentDate.clone().add(values.recurrenceInterval * 2, 'weeks');
          break;
        case 'monthly':
          currentDate = currentDate.clone().add(values.recurrenceInterval, 'months');
          if (values.recurrenceDayOfMonth) {
            currentDate = currentDate.date(values.recurrenceDayOfMonth);
          }
          break;
        case 'yearly':
          currentDate = currentDate.clone().add(values.recurrenceInterval, 'years');
          break;
      }
    }
    
    return executions;
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      const loadQueues = async () => {
        const list = await findAllQueues();
        setAllQueues(list);
        setQueues(list);
      };
      loadQueues();
    }
  }, []);

  useEffect(() => {
    if (searchParam.length < 3) {
      setLoading(false);
      setSelectedQueue("");
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      const fetchUsers = async () => {
        try {
          const { data } = await api.get("/users/");
          setOptions(data.users);
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam]);

  useEffect(() => {
    if (isMounted.current) {
      if (initialValues) {
        setCampaign((prevState) => {
          return { ...prevState, ...initialValues };
        });
      }

      api
        .get(`/contact-lists/list`, { params: { companyId } })
        .then(({ data }) => setContactLists(data));

      api
        .get(`/whatsapp`, { params: { companyId, session: 0 } })
        .then(({ data }) => {
          const activeOnly = (data || []).filter((w) => w.status === "CONNECTED");
          const scoped = forceWhatsappOficial
            ? activeOnly.filter((w) => w.channel === "whatsapp_oficial")
            : activeOnly;
          const mappedWhatsapps = scoped.map((whatsapp) => ({
            ...whatsapp,
            selected: false,
          }));
          setWhatsapps(mappedWhatsapps);
          if (forceWhatsappOficial && !campaignId && mappedWhatsapps[0]?.id) {
            setWhatsappId(Number(mappedWhatsapps[0].id));
          }
        });

      api.get(`/tags/list`, { params: { companyId, kanban: 0 } })
        .then(({ data }) => {
          const fetchedTags = data;
          const formattedTagLists = fetchedTags
            .filter(tag => tag.contacts.length > 0)
            .map((tag) => ({
              id: tag.id,
              name: `${tag.name} (${tag.contacts.length})`,
            }));
          setTagLists(formattedTagLists);
        })
        .catch((error) => {
          console.error("Error retrieving tags:", error);
        });

      if (!campaignId) return;

      api.get(`/campaigns/${campaignId}`).then(({ data }) => {
        if (data?.user) setSelectedUser(data.user);
        if (data?.queue) setSelectedQueue(data.queue.id);
        if (data?.whatsappId) {
          setWhatsappId(parseInt(data.whatsappId)); // Converter para número
        } else {
          setWhatsappId(null);
        }

        if (data?.metaTemplateQuickMessageId) {
          let vars = {};
          try {
            vars = data.metaTemplateVariables
              ? JSON.parse(data.metaTemplateVariables)
              : {};
          } catch {
            vars = {};
          }
          setMetaTemplateSelection({
            quickMessageId: data.metaTemplateQuickMessageId,
            variables: vars
          });
        } else {
          setMetaTemplateSelection(null);
        }
        
        setCampaign((prev) => {
          let prevCampaignData = Object.assign({}, prev);

          Object.entries(data).forEach(([key, value]) => {
            if (key === "scheduledAt" && value !== "" && value !== null) {
              prevCampaignData[key] = moment(value).format("YYYY-MM-DDTHH:mm");
            } else if (key === "recurrenceEndDate" && value !== "" && value !== null) {
              prevCampaignData[key] = moment(value).format("YYYY-MM-DD");
            } else if (key === "recurrenceDaysOfWeek" && value) {
              prevCampaignData[key] = JSON.parse(value);
            } else {
              prevCampaignData[key] = value === null ? "" : value;
            }
          });

          return prevCampaignData;
        });
      });
    }
  }, [campaignId, open, initialValues, companyId, forceWhatsappOficial]);

  useEffect(() => {
    const now = moment();
    const scheduledAt = moment(campaign.scheduledAt);
    const moreThenAnHour =
      !Number.isNaN(scheduledAt.diff(now)) && scheduledAt.diff(now, "hour") > 1;
    const isEditable =
      campaign.status === "INATIVA" ||
      (campaign.status === "PROGRAMADA" && moreThenAnHour);

    setCampaignEditable(isEditable);
  }, [campaign.status, campaign.scheduledAt]);

  const handleClose = () => {
    onClose();
    setCampaign(initialState);
    setPreviewExecutions([]);
    setShowPreview(false);
    setAttachment(null);
    setAudioBlob(null);
    setActiveStep(0);
    setSendingProgress({ visible: false, total: 0, delivered: 0, campaignId: null });
    setContactFilterTagId("");
    setMessageIntervalSeconds(30);
    setMetaTemplateSelection(null);
    setMetaTemplateIds([]);
  };

  const handleAttachmentFile = (e) => {
    const file = head(e.target.files);
    if (file) {
      setAttachment(file);
      setAudioBlob(null);
    }
  };

  // Busca de contatos para seleção direta (por nome/número e opcionalmente tag)
  useEffect(() => {
    if (!open || activeStep !== 1) return;
    const delay = setTimeout(async () => {
      try {
        setContactsLoading(true);
        const params = {
          name: contactsSearch.trim() || undefined,
          tagId: contactFilterTagId || undefined
        };
        const { data } = await api.get("/contacts/list", { params });
        setContactsOptions(Array.isArray(data) ? data : []);
      } catch (err) {
        toastError(err);
      } finally {
        setContactsLoading(false);
      }
    }, contactsSearch.length < 2 ? 0 : 400);
    return () => clearTimeout(delay);
  }, [open, activeStep, contactsSearch, contactFilterTagId]);


  useEffect(() => {
    if (sendingProgress.visible && sendingProgress.delivered === 0) {
      deliveredShippingIdsRef.current = new Set();
    }
  }, [sendingProgress.visible, sendingProgress.campaignId, sendingProgress.delivered]);

  // Escuta eventos de entrega por contato enquanto a tela de envio está visível
  useEffect(() => {
    if (!sendingProgress.visible || !sendingProgress.campaignId) return;
    const companyId = user.companyId;
    const channel = `company-${companyId}-campaign-shipping`;
    const campaignIdNum = Number(sendingProgress.campaignId);
    const onShipping = (data) => {
      if (data?.action === "delivered" && Number(data?.campaignId) === campaignIdNum) {
        const sid = data?.shippingId;
        if (sid != null) {
          const idKey = String(sid);
          if (deliveredShippingIdsRef.current.has(idKey)) return;
          deliveredShippingIdsRef.current.add(idKey);
        }
        setSendingProgress(prev => ({ ...prev, delivered: Math.min(prev.delivered + 1, prev.total || prev.delivered + 1) }));
        const label = data?.contactName || data?.number || "contato";
        toast.info(`Entregue para ${label}`);
      }
    };
    socket.on(channel, onShipping);
    return () => {
      socket.off(channel, onShipping);
    };
  }, [sendingProgress.visible, sendingProgress.campaignId, socket, user.companyId]);

  // Fechar automaticamente quando completar
  useEffect(() => {
    if (sendingProgress.visible && sendingProgress.total > 0 && sendingProgress.delivered >= sendingProgress.total) {
      toast.success("Envio concluído para todos os contatos selecionados.");
      setTimeout(() => {
        setSendingProgress({ visible: false, total: 0, delivered: 0, campaignId: null });
        handleClose();
      }, 600);
    }
  }, [sendingProgress]);

const handleSaveCampaign = async (values) => {
  try {
    const selectedWa = (whatsapps || []).find(
      (w) => Number(w.id) === Number(whatsappId)
    );
    if (
      (selectedWa?.channel === "whatsapp_oficial" || forceWhatsappOficial) &&
      !(metaTemplateSelection?.quickMessageId || metaTemplateIds?.[0])
    ) {
      toast.error(
        "Campanhas WhatsApp API Oficial exigem ao menos um template Meta aprovado."
      );
      return;
    }

    const resolvedTemplateId =
      metaTemplateSelection?.quickMessageId || metaTemplateIds?.[0] || null;

    const dataValues = {
      ...values,
      whatsappId: whatsappId,
      userId: selectedUser?.id || null,
      queueId: selectedQueue || null,
      // CORREÇÃO: Garantir conversão correta do array
      recurrenceDaysOfWeek: (values.isRecurring && values.recurrenceDaysOfWeek && values.recurrenceDaysOfWeek.length > 0) 
        ? values.recurrenceDaysOfWeek // Enviar array, o backend irá converter para JSON
        : null, // Enviar null se não for recorrente ou array vazio
      metaTemplateQuickMessageId:
        selectedWa?.channel === "whatsapp_oficial" || forceWhatsappOficial
          ? resolvedTemplateId
          : null,
      metaTemplateVariables:
        (selectedWa?.channel === "whatsapp_oficial" || forceWhatsappOficial) &&
        metaTemplateSelection?.variables
          ? JSON.stringify(metaTemplateSelection.variables)
          : null,
    };

    // Processar datas — nunca enviar name como null (Yup exige string)
    Object.entries(values).forEach(([key, value]) => {
      if (key === "scheduledAt" && value !== "" && value !== null) {
        dataValues[key] = moment(value).format("YYYY-MM-DD HH:mm:ss");
      } else if (key === "recurrenceEndDate" && value !== "" && value !== null) {
        dataValues[key] = moment(value).format("YYYY-MM-DD HH:mm:ss");
      } else if (key === "name") {
        dataValues.name =
          String(value || "").trim() ||
          `Campanha Meta ${moment().format("DD/MM/YYYY HH:mm")}`;
      } else if (key !== "recurrenceDaysOfWeek") {
        dataValues[key] = value === "" ? null : value;
      }
    });
    if (!String(dataValues.name || "").trim()) {
      dataValues.name = `Campanha Meta ${moment().format("DD/MM/YYYY HH:mm")}`;
    }

    // Garantir que campos não recorrentes sejam null quando isRecurring é false
    if (!values.isRecurring) {
      dataValues.recurrenceType = null;
      dataValues.recurrenceInterval = null;
      dataValues.recurrenceDaysOfWeek = null;
      dataValues.recurrenceDayOfMonth = null;
      dataValues.recurrenceEndDate = null;
      dataValues.maxExecutions = null;
    }

    // Se o usuário selecionou contatos manualmente, criar uma lista temporária
    if ((!values.contactListId || values.contactListId === "") && selectedContacts.length > 0) {
      try {
        const listName = `Campanha - ${values.name || "Sem nome"} - ${moment().format("DD/MM HH:mm")}`;
        const { data: createdList } = await api.post("/contact-lists", { name: listName });
        const newListId = createdList?.id;
        if (newListId) {
          // Inserir contatos selecionados como itens da lista
          for (const c of selectedContacts) {
            try {
              await api.post("/contact-list-items", {
                name: c.name || c.number,
                number: c.number,
                email: c.email || "",
                contactListId: newListId
              });
            } catch (e) {
              // Continua mesmo se algum contato falhar
              // Evitamos logs verbosos aqui
            }
          }
          dataValues.contactListId = newListId;
          dataValues.tagListId = null;
        }
      } catch (e) {
        // Se falhar a criação da lista, prossegue com o fluxo normal
      }
    }

    if (campaignId) {
      await api.put(`/campaigns/${campaignId}`, dataValues);
      if (attachment != null) {
        const formData = new FormData();
        formData.append("file", attachment);
        await api.post(`/campaigns/${campaignId}/media-upload`, formData);
      } else if (audioBlob) {
        const formData = new FormData();
        formData.append("file", audioBlob, `audio_${Date.now()}.webm`);
        await api.post(`/campaigns/${campaignId}/media-upload`, formData);
      }
      handleClose();
    } else {
      const { data } = await api.post("/campaigns", dataValues);
      if (attachment != null) {
        const formData = new FormData();
        formData.append("file", attachment);
        await api.post(`/campaigns/${data.id}/media-upload`, formData);
      } else if (audioBlob) {
        const formData = new FormData();
        formData.append("file", audioBlob, `audio_${Date.now()}.webm`);
        await api.post(`/campaigns/${data.id}/media-upload`, formData);
      }
      if (onSave) {
        onSave(data);
      }
      handleClose();
    }
    toast.success(i18n.t("campaigns.toasts.success"));
  } catch (err) {
    console.log(err);
    toastError(err);
  }
};

  const handleSendNow = async (values) => {
    if (sendNowInProgressRef.current) {
      return;
    }
    sendNowInProgressRef.current = true;
    setSendNowInProgress(true);

    // Alerta na hora: aparece assim que clica, já com progresso (0/83 quando tem contatos selecionados)
    const totalInicial = Array.isArray(selectedContacts) && selectedContacts.length > 0 ? selectedContacts.length : 0;
    if (typeof onSendNowStart === "function") {
      onSendNowStart({ campaignId: null, total: totalInicial, delivered: 0 });
    } else {
      setSendingProgress(prev => ({ ...prev, visible: true, total: totalInicial, delivered: 0, campaignId: null }));
    }

    try {
      const campaignName =
        String(values?.name || "").trim() ||
        `Campanha Meta ${moment().format("DD/MM/YYYY HH:mm")}`;
      if (campaignName.length < 3) {
        toast.error("Informe um nome da campanha com ao menos 3 caracteres.");
        if (typeof onSendNowStart === "function") {
          onSendNowStart({ campaignId: null, total: 0, delivered: 0, error: true });
        } else {
          setSendingProgress((prev) => ({ ...prev, visible: false }));
        }
        return;
      }

      const resolvedTemplateId =
        metaTemplateSelection?.quickMessageId || metaTemplateIds?.[0] || null;

      const selectedWa = (whatsapps || []).find(
        (w) => Number(w.id) === Number(whatsappId)
      );

      const dataValues = {
        ...values,
        name: campaignName,
        whatsappId: whatsappId,
        userId: selectedUser?.id || null,
        queueId: selectedQueue || null,
        recurrenceDaysOfWeek: (values.isRecurring && values.recurrenceDaysOfWeek && values.recurrenceDaysOfWeek.length > 0)
          ? values.recurrenceDaysOfWeek
          : null,
        metaTemplateQuickMessageId:
          selectedWa?.channel === "whatsapp_oficial" || forceWhatsappOficial
            ? resolvedTemplateId
            : null,
        metaTemplateVariables:
          (selectedWa?.channel === "whatsapp_oficial" || forceWhatsappOficial) &&
          metaTemplateSelection?.variables
            ? JSON.stringify(metaTemplateSelection.variables)
            : null,
      };

      // Definir scheduledAt automaticamente quando Enviar Agora é acionado sem data
      if (!values.scheduledAt || String(values.scheduledAt).trim() === "") {
        dataValues.scheduledAt = moment().format("YYYY-MM-DD HH:mm:ss");
      }

      Object.entries(values).forEach(([key, value]) => {
        if (key === "scheduledAt" && value !== "" && value !== null) {
          dataValues[key] = moment(value).format("YYYY-MM-DD HH:mm:ss");
        } else if (key === "recurrenceEndDate" && value !== "" && value !== null) {
          dataValues[key] = moment(value).format("YYYY-MM-DD HH:mm:ss");
        } else if (key === "name") {
          dataValues.name = campaignName;
        } else if (key !== "recurrenceDaysOfWeek" && key !== "scheduledAt") {
          dataValues[key] = value === "" ? null : value;
        }
      });
      dataValues.name = campaignName;

      // Garantir scheduledAt final como string válida
      if (!dataValues.scheduledAt || String(dataValues.scheduledAt).trim() === "") {
        dataValues.scheduledAt = moment().format("YYYY-MM-DD HH:mm:ss");
      }

      if (!values.isRecurring) {
        dataValues.recurrenceType = null;
        dataValues.recurrenceInterval = null;
        dataValues.recurrenceDaysOfWeek = null;
        dataValues.recurrenceDayOfMonth = null;
        dataValues.recurrenceEndDate = null;
        dataValues.maxExecutions = null;
      }

      // Inserir todos os contatos em paralelo (um único "lote") para o primeiro disparo sair mais rápido
      if ((!values.contactListId || values.contactListId === "") && selectedContacts.length > 0) {
        try {
          const listName = `Campanha - ${values.name || "Sem nome"} - ${moment().format("DD/MM HH:mm")}`;
          const { data: createdList } = await api.post("/contact-lists", { name: listName });
          const newListId = createdList?.id;
          if (newListId) {
            await Promise.all(
              selectedContacts.map((c) =>
                api.post("/contact-list-items", {
                  name: c.name || c.number,
                  number: c.number,
                  email: c.email || "",
                  contactListId: newListId
                }).catch(() => {})
              )
            );
            dataValues.contactListId = newListId;
            dataValues.tagListId = null;
          }
        } catch (e) {}
      }

      let id = campaignId;
      if (campaignId) {
        await api.put(`/campaigns/${campaignId}`, dataValues);
      } else {
        const { data } = await api.post("/campaigns", dataValues);
        id = data.id;
      }

      // Atualiza alerta com campaignId para o socket; busca total em paralelo se for lista
      if (typeof onSendNowStart === "function") {
        onSendNowStart({ campaignId: id, total: totalInicial, delivered: 0 });
      } else {
        setSendingProgress(prev => ({ ...prev, campaignId: id, total: totalInicial }));
      }
      if (totalInicial === 0) {
        api.get(`/campaigns/${id}/recipients-count`)
          .then(({ data }) => {
            const count = Number(data?.count ?? 0);
            if (count > 0 && typeof onSendNowStart === "function") {
              onSendNowStart({ campaignId: id, total: count, delivered: 0 });
            } else if (count > 0) {
              setSendingProgress(prev => ({ ...prev, total: count }));
            }
          })
          .catch(() => {});
      }

      const intervalSec = messageIntervalSeconds || 30;
      let sendNowPromise;

      if (attachment != null || audioBlob) {
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/campaigns/${id}/media-upload`, formData);
        } else {
          const formData = new FormData();
          formData.append("file", audioBlob, `audio_${Date.now()}.webm`);
          await api.post(`/campaigns/${id}/media-upload`, formData);
        }
        sendNowPromise = api.post(`/campaigns/${id}/send-now`, { messageIntervalSeconds: intervalSec });
      } else {
        sendNowPromise = api.post(`/campaigns/${id}/send-now`, { messageIntervalSeconds: intervalSec });
      }

      await sendNowPromise;
      toast.info("Envio iniciado. A primeira mensagem foi disparada; as demais seguem no intervalo escolhido.");
    } catch (err) {
      console.log(err);
      toastError(err);
    } finally {
      sendNowInProgressRef.current = false;
      setSendNowInProgress(false);
    }
  };
  const deleteMedia = async () => {
    if (attachment) {
      setAttachment(null);
      attachmentFile.current.value = null;
    }
    if (audioBlob) {
      setAudioBlob(null);
    }
    if (campaign.mediaPath) {
      await api.delete(`/campaigns/${campaign.id}/media-upload`);
      setCampaign((prev) => ({ ...prev, mediaPath: null, mediaName: null }));
      toast.success(i18n.t("campaigns.toasts.deleted"));
    }
  };

  const renderMessageField = (identifier) => {
    return (
      <Field
        as={TextField}
        id={identifier}
        name={identifier}
        fullWidth
        rows={5}
        label={i18n.t(`campaigns.dialog.form.${identifier}`)}
        placeholder={i18n.t("campaigns.dialog.form.messagePlaceholder")}
        multiline={true}
        variant="outlined"
        helperText="Use variáveis {nome}, {numero}, {email} (ou [nome], [numero], [email])."
        disabled={!campaignEditable && campaign.status !== "CANCELADA"}
        onFocus={() => setCurrentField(identifier)}
      />
    );
  };

  const renderConfirmationMessageField = (identifier) => {
    return (
      <Field
        as={TextField}
        id={identifier}
        name={identifier}
        fullWidth
        rows={5}
        label={i18n.t(`campaigns.dialog.form.${identifier}`)}
        placeholder={i18n.t("campaigns.dialog.form.messagePlaceholder")}
        multiline={true}
        variant="outlined"
        disabled={!campaignEditable && campaign.status !== "CANCELADA"}
      />
    );
  };

  const cancelCampaign = async () => {
    try {
      await api.post(`/campaigns/${campaign.id}/cancel`);
      toast.success(i18n.t("campaigns.toasts.cancel"));
      setCampaign((prev) => ({ ...prev, status: "CANCELADA" }));
      resetPagination();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const restartCampaign = async () => {
    try {
      await api.post(`/campaigns/${campaign.id}/restart`);
      toast.success(i18n.t("campaigns.toasts.restart"));
      setCampaign((prev) => ({ ...prev, status: "EM_ANDAMENTO" }));
      resetPagination();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filterOptions = createFilterOptions({
    trim: true,
  });

  // Placeholders para preview (substitui variáveis por texto de exemplo)
  const previewPlaceholders = {
    nome: "João", email: "joao@email.com", telefone: "(11) 99999-9999", numero: "5511999999999",
    empresa: "Minha Empresa", razao_social: "Empresa Ltda", endereco: "Rua Exemplo, 123",
    data: moment().format("DD/MM/YYYY"), hora: moment().format("HH:mm"), produto: "Produto X",
    valor: "R$ 100,00", vencimento: "25/03/2025", cargo: "Gerente"
  };
  const getPreviewText = (text) => {
    if (!text || typeof text !== "string") return "";
    let out = text;
    campaignVariables.forEach(({ token }) => {
      const key = token.replace(/[{}]/g, "");
      const placeholder = previewPlaceholders[key] || token;
      out = out.split(token).join(placeholder);
    });
    return out;
  };
  const getPreviewBubbles = (values) => {
    const bubbles = [];
    ["message1", "message2", "message3", "message4", "message5"].forEach((key) => {
      const raw = values[key];
      if (!raw || typeof raw !== "string" || !raw.trim()) return;
      const lines = getPreviewText(raw.trim()).split(/\n/).filter(Boolean);
      lines.forEach((line) => bubbles.push(line));
    });
    return bubbles;
  };

  return (
    <div className={classes.root}>
      {!onSendNowStart && (
        <Dialog
          open={sendingProgress.visible}
          onClose={() => {}}
          maxWidth="sm"
          PaperProps={{ style: { width: 480, position: "relative", overflow: "hidden" } }}
        >
          <DialogTitle>Enviando campanha</DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={2}>
              <Typography variant="h6">Estamos enviando suas mensagens</Typography>
              <CircularProgress className={classes.sendingSpinner} />
              <Typography variant="body1">
                {`${sendingProgress.delivered} de ${sendingProgress.total} contatos entregues`}
              </Typography>
              <Typography variant="body2" className={classes.sendingTip}>
                Você pode deixar esta janela aberta; avisaremos ao terminar.
              </Typography>
            </Box>
          </DialogContent>
        </Dialog>
      )}
      <ConfirmationModal
        title={i18n.t("campaigns.confirmationModal.deleteTitle")}
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={deleteMedia}
      >
        {i18n.t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        classes={{ paper: classes.dialogPaperSmall }}
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {forceWhatsappOficial ? (
            <Box display="flex" alignItems="center" style={{ gap: 10 }}>
              <WhatsAppIcon style={{ color: "#25D366" }} />
              <Box>
                <Typography variant="h6" style={{ fontSize: "1.05rem", lineHeight: 1.2 }}>
                  {campaignId
                    ? "Editar campanha Meta"
                    : "Campanha com Templates Meta"}
                </Typography>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  style={{ display: "block", marginTop: 2 }}
                >
                  Disparo com templates sincronizados e validados pela Meta (API Oficial)
                </Typography>
              </Box>
            </Box>
          ) : campaignEditable ? (
            <>
              {campaignId
                ? `${i18n.t("campaigns.dialog.update")}`
                : `${i18n.t("campaigns.dialog.new")}`}
            </>
          ) : (
            <>{`${i18n.t("campaigns.dialog.readonly")}`}</>
          )}
        </DialogTitle>
        <div style={{ display: "none" }}>
          <input
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            ref={attachmentFile}
            onChange={(e) => handleAttachmentFile(e)}
          />
        </div>
        <Formik
          initialValues={campaign}
          enableReinitialize={true}
          validationSchema={CampaignSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveCampaign(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => (
            <Form>
              <DialogContent dividers className={classes.dialogContentScrollable}>
                <Box mb={2}>
                  <Stepper activeStep={activeStep} alternativeLabel>
                    <Step><StepLabel>Template</StepLabel></Step>
                    <Step><StepLabel>Destinatários</StepLabel></Step>
                    <Step><StepLabel>Data e Hora</StepLabel></Step>
                  </Stepper>
                </Box>
                <Grid spacing={2} container>
                  {activeStep === 0 && (
                  <Grid item xs={12}>
                  <Box className={classes.templateStepRow} width="100%">
                    <Box className={classes.templateFormColumn}>
                  <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Field
                      as={TextField}
                      label={i18n.t("campaigns.dialog.form.name")}
                      name="name"
                      error={touched.name && Boolean(errors.name)}
                      helperText={touched.name && errors.name}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.textField}
                      disabled={!campaignEditable}
                    />
                  </Grid>
                  
                  {!forceWhatsappOficial && (
                  <Grid xs={12} md={6} item>
                    <FormControl
                      variant="outlined"
                      margin="dense"
                      size="small"
                      fullWidth
                      className={classes.formControl}
                    >
                      <InputLabel id="confirmation-selection-label">
                        {i18n.t("campaigns.dialog.form.confirmation")}
                      </InputLabel>
                      <Field
                        as={Select}
                        label={i18n.t("campaigns.dialog.form.confirmation")}
                        placeholder={i18n.t("campaigns.dialog.form.confirmation")}
                        labelId="confirmation-selection-label"
                        id="confirmation"
                        name="confirmation"
                        error={touched.confirmation && Boolean(errors.confirmation)}
                        disabled={!campaignEditable}
                      >
                        <MenuItem value={false}>Desabilitada</MenuItem>
                        <MenuItem value={true}>Habilitada</MenuItem>
                      </Field>
                    </FormControl>
                  </Grid>
                  )}

                  {forceWhatsappOficial && (
                    <>
                      <Grid xs={12} item>
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          className={classes.formControl}
                        >
                          <InputLabel id="whatsapp-oficial-step0-label">
                            Conexão API Oficial
                          </InputLabel>
                          <Select
                            labelId="whatsapp-oficial-step0-label"
                            label="Conexão API Oficial"
                            value={whatsappId || ""}
                            disabled={!campaignEditable}
                            onChange={(event) => {
                              setWhatsappId(event.target.value);
                              setMetaTemplateIds([]);
                              setMetaTemplateSelection(null);
                            }}
                          >
                            {(whatsapps || []).map((whatsapp) => (
                              <MenuItem key={whatsapp.id} value={whatsapp.id}>
                                {whatsapp.name} (WhatsApp Oficial)
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid xs={12} item>
                        <Typography variant="subtitle2" gutterBottom>
                          Templates Meta sincronizados
                        </Typography>
                        <Typography variant="body2" color="textSecondary" paragraph>
                          Selecione um, alguns ou todos os templates aprovados desta conexão.
                          A pesquisa ajuda a filtrar pelo nome ou conteúdo.
                        </Typography>
                        <MetaOfficialTemplateSelector
                          whatsappId={whatsappId ? Number(whatsappId) : null}
                          multiple
                          selectedIds={metaTemplateIds}
                          onChangeMultiple={(ids) => {
                            setMetaTemplateIds(ids);
                            const first = Number(ids?.[0]);
                            if (first) {
                              setMetaTemplateSelection((prev) => ({
                                ...(prev || {}),
                                quickMessageId: first
                              }));
                            } else {
                              setMetaTemplateSelection(null);
                            }
                          }}
                          disabled={!campaignEditable}
                          showSync
                        />
                      </Grid>
                    </>
                  )}

                  {/* SEÇÃO DE MENSAGENS */}
                  {!forceWhatsappOficial && (
                  <Grid xs={12} item>
                    <Tabs
                      value={messageTab}
                      indicatorColor="primary"
                      textColor="primary"
                      onChange={(e, v) => setMessageTab(v)}
                      className={classes.messageTabs}
                    >
                      <Tab className={classes.tabItem} label="Msg. 1" index={0} />
                      <Tab className={classes.tabItem} label="Msg. 2" index={1} />
                      <Tab className={classes.tabItem} label="Msg. 3" index={2} />
                      <Tab className={classes.tabItem} label="Msg. 4" index={3} />
                      <Tab className={classes.tabItem} label="Msg. 5" index={4} />
                    </Tabs>
                    <Box style={{ paddingTop: 20, border: "none" }}>
                      {messageTab === 0 && (
                        <>
                          {values.confirmation ? (
                            <Grid spacing={2} container>
                              <Grid xs={12} md={8} item>
                                <>{renderMessageField("message1")}</>
                              </Grid>
                              <Grid xs={12} md={4} item>
                                <>{renderConfirmationMessageField("confirmationMessage1")}</>
                              </Grid>
                            </Grid>
                          ) : (
                            <>{renderMessageField("message1")}</>
                          )}
                        </>
                      )}
                      {messageTab === 1 && (
                        <>
                          {values.confirmation ? (
                            <Grid spacing={2} container>
                              <Grid xs={12} md={8} item>
                                <>{renderMessageField("message2")}</>
                              </Grid>
                              <Grid xs={12} md={4} item>
                                <>{renderConfirmationMessageField("confirmationMessage2")}</>
                              </Grid>
                            </Grid>
                          ) : (
                            <>{renderMessageField("message2")}</>
                          )}
                        </>
                      )}
                      {messageTab === 2 && (
                        <>
                          {values.confirmation ? (
                            <Grid spacing={2} container>
                              <Grid xs={12} md={8} item>
                                <>{renderMessageField("message3")}</>
                              </Grid>
                              <Grid xs={12} md={4} item>
                                <>{renderConfirmationMessageField("confirmationMessage3")}</>
                              </Grid>
                            </Grid>
                          ) : (
                            <>{renderMessageField("message3")}</>
                          )}
                        </>
                      )}
                      {messageTab === 3 && (
                        <>
                          {values.confirmation ? (
                            <Grid spacing={2} container>
                              <Grid xs={12} md={8} item>
                                <>{renderMessageField("message4")}</>
                              </Grid>
                              <Grid xs={12} md={4} item>
                                <>{renderConfirmationMessageField("confirmationMessage4")}</>
                              </Grid>
                            </Grid>
                          ) : (
                            <>{renderMessageField("message4")}</>
                          )}
                        </>
                      )}
                      {messageTab === 4 && (
                        <>
                          {values.confirmation ? (
                            <Grid spacing={2} container>
                              <Grid xs={12} md={8} item>
                                <>{renderMessageField("message5")}</>
                              </Grid>
                              <Grid xs={12} md={4} item>
                                <>{renderConfirmationMessageField("confirmationMessage5")}</>
                              </Grid>
                            </Grid>
                          ) : (
                            <>{renderMessageField("message5")}</>
                          )}
                        </>
                      )}
                    </Box>
                  </Grid>
                  )}

                  {!forceWhatsappOficial && (
                  <>
                  {/* Variáveis Dinâmicas — abaixo do campo de mensagem */}
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle2" style={{ marginBottom: 8 }}>
                          Variáveis Dinâmicas
                        </Typography>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {campaignVariables.map(v => (
                            <Chip
                              key={v.token}
                              label={`${v.token} — ${v.label}`}
                              onClick={() => {
                                const fieldId =
                                  currentField ||
                                  (messageTab === 0 ? "message1" :
                                  messageTab === 1 ? "message2" :
                                  messageTab === 2 ? "message3" :
                                  messageTab === 3 ? "message4" : "message5");
                                const prev = values[fieldId] || "";
                                setFieldValue(fieldId, `${prev}${v.token}`);
                              }}
                            />
                          ))}
                        </div>
                        <FormHelperText>
                          Clique para inserir no campo de mensagem em foco.
                        </FormHelperText>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Seção de Mídia com anexar arquivo e gravar áudio */}
                  <Grid xs={12} item>
                    <Box className={classes.mediaContainer}>
                      <Typography variant="subtitle1">Anexar Mídia</Typography>
                      {(campaign.mediaPath || attachment || audioBlob) && (
                        <Box className={classes.mediaInfo}>
                          <Box display="flex" alignItems="center" gap={8}>
                            {audioBlob ? <MicIcon fontSize="small" /> : <AttachFileIcon fontSize="small" />}
                            <Typography variant="body2">
                              {audioBlob
                                ? "Áudio gravado"
                                : (attachment ? attachment.name : campaign.mediaName)}
                            </Typography>
                          </Box>
                          {campaignEditable && (
                            <IconButton
                              onClick={() => setConfirmationOpen(true)}
                              color="secondary"
                              size="small"
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          )}
                        </Box>
                      )}
                      {audioBlob && (
                        <AudioRecorder
                          onAudioRecorded={(blob) => setAudioBlob(blob)}
                          onAudioDeleted={() => setAudioBlob(null)}
                          disabled={isSubmitting}
                        />
                      )}
                      {!audioBlob && (
                        <Box className={classes.mediaOptions}>
                          <Button
                            variant="outlined"
                            startIcon={<AttachFileIcon />}
                            onClick={() => attachmentFile.current.click()}
                            disabled={isSubmitting}
                          >
                            Anexar Arquivo
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<MicIcon />}
                            onClick={() => setAudioBlob(null)}
                            disabled={isSubmitting}
                          >
                            Gravar Áudio
                          </Button>
                        </Box>
                      )}
                      {!audioBlob && (
                        <AudioRecorder
                          onAudioRecorded={(blob) => setAudioBlob(blob)}
                          onAudioDeleted={() => setAudioBlob(null)}
                          disabled={isSubmitting}
                        />
                      )}
                    </Box>
                  </Grid>
                  </>
                  )}
                    </Grid>
                    </Box>
                    <Box className={classes.templatePreviewColumn}>
                      <Typography variant="subtitle2" gutterBottom style={{ textAlign: "center" }}>
                        Preview do disparo
                      </Typography>
                      <div className={classes.iphoneFrame}>
                        <div className={classes.iphoneNotch} />
                        <div className={classes.iphoneScreen}>
                          <div className={classes.iphoneStatusBar}>
                            <span>09:41</span>
                            <span>WhatsApp</span>
                            <span>🔋 100%</span>
                          </div>
                          <div className={classes.whatsappPreviewHeader}>
                            <div className={classes.whatsappHeaderLeft}>
                              <div className={classes.whatsappHeaderAvatar}>
                                <img src="/favicon.png" alt="" className={classes.whatsappHeaderAvatarImg} />
                              </div>
                              <div className={classes.whatsappHeaderText}>
                                <span className={classes.whatsappHeaderTitle}>VB</span>
                                <span className={classes.whatsappHeaderSubtitle}>online</span>
                              </div>
                            </div>
                            <IconButton className={classes.whatsappHeaderPhoneBtn} size="small" disableRipple>
                              <PhoneIcon />
                            </IconButton>
                          </div>
                          <div className={classes.whatsappPreviewChat}>
                            <div className={classes.whatsappDateTag}>
                              <span>Hoje</span>
                            </div>
                            {forceWhatsappOficial ? (
                              metaTemplateIds.length === 0 ? (
                                <Typography variant="body2" color="textSecondary" style={{ textAlign: "center", padding: 24 }}>
                                  Selecione a conexão e um ou mais templates Meta à esquerda.
                                </Typography>
                              ) : (
                                metaTemplateIds.map((id) => (
                                  <div key={id} className={classes.whatsappBubble}>
                                    Template #{id} (Meta)
                                    <div className={classes.whatsappBubbleTime}>
                                      {moment().format("HH:mm")}
                                    </div>
                                  </div>
                                ))
                              )
                            ) : (() => {
                              const textBubbles = getPreviewBubbles(values);
                              const hasFile = !!(attachment || campaign.mediaPath);
                              const fileLabel = attachment ? attachment.name : (campaign.mediaName || "Arquivo");
                              const hasAudio = !!audioBlob;
                              const isEmpty = textBubbles.length === 0 && !hasFile && !hasAudio;
                              if (isEmpty) {
                                return (
                                  <Typography variant="body2" color="textSecondary" style={{ textAlign: "center", padding: 24 }}>
                                    As mensagens aparecerão aqui conforme você preencher os campos.
                                  </Typography>
                                );
                              }
                              return (
                                <>
                                  {textBubbles.map((text, idx) => (
                                    <div key={`t-${idx}`} className={classes.whatsappBubble}>
                                      {text}
                                      <div className={classes.whatsappBubbleTime}>
                                        {moment().format("HH:mm")}
                                      </div>
                                    </div>
                                  ))}
                                  {hasFile && (
                                    <div className={classes.whatsappBubble}>
                                      <div className={classes.whatsappBubbleWithIcon}>
                                        <AttachFileIcon style={{ fontSize: 18, color: "rgba(0,0,0,0.6)" }} />
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{fileLabel}</span>
                                      </div>
                                      <div className={classes.whatsappBubbleTime}>
                                        {moment().format("HH:mm")}
                                      </div>
                                    </div>
                                  )}
                                  {hasAudio && (
                                    <div className={classes.whatsappBubble}>
                                      <div className={classes.whatsappBubbleWithIcon}>
                                        <MicIcon style={{ fontSize: 18, color: "rgba(0,0,0,0.6)" }} />
                                        <span>Áudio</span>
                                      </div>
                                      <div className={classes.whatsappBubbleTime}>
                                        {moment().format("HH:mm")}
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          {!forceWhatsappOficial && (
                          <div className={classes.whatsappPreviewFooter}>
                            <input
                              type="text"
                              className={classes.whatsappFooterInput}
                              placeholder="Mensagem"
                              value={values[`message${messageTab + 1}`] || ''}
                              onChange={(e) => setFieldValue(`message${messageTab + 1}`, e.target.value)}
                            />
                            <MicIcon style={{ fontSize: 20, color: '#128c7e' }} />
                          </div>
                          )}
                        </div>
                      </div>
                    </Box>
                  </Box>
                  </Grid>
                  )}

                  {activeStep === 1 && (
                  <>
                  <Grid xs={12} item>
                    <Typography variant="subtitle2" gutterBottom>Seleção de contatos</Typography>
                    <div className={classes.contactListToolbar}>
                      <TextField
                        size="small"
                        variant="outlined"
                        placeholder="Buscar por nome, número ou tag..."
                        value={contactsSearch}
                        onChange={(e) => setContactsSearch(e.target.value)}
                        style={{ minWidth: 260 }}
                        InputProps={{
                          endAdornment: (contactsLoading || loadingAllContacts) ? <CircularProgress size={20} /> : null
                        }}
                      />
                      <FormControl variant="outlined" size="small" style={{ minWidth: 180 }}>
                        <InputLabel id="filter-tag-label">Filtrar por tag</InputLabel>
                        <Select
                          labelId="filter-tag-label"
                          value={contactFilterTagId}
                          onChange={(e) => setContactFilterTagId(e.target.value || "")}
                          label="Filtrar por tag"
                        >
                          <MenuItem value="">Todos os contatos</MenuItem>
                          {Array.isArray(tagLists) &&
                            tagLists.map((tag) => (
                              <MenuItem key={tag.id} value={tag.id}>
                                {tag.name}
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          const ids = new Set(selectedContacts.map((c) => c.id));
                          const toSelect = filteredContactsForList.filter((c) => !ids.has(c.id));
                          setSelectedContacts([...selectedContacts, ...toSelect]);
                        }}
                      >
                        Selecionar todos
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setSelectedContacts([])}
                      >
                        Desmarcar todos
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        onClick={() => setSelectedContacts([])}
                        disabled={selectedContacts.length === 0}
                      >
                        Excluir selecionados
                      </Button>
                    </div>
                    <div className={classes.contactListScroll}>
                      {(contactsLoading || loadingAllContacts) && filteredContactsForList.length === 0 ? (
                        <Box p={2} display="flex" justifyContent="center">
                          <CircularProgress size={32} />
                        </Box>
                      ) : (
                        filteredContactsForList.map((contact) => {
                          const isSelected = selectedContacts.some((c) => c.id === contact.id);
                          const tagNames = (contact.tags || []).map((t) => t.name).filter(Boolean);
                          return (
                            <div
                              key={contact.id}
                              className={classes.contactRow}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedContacts(selectedContacts.filter((c) => c.id !== contact.id));
                                } else {
                                  setSelectedContacts([...selectedContacts, contact]);
                                }
                              }}
                            >
                              <Checkbox
                                className={classes.contactRowCheckbox}
                                checked={isSelected}
                                onChange={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSelected) {
                                    setSelectedContacts(selectedContacts.filter((c) => c.id !== contact.id));
                                  } else {
                                    setSelectedContacts([...selectedContacts, contact]);
                                  }
                                }}
                                color="primary"
                              />
                              <Box flex={1} display="flex" alignItems="center" flexWrap="wrap">
                                <Typography variant="body2" style={{ fontWeight: 500 }}>
                                  {contact.name || contact.number || "—"}
                                </Typography>
                                {tagNames.length > 0 && (
                                  <Chip
                                    size="small"
                                    label={tagNames.join(", ")}
                                    className={classes.contactTagChip}
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                              <Typography variant="body2" color="textSecondary">
                                {contact.number || "—"}
                              </Typography>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <FormHelperText style={{ marginTop: 8 }}>
                      {selectedContacts.length} contato(s) selecionado(s). Clique na linha para marcar ou desmarcar.
                    </FormHelperText>
                  </Grid>

                  <Grid xs={12} md={6} item>
                    {!forceWhatsappOficial && (
                    <FormControl
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.formControl}
                    >
                      <InputLabel id="whatsapp-selection-label">
                        {i18n.t("campaigns.dialog.form.whatsapp")}
                      </InputLabel>
                      <Field
                        as={Select}
                        label={i18n.t("campaigns.dialog.form.whatsapp")}
                        placeholder={i18n.t("campaigns.dialog.form.whatsapp")}
                        labelId="whatsapp-selection-label"
                        id="whatsappIds"
                        name="whatsappIds"
                        required
                        error={touched.whatsappId && Boolean(errors.whatsappId)}
                        disabled={!campaignEditable}
                        value={whatsappId}
                        onChange={(event) => {
                          setWhatsappId(event.target.value)
                        }}
                      >
                        {whatsapps &&
                          whatsapps.map((whatsapp) => {
                            const channelLabel =
                              whatsapp.channel === "telegram"
                                ? "Telegram"
                                : whatsapp.channel === "sms"
                                  ? "SMS"
                                  : whatsapp.channel === "whatsapp_oficial"
                                    ? "WhatsApp Oficial"
                                    : "WhatsApp";
                            return (
                              <MenuItem key={whatsapp.id} value={whatsapp.id}>
                                {whatsapp.name} ({channelLabel})
                              </MenuItem>
                            );
                          })}
                      </Field>
                    </FormControl>
                    )}
                  </Grid>

                  {selectedWhatsappChannel === "whatsapp_oficial" && !forceWhatsappOficial && (
                    <Grid xs={12} item>
                      <Typography variant="subtitle2" gutterBottom>
                        Template Meta (obrigatório para API Oficial)
                      </Typography>
                      <Typography variant="body2" color="textSecondary" paragraph>
                        Campanhas pela API oficial da Meta devem usar templates aprovados. Mensagens livres não são permitidas fora da janela de 24h.
                      </Typography>
                      <MetaOfficialTemplateSelector
                        whatsappId={whatsappId ? Number(whatsappId) : null}
                        value={metaTemplateSelection}
                        onChange={setMetaTemplateSelection}
                        disabled={!campaignEditable}
                      />
                    </Grid>
                  )}

                  <Grid xs={12} md={6} item>
                    <FormControl
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.formControl}
                    >
                      <InputLabel id="openTicket-selection-label">
                        {i18n.t("campaigns.dialog.form.openTicket")}
                      </InputLabel>
                      <Field
                        as={Select}
                        label={i18n.t("campaigns.dialog.form.openTicket")}
                        labelId="openTicket-selection-label"
                        id="openTicket"
                        name="openTicket"
                        error={touched.openTicket && Boolean(errors.openTicket)}
                        disabled={!campaignEditable}
                      >
                        <MenuItem value={"enabled"}>{i18n.t("campaigns.dialog.form.enabledOpenTicket")}</MenuItem>
                        <MenuItem value={"disabled"}>{i18n.t("campaigns.dialog.form.disabledOpenTicket")}</MenuItem>
                      </Field>
                    </FormControl>
                  </Grid>

                  <Grid xs={12} md={6} item>
                    <Autocomplete
                      style={{ marginTop: '8px' }}
                      variant="outlined"
                      margin="dense"
                      className={classes.formControl}
                      getOptionLabel={(option) => `${option.name}`}
                      value={selectedUser}
                      size="small"
                      onChange={(e, newValue) => {
                        setSelectedUser(newValue);
                        if (newValue != null && Array.isArray(newValue.queues)) {
                          if (newValue.queues.length === 1) {
                            setSelectedQueue(newValue.queues[0].id);
                          }
                          setQueues(newValue.queues);
                        } else {
                          setQueues(allQueues);
                          setSelectedQueue("");
                        }
                      }}
                      options={options}
                      filterOptions={filterOptions}
                      freeSolo
                      fullWidth
                      autoHighlight
                      disabled={!campaignEditable || values.openTicket === 'disabled'}
                      noOptionsText={i18n.t("transferTicketModal.noOptions")}
                      loading={loading}
                      renderOption={option => (<span> <UserStatusIcon user={option} /> {option.name}</span>)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={i18n.t("transferTicketModal.fieldLabel")}
                          variant="outlined"
                          onChange={(e) => setSearchParam(e.target.value)}
                          InputProps={{
                            ...params.InputProps,
                            endAdornment: (
                              <React.Fragment>
                                {loading ? (
                                  <CircularProgress color="inherit" size={20} />
                                ) : null}
                                {params.InputProps.endAdornment}
                              </React.Fragment>
                            ),
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid xs={12} md={6} item>
                    <FormControl
                      variant="outlined"
                      margin="dense"
                      size="small"
                      fullWidth
                      className={classes.formControl}
                    >
                      <InputLabel id="statusTicket-selection-label">
                        {i18n.t("campaigns.dialog.form.statusTicket")}
                      </InputLabel>
                      <Field
                        as={Select}
                        label={i18n.t("campaigns.dialog.form.statusTicket")}
                        labelId="statusTicket-selection-label"
                        id="statusTicket"
                        name="statusTicket"
                        error={touched.statusTicket && Boolean(errors.statusTicket)}
                        disabled={!campaignEditable || values.openTicket === 'disabled'}
                      >
                        <MenuItem value={"closed"}>{i18n.t("campaigns.dialog.form.closedTicketStatus")}</MenuItem>
                        <MenuItem value={"pending"}>{i18n.t("campaigns.dialog.form.pendingTicketStatus")}</MenuItem>
                        <MenuItem value={"open"}>{i18n.t("campaigns.dialog.form.openTicketStatus")}</MenuItem>
                      </Field>
                    </FormControl>
                  </Grid>
                  </>
                  )}

                  {activeStep === 2 && (
                  <>
                  <Grid xs={12} md={6} item style={{ margin: "0 auto" }}>
                    <Field
                      as={TextField}
                      label={i18n.t("campaigns.dialog.form.scheduledAt")}
                      name="scheduledAt"
                      error={touched.scheduledAt && Boolean(errors.scheduledAt)}
                      helperText={touched.scheduledAt && errors.scheduledAt}
                      variant="outlined"
                      margin="dense"
                      type="datetime-local"
                      InputLabelProps={{
                        shrink: true,
                      }}
                      fullWidth
                      className={classes.textField}
                      disabled={!campaignEditable}
                    />
                  </Grid>

                  <Grid xs={12} item>
                    <FormControl variant="outlined" margin="dense" fullWidth className={classes.formControl}>
                      <InputLabel id="message-interval-label">Intervalo entre envios</InputLabel>
                      <Select
                        labelId="message-interval-label"
                        value={messageIntervalSeconds}
                        onChange={(e) => setMessageIntervalSeconds(Number(e.target.value))}
                        label="Intervalo entre envios"
                      >
                        {MESSAGE_INTERVAL_OPTIONS.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </Select>
                      <Typography className={classes.intervalNotice}>
                        Recomendamos utilizar intervalos entre mensagens para reduzir o risco de bloqueio do WhatsApp pela Meta.
                      </Typography>
                    </FormControl>
                  </Grid>

                  {/* SEÇÃO DE RECORRÊNCIA */}
                  <Grid xs={12} item>
                    <Card className={classes.recurrenceCard}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <RepeatIcon className={classes.recurrenceIcon} />
                          <Typography variant="h6">
                            Configuração de Recorrência
                          </Typography>
                        </Box>
                        
                        <Grid spacing={2} container>
                          <Grid xs={12} item>
                            <FormControlLabel
                              control={
                                <Field
                                  as={Switch}
                                  name="isRecurring"
                                  checked={values.isRecurring}
                                  onChange={(e) => {
                                    setFieldValue('isRecurring', e.target.checked);
                                    if (!e.target.checked) {
                                      setPreviewExecutions([]);
                                      setShowPreview(false);
                                    }
                                  }}
                                  disabled={!campaignEditable}
                                />
                              }
                              label="Habilitar recorrência"
                            />
                          </Grid>

                          <Collapse in={values.isRecurring}>
                            <Grid spacing={2} container>
                              <Grid xs={12} md={3} item>
                                <FormControl
                                  variant="outlined"
                                  margin="dense"
                                  fullWidth
                                  error={touched.recurrenceType && Boolean(errors.recurrenceType)}
                                >
                                  <InputLabel>Tipo de Recorrência</InputLabel>
                                  <Field
                                    as={Select}
                                    name="recurrenceType"
                                    label="Tipo de Recorrência"
                                    disabled={!campaignEditable}
                                    onChange={(e) => {
                                      setFieldValue('recurrenceType', e.target.value);
                                      setFieldValue('recurrenceDaysOfWeek', []);
                                      setFieldValue('recurrenceDayOfMonth', 1);
                                    }}
                                  >
                                    <MenuItem value="minutely">Por Minuto</MenuItem>
                                    <MenuItem value="hourly">Por Hora</MenuItem>
                                    <MenuItem value="daily">Diário</MenuItem>
                                    <MenuItem value="weekly">Semanal</MenuItem>
                                    <MenuItem value="biweekly">Quinzenal</MenuItem>
                                    <MenuItem value="monthly">Mensal</MenuItem>
                                    <MenuItem value="yearly">Anual</MenuItem>
                                  </Field>
                                  {touched.recurrenceType && errors.recurrenceType && (
                                    <FormHelperText error>{errors.recurrenceType}</FormHelperText>
                                  )}
                                </FormControl>
                              </Grid>

                              <Grid xs={12} md={3} item>
                                <Field
                                  as={TextField}
                                  name="recurrenceInterval"
                                  label="Intervalo"
                                  type="number"
                                  variant="outlined"
                                  margin="dense"
                                  fullWidth
                                  inputProps={{ min: 1 }}
                                  error={touched.recurrenceInterval && Boolean(errors.recurrenceInterval)}
                                  helperText={
                                    touched.recurrenceInterval && errors.recurrenceInterval ||
                                    `A cada ${values.recurrenceInterval || 1} ${
                                      values.recurrenceType === 'minutely' ? 'minuto(s)' :
                                      values.recurrenceType === 'hourly' ? 'hora(s)' :
                                      values.recurrenceType === 'daily' ? 'dia(s)' :
                                      values.recurrenceType === 'weekly' ? 'semana(s)' :
                                      values.recurrenceType === 'biweekly' ? 'quinzena(s)' :
                                      values.recurrenceType === 'monthly' ? 'mês(es)' :
                                      values.recurrenceType === 'yearly' ? 'ano(s)' : ''
                                    }`
                                  }
                                  disabled={!campaignEditable}
                                />
                              </Grid>

                              {values.recurrenceType === 'weekly' && (
                                <Grid xs={12} md={6} item>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Dias da Semana
                                  </Typography>
                                  <FormGroup row>
                                    {daysOfWeekOptions.map((day) => (
                                      <FormControlLabel
                                        key={day.value}
                                        control={
                                          <Checkbox
                                            checked={values.recurrenceDaysOfWeek.includes(day.value)}
                                            onChange={(e) => {
                                              const currentDays = values.recurrenceDaysOfWeek || [];
                                              if (e.target.checked) {
                                                setFieldValue('recurrenceDaysOfWeek', [...currentDays, day.value]);
                                              } else {
                                                setFieldValue('recurrenceDaysOfWeek', 
                                                  currentDays.filter(d => d !== day.value)
                                                );
                                              }
                                            }}
                                            disabled={!campaignEditable}
                                          />
                                        }
                                        label={day.label.substring(0, 3)}
                                      />
                                    ))}
                                  </FormGroup>
                                  {touched.recurrenceDaysOfWeek && errors.recurrenceDaysOfWeek && (
                                    <FormHelperText error>{errors.recurrenceDaysOfWeek}</FormHelperText>
                                  )}
                                </Grid>
                              )}

                              {values.recurrenceType === 'monthly' && (
                                <Grid xs={12} md={3} item>
                                  <Field
                                    as={TextField}
                                    name="recurrenceDayOfMonth"
                                    label="Dia do Mês"
                                    type="number"
                                    variant="outlined"
                                    margin="dense"
                                    fullWidth
                                    inputProps={{ min: 1, max: 31 }}
                                    error={touched.recurrenceDayOfMonth && Boolean(errors.recurrenceDayOfMonth)}
                                    helperText={
                                      touched.recurrenceDayOfMonth && errors.recurrenceDayOfMonth ||
                                      "Dia específico do mês (1-31)"
                                    }
                                    disabled={!campaignEditable}
                                  />
                                </Grid>
                              )}

                              <Grid xs={12} md={4} item>
                                <Field
                                  as={TextField}
                                  name="recurrenceEndDate"
                                  label="Data Final (opcional)"
                                  type="date"
                                  variant="outlined"
                                  margin="dense"
                                  fullWidth
                                  InputLabelProps={{ shrink: true }}
                                  error={touched.recurrenceEndDate && Boolean(errors.recurrenceEndDate)}
                                  helperText={
                                    touched.recurrenceEndDate && errors.recurrenceEndDate ||
                                    "Deixe vazio para recorrência infinita"
                                  }
                                  disabled={!campaignEditable}
                                />
                              </Grid>

                              <Grid xs={12} md={4} item>
                                <Field
                                  as={TextField}
                                  name="maxExecutions"
                                  label="Máximo de Execuções (opcional)"
                                  type="number"
                                  variant="outlined"
                                  margin="dense"
                                  fullWidth
                                  inputProps={{ min: 1 }}
                                  error={touched.maxExecutions && Boolean(errors.maxExecutions)}
                                  helperText={
                                    touched.maxExecutions && errors.maxExecutions ||
                                    "Deixe vazio para recorrência infinita"
                                  }
                                  disabled={!campaignEditable}
                                />
                              </Grid>

                              <Grid xs={12} md={4} item>
                                <Button
                                  variant="outlined"
                                  startIcon={<VisibilityIcon />}
                                  onClick={() => {
                                    handlePreviewRecurrence(values);
                                    setShowPreview(!showPreview);
                                  }}
                                  disabled={!values.recurrenceType || !values.scheduledAt}
                                  fullWidth
                                  style={{ marginTop: 8 }}
                                >
                                  {showPreview ? 'Ocultar' : 'Visualizar'} Próximas Execuções
                                </Button>
                              </Grid>

                              <Collapse in={showPreview && previewExecutions.length > 0}>
                                <Grid xs={12} item>
                                  <Card className={classes.previewCard}>
                                    <CardContent>
                                      <Typography variant="subtitle2" gutterBottom>
                                        Próximas 5 Execuções:
                                      </Typography>
                                      <List dense>
                                        {previewExecutions.slice(0, 5).map((execution, index) => (
                                          <ListItem key={index} divider>
                                            <ListItemText
                                              primary={`${index + 1}ª Execução`}
                                              secondary={typeof execution === 'string' ? execution : moment(execution).format('DD/MM/YYYY HH:mm')}
                                            />
                                          </ListItem>
                                        ))}
                                      </List>
                                    </CardContent>
                                  </Card>
                                </Grid>
                              </Collapse>
                            </Grid>
                          </Collapse>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                  </>
                  )}
                </Grid>
              </DialogContent>
              <DialogActions>
                <Box className={classes.footerStepper}>
                  <Box>
                {(campaign.status === "CANCELADA" || campaign.status === "FINALIZADA") && (
                  <Button
                    color="primary"
                    onClick={() => restartCampaign()}
                    variant="outlined"
                  >
                    {i18n.t("campaigns.dialog.buttons.restart")}
                  </Button>
                )}
                {campaign.status === "EM_ANDAMENTO" && (
                  <Button
                    color="primary"
                    onClick={() => cancelCampaign()}
                    variant="outlined"
                  >
                    {i18n.t("campaigns.dialog.buttons.cancel")}
                  </Button>
                )}
                  </Box>
                  <Box display="flex" alignItems="center" gap={8}>
                    {activeStep > 0 && (
                      <Button onClick={() => setActiveStep((s) => s - 1)} disabled={isSubmitting}>
                        Voltar
                      </Button>
                    )}
                    <Button
                      onClick={handleClose}
                      color="primary"
                      disabled={isSubmitting}
                      variant="outlined"
                    >
                      {i18n.t("campaigns.dialog.buttons.close")}
                    </Button>
                    {activeStep < 2 && (
                      <Button
                        color="primary"
                        variant="contained"
                        onClick={() => {
                          if (forceWhatsappOficial && activeStep === 0) {
                            if (!whatsappId) {
                              toast.error("Selecione a conexão API Oficial.");
                              return;
                            }
                            if (!(metaTemplateIds?.length || metaTemplateSelection?.quickMessageId)) {
                              toast.error("Selecione ao menos um template Meta sincronizado.");
                              return;
                            }
                          }
                          setActiveStep((s) => s + 1);
                        }}
                        disabled={isSubmitting}
                      >
                        Próximo
                      </Button>
                    )}
                    {activeStep === 2 && (campaignEditable || campaign.status === "CANCELADA") && (
                      <>
                        <Button
                          onClick={() => handleSendNow(values)}
                          disabled={isSubmitting || sendNowInProgress}
                          variant="outlined"
                          className={classes.outlinePrimaryButton}
                          style={{ marginLeft: 8 }}
                        >
                          {sendNowInProgress ? (
                            <>
                              Enviando...
                              <CircularProgress size={18} className={classes.buttonProgress} />
                            </>
                          ) : (
                            "Enviar Agora"
                          )}
                        </Button>
                        <Button
                          type="submit"
                          color="primary"
                          disabled={isSubmitting}
                          variant="contained"
                          className={classes.btnWrapper}
                        >
                          {campaignId
                            ? `${i18n.t("campaigns.dialog.buttons.edit")}`
                            : `${i18n.t("campaigns.dialog.buttons.add")}`}
                          {isSubmitting && (
                            <CircularProgress
                              size={24}
                              className={classes.buttonProgress}
                            />
                          )}
                        </Button>
                      </>
                    )}
                  </Box>
                </Box>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default CampaignModal;
