/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useHistory, useLocation, useParams, matchPath } from "react-router-dom";
import clsx from "clsx";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputBase,
  LinearProgress,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ArrowBack from "@material-ui/icons/ArrowBack";
import SaveOutlined from "@material-ui/icons/SaveOutlined";
import GetAppOutlined from "@material-ui/icons/GetAppOutlined";
import DescriptionOutlined from "@material-ui/icons/DescriptionOutlined";
import AccountTreeOutlined from "@material-ui/icons/AccountTreeOutlined";
import FlashOnOutlined from "@material-ui/icons/FlashOnOutlined";
import QuestionAnswerOutlined from "@material-ui/icons/QuestionAnswerOutlined";
import MenuBookOutlined from "@material-ui/icons/MenuBookOutlined";
import ImageOutlined from "@material-ui/icons/ImageOutlined";
import {
  Calendar,
  ArrowLeftRight,
  UserPlus,
  CircleDollarSign,
  Link2,
  CalendarClock,
  ListTodo,
  Headphones,
  ShoppingBag,
  Filter,
  MessageCircle,
  Target,
  Languages,
  Smile,
  Meh,
  Sparkles,
  PenLine,
  Globe,
  Paperclip,
  Trash2,
  FileText,
  FileType2,
  Braces,
  Table,
  AlignLeft,
  Plug,
  Package
} from "lucide-react";
import { getBackendUrl } from "../../config";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import ForbiddenPage from "../../components/ForbiddenPage";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import AgentIntegrationSection from "./components/AgentIntegrationSection";
import AgentInventoryTab from "./components/AgentInventoryTab";
import { normalizeAgentInventory } from "../../helpers/inventoryReplyTemplates";
import useAnthropicIntegration from "../../hooks/useAnthropicIntegration";
import { isClaudeModelId } from "../../providers/anthropic/models";
import { isGeminiModelId } from "../../providers/gemini/models";
import { isGrokModelId } from "../../providers/grok/models";
import useGeminiIntegration from "../../hooks/useGeminiIntegration";
import useGrokIntegration from "../../hooks/useGrokIntegration";

import { buildDefaultAgentV2, normalizeApiResponseToV2, mergeImportedAgentJson } from "./defaultAgentV2";
import { PLAN_PROMPT_CHAR_LIMIT } from "./openAiIntegrationConstants";
import { AgentEditorChoicePicker } from "./AgentEditorChoicePicker";
import AgentScriptEditor, { getSlashFilter, getStarFilter } from "./AgentScriptEditor";
import AgentScriptPickerModal from "./AgentScriptPickerModal";
import AgentScriptHelpModal from "./AgentScriptHelpModal";
import AgentActionsTab from "./AgentActionsTab";
import { STANDARD_SCRIPT_VARIABLES, STANDARD_VARIABLE_KEYS } from "./agentScriptConstants";
import {
  AGENT_SCRIPT_PERFECT_TEMPLATE_BODY,
  AGENT_SCRIPT_PERFECT_TEMPLATE_FILENAME
} from "./agentScriptPerfectTemplate";

/** Id da linha `Prompts` nas respostas GET/POST/PUT (contrato estável para o frontend). */
function resolvePromptTableId(data) {
  if (!data || typeof data !== "object") return null;
  const raw = data.id != null ? data.id : data.promptId;
  if (raw === "" || raw == null) return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : null;
}

/** Mensagem ao falhar GET /prompt/:id (rede vs 5xx vs 404). */
function getAgentLoadErrorAction(err) {
  const status = err?.response?.status;
  const body = err?.response?.data;
  const serverMsg = body?.error || body?.message;

  if (status === 404) {
    return {
      mode: "toast",
      message: "Agente não encontrado ou já foi removido.",
      redirect: true
    };
  }
  if (status === 401) {
    return {
      mode: "toast",
      message: "Não autorizado. Inicie sessão novamente se o problema continuar.",
      redirect: false
    };
  }
  if (status === 403) {
    return {
      mode: "toast",
      message: "Sem permissão para ver este agente.",
      redirect: true
    };
  }
  if (status >= 500) {
    return {
      mode: "toast",
      message: serverMsg
        ? `Erro no servidor: ${String(serverMsg)}`
        : "Erro no servidor (5xx) ao carregar o agente. Veja o terminal do backend.",
      redirect: true
    };
  }

  const base = getBackendUrl();
  if (err?.code === "ECONNABORTED") {
    return {
      mode: "toast",
      message: `Tempo esgotado ao contactar a API (${base}). Tente novamente.`,
      redirect: true
    };
  }
  if (err?.response == null) {
    const netHint =
      err?.message === "Network Error"
        ? "O browser não conseguiu ligar ao servidor (rede, CORS ou servidor parado)."
        : "Sem resposta HTTP do servidor.";
    return {
      mode: "toast",
      message: `${netHint} API: ${base}. Confirme o backend (ex.: npm run dev na pasta backend, porta por defeito 3000) e REACT_APP_BACKEND_URL.`,
      redirect: true
    };
  }

  return { mode: "toastError", redirect: true };
}

/** 100 GB — alinhado ao middleware uploadAttendanceFlowMedia no backend */
const AGENT_MEDIA_MAX_BYTES = 100 * 1024 * 1024 * 1024;

function formatUploadBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

function inferUploadKind(file) {
  const mime = String(file?.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || mime.includes("document") || mime.includes("sheet")) return "document";
  return "file";
}

function inferMediaFileTypeLabel(file) {
  const mime = String(file?.type || "").toLowerCase();
  if (mime.startsWith("image/")) return "imagem";
  if (mime.startsWith("video/")) return "vídeo";
  if (mime.startsWith("audio/")) return "áudio";
  if (mime === "application/pdf") return "PDF";
  const ext = String(file?.name || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif"].includes(ext)) return "imagem";
  if (["mp4", "mkv", "mov", "avi", "webm", "m4v", "wmv", "flv", "3gp"].includes(ext)) return "vídeo";
  if (["mp3", "ogg", "wav", "m4a", "aac", "flac", "opus"].includes(ext)) return "áudio";
  if (ext === "pdf") return "PDF";
  return "documento";
}

function normalizeMediaSlug(raw) {
  let s = String(raw || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  s = s.slice(0, 48) || `midia_${Date.now()}`;
  if (!/^[a-zA-Z]/.test(s)) s = `m_${s}`;
  return s;
}

function slugFromFileName(name) {
  return normalizeMediaSlug(String(name || "").replace(/\.[^.]+$/, ""));
}

const TAB_INTEGRATION = "integracao";
const TAB_RULES = "regras";
const TAB_SCRIPT = "roteiro";
const TAB_FAQ = "faq";
const TAB_KNOW = "base";
const TAB_ACTIONS = "acoes";
const TAB_INVENTORY = "inventario";

const ACTION_PRESET_DEFS = [
  {
    type: "agendamento",
    name: "Realizar agendamento",
    slug: "agendamento",
    Icon: Calendar,
    color: "#0ea5e9",
    hint: "Confirmação e responsável",
    agentTriggerPatterns: [
      "gostaria de agendar",
      "quer agendar",
      "podemos marcar",
      "qual o melhor dia",
      "qual o melhor horário",
      "me passe o dia e horário",
      "vamos agendar",
      "posso reservar um horário",
      "quer marcar uma visita",
      "qual data funciona melhor",
      "me diga uma data",
      "tem algum horário de preferência",
      "posso confirmar sua agenda",
      "vou registrar seu horário"
    ],
    userTriggerPatterns: [
      "amanhã",
      "depois de amanhã",
      "semana que vem",
      "próxima semana",
      "dia 1",
      "às 10h",
      "horário",
      "hoje",
      "segunda",
      "terça",
      "quarta",
      "quinta",
      "sexta",
      "de manhã",
      "à tarde",
      "noite",
      "15/05",
      "amanha as 10",
      "pode ser amanhã"
    ],
    intentSlotSchema: [
      { name: "date", type: "datetime", required: true, label: "Data e horário" }
    ]
  },
  {
    type: "transferir",
    name: "Transferir chamado",
    slug: "transferirchamado",
    Icon: ArrowLeftRight,
    color: "#8b5cf6",
    hint: "Fila e time",
    agentTriggerPatterns: [
      "vou te transferir",
      "passar para um atendente",
      "encaminhar para um atendente",
      "atendente humano",
      "vou direcionar para o time",
      "vou passar para o setor responsável",
      "um consultor vai te atender",
      "vou chamar um especialista",
      "vou encaminhar seu atendimento",
      "vou transferir seu chamado",
      "nosso time humano continua"
    ],
    userTriggerPatterns: [
      "sim",
      "pode transferir",
      "ok",
      "quero falar com atendente",
      "pode sim",
      "tudo bem",
      "confirmo",
      "quero atendente",
      "falar com humano",
      "me transfere",
      "pode passar",
      "chama atendente"
    ]
  },
  {
    type: "criar_lead",
    name: "Criar lead",
    slug: "criarLead",
    Icon: UserPlus,
    color: "#10b981",
    hint: "Pipeline e CRM",
    agentTriggerPatterns: [
      "me passe seu nome",
      "me passa seu e-mail",
      "qual seu telefone",
      "me informe seus dados",
      "me diga seu contato",
      "qual seu melhor e-mail",
      "qual número para contato",
      "vou registrar seu cadastro",
      "me envie nome e telefone",
      "preciso dos seus dados"
    ],
    userTriggerPatterns: [
      "@",
      "nome:",
      "telefone:",
      "whats:",
      "email",
      "e-mail",
      "meu nome",
      "meu telefone",
      "contato",
      "celular",
      "gmail.com",
      "hotmail.com"
    ],
    intentSlotSchema: [
      { name: "name", type: "string", required: true, label: "Nome" },
      { name: "email", type: "string", required: false, label: "E-mail" },
      { name: "phone", type: "string", required: true, label: "Telefone" },
      { name: "company", type: "string", required: false, label: "Empresa" },
      { name: "city", type: "string", required: false, label: "Cidade" },
      { name: "interest", type: "string", required: false, label: "Interesse" },
      { name: "responsibleId", type: "number", required: false, label: "Responsável" },
      { name: "description", type: "string", required: false, label: "Observações" }
    ]
  },
  {
    type: "criar_contato",
    name: "Criar contato",
    slug: "criarContato",
    Icon: UserPlus,
    color: "#22c55e",
    hint: "Cadastro do contato",
    agentTriggerPatterns: [
      "vou registrar seu contato",
      "vou criar seu contato",
      "vou atualizar seu contato",
      "me passe nome e telefone",
      "me informe seus dados de contato",
      "vou salvar seus dados de contato",
      "vou deixar seu contato cadastrado",
      "qual nome e telefone para contato"
    ],
    userTriggerPatterns: [
      "meu nome",
      "telefone",
      "whatsapp",
      "contato",
      "celular",
      "email",
      "e-mail",
      "@",
      "pode cadastrar",
      "salva meu contato"
    ],
    intentSlotSchema: [
      { name: "name", type: "string", required: true, label: "Nome" },
      { name: "phone", type: "string", required: true, label: "Telefone" },
      { name: "email", type: "string", required: false, label: "E-mail" },
      { name: "company", type: "string", required: false, label: "Empresa" },
      { name: "city", type: "string", required: false, label: "Cidade" }
    ]
  },
  {
    type: "preco",
    name: "Passar preço",
    slug: "passarPreco",
    Icon: CircleDollarSign,
    color: "#f59e0b",
    hint: "Inventário",
    agentTriggerPatterns: [
      "o valor é",
      "o preço fica",
      "o investimento é",
      "fica por",
      "o custo é",
      "o plano custa",
      "o pacote fica",
      "posso te passar valores"
    ],
    userTriggerPatterns: [
      "qual o preço",
      "quanto custa",
      "qual o valor",
      "tem valor",
      "me passa preço",
      "quanto fica",
      "valor?",
      "preço?",
      "orçamento"
    ]
  },
  {
    type: "enviar_link",
    name: "Enviar link",
    slug: "enviarLink",
    Icon: Link2,
    color: "#6366f1",
    hint: "URL ao cliente",
    agentTriggerPatterns: [
      "segue o link",
      "vou te enviar o link",
      "aqui está o link",
      "acesse por aqui",
      "vou mandar o formulário",
      "vou enviar o catálogo",
      "segue nosso catálogo",
      "segue o formulário",
      "link de pagamento",
      "link para cadastro"
    ],
    userTriggerPatterns: [
      "manda o link",
      "envia o link",
      "qual o link",
      "pode enviar",
      "me manda",
      "manda pra mim",
      "quero o link",
      "envia pra mim",
      "onde acesso",
      "tem link"
    ]
  },
  {
    type: "consultar_agenda",
    name: "Consultar agenda",
    slug: "verificarAgenda",
    Icon: CalendarClock,
    color: "#14b8a6",
    hint: "Horários",
    agentTriggerPatterns: [
      "vou verificar a agenda",
      "deixa eu conferir a disponibilidade",
      "vou checar",
      "vou consultar horários",
      "vou ver disponibilidade",
      "vou conferir os horários",
      "deixa eu validar na agenda",
      "vou confirmar se temos horário"
    ],
    userTriggerPatterns: [
      "tem disponibilidade",
      "tem horário",
      "qual o próximo horário",
      "tem vaga",
      "qual data tem",
      "quando pode",
      "que horas tem",
      "tem amanhã",
      "tem hoje"
    ]
  },
  {
    type: "ticket",
    name: "Criar atividade",
    slug: "criarAtividade",
    Icon: ListTodo,
    color: "#ec4899",
    hint: "Tarefas internas",
    agentTriggerPatterns: [
      "vou registrar uma atividade",
      "abrir uma tarefa",
      "registrar no sistema",
      "vou criar uma tarefa",
      "vou anotar no atendimento",
      "vou deixar registrado"
    ],
    userTriggerPatterns: ["ok", "pode registrar", "combinado", "pode anotar", "registra", "confirmado"],
    intentSlotSchema: [
      { name: "title", type: "string", required: false, label: "Título" },
      { name: "description", type: "string", required: false, label: "Descrição" },
      { name: "date", type: "datetime", required: false, label: "Data" },
      { name: "userId", type: "number", required: false, label: "Responsável" }
    ]
  }
];

const ROLE_CHOICES = [
  { value: "Especialista em suporte ao cliente", label: "Suporte", Icon: Headphones },
  { value: "Consultor comercial", label: "Vendas", Icon: ShoppingBag },
  { value: "Triagem e qualificação de leads", label: "Triagem", Icon: Filter },
  { value: "Assistente geral multicanal", label: "Geral", Icon: MessageCircle }
];

const OBJECTIVE_CHOICES = [
  { value: "Resolver dúvidas e orientar o cliente com clareza.", label: "Suporte", Icon: Headphones },
  { value: "Qualificar interesse e conduzir à venda com consultoria.", label: "Vendas", Icon: ShoppingBag },
  { value: "Agendar reuniões ou visitas com eficiência.", label: "Agendar", Icon: Calendar },
  { value: "Coletar dados e encaminhar ao time certo.", label: "Coletar info", Icon: Target }
];

const FORMALITY_CHOICES = [
  { value: "informal", label: "Leve", Icon: Smile },
  { value: "neutro", label: "Neutro", Icon: Meh },
  { value: "profissional", label: "Formal", Icon: PenLine }
];

const LANGUAGE_CHOICES = [
  { value: "pt-BR", label: "PT", sub: "Brasil", Icon: Languages },
  { value: "en-US", label: "EN", sub: "US", Icon: Languages },
  { value: "es", label: "ES", sub: "Español", Icon: Languages }
];

const WRITING_STYLE_CHOICES = [
  { value: "claro e direto", label: "Direto", Icon: PenLine },
  { value: "consultivo e humano", label: "Consultivo", Icon: MessageCircle },
  { value: "amigável e próximo", label: "Amigável", Icon: Smile },
  { value: "técnico e preciso", label: "Técnico", Icon: Sparkles }
];

const EMOJI_TOGGLE_OPTIONS = [
  { value: true, label: "Sim", Icon: Smile },
  { value: false, label: "Não", Icon: Meh }
];

function deepClone(o) {
  return JSON.parse(JSON.stringify(o));
}

function normalizeSavedPromptState(responseData, fallbackPayload) {
  const normalized = normalizeApiResponseToV2(responseData);
  if (normalized) return normalized;
  if (fallbackPayload && Number(fallbackPayload.schemaVersion) === 2 && fallbackPayload.agent) {
    return deepClone(fallbackPayload);
  }
  return null;
}

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  return {
    pageRoot: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(2),
      padding: theme.spacing(2, 2, 3),
      boxSizing: "border-box",
      minHeight: 0,
      overflow: "visible"
    },
    editorGrid: {
      display: "grid",
      gridTemplateColumns: "1fr minmax(280px, 320px)",
      gap: theme.spacing(2),
      alignItems: "start",
      overflow: "visible",
      [theme.breakpoints.down("sm")]: {
        gridTemplateColumns: "1fr"
      }
    },
    editorGridIntegration: {
      gridTemplateColumns: "1fr",
      maxWidth: 1320,
      margin: "0 auto",
      width: "100%",
      padding: theme.spacing(0, 1, 0, 2)
    },
    editorGridInventory: {
      gridTemplateColumns: "1fr",
      maxWidth: "100%"
    },
    docWrap: {
      borderRadius: 14,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "#fafafa",
      padding: theme.spacing(2.5, 3),
      minHeight: 440,
      boxShadow: isDark ? "none" : "0 8px 30px rgba(15,23,42,0.06)",
      transition: "box-shadow 0.2s ease, border-color 0.2s ease",
      "&:focus-within": {
        borderColor: isDark ? "rgba(129,140,248,0.45)" : "rgba(99,102,241,0.35)",
        boxShadow: isDark
          ? "0 0 0 3px rgba(129,140,248,0.12)"
          : "0 0 0 3px rgba(99,102,241,0.12), 0 8px 30px rgba(15,23,42,0.06)"
      }
    },
    docTextarea: {
      width: "100%",
      minHeight: 400,
      border: "none",
      outline: "none",
      resize: "vertical",
      background: "transparent",
      fontSize: "0.875rem",
      lineHeight: 1.65,
      fontFamily:
        '"Helvetica Neue", HelveticaNeue, "SF Pro Text", "Segoe UI", system-ui, -apple-system, sans-serif',
      color: theme.palette.text.primary,
      letterSpacing: "-0.011em",
      "&::placeholder": {
        color: isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.38)",
        opacity: 1
      }
    },
    subtleActions: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: theme.spacing(1),
      marginBottom: theme.spacing(1.5)
    },
    attachBtn: {
      textTransform: "none",
      borderRadius: 10,
      fontWeight: 500,
      padding: "6px 14px",
      background: isDark
        ? "#1e3a5f"
        : "linear-gradient(180deg, #e0f2fe 0%, #dbeafe 100%)",
      color: isDark ? "#ffffff" : "#0369a1",
      border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #bae6fd",
      boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 2px rgba(3,105,161,0.08)",
      "&:hover": {
        background: isDark
          ? "#254a72"
          : "linear-gradient(180deg, #dbeafe 0%, #cffafe 100%)"
      }
    },
    scriptWrap: {
      position: "relative"
    },
    scriptPaperExpand: {
      minHeight: "min-content",
      overflow: "visible"
    },
    settingsCard: {
      borderRadius: 16,
      padding: theme.spacing(1.5, 1.75),
      marginBottom: theme.spacing(1.25),
      background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
      border: `1px solid ${border}`,
      boxShadow: isDark ? "none" : "0 4px 24px rgba(15,23,42,0.06)"
    },
    magicPanel: {
      background: isDark
        ? "linear-gradient(165deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)"
        : "linear-gradient(165deg, #ffffff 0%, #f8f9fb 100%)",
      backdropFilter: "saturate(1.1) blur(10px)",
      WebkitBackdropFilter: "saturate(1.1) blur(10px)"
    },
    magicRing: {
      borderRadius: 17,
      padding: 1,
      marginBottom: theme.spacing(1.25),
      background: isDark
        ? "linear-gradient(145deg, rgba(129,140,248,0.35), rgba(45,212,191,0.2))"
        : "linear-gradient(145deg, rgba(99,102,241,0.22), rgba(14,165,233,0.14))"
    },
    magicRingInner: {
      borderRadius: 16,
      background: isDark ? "rgba(22,22,24,0.98)" : "#ffffff",
      padding: theme.spacing(1.5, 1.75),
      border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.06)"
    },
    cardTitle: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(1)
    },
    miniLabel: {
      display: "block",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      marginBottom: 6
    },
    choiceBtn: {
      textTransform: "none",
      borderRadius: 8,
      padding: "7px 14px",
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: "0.02em",
      lineHeight: 1.25,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.11)" : "rgba(15,23,42,0.1)"}`,
      color: theme.palette.text.secondary,
      background: "transparent",
      minHeight: 32,
      boxShadow: "none",
      "& .MuiButton-startIcon": {
        marginRight: 10,
        marginLeft: 0
      },
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.035)",
        borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.14)"
      }
    },
    choiceBtnActive: {
      color: theme.palette.text.primary,
      borderColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.2)",
      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.055)",
      boxShadow: "none",
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.07)"
      }
    },
    notionField: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 10,
        transition: "box-shadow 0.18s ease, border-color 0.18s ease",
        "& fieldset": {
          borderColor: border
        },
        "&:hover fieldset": {
          borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.16)"
        },
        "&.Mui-focused fieldset": {
          borderWidth: 1,
          borderColor: "rgba(99, 102, 241, 0.65)"
        },
        "&.Mui-focused": {
          boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.14)"
        }
      }
    },
    queueSelectField: {
      "& .MuiSelect-select:focus": {
        background: "transparent"
      },
      "& .MuiOutlinedInput-input": {
        display: "flex",
        alignItems: "center",
        minHeight: "1.2em"
      }
    },
    dialogFormField: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 10,
        "& .MuiOutlinedInput-notchedOutline": {
          borderColor: `${border} !important`,
          borderWidth: "1px !important"
        },
        "&:hover .MuiOutlinedInput-notchedOutline": {
          borderColor: `${isDark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.16)"} !important`
        },
        "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
          borderWidth: "1px !important",
          borderColor: "rgba(99, 102, 241, 0.55) !important"
        },
        "&.Mui-focused": {
          boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.12)"
        }
      },
      "& .MuiInputLabel-outlined.Mui-focused": {
        color: "rgba(99, 102, 241, 0.9)"
      }
    },
    selectMenuPaper: {
      borderRadius: 12,
      marginTop: 8,
      maxHeight: 320,
      boxShadow: isDark
        ? "0 20px 48px rgba(0,0,0,0.48), 0 0 1px rgba(255,255,255,0.08)"
        : "0 20px 48px rgba(15,23,42,0.1), 0 0 1px rgba(15,23,42,0.06)",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)"}`,
      outline: "none"
    },
    faqPairCard: {
      borderRadius: 14,
      padding: theme.spacing(1.75),
      marginBottom: theme.spacing(1.5),
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.92)",
      boxShadow: isDark ? "none" : "0 2px 12px rgba(15,23,42,0.05)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      "&:hover": {
        boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 6px 20px rgba(15,23,42,0.07)",
        transform: "translateY(-1px)"
      }
    },
    urlRow: {
      display: "flex",
      alignItems: "stretch",
      gap: theme.spacing(1),
      padding: theme.spacing(1, 1.25),
      borderRadius: 12,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
      marginBottom: theme.spacing(1.5),
      "&:focus-within": {
        borderColor: "rgba(99,102,241,0.4)",
        boxShadow: "0 0 0 3px rgba(99,102,241,0.1)"
      }
    },
    urlInput: {
      flex: 1,
      fontSize: "0.875rem",
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
    },
    attachRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
      marginBottom: theme.spacing(1.5)
    },
    sourceChip: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 10,
      marginBottom: 8,
      border: `1px solid ${border}`,
      fontSize: 12,
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff"
    },
    iosSwitch: {
      "& .MuiSwitch-switchBase.Mui-checked": { color: "#34c759" },
      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#34c759", opacity: 0.5 }
    },
    metaMuted: { fontSize: 12, color: theme.palette.text.secondary },
    modalPaper: {
      borderRadius: 16,
      overflow: "hidden"
    },
    modalOption: {
      borderRadius: 12,
      marginBottom: theme.spacing(0.75),
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)"}`,
      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.65)",
      transition: "background-color 0.15s ease, border-color 0.15s ease",
      padding: 0,
      display: "block",
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.03)",
        borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)"
      }
    },
    modalActionRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      padding: "14px 16px",
      boxSizing: "border-box",
      gap: 14
    },
    modalAttachRow: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
      padding: "11px 14px",
      boxSizing: "border-box",
      gap: 12
    },
    modalAttachIconCell: {
      width: 36,
      height: 36,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    modalActionIconCell: {
      width: 40,
      height: 40,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    modalActionTextCell: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    },
    iconBubble: {
      width: 40,
      height: 40,
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    },
    lucideListIcon: {
      minWidth: 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    modalActionTitle: {
      fontWeight: 600,
      fontSize: "1.05rem",
      letterSpacing: "-0.02em"
    },
    mediaUploadPanel: {
      marginBottom: theme.spacing(1.5),
      padding: theme.spacing(2),
      borderRadius: 12,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)"}`,
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(99,102,241,0.04)"
    },
    mediaUploadRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1.5)
    },
    mediaUploadTrack: {
      flex: 1,
      height: 4,
      borderRadius: 999,
      overflow: "hidden",
      background: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"
    },
    mediaUploadBar: {
      height: "100%",
      borderRadius: 999,
      background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
      transition: "width 0.2s ease"
    },
    mediaUploadMeta: {
      fontSize: 11,
      color: theme.palette.text.secondary,
      marginTop: 6,
      letterSpacing: "0.01em"
    },
    mediaFileReady: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: theme.spacing(1.5),
      padding: "8px 12px",
      borderRadius: 10,
      fontSize: 12,
      border: `1px solid ${isDark ? "rgba(52,199,89,0.35)" : "rgba(52,199,89,0.45)"}`,
      background: isDark ? "rgba(52,199,89,0.08)" : "rgba(52,199,89,0.06)",
      color: isDark ? "rgba(220,252,231,0.95)" : "#166534"
    },
  };
});

export default function AgentEditorPage() {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();
  const { id } = useParams();
  const pathname = (location.pathname || "").replace(/\/+$/, "") || "/";
  const isCreate = matchPath(pathname, { path: "/prompts/create", exact: true }) != null;
  const promptId =
    isCreate || id == null || String(id).trim() === ""
      ? null
      : Number.parseInt(String(id), 10);
  const hasValidEditId = !isCreate && promptId != null && !Number.isNaN(promptId);
  const { user } = useContext(AuthContext);
  const isAdmin = user?.profile !== "user";
  const [loading, setLoading] = useState(() => (isCreate ? false : hasValidEditId));
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [tab, setTab] = useState(isCreate ? TAB_INTEGRATION : TAB_RULES);
  const [v2, setV2] = useState(() => buildDefaultAgentV2({ apiKey: "", model: "gpt-5.5" }));
  const [integrationPeek, setIntegrationPeek] = useState({ apiKey: "", model: "gpt-5.5" });
  const anthropicHook = useAnthropicIntegration();
  const geminiHook = useGeminiIntegration();
  const grokHook = useGrokIntegration();
  const [queues, setQueues] = useState([]);
  const [users, setUsers] = useState([]);
  const [whatsapps, setWhatsapps] = useState([]);

  const [attachOpen, setAttachOpen] = useState(false);
  const [secondaryAttach, setSecondaryAttach] = useState(null);
  const [manualPaste, setManualPaste] = useState("");
  const [attachSiteUrl, setAttachSiteUrl] = useState("");

  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaDraft, setMediaDraft] = useState({
    slug: "",
    name: "",
    fileUrl: "",
    fileType: "imagem",
    caption: ""
  });
  const [mediaUpload, setMediaUpload] = useState(null);
  const mediaFileInputRef = useRef(null);

  const knowledgeFileRef = useRef(null);

  /** `null` | `{ type: 'slash' | 'vars', filter: string }` — modal Apple para / e * */
  const [scriptMenu, setScriptMenu] = useState(null);
  const [scriptHelpOpen, setScriptHelpOpen] = useState(false);
  /** Após fechar com X/backdrop: não reabrir até sumir o contexto /… ou *… (usuário apagar o gatilho). */
  const scriptPickerDismissedRef = useRef(false);
  const scriptPickerCursorRef = useRef({ val: "", pos: -1 });
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const scriptInputRef = useRef(null);
  const [knowUrl, setKnowUrl] = useState("");

  const fileInputRef = useRef(null);
  const [fileAccept, setFileAccept] = useState(".pdf");
  const v2Ref = useRef(v2);
  useLayoutEffect(() => {
    v2Ref.current = v2;
  }, [v2]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    const unblock = history.block(() => {
      if (!dirtyRef.current) return true;
      return window.confirm(
        "Existem alterações não salvas neste agente. Sair sem salvar?"
      );
    });
    return () => unblock();
  }, [history]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  /** Guia do roteiro (?): F1 em qualquer lugar com a aba Roteiro ativa; Ctrl+? no editor. */
  useEffect(() => {
    if (tab !== TAB_SCRIPT) return undefined;
    const onHelpKey = (e) => {
      if (e.key !== "F1") return;
      e.preventDefault();
      setScriptHelpOpen(true);
    };
    window.addEventListener("keydown", onHelpKey, true);
    return () => window.removeEventListener("keydown", onHelpKey, true);
  }, [tab]);

  const markDirty = useCallback(() => setDirty(true), []);

  const charCount = useMemo(() => {
    const rules = String(v2.generalRules || "").length;
    const script = String(v2.attendance?.script || "").length;
    return rules + script;
  }, [v2.generalRules, v2.attendance]);

  const tokenApprox = Math.ceil(charCount / 4);

  const loadAuxData = useCallback(async () => {
    try {
      const [{ data: u }, { data: q }, { data: w }] = await Promise.all([
        api.get("/users/list"),
        api.get("/queue"),
        api.get("/whatsapp/")
      ]);
      setUsers(Array.isArray(u) ? u : Array.isArray(u?.users) ? u.users : []);
      setQueues(Array.isArray(q) ? q : []);
      setWhatsapps(Array.isArray(w) ? w : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadAuxData();
  }, [loadAuxData]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/settings/agent_integration");
        if (data?.value) {
          const v = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          setIntegrationPeek({ apiKey: v.apiKey || "", model: v.model || "gpt-5.5" });
          if (isCreate) {
            setV2((prev) => {
              const hasModel = String(prev.integration?.model || "").trim().length > 0;
              return {
                ...prev,
                integration: {
                  ...prev.integration,
                  apiKey: v.apiKey || prev.integration.apiKey,
                  model: hasModel ? prev.integration.model : v.model || prev.integration.model,
                  responderGrupo:
                    typeof v.responderGrupo === "boolean"
                      ? v.responderGrupo
                      : prev.integration.responderGrupo
                }
              };
            });
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, [isCreate]);

  useEffect(() => {
    loadAuxData();
  }, [loadAuxData]);

  useEffect(() => {
    if (isCreate) {
      setLoading(false);
      return;
    }
    if (!hasValidEditId) {
      toast.error("Agente inválido.");
      history.replace({ pathname: "/prompts", state: { tab: "agentes" } });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await api.get(`/prompt/${promptId}`);
        const nv = normalizeApiResponseToV2(data);
        if (cancelled) return;
        if (nv) {
          try {
            const merged = mergeImportedAgentJson(
              { schemaVersion: 2, v2: nv },
              {
                apiKey: String(nv.integration?.apiKey || "").trim(),
                model: String(nv.integration?.model || "gpt-5.5")
              }
            );
            if (!cancelled) setV2(merged);
          } catch {
            if (!cancelled) setV2(nv);
          }
          if (!cancelled) setDirty(false);
        } else if (!cancelled) toast.error("Resposta inválida do servidor.");
      } catch (e) {
        if (!cancelled) {
          const action = getAgentLoadErrorAction(e);
          if (action.mode === "toastError") {
            toastError(e);
          } else if (action.message) {
            toast.error(action.message);
          }
          if (action.redirect) {
            history.push({ pathname: "/prompts", state: { tab: "agentes" } });
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCreate, hasValidEditId, promptId, history]);

  useEffect(() => {
    if (!isCreate) return;
    const imp = location.state && location.state.importedAgent;
    if (!imp || typeof imp !== "object") return;
    setV2(imp);
    setDirty(true);
    toast.success("Agente importado do JSON. Revise e salve.");
    history.replace({ pathname: "/prompts/create", state: {} });
  }, [isCreate, history, location.state]);

  const persist = useCallback(async () => {
    const payload = deepClone(v2Ref.current);
    payload.schemaVersion = 2;
    if (!payload.integration || typeof payload.integration !== "object") {
      payload.integration = {};
    }
    const selectedModel = String(payload.integration.model || "").trim();
    const isClaude = isClaudeModelId(selectedModel);
    const isGemini = isGeminiModelId(selectedModel);
    const isGrok = isGrokModelId(selectedModel);
    if (!isClaude && !isGemini && !isGrok && !String(payload.integration.apiKey || "").trim()) {
      payload.integration.apiKey = String(integrationPeek.apiKey || "").trim();
    }
    if (isGrok) {
      try {
        const integration = await grokHook.getIntegration();
        if (!integration?.enabled || !integration?.apiKey?.hasKey) {
          toast.error("Configure Grok em Integrações antes de salvar.");
          return;
        }
      } catch {
        toast.error("Não foi possível verificar a integração Grok.");
        return;
      }
    } else if (isGemini) {
      try {
        const integration = await geminiHook.getIntegration();
        if (!integration?.enabled || !integration?.apiKey?.hasKey) {
          toast.error("Configure Gemini em Integrações antes de salvar.");
          return;
        }
      } catch {
        toast.error("Não foi possível verificar a integração Gemini.");
        return;
      }
    } else if (isClaude) {
      try {
        const integration = await anthropicHook.getIntegration();
        if (!integration?.enabled || !integration?.apiKey?.hasKey) {
          toast.error("Configure Claude em Integrações antes de salvar.");
          return;
        }
      } catch {
        toast.error("Não foi possível verificar a integração Claude.");
        return;
      }
    } else if (!payload.integration.apiKey) {
      toast.error("Configure Open IA em Integrações antes de salvar.");
      return;
    }
    if (!String(payload.integration.model || "").trim()) {
      payload.integration.model = integrationPeek.model || "gpt-5.5";
    }
    if (typeof payload.integration.responderGrupo === "boolean" && !isClaude && !isGemini && !isGrok) {
      try {
        const { data } = await api.get("/settings/agent_integration");
        const prev =
          data?.value && typeof data.value === "string"
            ? JSON.parse(data.value)
            : data?.value || {};
        await api.put("/settings/agent_integration", {
          value: { ...prev, responderGrupo: payload.integration.responderGrupo }
        });
      } catch {
        /* preferência global; agente segue com v2 */
      }
    }

    setSaving(true);
    setSaveStatus("saving");
    try {
      if (isCreate) {
        const { data } = await api.post("/prompt", payload);
        const newId = resolvePromptTableId(data);
        const savedState = normalizeSavedPromptState(data, payload);
        if (savedState) {
          v2Ref.current = savedState;
          setV2(savedState);
        }
        toast.success(data?.relationSyncWarning ? "Agente salvo no banco. Ajustes auxiliares serão sincronizados." : "Agente salvo no banco de dados.");
        setSaveStatus("saved");
        setDirty(false);
        if (newId != null) {
          history.push({
            pathname: `/prompts/create/${newId}`,
            state: { tab: "agentes", justCreatedAgentId: newId }
          });
        } else {
          toast.info("Agente criado. Abra a aba Agentes para ver o novo item na lista.");
          history.push({ pathname: "/prompts", state: { tab: "agentes" } });
        }
      } else if (hasValidEditId) {
        const { data } = await api.put(`/prompt/${promptId}`, payload);
        const savedState = normalizeSavedPromptState(data, payload);
        if (savedState) {
          v2Ref.current = savedState;
          setV2(savedState);
        }
        toast.success(data?.relationSyncWarning ? "Alterações salvas no banco. Ajustes auxiliares serão sincronizados." : "Alterações salvas no banco de dados.");
        setSaveStatus("saved");
        setDirty(false);
      } else {
        toast.error("Identificador do agente inválido.");
        setSaveStatus("error");
      }
    } catch (e) {
      const status = e?.response?.status;
      const backendMessage = e?.response?.data?.error || e?.response?.data?.details;
      if (!status || status >= 500) {
        toast.error(backendMessage ? `Erro ao salvar: ${backendMessage}` : "Erro ao salvar. Verifique a conexão com o servidor e tente novamente.");
      } else if (status === 401 || status === 403) {
        toast.error("Sessão expirada ou sem permissão para salvar.");
      } else if (backendMessage) {
        toast.error(`Erro ao salvar: ${backendMessage}`);
      }
      toastError(e);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [isCreate, hasValidEditId, promptId, history, integrationPeek.apiKey, integrationPeek.model, anthropicHook]);

  const refreshV2SmartActionsFromDb = useCallback(async () => {
    if (!promptId || isCreate) return;
    try {
      const { data } = await api.get(`/prompt/${promptId}`);
      const nv = normalizeApiResponseToV2(data);
      if (nv && Array.isArray(nv.smartActions)) {
        setV2((prev) => ({ ...prev, smartActions: nv.smartActions }));
      }
    } catch (e) {
      toastError(e);
    }
  }, [promptId, isCreate]);

  const updateV2 = (patch) => {
    setV2((prev) => ({ ...prev, ...patch }));
    markDirty();
  };

  const updateAgent = (patch) => {
    setV2((prev) => ({ ...prev, agent: { ...prev.agent, ...patch } }));
    markDirty();
  };

  const updateIntegration = (patch) => {
    setV2((prev) => ({ ...prev, integration: { ...prev.integration, ...patch } }));
    markDirty();
  };

  const updateModelWithProviderGuard = (nextModel) => {
    updateIntegration({ model: nextModel });
  };

  const updateAttendance = (patch) => {
    setV2((prev) => ({
      ...prev,
      attendance: { ...prev.attendance, ...patch }
    }));
    markDirty();
  };

  const updateAttendanceSettings = (patch) => {
    setV2((prev) => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        settings: { ...prev.attendance.settings, ...patch }
      }
    }));
    markDirty();
  };

  const updateKnowledge = (patch) => {
    setV2((prev) => ({
      ...prev,
      knowledge: { ...prev.knowledge, ...patch }
    }));
    markDirty();
  };

  const appendToRules = (text) => {
    setV2((prev) => ({
      ...prev,
      generalRules: `${prev.generalRules || ""}\n\n${text}`.trim()
    }));
    markDirty();
  };

  const extractFile = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/prompt/extract-document", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const t = String(data?.text || "").trim();
      if (t) appendToRules(t);
      toast.success("Texto inserido nas Regras gerais.");
    } catch (e) {
      toastError(e);
    }
  };

  const extractKnowledgeAttachment = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/prompt/extract-document", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      const t = String(data?.text || "").trim();
      if (!t) {
        toast.error("Não foi possível extrair texto deste arquivo.");
        return;
      }
      const name = String(file.name || "documento").slice(0, 240);
      setV2((prev) => {
        const prevSources = Array.isArray(prev.knowledge?.sources) ? prev.knowledge.sources : [];
        return {
          ...prev,
          knowledge: {
            ...prev.knowledge,
            sources: [
              ...prevSources,
              {
                sourceType: "document",
                title: name,
                content: t.slice(0, 200000),
                metadata: { kind: "extracted_upload" }
              }
            ]
          }
        };
      });
      markDirty();
      toast.success("Anexo processado e adicionado à base.");
    } catch (e) {
      toastError(e);
    }
  };

  const triggerFilePick = (accept) => {
    setFileAccept(accept);
    setAttachOpen(false);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleExportJson = () => {
    const body = {
      exportedAt: new Date().toISOString(),
      schemaVersion: 2,
      promptId: promptId || null,
      v2: deepClone(v2Ref.current)
    };
    const blob = new Blob([JSON.stringify(body, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const safe = String(v2Ref.current?.agent?.name || "agente").replace(/[^\w\-]+/g, "_");
    a.download = `${safe}-${promptId || "novo"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Exportação gerada.");
  };

  const handleDownloadScriptTemplate = () => {
    try {
      const blob = new Blob([AGENT_SCRIPT_PERFECT_TEMPLATE_BODY], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = AGENT_SCRIPT_PERFECT_TEMPLATE_FILENAME;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Modelo baixado — abra o arquivo e copie o texto para o roteiro.");
    } catch (e) {
      toast.error("Não foi possível baixar o modelo.");
    }
  };

  const insertScriptToken = (slugOrToken) => {
    const el = scriptInputRef.current;
    const script = v2Ref.current.attendance.script || "";
    let start = 0;
    let end = 0;
    if (el && typeof el.selectionStart === "number") {
      start = el.selectionStart;
      end = el.selectionEnd;
    } else {
      start = end = script.length;
    }
    let before = script.slice(0, start);
    const after = script.slice(end);
    if (/\/[a-zA-Z0-9_-]*$/.test(before)) {
      before = before.replace(/\/[a-zA-Z0-9_-]*$/, "");
    } else if (/\*[a-zA-Z0-9_]*$/.test(before)) {
      before = before.replace(/\*[a-zA-Z0-9_]*$/, "");
    }
    const raw =
      slugOrToken.startsWith("/") || slugOrToken.startsWith("{")
        ? slugOrToken
        : `/${slugOrToken}`;
    const needsSpace = !raw.endsWith("}");
    const insertText = needsSpace ? `${raw} ` : raw;
    const newScript = before + insertText + after;
    const pos = before.length + insertText.length;
    setV2((prev) => ({
      ...prev,
      attendance: { ...prev.attendance, script: newScript }
    }));
    markDirty();
    scriptPickerDismissedRef.current = false;
    setScriptMenu(null);
    requestAnimationFrame(() => {
      if (el && document.body.contains(el)) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  };

  const dismissScriptPicker = useCallback(() => {
    scriptPickerDismissedRef.current = true;
    setScriptMenu(null);
  }, []);

  const syncScriptPickerFromCursor = useCallback((val, pos) => {
    const slash = getSlashFilter(val, pos);
    const star = getStarFilter(val, pos);
    if (slash === null && star === null) {
      scriptPickerDismissedRef.current = false;
      setScriptMenu(null);
      return;
    }
    if (scriptPickerDismissedRef.current) {
      setScriptMenu(null);
      return;
    }
    if (slash !== null) setScriptMenu({ type: "slash", filter: slash });
    else if (star !== null) setScriptMenu({ type: "vars", filter: star });
    else setScriptMenu(null);
  }, []);

  const onScriptChange = (val, event) => {
    updateAttendance({ script: val });
    const pos =
      event?.target?.selectionStart != null ? event.target.selectionStart : val.length;
    scriptPickerCursorRef.current = { val, pos };
    syncScriptPickerFromCursor(val, pos);
  };

  const onScriptSelect = (e) => {
    const ta = e?.target;
    if (!ta || ta.selectionStart == null) return;
    const val = ta.value;
    const pos = ta.selectionStart;
    if (
      scriptPickerCursorRef.current.val === val &&
      scriptPickerCursorRef.current.pos === pos
    ) {
      return;
    }
    scriptPickerCursorRef.current = { val, pos };
    syncScriptPickerFromCursor(val, pos);
  };

  const scriptPickerItems = useMemo(() => {
    if (!scriptMenu) return [];
    const q = (scriptMenu.filter || "").toLowerCase();
    if (scriptMenu.type === "vars") {
      return STANDARD_SCRIPT_VARIABLES.filter(
        (v) =>
          !q ||
          v.label.toLowerCase().includes(q) ||
          v.key.toLowerCase().startsWith(q) ||
          v.sub.toLowerCase().includes(q)
      ).map((v) => ({
        key: `var-${v.key}`,
        emoji: v.emoji,
        title: v.label,
        subtitle: v.sub,
        insert: `{${v.key}}`
      }));
    }
    const rows = [
      ...v2.mediaLibrary.map((m) => ({
        key: `m-${m.slug}`,
        emoji: "📎",
        title: m.name,
        subtitle: `/${String(m.slug || "").replace(/^\//, "")}`,
        insert: String(m.slug || "").replace(/^\//, "")
      }))
    ];
    return rows.filter(
      (it) =>
        !q ||
        it.insert.toLowerCase().startsWith(q) ||
        it.title.toLowerCase().includes(q) ||
        it.subtitle.toLowerCase().includes(q)
    );
  }, [scriptMenu, v2.mediaLibrary]);

  const addMedia = () => {
    if (mediaUpload) {
      toast.info("Aguarde o envio do arquivo terminar.");
      return;
    }
    if (!mediaDraft.slug.trim() || !mediaDraft.name.trim()) {
      toast.error("Informe slug e nome amigável.");
      return;
    }
    if (!mediaDraft.fileUrl.trim()) {
      toast.error("Envie um arquivo ou informe a URL.");
      return;
    }
    setV2((prev) => ({
      ...prev,
      mediaLibrary: [
        ...prev.mediaLibrary,
        {
          slug: normalizeMediaSlug(mediaDraft.slug),
          name: mediaDraft.name,
          fileUrl: mediaDraft.fileUrl,
          fileType: mediaDraft.fileType,
          caption: mediaDraft.caption
        }
      ]
    }));
    setMediaDraft({ slug: "", name: "", fileUrl: "", fileType: "imagem", caption: "" });
    markDirty();
    setMediaModalOpen(false);
    toast.success("Mídia adicionada.");
  };

  const uploadMediaFile = async (file) => {
    if (!file) return;
    if (file.size > AGENT_MEDIA_MAX_BYTES) {
      toast.error("Arquivo acima de 100 GB. Reduza o tamanho ou use outro formato.");
      return;
    }
    const suggestedSlug = slugFromFileName(file.name);
    const friendlyName = String(file.name || "")
      .replace(/\.[^.]+$/, "")
      .slice(0, 120);
    const typeLabel = inferMediaFileTypeLabel(file);

    setMediaUpload({
      fileName: file.name,
      progress: 0,
      loaded: 0,
      total: file.size || 0
    });

    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", inferUploadKind(file));

    try {
      const { data } = await api.post("/prompt/attendance-flow/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 0,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (ev) => {
          const total = ev.total || file.size || 0;
          const loaded = ev.loaded || 0;
          const progress = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : null;
          setMediaUpload({
            fileName: file.name,
            progress,
            loaded,
            total
          });
        }
      });
      if (data?.url) {
        setMediaDraft((d) => ({
          ...d,
          fileUrl: data.url,
          fileType: typeLabel,
          slug: d.slug.trim() ? d.slug : suggestedSlug,
          name: d.name.trim() ? d.name : friendlyName
        }));
        toast.success("Arquivo anexado. Salve a mídia para usar /slug no roteiro.");
      } else {
        toast.error("Resposta do servidor sem URL do arquivo.");
      }
    } catch (e) {
      const status = e?.response?.status;
      if (status === 413) {
        toast.error("Arquivo muito grande para o servidor (limite 100 GB).");
      } else if (e?.code === "ECONNABORTED") {
        toast.error("Envio interrompido por tempo limite. Tente um arquivo menor ou verifique a rede.");
      } else {
        toastError(e);
      }
    } finally {
      setMediaUpload(null);
      if (mediaFileInputRef.current) mediaFileInputRef.current.value = "";
    }
  };

  if (!isAdmin) return <ForbiddenPage />;

  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress />
        <Typography style={{ marginTop: 16 }}>Carregando agente…</Typography>
      </Box>
    );
  }

  const viewModes = [
    { value: TAB_INTEGRATION, label: "Integração", icon: <Plug size={16} strokeWidth={1.75} /> },
    { value: TAB_RULES, label: "Regras Gerais", icon: <DescriptionOutlined /> },
    { value: TAB_SCRIPT, label: "Roteiro", icon: <AccountTreeOutlined /> },
    { value: TAB_ACTIONS, label: "Ações", icon: <FlashOnOutlined /> },
    { value: TAB_INVENTORY, label: "Inventário", icon: <Package size={16} strokeWidth={1.75} /> },
    { value: TAB_FAQ, label: "FAQ", icon: <QuestionAnswerOutlined /> },
    { value: TAB_KNOW, label: "Conhecimento", icon: <MenuBookOutlined /> }
  ];

  const handleBack = () => {
    if (
      dirtyRef.current &&
      !window.confirm("Existem alterações não salvas neste agente. Sair sem salvar?")
    ) {
      return;
    }
    history.push({ pathname: "/prompts", state: { tab: "agentes" } });
  };

  const navActions = (
    <>
      <Button
        size="small"
        startIcon={<GetAppOutlined style={{ fontSize: 18, color: "#ffffff" }} />}
        onClick={handleExportJson}
        style={{ textTransform: "none", borderRadius: 10, color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.4)" }}
      >
        Exportar JSON
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<ArrowBack style={{ fontSize: 18, color: "#ffffff" }} />}
        onClick={handleBack}
        style={{ textTransform: "none", borderRadius: 10, boxShadow: "none", marginLeft: 4, color: "#ffffff", borderColor: "rgba(255, 255, 255, 0.4)" }}
      >
        Voltar
      </Button>
      <Button
        size="small"
        variant="contained"
        color="primary"
        startIcon={<SaveOutlined style={{ color: "#ffffff" }} />}
        disabled={saving}
        onClick={persist}
        style={{ textTransform: "none", borderRadius: 10, boxShadow: "none", marginLeft: 4, color: "#ffffff", backgroundColor: "#1e40af" }}
      >
        Salvar
      </Button>
    </>
  );


  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        accept={fileAccept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          extractFile(f);
          e.target.value = "";
        }}
      />

      <ActivitiesStyleLayout
        title={null}
        description={isCreate ? "Novo agente" : `Editor do agente — ${v2.agent.name || "Agente"}`}
        disableFilterBar
        hideSearch
        compactHeader
        viewModes={viewModes}
        currentViewMode={tab}
        onViewModeChange={setTab}
        navActions={navActions}
        scrollContent={false}
        contentEdgeToEdge
      >
        <Box className={classes.pageRoot}>
          <Box
            className={clsx(
              classes.editorGrid,
              tab === TAB_INTEGRATION && classes.editorGridIntegration,
              tab === TAB_INVENTORY && classes.editorGridInventory
            )}
          >
          <Box minWidth={0}>
            {tab === TAB_INTEGRATION && (
              <AgentIntegrationSection
                model={v2.integration.model}
                responderGrupo={Boolean(v2.integration.responderGrupo)}
                onModelChange={updateModelWithProviderGuard}
                onResponderGrupoChange={(checked) => updateIntegration({ responderGrupo: checked })}
                provider="auto"
                showColorPicker
                agentColor={v2.agent.agentColor}
                onAgentColorChange={(color) => updateAgent({ agentColor: color })}
                queueId={v2.integration.queueId}
                queues={queues}
                onQueueChange={(id) => updateIntegration({ queueId: id })}
              />
            )}

            {tab === TAB_RULES && (
              <>
                <Box className={classes.subtleActions}>
                  <Button className={classes.attachBtn} size="small" onClick={() => setAttachOpen(true)}>
                    Anexar
                  </Button>
                </Box>
                <Paper className={classes.docWrap} elevation={0}>
                  <InputBase
                    multiline
                    className={classes.docTextarea}
                    placeholder="Escreva as regras como um documento claro para o agente…"
                    value={v2.generalRules}
                    onChange={(e) => updateV2({ generalRules: e.target.value })}
                    inputProps={{ className: classes.docTextarea }}
                  />
                </Paper>
              </>
            )}

            {tab === TAB_SCRIPT && (
              <>
                <Box className={classes.subtleActions}>
                  <Tooltip title="Ajuda do roteiro e texto para ChatGPT — F1 ou Ctrl+? no campo">
                    <IconButton
                      size="small"
                      aria-label="Ajuda do roteiro: guia e instruções para gerar roteiro no ChatGPT"
                      onClick={() => setScriptHelpOpen(true)}
                      style={{ borderRadius: 10, marginRight: 4, fontWeight: 700 }}
                    >
                      <Typography component="span" variant="body2" style={{ fontWeight: 700, lineHeight: 1 }}>
                        ?
                      </Typography>
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    onClick={() => {
                      setMediaDraft({ slug: "", name: "", fileUrl: "", fileType: "imagem", caption: "" });
                      setMediaModalOpen(true);
                    }}
                    style={{ textTransform: "none", borderRadius: 10 }}
                    startIcon={<ImageOutlined style={{ opacity: 0.8 }} />}
                  >
                    Mídias
                  </Button>
                  <Button
                    size="small"
                    onClick={handleDownloadScriptTemplate}
                    style={{ textTransform: "none", borderRadius: 10 }}
                    startIcon={<GetAppOutlined style={{ opacity: 0.85 }} />}
                  >
                    Baixar modelo de roteiro
                  </Button>
                </Box>
                <Paper
                  className={clsx(classes.docWrap, classes.scriptWrap, classes.scriptPaperExpand)}
                  elevation={0}
                >
                  <AgentScriptEditor
                    value={v2.attendance.script}
                    onChange={onScriptChange}
                    onSelect={onScriptSelect}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") dismissScriptPicker();
                      if ((e.ctrlKey || e.metaKey) && e.key === "?") {
                        e.preventDefault();
                        setScriptHelpOpen(true);
                      }
                    }}
                    placeholder="Roteiro da conversa (somente diálogo e contexto operacional). Nova etapa: --- ou linha # (# ETAPA, # PASSO, # 1. Título…). Condições podem ser exemplos ou sim/não em texto. Automatizações ficam na aba Ações — a IA reconhece gatilhos no contexto. Use / para mídias e * para variáveis."
                    smartActions={v2.smartActions}
                    mediaLibrary={v2.mediaLibrary}
                    presetDefs={ACTION_PRESET_DEFS}
                    standardVarKeys={STANDARD_VARIABLE_KEYS}
                    inputRef={scriptInputRef}
                  />
                </Paper>
                <AgentScriptPickerModal
                  open={scriptMenu != null}
                  mode={scriptMenu?.type}
                  items={scriptPickerItems}
                  title={scriptMenu?.type === "vars" ? "Variáveis" : "Mídias"}
                  hint={
                    scriptMenu?.type === "vars"
                      ? "Substituídas automaticamente no WhatsApp. Filtre digitando após *."
                      : "Mídias do agente. Filtre digitando após /."
                  }
                  onClose={dismissScriptPicker}
                  onPick={(it) => insertScriptToken(it.insert)}
                />
                <Typography variant="caption" color="textSecondary" style={{ marginTop: 8, display: "block" }}>
                  <strong>?</strong> no canto, <strong>F1</strong> nesta aba ou <strong>Ctrl+?</strong> no roteiro: guia + briefing pronto para colar no ChatGPT. Pergunta ao cliente → próximo texto só na etapa ou <strong>RESPOSTA:</strong> seguinte. <strong>/</strong> (mídias) e <strong>*</strong> (variáveis) abrem o seletor. Nova etapa: <strong>---</strong> ou <strong># ETAPA</strong> / <strong># PASSO</strong> / <strong># 1. …</strong>. Aba <strong>Ações</strong>: gatilhos inteligentes com OpenAI. Salve ao terminar.
                </Typography>
                <AgentScriptHelpModal open={scriptHelpOpen} onClose={() => setScriptHelpOpen(false)} />
              </>
            )}

            {tab === TAB_ACTIONS && (
              <Box>
                <AgentActionsTab promptId={promptId} onRegistryUpdated={refreshV2SmartActionsFromDb} />
              </Box>
            )}

            {tab === TAB_INVENTORY && (
              <AgentInventoryTab
                value={v2.inventory}
                onChange={(inventory) =>
                  updateV2({ inventory: normalizeAgentInventory(inventory) })
                }
                promptId={promptId}
                onEnsureProductActions={async () => {
                  if (!promptId || isCreate) {
                    toast.info(
                      "Salve o agente e, na aba Ações, ative Consultar produtos / Passar preço."
                    );
                    return;
                  }
                  const slugs = [
                    "consultarprodutos",
                    "passarpreco",
                    "consultarestoque",
                    "enviarlinkproduto",
                    "registrarintencaocompra"
                  ];
                  try {
                    for (const slug of slugs) {
                      await api.post(`/prompt/${promptId}/smart-actions`, { slug });
                    }
                    toast.success("Ações de inventário disponíveis na aba Ações.");
                    await refreshV2SmartActionsFromDb();
                  } catch (err) {
                    toastError(err);
                  }
                }}
              />
            )}

            {tab === TAB_FAQ && (
              <Box>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em" }}>FAQ</Typography>
                  <Button
                    size="small"
                    style={{ textTransform: "none", borderRadius: 10 }}
                    startIcon={<Sparkles size={16} strokeWidth={1.75} />}
                    onClick={() => updateV2({ faq: [...v2.faq, { question: "", answer: "" }] })}
                  >
                    Nova pergunta
                  </Button>
                </Box>
                <Typography variant="caption" color="textSecondary" display="block" paragraph>
                  Apenas pergunta e resposta — o agente usa este conteúdo no contexto.
                </Typography>
                {v2.faq.map((row, idx) => (
                  <Paper key={idx} className={classes.faqPairCard} elevation={0}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Pergunta"
                      value={row.question}
                      onChange={(e) => {
                        const faq = [...v2.faq];
                        faq[idx] = { ...faq[idx], question: e.target.value };
                        updateV2({ faq });
                      }}
                      margin="dense"
                      variant="outlined"
                      className={classes.notionField}
                    />
                    <TextField
                      fullWidth
                      size="small"
                      label="Resposta"
                      value={row.answer}
                      onChange={(e) => {
                        const faq = [...v2.faq];
                        faq[idx] = { ...faq[idx], answer: e.target.value };
                        updateV2({ faq });
                      }}
                      margin="dense"
                      variant="outlined"
                      multiline
                      minRows={3}
                      className={classes.notionField}
                    />
                    <Box display="flex" justifyContent="flex-end" mt={0.5}>
                      <Button
                        size="small"
                        startIcon={<Trash2 size={14} strokeWidth={1.75} />}
                        onClick={() => updateV2({ faq: v2.faq.filter((_, i) => i !== idx) })}
                        style={{ textTransform: "none", color: "#94a3b8" }}
                      >
                        Remover
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}

            {tab === TAB_KNOW && (
              <Box>
                <Typography style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em", marginBottom: 8 }}>
                  Base de conhecimento
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" paragraph>
                  Texto livre, sites e documentos extraídos entram no contexto do agente.
                </Typography>
                <input
                  ref={knowledgeFileRef}
                  type="file"
                  style={{ display: "none" }}
                  accept=".pdf,.doc,.docx,.txt,.json,.csv,text/plain,application/pdf"
                  onChange={(e) => {
                    extractKnowledgeAttachment(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Box className={classes.attachRow}>
                  <Button
                    className={classes.attachBtn}
                    size="small"
                    startIcon={<Paperclip size={16} strokeWidth={1.75} />}
                    onClick={() => knowledgeFileRef.current?.click()}
                    style={{ textTransform: "none" }}
                  >
                    Anexar documento
                  </Button>
                  <Typography variant="caption" color="textSecondary">
                    PDF, DOCX, TXT, JSON ou CSV — texto extraído automaticamente
                  </Typography>
                </Box>
                <Paper className={classes.docWrap} elevation={0} style={{ minHeight: 200 }}>
                  <InputBase
                    multiline
                    className={classes.docTextarea}
                    placeholder="Escreva ou cole contexto manual…"
                    value={v2.knowledge.manualText}
                    onChange={(e) => updateKnowledge({ manualText: e.target.value })}
                    inputProps={{ className: classes.docTextarea, style: { minHeight: 180 } }}
                  />
                </Paper>
                <Typography className={classes.miniLabel} style={{ marginTop: 20 }}>
                  Site (URL)
                </Typography>
                <Box className={classes.urlRow}>
                  <Box display="flex" alignItems="center" pl={0.5} color="text.secondary">
                    <Globe size={18} strokeWidth={1.75} />
                  </Box>
                  <InputBase
                    className={classes.urlInput}
                    placeholder="https://exemplo.com/docs"
                    value={knowUrl}
                    onChange={(e) => setKnowUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const u = knowUrl.trim();
                        if (!u) return;
                        updateKnowledge({ websites: [...v2.knowledge.websites, { url: u }] });
                        setKnowUrl("");
                      }
                    }}
                  />
                  <Button
                    color="primary"
                    size="small"
                    variant="contained"
                    style={{ textTransform: "none", borderRadius: 10, boxShadow: "none", minWidth: 88 }}
                    onClick={() => {
                      const u = knowUrl.trim();
                      if (!u) return;
                      updateKnowledge({ websites: [...v2.knowledge.websites, { url: u }] });
                      setKnowUrl("");
                      toast.success("URL adicionada.");
                    }}
                  >
                    Adicionar
                  </Button>
                </Box>
                {(v2.knowledge.websites || []).length > 0 && (
                  <Typography className={classes.miniLabel}>Sites vinculados</Typography>
                )}
                {(v2.knowledge.websites || []).map((w, i) => (
                  <Box key={i} className={classes.sourceChip}>
                    <Globe size={14} strokeWidth={1.75} style={{ opacity: 0.7 }} />
                    <Typography variant="body2" style={{ flex: 1, wordBreak: "break-all" }}>
                      {w.url}
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label="remover url"
                      onClick={() =>
                        updateKnowledge({
                          websites: v2.knowledge.websites.filter((_, j) => j !== i)
                        })
                      }
                    >
                      <Trash2 size={16} strokeWidth={1.75} />
                    </IconButton>
                  </Box>
                ))}
                {Array.isArray(v2.knowledge.sources) && v2.knowledge.sources.length > 0 && (
                  <Typography className={classes.miniLabel} style={{ marginTop: 12 }}>
                    Documentos extraídos
                  </Typography>
                )}
                {(v2.knowledge.sources || []).map((s, i) => (
                  <Box key={`src-${i}`} className={classes.sourceChip}>
                    <DescriptionOutlined style={{ fontSize: 16, opacity: 0.7 }} />
                    <Typography variant="body2" style={{ flex: 1 }}>
                      {s.title || s.sourceType || "Documento"}{" "}
                      <Typography component="span" variant="caption" color="textSecondary">
                        ({String(s.content || "").length.toLocaleString()} caracteres)
                      </Typography>
                    </Typography>
                    <IconButton
                      size="small"
                      aria-label="remover anexo"
                      onClick={() =>
                        updateKnowledge({
                          sources: (v2.knowledge.sources || []).filter((_, j) => j !== i)
                        })
                      }
                    >
                      <Trash2 size={16} strokeWidth={1.75} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {tab !== TAB_INTEGRATION && tab !== TAB_INVENTORY ? (
          <Box>
            <div className={classes.magicRing}>
              <div className={classes.magicRingInner}>
                <Typography className={classes.cardTitle}>Consumo</Typography>
                <Typography variant="caption" display="block" gutterBottom>
                  {charCount.toLocaleString()} / {PLAN_PROMPT_CHAR_LIMIT.toLocaleString()} caracteres · ~{tokenApprox}{" "}
                  tokens
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, (charCount / PLAN_PROMPT_CHAR_LIMIT) * 100)}
                  style={{ height: 5, borderRadius: 4 }}
                />
              </div>
            </div>

            {tab === TAB_RULES && (
              <Paper className={clsx(classes.settingsCard, classes.magicPanel)} elevation={0}>
                <Typography className={classes.cardTitle}>Agente</Typography>
                <TextField
                  fullWidth
                  label="Nome"
                  value={v2.agent.name}
                  onChange={(e) => updateAgent({ name: e.target.value })}
                  margin="dense"
                  variant="outlined"
                  size="small"
                  className={clsx(classes.notionField, classes.dialogFormField)}
                />
                <AgentEditorChoicePicker
                  label="Função"
                  options={ROLE_CHOICES}
                  value={v2.agent.role}
                  onChange={(v) => updateAgent({ role: v })}
                  emptyLabel="Escolher função…"
                />
                <AgentEditorChoicePicker
                  label="Objetivo principal"
                  options={OBJECTIVE_CHOICES}
                  value={v2.agent.objective}
                  onChange={(v) => updateAgent({ objective: v })}
                  emptyLabel="Escolher objetivo…"
                />
                <AgentEditorChoicePicker
                  label="Tom"
                  options={FORMALITY_CHOICES}
                  value={v2.agent.formality}
                  onChange={(v) => updateAgent({ formality: v })}
                  emptyLabel="Escolher tom…"
                />
                <AgentEditorChoicePicker
                  label="Idioma"
                  options={LANGUAGE_CHOICES}
                  value={v2.agent.language}
                  onChange={(v) => updateAgent({ language: v })}
                  emptyLabel="Escolher idioma…"
                />
                <AgentEditorChoicePicker
                  label="Estilo de escrita"
                  options={WRITING_STYLE_CHOICES}
                  value={v2.agent.writingStyle}
                  onChange={(v) => updateAgent({ writingStyle: v })}
                  emptyLabel="Escolher estilo…"
                />
                <AgentEditorChoicePicker
                  label="Emojis nas respostas"
                  options={EMOJI_TOGGLE_OPTIONS}
                  value={v2.agent.emojisEnabled}
                  onChange={(v) => updateAgent({ emojisEnabled: v })}
                  emptyLabel="Escolher…"
                />
                <TextField
                  fullWidth
                  label="Intervalo entre mensagens (s)"
                  type="number"
                  value={v2.agent.responseDelay}
                  onChange={(e) => updateAgent({ responseDelay: Number(e.target.value) })}
                  margin="dense"
                  variant="outlined"
                  size="small"
                  className={clsx(classes.notionField, classes.dialogFormField)}
                  style={{ marginTop: 4 }}
                />
              </Paper>
            )}

            {tab === TAB_SCRIPT && (
              <Paper className={classes.settingsCard} elevation={0}>
                <Typography className={classes.cardTitle}>Fluxo</Typography>
                <TextField
                  fullWidth
                  label="Objetivo do roteiro"
                  value={v2.attendance.settings.objective}
                  onChange={(e) => updateAttendanceSettings({ objective: e.target.value })}
                  margin="dense"
                  variant="outlined"
                  size="small"
                  className={classes.notionField}
                />
                <TextField
                  fullWidth
                  label="Tipo de atendimento"
                  value={v2.attendance.settings.serviceType}
                  onChange={(e) => updateAttendanceSettings({ serviceType: e.target.value })}
                  margin="dense"
                  variant="outlined"
                  size="small"
                  className={classes.notionField}
                />
                <FormControlLabel
                  control={
                    <Switch
                      className={classes.iosSwitch}
                      checked={!!v2.attendance.settings.mandatoryFlow}
                      onChange={(e) => updateAttendanceSettings({ mandatoryFlow: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Fluxo obrigatório"
                />
                <FormControlLabel
                  control={
                    <Switch
                      className={classes.iosSwitch}
                      checked={!!v2.attendance.settings.allowInterrupt}
                      onChange={(e) => updateAttendanceSettings({ allowInterrupt: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Permitir interrupção"
                />
                <TextField
                  fullWidth
                  label="Tempo máx. resposta (s)"
                  type="number"
                  value={v2.attendance.settings.maxResponseTimeSec}
                  onChange={(e) => updateAttendanceSettings({ maxResponseTimeSec: Number(e.target.value) })}
                  margin="dense"
                  variant="outlined"
                  size="small"
                  className={classes.notionField}
                />
                <TextField
                  fullWidth
                  label="Máx. tentativas"
                  type="number"
                  value={v2.attendance.settings.maxAttempts}
                  onChange={(e) => updateAttendanceSettings({ maxAttempts: Number(e.target.value) })}
                  margin="dense"
                  variant="outlined"
                  size="small"
                  className={classes.notionField}
                />
                <FormControlLabel
                  control={
                    <Switch
                      className={classes.iosSwitch}
                      checked={!!v2.attendance.settings.smartFallback}
                      onChange={(e) => updateAttendanceSettings({ smartFallback: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Fallback inteligente"
                />
                <FormControlLabel
                  control={
                    <Switch
                      className={classes.iosSwitch}
                      checked={!!v2.attendance.settings.canImprovise}
                      onChange={(e) => updateAttendanceSettings({ canImprovise: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="IA pode improvisar"
                />
                <FormControlLabel
                  control={
                    <Switch
                      className={classes.iosSwitch}
                      checked={!!v2.attendance.settings.canTransferHuman}
                      onChange={(e) => updateAttendanceSettings({ canTransferHuman: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="IA pode transferir humano"
                />
              </Paper>
            )}

            {tab === TAB_FAQ && (
              <Paper className={classes.settingsCard} elevation={0}>
                <Typography className={classes.cardTitle}>FAQ</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      className={classes.iosSwitch}
                      checked={v2.faqEnabled}
                      onChange={(e) => updateV2({ faqEnabled: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="FAQ ativo"
                />
              </Paper>
            )}

            {tab === TAB_KNOW && (
              <Paper className={classes.settingsCard} elevation={0}>
                <Typography className={classes.cardTitle}>Base</Typography>
                <FormControlLabel
                  control={
                    <Switch
                      className={classes.iosSwitch}
                      checked={v2.knowledgeEnabled}
                      onChange={(e) => updateV2({ knowledgeEnabled: e.target.checked })}
                      color="primary"
                    />
                  }
                  label="Base ativa"
                />
              </Paper>
            )}

          </Box>
          ) : null}
          </Box>
        </Box>
      </ActivitiesStyleLayout>

      <Dialog
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        classes={{ paper: classes.modalPaper }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className={classes.modalActionTitle}>Anexar conteúdo</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45, display: "block", marginBottom: 12 }}>
            O texto extraído é inserido em Regras gerais (exceto site, que vai para a base).
          </Typography>
          <List disablePadding>
            {[
              {
                label: "PDF",
                accept: ".pdf,application/pdf",
                Icon: FileText,
                color: "#ef4444",
                hint: "Extrair texto automaticamente"
              },
              {
                label: "DOCX",
                accept: ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                Icon: FileType2,
                color: "#3b82f6",
                hint: "Extrair texto automaticamente"
              },
              {
                label: "TXT",
                accept: ".txt,text/plain",
                Icon: FileText,
                color: "#64748b",
                hint: "Extrair texto automaticamente"
              },
              {
                label: "JSON",
                accept: ".json,application/json",
                Icon: Braces,
                color: "#ca8a04",
                hint: "Extrair texto automaticamente"
              },
              {
                label: "CSV",
                accept: ".csv,text/csv",
                Icon: Table,
                color: "#16a34a",
                hint: "Extrair texto automaticamente"
              }
            ].map((opt) => {
              const LucideIcon = opt.Icon;
              return (
                <ListItem
                  key={opt.label}
                  button
                  className={classes.modalOption}
                  onClick={() => triggerFilePick(opt.accept)}
                >
                  <Box className={classes.modalAttachRow}>
                    <Box className={classes.modalAttachIconCell}>
                      <LucideIcon size={20} strokeWidth={1.55} color={opt.color} style={{ opacity: 0.92 }} />
                    </Box>
                    <Box className={classes.modalActionTextCell}>
                      <Typography style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.015em", lineHeight: 1.35 }}>
                        {opt.label}
                      </Typography>
                      <Typography variant="caption" style={{ fontSize: 12, opacity: 0.7, marginTop: 3, lineHeight: 1.45 }}>
                        {opt.hint}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              );
            })}
            <ListItem
              button
              className={classes.modalOption}
              onClick={() => {
                setAttachOpen(false);
                setAttachSiteUrl("");
                setManualPaste("");
                setSecondaryAttach("site");
              }}
            >
              <Box className={classes.modalAttachRow}>
                <Box className={classes.modalAttachIconCell}>
                  <Globe size={20} strokeWidth={1.55} color="#0ea5e9" style={{ opacity: 0.92 }} />
                </Box>
                <Box className={classes.modalActionTextCell}>
                  <Typography style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.015em", lineHeight: 1.35 }}>
                    Site
                  </Typography>
                  <Typography variant="caption" style={{ fontSize: 12, opacity: 0.7, marginTop: 3, lineHeight: 1.45 }}>
                    Adicionar URL à base de conhecimento
                  </Typography>
                </Box>
              </Box>
            </ListItem>
            <ListItem
              button
              className={classes.modalOption}
              onClick={() => {
                setAttachOpen(false);
                setAttachSiteUrl("");
                setManualPaste("");
                setSecondaryAttach("text");
              }}
            >
              <Box className={classes.modalAttachRow}>
                <Box className={classes.modalAttachIconCell}>
                  <AlignLeft size={20} strokeWidth={1.55} color="#a855f7" style={{ opacity: 0.92 }} />
                </Box>
                <Box className={classes.modalActionTextCell}>
                  <Typography style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.015em", lineHeight: 1.35 }}>
                    Texto manual
                  </Typography>
                  <Typography variant="caption" style={{ fontSize: 12, opacity: 0.7, marginTop: 3, lineHeight: 1.45 }}>
                    Colar nas Regras gerais
                  </Typography>
                </Box>
              </Box>
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttachOpen(false)} style={{ textTransform: "none" }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={secondaryAttach != null}
        onClose={() => {
          setSecondaryAttach(null);
          setAttachSiteUrl("");
          setManualPaste("");
        }}
        maxWidth="sm"
        fullWidth
        classes={{ paper: classes.modalPaper }}
      >
        <DialogTitle style={{ fontWeight: 600 }}>
          {secondaryAttach === "site" ? "Site" : "Texto manual"}
        </DialogTitle>
        <DialogContent dividers>
          {secondaryAttach === "site" && (
            <>
              <TextField
                fullWidth
                label="URL do site"
                value={attachSiteUrl}
                onChange={(e) => setAttachSiteUrl(e.target.value)}
                placeholder="https://"
                margin="normal"
                variant="outlined"
              />
              <Typography variant="caption" color="textSecondary">
                A URL será adicionada à Base de conhecimento (lista de sites).
              </Typography>
            </>
          )}
          {secondaryAttach === "text" && (
            <TextField
              fullWidth
              multiline
              minRows={8}
              label="Colar texto"
              value={manualPaste}
              onChange={(e) => setManualPaste(e.target.value)}
              margin="normal"
              variant="outlined"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSecondaryAttach(null);
              setAttachSiteUrl("");
              setManualPaste("");
            }}
            style={{ textTransform: "none" }}
          >
            Cancelar
          </Button>
          <Button
            color="primary"
            variant="contained"
            style={{ textTransform: "none", boxShadow: "none" }}
            onClick={() => {
              if (secondaryAttach === "site" && attachSiteUrl.trim()) {
                updateKnowledge({ websites: [...v2.knowledge.websites, { url: attachSiteUrl.trim() }] });
                toast.success("URL adicionada à base.");
              }
              if (secondaryAttach === "text" && manualPaste.trim()) {
                appendToRules(manualPaste.trim());
                toast.success("Texto adicionado às regras.");
              }
              setSecondaryAttach(null);
              setAttachSiteUrl("");
              setManualPaste("");
            }}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={mediaModalOpen}
        onClose={() => {
          if (mediaUpload) return;
          setMediaModalOpen(false);
        }}
        maxWidth="sm"
        fullWidth
        classes={{ paper: classes.modalPaper }}
      >
        <DialogTitle style={{ fontWeight: 600 }}>Mídias do agente</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
            Use /slug no roteiro para enviar automaticamente esta mídia. Imagens, vídeos, áudios e documentos
            (até 100 GB).
          </Typography>
          {mediaUpload && (
            <Box className={classes.mediaUploadPanel}>
              <Box className={classes.mediaUploadRow}>
                <CircularProgress size={22} thickness={4} style={{ color: "#8b5cf6" }} />
                <Box flex={1} minWidth={0}>
                  <Typography variant="body2" style={{ fontWeight: 500, fontSize: 13 }} noWrap>
                    Enviando {mediaUpload.fileName}
                  </Typography>
                  {mediaUpload.progress != null ? (
                    <Box className={classes.mediaUploadTrack} style={{ marginTop: 8 }}>
                      <Box
                        className={classes.mediaUploadBar}
                        style={{ width: `${mediaUpload.progress}%` }}
                      />
                    </Box>
                  ) : (
                    <LinearProgress
                      style={{ marginTop: 8, borderRadius: 999, height: 4 }}
                      color="primary"
                    />
                  )}
                  <Typography className={classes.mediaUploadMeta}>
                    {mediaUpload.progress != null
                      ? `${mediaUpload.progress}% · ${formatUploadBytes(mediaUpload.loaded)} / ${formatUploadBytes(mediaUpload.total)}`
                      : `${formatUploadBytes(mediaUpload.loaded)} enviados…`}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
          {mediaDraft.fileUrl && !mediaUpload && (
            <Box className={classes.mediaFileReady}>
              <Typography component="span" variant="caption" style={{ fontWeight: 600 }}>
                Arquivo pronto
              </Typography>
              <Typography component="span" variant="caption" noWrap style={{ flex: 1, opacity: 0.85 }}>
                {mediaDraft.fileUrl.split("/").pop()}
              </Typography>
            </Box>
          )}
          <Button
            component="label"
            variant="outlined"
            size="small"
            disabled={!!mediaUpload}
            style={{ textTransform: "none", borderRadius: 10, marginBottom: 12 }}
          >
            {mediaUpload ? "Enviando…" : "Enviar arquivo"}
            <input
              ref={mediaFileInputRef}
              type="file"
              hidden
              accept="*/*"
              onChange={(e) => uploadMediaFile(e.target.files?.[0])}
            />
          </Button>
          <TextField
            fullWidth
            label="Slug (/nome)"
            value={mediaDraft.slug}
            onChange={(e) => setMediaDraft((d) => ({ ...d, slug: e.target.value }))}
            margin="dense"
            variant="outlined"
            size="small"
          />
          <TextField
            fullWidth
            label="Nome amigável"
            value={mediaDraft.name}
            onChange={(e) => setMediaDraft((d) => ({ ...d, name: e.target.value }))}
            margin="dense"
            variant="outlined"
            size="small"
          />
          <TextField
            fullWidth
            select
            label="Tipo"
            value={mediaDraft.fileType}
            onChange={(e) => setMediaDraft((d) => ({ ...d, fileType: e.target.value }))}
            margin="dense"
            variant="outlined"
            size="small"
          >
            {["imagem", "vídeo", "PDF", "áudio", "documento"].map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="URL do arquivo"
            value={mediaDraft.fileUrl}
            onChange={(e) => setMediaDraft((d) => ({ ...d, fileUrl: e.target.value }))}
            margin="dense"
            variant="outlined"
            size="small"
          />
          <TextField
            fullWidth
            label="Legenda"
            value={mediaDraft.caption}
            onChange={(e) => setMediaDraft((d) => ({ ...d, caption: e.target.value }))}
            margin="dense"
            variant="outlined"
            size="small"
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (mediaUpload) return;
              setMediaModalOpen(false);
            }}
            disabled={!!mediaUpload}
            style={{ textTransform: "none" }}
          >
            Fechar
          </Button>
          <Button
            color="primary"
            variant="contained"
            disabled={!!mediaUpload}
            style={{ textTransform: "none", boxShadow: "none" }}
            onClick={addMedia}
          >
            Salvar mídia
          </Button>
        </DialogActions>
      </Dialog>

    </>
  );
}
