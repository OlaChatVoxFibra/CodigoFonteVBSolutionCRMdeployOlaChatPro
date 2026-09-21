/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useCallback
} from "react";
import { toast } from "react-toastify";
import "./mobile-styles.css";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
  Paper,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip,
  Grid,
  Collapse,
  useMediaQuery,
  Menu,
  MenuItem,
  Fab,
  Slide,
  ClickAwayListener,
  Tooltip,
  ButtonGroup
} from "@material-ui/core";
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Add as AddIcon,
  ExpandLess,
  ExpandMore,
  Save as SaveIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  ChevronLeft,
  ChevronRight,
  ArrowBack as ArrowBackIcon
} from "@material-ui/icons";
import WebAssetIcon from '@material-ui/icons/WebAsset';
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";

import HttpIcon from "@mui/icons-material/Http";
import DataObjectIcon from "@mui/icons-material/DataObject";
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer";
import CompareArrows from "@mui/icons-material/CompareArrows";

import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow
} from "react-flow-renderer";

import { SiOpenai } from "react-icons/si";
import {
  AccessTime,
  CallSplit,
  DynamicFeed,
  Image,
  ImportExport,
  LibraryBooks,
  Message,
  MicNone,
  RocketLaunch,
  Videocam,
  Tag,
  Queue,
  Person,
  Google,
  SmartToy
} from "@mui/icons-material";
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Import dos nós (mantendo os mesmos)
import messageNode from "./nodes/messageNode.js";
import startNode from "./nodes/startNode";
import openaiNode from "./nodes/openaiNode";
import geminiNode from "./nodes/geminiNode";
//import conditionNode from "./nodes/conditionNode";
import menuNode from "./nodes/menuNode";
import intervalNode from "./nodes/intervalNode";
import imgNode from "./nodes/imgNode";
import randomizerNode from "./nodes/randomizerNode";
import videoNode from "./nodes/videoNode";
import switchFlowNode from "./nodes/switchFlowNode";
import attendantNode from "./nodes/attendantNode";
import RemoveEdge from "./nodes/removeEdge";
import audioNode from "./nodes/audioNode";
import { useNodeStorage } from "../../stores/useNodeStorage";
import singleBlockNode from "./nodes/singleBlockNode";
import ticketNode from "./nodes/ticketNode";
import tagNode from "./nodes/tagNode";
//import conditionCompareNode from "./nodes/conditionCompareNode";
import HttpRequestNode from "./nodes/httpRequestNode";
import removeTagNode from "./nodes/removeTagNode";
import VariableNode, {
  getFlowVariable,
  setFlowVariable,
} from "./nodes/variableNode";
import inputNode from "./nodes/inputNode";

// Imports dos modais (mantendo os mesmos)
import FlowBuilderAddImgModal from "../../components/FlowBuilderAddImgModal";
import FlowBuilderTicketModal from "../../components/FlowBuilderAddTicketModal";
import FlowBuilderAddAudioModal from "../../components/FlowBuilderAddAudioModal";
import FlowBuilderAddTagModal from "../../components/FlowBuilderAddTagModal";
import FlowBuilderRandomizerModal from "../../components/FlowBuilderRandomizerModal";
import FlowBuilderAddVideoModal from "../../components/FlowBuilderAddVideoModal";
import FlowBuilderSingleBlockModal from "../../components/FlowBuilderSingleBlockModal";
import FlowBuilderAddTextModal from "../../components/FlowBuilderAddTextModal";
import FlowBuilderIntervalModal from "../../components/FlowBuilderIntervalModal";
//import FlowBuilderConditionModal from "../../components/FlowBuilderConditionModal";
import FlowBuilderMenuModal from "../../components/FlowBuilderMenuModal";
import FlowBuilderAddSwitchFlowModal from "../../components/FlowBuilderAddSwitchFlowModal";
import FlowBuilderAddAttendantModal from "../../components/FlowBuilderAddAttendantModal";
import FlowBuilderInputModal from "../../components/FlowBuilderInputModal";
//import FlowBuilderConditionCompareModal from "../../components/FlowBuilderConditionCompareModal";
import FlowBuilderRemoveTagModal from "../../components/FlowBuilderRemoveTagModal";
import FlowBuilderOpenAIModal from "../../components/FlowBuilderAddOpenAIModal";
import FlowBuilderGeminiModal from "../../components/FlowBuilderGeminiModal";
import { useParams } from "react-router-dom/cjs/react-router-dom.min";
import { CircularProgress } from "@material-ui/core";



const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
    backgroundColor: theme.palette.background.default
  },
  header: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(0, 1.5),
    height: 46,
    minHeight: 46,
    backgroundColor: theme.palette.type === 'dark'
      ? '#1a1a1a'
      : '#ffffff',
    borderBottom: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  headerBackBtn: {
    color: theme.palette.text.secondary,
    padding: 6,
    borderRadius: 8,
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
  },
  headerSaveBtn: {
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.8rem',
    padding: theme.spacing(0.5, 2),
    borderRadius: 8,
    minHeight: 32,
    boxShadow: 'none',
    '&:hover': {
      boxShadow: 'none',
    },
  },
  content: {
    flex: 1,
    display: "flex",
    position: "relative",
    overflow: "hidden"
  },
  sidebar: {
    width: props => props.sidebarOpen ? 240 : 48,
    backgroundColor: theme.palette.type === 'dark'
      ? '#1a1a1a'
      : '#fafafa',
    borderRight: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    transition: "width 0.2s ease",
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
    [theme.breakpoints.down('md')]: {
      display: "none"
    }
  },
  sidebarHeader: {
    padding: theme.spacing(1, 1.5),
    borderBottom: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
    backgroundColor: 'transparent',
  },
  sidebarContent: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: 'transparent',
    padding: theme.spacing(0.25),
    ...theme.scrollbarStyles
  },
  flowContainer: {
    flex: 1,
    position: "relative",
    backgroundColor: theme.palette.type === 'dark' ? '#0f0f0f' : '#fafbfc',
    '& .react-flow__controls': {
      zIndex: 1100,
      bottom: theme.spacing(1.5),
      left: theme.spacing(1.5),
      borderRadius: 8,
      overflow: 'hidden',
      border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      '& button': {
        backgroundColor: theme.palette.type === 'dark' ? '#1e1e1e' : '#fff',
        color: theme.palette.text.secondary,
        borderBottom: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
        width: 28,
        height: 28,
        '&:hover': {
          backgroundColor: theme.palette.type === 'dark' ? '#2a2a2a' : '#f5f5f5',
        },
      },
      [theme.breakpoints.down('md')]: {
        display: 'none'
      }
    }
  },
  bottomSheet: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.palette.type === 'dark'
      ? 'rgba(30,30,30,0.98)'
      : 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    boxShadow: theme.palette.type === 'dark'
      ? '0 -8px 32px rgba(0,0,0,0.5)'
      : '0 -8px 32px rgba(0,0,0,0.1)',
    zIndex: 1500,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    backdropFilter: 'blur(20px)',
    [theme.breakpoints.up('lg')]: {
      display: "none"
    }
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
    borderRadius: 2,
    margin: "10px auto 6px",
    cursor: "pointer"
  },
  bottomSheetHeader: {
    padding: theme.spacing(1.5, 2.5),
    borderBottom: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: 'transparent',
  },
  bottomSheetContent: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(2),
    backgroundColor: 'transparent',
    ...theme.scrollbarStyles
  },
  fab: {
    position: "fixed",
    display: 'none',
    [theme.breakpoints.down('md')]: {
      display: 'flex',
      bottom: theme.spacing(9),
      right: theme.spacing(2),
      top: 'auto',
      zIndex: 1400,
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      width: 44,
      height: 44,
      '&:hover': {
        backgroundColor: theme.palette.primary.dark,
      },
    }
  },
  addFab: {
    position: "fixed",
    bottom: theme.spacing(2),
    left: theme.spacing(2),
    zIndex: 1400,
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 16px rgba(0,0,0,0.4)'
      : '0 4px 16px rgba(25,118,210,0.3)',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
    [theme.breakpoints.up('lg')]: {
      display: "none"
    }
  },
  categoryButton: {
    margin: theme.spacing(0.5),
    textTransform: "none",
    borderRadius: 10,
    minWidth: "auto",
    fontSize: "0.75rem",
    color: theme.palette.text.primary,
    borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  },
  nodeButton: {
    justifyContent: "flex-start",
    textTransform: "none",
    padding: theme.spacing(0.75, 1),
    marginBottom: 1,
    borderRadius: 6,
    transition: "background 0.15s ease",
    color: theme.palette.text.primary,
    "&:hover": {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    }
  },
  collapsedNodeButton: {
    width: 36,
    height: 36,
    minWidth: 36,
    padding: 0,
    margin: theme.spacing(0.25, 'auto'),
    display: 'flex',
    justifyContent: "center",
    borderRadius: 6,
    color: theme.palette.text.secondary,
    transition: 'background 0.15s ease',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    }
  },
  categoryHeader: {
    padding: theme.spacing(0.75, 1),
    backgroundColor: 'transparent',
    fontWeight: "bold",
    color: theme.palette.text.secondary,
    cursor: "pointer",
    userSelect: "none",
    borderRadius: 6,
    margin: theme.spacing(0.25, 0.25),
    transition: 'background 0.15s ease',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    }
  },
  quickActions: {
    position: "fixed",
    top: 60,
    right: theme.spacing(1.5),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
    zIndex: 1200,
    [theme.breakpoints.down('md')]: {
      display: "none"
    }
  },
  quickActionButton: {
    backgroundColor: theme.palette.type === 'dark'
      ? 'rgba(30,30,30,0.85)'
      : 'rgba(255,255,255,0.85)',
    backdropFilter: "blur(8px)",
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    color: theme.palette.text.secondary,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    borderRadius: 8,
    width: 36,
    height: 36,
    transition: 'all 0.15s ease',
    '& svg': { fontSize: 18 },
    "&:hover": {
      backgroundColor: theme.palette.type === 'dark'
        ? 'rgba(50,50,50,0.95)'
        : '#ffffff',
      color: theme.palette.primary.main,
      borderColor: theme.palette.type === 'dark' ? 'rgba(144,202,249,0.2)' : 'rgba(25,118,210,0.2)',
    }
  },
  mobileControls: {
    position: "fixed",
    bottom: 80,
    left: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    zIndex: 1300,
    [theme.breakpoints.up('lg')]: {
      display: "none"
    }
  },
  controlButton: {
    backgroundColor: theme.palette.type === 'dark'
      ? 'rgba(30,30,30,0.9)'
      : 'rgba(255,255,255,0.9)',
    backdropFilter: "blur(12px)",
    boxShadow: theme.palette.type === 'dark'
      ? '0 2px 12px rgba(0,0,0,0.4)'
      : '0 2px 12px rgba(0,0,0,0.08)',
    width: 44,
    height: 44,
    borderRadius: 14,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
    transition: 'all 0.2s ease',
    "&:hover": {
      backgroundColor: theme.palette.type === 'dark'
        ? 'rgba(50,50,50,0.95)'
        : '#ffffff',
      transform: "scale(1.06)"
    }
  },
  categoryCard: {
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.02)' : '#ffffff',
    borderRadius: 8,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    marginBottom: theme.spacing(1),
    transition: 'all 0.15s ease',
  },
  categoryTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(0.75),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    color: theme.palette.text.secondary,
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  categoryNodeBtn: {
    width: "100%",
    marginBottom: 2,
    justifyContent: "flex-start",
    textTransform: "none",
    fontSize: "0.75rem",
    padding: theme.spacing(0.5, 1),
    borderRadius: 6,
    color: theme.palette.text.primary,
    borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    transition: 'background 0.15s ease',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    }
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "70vh",
    backgroundColor: theme.palette.type === 'dark' ? '#0f0f0f' : '#fafbfc',
  }
}));

// Definição das categorias de nós
const nodeCategories = [
  {
    name: "Básicos",
    color: theme => theme.palette.primary.main,
    icon: <RocketLaunch />,
    nodes: [
      {
        icon: <RocketLaunch />,
        name: "Início",
        type: "start",
        description: "Ponto inicial do fluxo"
      }
    ]
  },
  {
    name: "Conteúdo",
    color: theme => theme.palette.success.main,
    icon: <LibraryBooks />,
    nodes: [
      {
        icon: <LibraryBooks />,
        name: "Conteúdo",
        type: "content",
        description: "Enviar texto, imagem, áudio ou vídeo"
      },
      {
        icon: <Message />,
        name: "Texto",
        type: "text",
        description: "Mensagem de texto simples"
      }
    ]
  },
  {
    name: "Interação",
    color: theme => theme.palette.warning.main,
    icon: <DynamicFeed />,
    nodes: [
      {
        icon: <DynamicFeed />,
        name: "Menu",
        type: "menu",
        description: "Menu de opções para o usuário"
      },
      {
        icon: <QuestionAnswerIcon />,
        name: "Input",
        type: "input",
        description: "Coletar entrada do usuário"
      },
      {
        icon: <AccessTime />,
        name: "Intervalo",
        type: "interval",
        description: "Pausar execução por tempo"
      }
    ]
  },
  {
    name: "Lógica",
    color: theme => theme.palette.secondary.main,
    icon: <CallSplit />,
    nodes: [
      {
        icon: <CallSplit />,
        name: "Randomizador",
        type: "random",
        description: "Escolha aleatória de caminhos"
      }
    ]
  },
  {
    name: "Sistema",
    color: theme => theme.palette.info.main,
    icon: <Queue />,
    nodes: [
      {
        icon: <Queue />,
        name: "Filas",
        type: "ticket",
        description: "Gerenciar filas de atendimento"
      },
      {
        icon: <Tag />,
        name: "Tags",
        type: "tag",
        description: "Adicionar tags ao contato"
      },
      {
        icon: <Tag />,
        name: "Remover Tag",
        type: "removeTag",
        description: "Remover tags do contato"
      },
      {
        icon: <ArrowForwardIcon />,
        name: "Trocar Flow",
        type: "switchFlow",
        description: "Direcionar para outro fluxo"
      },
      {
        icon: <Person />,
        name: "Atendente",
        type: "attendant",
        description: "Transferir para atendente"
      }
    ]
  },
  {
    name: "Integrações",
    color: theme => theme.palette.error.main,
    icon: <HttpIcon />,
    nodes: [
      {
        icon: <HttpIcon />,
        name: "HTTP Request",
        type: "httpRequest",
        description: "Requisição HTTP externa"
      },
      {
        icon: <DataObjectIcon />,
        name: "Variável",
        type: "variable",
        description: "Definir variáveis globais"
      },
      {
        icon: <SiOpenai />,
        name: "Gemini",
        type: "gemini",
        description: "Integração com Gemini"
      },
      {
        icon: <SiOpenai />,
        name: "OpenAI",
        type: "openai",
        description: "Integração com OpenAI/"
      }
    ]
  }
];

// Função para gerar string aleatória (mantida igual)
function geraStringAleatoria(tamanho) {
  var stringAleatoria = "";
  var caracteres =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < tamanho; i++) {
    stringAleatoria += caracteres.charAt(
      Math.floor(Math.random() * caracteres.length)
    );
  }
  return stringAleatoria;
}

// Tipos de nós (mantido igual)
const nodeTypes = {
  message: messageNode,
  start: startNode,
  //condition: conditionNode,
  menu: menuNode,
  interval: intervalNode,
  img: imgNode,
  gemini: geminiNode,
  audio: audioNode,
  randomizer: randomizerNode,
  video: videoNode,
  singleBlock: singleBlockNode,
  ticket: ticketNode,
  tag: tagNode,
  removeTag: removeTagNode,
  switchFlow: switchFlowNode,
  attendant: attendantNode,
  httpRequest: HttpRequestNode,
  variable: VariableNode,
  openai: openaiNode,
  input: inputNode,
  //conditionCompare: conditionCompareNode,
};

const edgeTypes = {
  buttonedge: RemoveEdge
};

const initialNodes = [
  {
    id: "1",
    position: { x: 250, y: 100 },
    data: { label: "Inicio do fluxo" },
    type: "start"
  }
];

const initialEdges = [];

// Função para detectar se é mobile
const isMobileDevice = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0)
  );
};

// Componente de controles customizados para mobile
const MobileControls = () => {
  const classes = useStyles();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className={classes.mobileControls}>
      <IconButton
        onClick={() => zoomIn()}
        className={classes.controlButton}
        size="small"
      >
        <ZoomInIcon />
      </IconButton>

      <IconButton
        onClick={() => zoomOut()}
        className={classes.controlButton}
        size="small"
      >
        <ZoomOutIcon />
      </IconButton>

      <IconButton
        onClick={() => fitView({ padding: 0.2 })}
        className={classes.controlButton}
        size="small"
      >
        <WebAssetIcon />
      </IconButton>
    </div>
  );
};

// Componente de ações rápidas para desktop
const QuickActions = ({ onActionClick }) => {
  const classes = useStyles();

  const quickActions = [
    { icon: <Message />, name: "Texto", type: "text" },
    { icon: <DynamicFeed />, name: "Menu", type: "menu" },
    { icon: <AccessTime />, name: "Intervalo", type: "interval" },
    { icon: <LibraryBooks />, name: "Conteúdo", type: "content" }
  ];

  return (
    <div className={classes.quickActions}>
      {quickActions.map((action) => (
        <Tooltip key={action.type} title={action.name} placement="left">
          <IconButton
            onClick={() => onActionClick(action.type)}
            className={classes.quickActionButton}
            size="medium"
          >
            {action.icon}
          </IconButton>
        </Tooltip>
      ))}
    </div>
  );
};

export const FlowBuilderConfig = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { id } = useParams();

  // Estados para interface
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(['Básicos']);

  const classes = useStyles({ sidebarOpen });

  // Estados existentes (mantidos)
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [dataNode, setDataNode] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Estados dos modais (mantidos)
  const [modalAddText, setModalAddText] = useState(null);
  const [modalAddInterval, setModalAddInterval] = useState(false);
  //const [modalAddCondition, setModalAddCondition] = useState(null);
  const [modalAddMenu, setModalAddMenu] = useState(null);
  const [modalAddImg, setModalAddImg] = useState(null);
  const [modalAddAudio, setModalAddAudio] = useState(null);
  const [modalAddRandomizer, setModalAddRandomizer] = useState(null);
  const [modalAddVideo, setModalAddVideo] = useState(null);
  const [modalAddSingleBlock, setModalAddSingleBlock] = useState(null);
  const [modalAddTicket, setModalAddTicket] = useState(null);
  const [modalAddTag, setModalAddTag] = useState(null);
  const [modalAddSwitchFlow, setModalAddSwitchFlow] = useState(null);
  const [modalAddAttendant, setModalAddAttendant] = useState(null);
  const [modalAddOpenAI, setModalAddOpenAI] = useState(null);
  const [modalAddGemini, setModalAddGemini] = useState(null);
  const [modalAddInput, setModalAddInput] = useState(null);
  //const [modalAddConditionCompare, setModalAddConditionCompare] = useState(null);
  const [modalAddRemoveTag, setModalAddRemoveTag] = useState(null);

  // Estados ReactFlow (mantidos)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const storageItems = useNodeStorage();

  const connectionLineStyle = {
    stroke: theme.palette.primary.main,
    strokeWidth: isMobileDevice() ? "4px" : "2px",
    strokeLinecap: "round",
  };

  // Inicializar sistema de variáveis globais
  useEffect(() => {
    if (!window.flowVariables) {
      window.flowVariables = {};
      console.log("Sistema de variáveis globais inicializado");
    }
    window.getFlowVariable = getFlowVariable;
    window.setFlowVariable = setFlowVariable;
  }, []);

  // Função addNode COMPLETA (mantida igual - muito longa para reproduzir aqui)
  const addNode = (type, data) => {
    const posY = nodes[nodes.length - 1].position.y;
    const posX = nodes[nodes.length - 1].position.x + (nodes[nodes.length - 1].width || 200) + 40;

    if (type === "start") {
      return setNodes(old => {
        return [
          ...old.filter(item => item.id !== "1"),
          {
            id: "1",
            position: { x: posX, y: posY },
            data: { label: "Inicio do fluxo" },
            type: "start"
          }
        ];
      });
    }

    if (type === "text") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { label: data.text },
            type: "message"
          }
        ];
      });
    }

    if (type === "interval") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { label: `Intervalo ${data.sec} seg.`, sec: data.sec },
            type: "interval"
          }
        ];
      });
    }

    if (type === "menu") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: {
              message: data.message,
              arrayOption: data.arrayOption
            },
            type: "menu"
          }
        ];
      });
    }

    if (type === "img") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { url: data.url },
            type: "img"
          }
        ];
      });
    }

    if (type === "audio") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { url: data.url, record: data.record },
            type: "audio"
          }
        ];
      });
    }

    if (type === "randomizer") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { percent: data.percent },
            type: "randomizer"
          }
        ];
      });
    }

    if (type === "video") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { url: data.url },
            type: "video"
          }
        ];
      });
    }

    if (type === "singleBlock") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { ...data },
            type: "singleBlock"
          }
        ];
      });
    }

    if (type === "ticket") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { ...data },
            type: "ticket"
          }
        ];
      });
    }

    if (type === "openai") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { ...data },
            type: "openai",
          },
        ];
      });
    }

    if (type === "gemini") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { ...data },
            type: "gemini",
          },
        ];
      });
    }

    if (type === "tag") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { ...data },
            type: "tag"
          }
        ];
      });
    }

    if (type === "removeTag") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: {
              tag: data?.tag || "",
              ...data,
            },
            type: "removeTag",
          },
        ];
      });
    }

    if (type === "switchFlow") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { ...data },
            type: "switchFlow"
          }
        ];
      });
    }

    if (type === "attendant") {
      return setNodes(old => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: { ...data },
            type: "attendant"
          }
        ]
      })
    }

    if (type === "httpRequest") {
      return setNodes((old) => [
        ...old,
        {
          id: geraStringAleatoria(30),
          position: { x: posX, y: posY },
          data: {
            url: "",
            method: data?.method || "POST",
            requestBody: data?.requestBody || "{}",
            headersString: data?.headersString || "",
            queryParams: data?.queryParams || [],
            saveVariables: data?.saveVariables || [],
            ...data,
          },
          type: "httpRequest",
        },
      ]);
    }

    if (type === "variable") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: {
              variableName: data?.variableName || "",
              variableValue: data?.variableValue || "",
              variableType: data?.variableType || "text",
              variableExpression: data?.variableExpression || "",
              isExpression: data?.isExpression || false,
              ...data,
            },
            type: "variable",
          },
        ];
      });
    }

    if (type === "input") {
      return setNodes((old) => {
        return [
          ...old,
          {
            id: geraStringAleatoria(30),
            position: { x: posX, y: posY },
            data: {
              question: data?.question || "",
              variableName: data?.variableName || "",
              ...data,
            },
            type: "input",
          },
        ];
      });
    }
  };

  // Funções de adição (mantidas)
  const textAdd = data => addNode("text", data);
  const intervalAdd = data => addNode("interval", data);
  //const conditionAdd = data => addNode("condition", data);
  const menuAdd = data => addNode("menu", data);
  const imgAdd = data => addNode("img", data);
  const audioAdd = data => addNode("audio", data);
  const randomizerAdd = data => addNode("randomizer", data);
  const videoAdd = data => addNode("video", data);
  const singleBlockAdd = data => addNode("singleBlock", data);
  const ticketAdd = data => addNode("ticket", data);
  const tagAdd = data => addNode("tag", data);
  const openaiAdd = data => addNode("openai", data);
  const geminiAdd = data => addNode("gemini", data);
  const removeTagAdd = data => addNode("removeTag", data);
  const switchFlowAdd = data => addNode("switchFlow", data);
  const attendantAdd = data => addNode("attendant", data);
  const variableAdd = data => addNode("variable", data);
  const inputAdd = data => addNode("input", data);

  // useEffect para carregar fluxo COMPLETO (mantido)
  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get(`/flowbuilder/flow/${id}`);
          if (data.flow.flow !== null) {
            const preparedNodes = data.flow.flow.nodes.map((node) => {
              if (node.type === "httpRequest") {
                console.log(`[FlowBuilder] Processando nó HTTP Request: ${node.id}`);

                if (node.data.saveVariables && node.data.saveVariables.length > 0) {
                  console.log(
                    `[FlowBuilder] Nó ${node.id} tem ${node.data.saveVariables.length} variáveis configuradas`
                  );

                  if (
                    !node.data.responseVariables ||
                    !Array.isArray(node.data.responseVariables)
                  ) {
                    console.log(
                      `[FlowBuilder] Configurando responseVariables para nó ${node.id}`
                    );
                    node.data.responseVariables = node.data.saveVariables.map(
                      (item) => ({
                        path: item.path,
                        variableName: item.variable,
                      })
                    );
                  }
                } else {
                  node.data.saveVariables = node.data.saveVariables || [];
                  node.data.responseVariables = node.data.responseVariables || [];
                }

                console.log(`[FlowBuilder] Nó HTTP Request ${node.id} processado:`, {
                  url: node.data.url,
                  method: node.data.method,
                  saveVariables: node.data.saveVariables?.length || 0,
                  responseVariables: node.data.responseVariables?.length || 0,
                });
              }
              return node;
            });

            setNodes(preparedNodes);
            setEdges(data.flow.flow.connections);
          }
          setLoading(false);
        } catch (err) {
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [id]);

  // useEffect para storage COMPLETO (mantido)
  useEffect(() => {
    if (storageItems.action === "delete") {
      setNodes(old => old.filter(item => item.id !== storageItems.node));
      setEdges(old => {
        const newData = old.filter(item => item.source !== storageItems.node);
        const newClearTarget = newData.filter(
          item => item.target !== storageItems.node
        );
        return newClearTarget;
      });
      storageItems.setNodesStorage("");
      storageItems.setAct("idle");
    }
    if (storageItems.action === "duplicate") {
      const nodeDuplicate = nodes.filter(
        item => item.id === storageItems.node
      )[0];
      const maioresX = nodes.map(node => node.position.x);
      const maiorX = Math.max(...maioresX);
      const finalY = nodes[nodes.length - 1].position.y;
      const nodeNew = {
        ...nodeDuplicate,
        id: geraStringAleatoria(30),
        position: {
          x: maiorX + 240,
          y: finalY
        },
        selected: false,
        style: {
          backgroundColor: theme.palette.grey[800],
          padding: 0,
          borderRadius: 8,
          border: `1px solid ${theme.palette.divider}`
        }
      };
      setNodes(old => [...old, nodeNew]);
      storageItems.setNodesStorage("");
      storageItems.setAct("idle");
    }
  }, [storageItems.action, nodes, theme]);

  const onConnect = useCallback(
    params => setEdges(eds => addEdge(params, eds)),
    [setEdges]
  );

  // Função de salvar COMPLETA (mantida)
  const saveFlow = async () => {
    try {
      console.log("[FlowBuilder] Preparando para salvar fluxo...");
      const processedNodes = nodes.map((node) => {
        if (node.type === "httpRequest") {
          console.log(`[FlowBuilder] Processando nó HTTP Request: ${node.id}`);
          if (node.data.saveVariables && node.data.saveVariables.length > 0) {
            console.log(
              `[FlowBuilder] Nó ${node.id} tem ${node.data.saveVariables.length} variáveis configuradas`
            );

            if (
              !node.data.responseVariables ||
              !Array.isArray(node.data.responseVariables)
            ) {
              console.log(
                `[FlowBuilder] Configurando responseVariables para nó ${node.id}`
              );
              node.data.responseVariables = node.data.saveVariables.map(
                (item) => ({
                  path: item.path,
                  variableName: item.variable,
                })
              );
            }
          } else {
            node.data.saveVariables = node.data.saveVariables || [];
            node.data.responseVariables = node.data.responseVariables || [];
          }

          console.log(`[FlowBuilder] Nó HTTP Request ${node.id} processado:`, {
            url: node.data.url,
            method: node.data.method,
            saveVariables: node.data.saveVariables?.length || 0,
            responseVariables: node.data.responseVariables?.length || 0,
          });
        }
        return node;
      });

      console.log("[FlowBuilder] Enviando fluxo para o servidor...");

      await api
        .post("/flowbuilder/flow", {
          idFlow: id,
          nodes: processedNodes,
          connections: edges,
        })
        .then((res) => {
          toast.success("Fluxo salvo com sucesso");
          setNodes(processedNodes);
        });
    } catch (error) {
      toast.error("Erro ao salvar o fluxo");
      console.error("Erro ao salvar o fluxo:", error);
    }
  };

  // Event handlers COMPLETOS (mantidos mas adaptados para tema)
  const doubleClick = (event, node) => {
    setDataNode(node);
    if (node.type === "message") setModalAddText("edit");
    if (node.type === "interval") setModalAddInterval("edit");
    if (node.type === "menu") setModalAddMenu("edit");
    if (node.type === "img") setModalAddImg("edit");
    if (node.type === "audio") setModalAddAudio("edit");
    if (node.type === "randomizer") setModalAddRandomizer("edit");
    if (node.type === "video") setModalAddVideo("edit");
    if (node.type === "singleBlock") setModalAddSingleBlock("edit");
    if (node.type === "ticket") setModalAddTicket("edit");
    if (node.type === "tag") setModalAddTag("edit");
    if (node.type === "removeTag") setModalAddRemoveTag("edit");
    if (node.type === "switchFlow") setModalAddSwitchFlow("edit");
    if (node.type === "openai") setModalAddOpenAI("edit");
    if (node.type === "gemini") setModalAddGemini("edit");
    if (node.type === "attendant") setModalAddAttendant("edit");
    if (node.type === "httpRequest") {
      if (node.data.saveVariables && node.data.saveVariables.length > 0) {
        if (
          !node.data.responseVariables ||
          !Array.isArray(node.data.responseVariables)
        ) {
          node.data.responseVariables = node.data.saveVariables.map((item) => ({
            path: item.path,
            variableName: item.variable,
          }));

          setNodes((old) =>
            old.map((itemNode) => {
              if (itemNode.id === node.id) {
                return node;
              }
              return itemNode;
            })
          );

          console.log("[FlowBuilder] Nó HTTP Request atualizado:", node.id);
        }
      }
    }
    if (node.type === "input") setModalAddInput("edit");
  };

  const clickNode = (event, node) => {
    setNodes(old =>
      old.map(item => {
        if (item.id === node.id) {
          return {
            ...item,
            style: {
              backgroundColor: theme.palette.primary.main,
              padding: 1,
              borderRadius: 8,
              border: `2px solid ${theme.palette.primary.dark}`
            }
          };
        }
        return {
          ...item,
          style: {
            backgroundColor: theme.palette.grey[800],
            padding: 0,
            borderRadius: 8,
            border: `1px solid ${theme.palette.divider}`
          }
        };
      })
    );
  };

  const clickEdge = (event, node) => {
    setNodes(old =>
      old.map(item => {
        return {
          ...item,
          style: {
            backgroundColor: theme.palette.grey[800],
            padding: 0,
            borderRadius: 8,
            border: `1px solid ${theme.palette.divider}`
          }
        };
      })
    );
  };

  const updateNode = dataAlter => {
    setNodes(old =>
      old.map(itemNode => {
        if (itemNode.id === dataAlter.id) {
          return dataAlter;
        }
        return itemNode;
      })
    );
    // Fechar todos os modais
    setModalAddText(null);
    setModalAddInterval(null);
    setModalAddMenu(null);
    setModalAddImg(null);
    setModalAddOpenAI(null);
    setModalAddAudio(null);
    setModalAddRandomizer(null);
    setModalAddVideo(null);
    setModalAddGemini(null);
    setModalAddSingleBlock(null);
    setModalAddTicket(null);
    setModalAddRemoveTag(null);
    setModalAddTag(null);
    setModalAddSwitchFlow(null);
    setModalAddAttendant(null);
    setModalAddInput(null);
  };

  // Handler para categoria expand/collapse
  const handleCategoryToggle = (categoryName) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  // Handler para ações de nós
  const clickActions = type => {
    setBottomSheetOpen(false);

    switch (type) {
      case "start":
        addNode("start");
        break;
      case "menu":
        setModalAddMenu("create");
        break;
      case "content":
        setModalAddSingleBlock("create");
        break;
      case "text":
        setModalAddText("create");
        break;
      case "random":
        setModalAddRandomizer("create");
        break;
      case "interval":
        setModalAddInterval("create");
        break;
      case "ticket":
        setModalAddTicket("create");
        break;
      case "tag":
        setModalAddTag("create");
        break;
      case "removeTag":
        setModalAddRemoveTag("create");
        break;
      case "switchFlow":
        setModalAddSwitchFlow("create");
        break;
      case "attendant":
        setModalAddAttendant("create");
        break;
      case "httpRequest":
        addNode("httpRequest");
        break;
      case "variable":
        addNode("variable");
        break;
      case "input":
        setModalAddInput("create");
        break;
      case "openai":
        setModalAddOpenAI("create");
        break;
      case "gemini":
        setModalAddGemini("create");
        break;
      case "img":
        setModalAddImg("create");
        break;
      case "audio":
        setModalAddAudio("create");
        break;
      case "video":
        setModalAddVideo("create");
        break;
      default:
    }
  };

  // Componente do Sidebar
  const SidebarContent = () => (
    <div className={classes.sidebarContent}>
      {nodeCategories.map((category) => (
        <div key={category.name}>
          {sidebarOpen ? (
            // Modo expandido
            <>
              <div className={classes.categoryHeader}>
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  onClick={() => handleCategoryToggle(category.name)}
                  style={{ cursor: "pointer" }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{
                      color: typeof category.color === 'function' ? category.color(theme) : category.color,
                      display: 'flex',
                      alignItems: 'center',
                      '& > *': { fontSize: 16 },
                    }}>
                      {category.icon}
                    </Box>
                    <Typography variant="caption" style={{ fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {category.name}
                    </Typography>
                  </Box>
                  {expandedCategories.includes(category.name) ?
                    <ExpandLess style={{ fontSize: 18, opacity: 0.5 }} /> :
                    <ExpandMore style={{ fontSize: 18, opacity: 0.5 }} />
                  }
                </Box>
              </div>

              <Collapse in={expandedCategories.includes(category.name)}>
                <List dense style={{ padding: '2px 4px 4px' }}>
                  {category.nodes.map((node) => (
                    <ListItem key={node.type} disablePadding>
                      <Button
                        fullWidth
                        variant="text"
                        className={classes.nodeButton}
                        onClick={() => clickActions(node.type)}
                        startIcon={
                          <Box sx={{
                            color: typeof category.color === 'function' ? category.color(theme) : category.color,
                            display: 'flex',
                            alignItems: 'center',
                            '& > *': { fontSize: 16 },
                          }}>
                            {node.icon}
                          </Box>
                        }
                      >
                        <Typography variant="body2" style={{ fontWeight: 500, fontSize: '0.78rem', lineHeight: 1.2 }}>
                          {node.name}
                        </Typography>
                      </Button>
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </>
          ) : (
            // Modo colapsado - só ícones
            <div>
              {category.nodes.map((node) => (
                <Tooltip key={node.type} title={node.name} placement="right">
                  <IconButton
                    className={classes.collapsedNodeButton}
                    onClick={() => clickActions(node.type)}
                    style={{ color: typeof category.color === 'function' ? category.color(theme) : category.color }}
                  >
                    {node.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Componente do Bottom Sheet
  const BottomSheetContent = () => (
    <Slide direction="up" in={bottomSheetOpen} mountOnEnter unmountOnExit>
      <div className={classes.bottomSheet}>
        <div
          className={classes.bottomSheetHandle}
          onClick={() => setBottomSheetOpen(false)}
        />

        <div className={classes.bottomSheetHeader}>
          <Typography variant="subtitle2" style={{ fontWeight: 600, fontSize: '0.85rem' }}>Componentes</Typography>
          <IconButton onClick={() => setBottomSheetOpen(false)} size="small" style={{ borderRadius: 6, padding: 4 }}>
            <CloseIcon style={{ fontSize: 18 }} />
          </IconButton>
        </div>

        <div className={classes.bottomSheetContent}>
          <Grid container spacing={2}>
            {nodeCategories.map((category) => (
              <Grid item xs={6} key={category.name}>
                <Paper elevation={0} className={classes.categoryCard} style={{ padding: 12 }}>
                  <Typography
                    variant="subtitle2"
                    className={classes.categoryTitle}
                    style={{ color: typeof category.color === 'function' ? category.color(theme) : category.color, marginBottom: 10 }}
                  >
                    {category.name}
                  </Typography>
                  {category.nodes.map((node) => (
                    <Button
                      key={node.type}
                      fullWidth
                      variant="outlined"
                      onClick={() => clickActions(node.type)}
                      startIcon={
                        <Box sx={{ color: typeof category.color === 'function' ? category.color(theme) : category.color }}>
                          {node.icon}
                        </Box>
                      }
                      className={classes.categoryNodeBtn}
                      size="small"
                    >
                      {node.name}
                    </Button>
                  ))}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </div>
      </div>
    </Slide>
  );

  if (loading) {
    return (
      <div className={classes.root}>
        <div className={classes.header}>
          <div className={classes.headerLeft}>
            <IconButton
              className={classes.headerBackBtn}
              onClick={() => window.history.back()}
              size="small"
            >
              <ArrowBackIcon style={{ fontSize: 20 }} />
            </IconButton>
          </div>
        </div>
        <div className={classes.loadingContainer}>
          <CircularProgress style={{ color: theme.palette.primary.main }} />
        </div>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      {/* Header */}
      <div className={classes.header}>
        <div className={classes.headerLeft}>
          <IconButton
            className={classes.headerBackBtn}
            onClick={() => window.history.back()}
            size="small"
          >
            <ArrowBackIcon style={{ fontSize: 20 }} />
          </IconButton>
        </div>
        <div className={classes.headerRight}>
          <Button
            variant="contained"
            color="primary"
            className={classes.headerSaveBtn}
            onClick={saveFlow}
            startIcon={<SaveIcon style={{ fontSize: 16 }} />}
            size="small"
          >
            Salvar
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className={classes.content}>
        {/* Sidebar Desktop */}
        {!isMobile && (
          <div className={classes.sidebar}>
            <div className={classes.sidebarHeader}>
              {sidebarOpen && (
                <Typography variant="caption" style={{ fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: theme.palette.text.secondary }}>
                  Nós
                </Typography>
              )}
              <IconButton
                onClick={() => setSidebarOpen(!sidebarOpen)}
                size="small"
                style={{ borderRadius: 6, padding: 4 }}
              >
                {sidebarOpen ? <ChevronLeft style={{ fontSize: 18 }} /> : <ChevronRight style={{ fontSize: 18 }} />}
              </IconButton>
            </div>
            <SidebarContent />
          </div>
        )}

        {/* Flow Container */}
        <div className={classes.flowContainer}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            deleteKeyCode={["Backspace", "Delete"]}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDoubleClick={doubleClick}
            onNodeClick={clickNode}
            onEdgeClick={clickEdge}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            connectionLineStyle={connectionLineStyle}
            style={{
              backgroundColor: theme.palette.type === 'dark' ? '#0f0f0f' : '#fafbfc',
            }}
            edgeTypes={edgeTypes}
            variant={"cross"}
            defaultEdgeOptions={{
              style: {
                stroke: theme.palette.type === 'dark' ? '#444' : '#c0c5cc',
                strokeWidth: "2px",
                strokeLinecap: "round",
              },
              animated: false
            }}
          >
            <Controls />
            <Background
              variant="dots"
              gap={20}
              size={0.8}
              color={theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'}
            />
          </ReactFlow>

        </div>
      </div>

      {/* Mobile Controls */}
      {isMobile && <MobileControls />}

      {/* Botão Salvar - agora posicionado acima dos quickActions */}
      <Fab
        color="primary"
        className={classes.fab}
        onClick={saveFlow}
        title="Salvar Fluxo"
      >
        <SaveIcon />
      </Fab>

      {/* Quick Actions Desktop - agora abaixo do botão salvar */}
      {!isMobile && <QuickActions onActionClick={clickActions} />}

      {/* Bottom Sheet Mobile */}
      {isMobile && <BottomSheetContent />}

      {/* FAB Adicionar - só em mobile */}
      {isMobile && (
        <Fab
          color="secondary"
          className={classes.addFab}
          onClick={() => setBottomSheetOpen(true)}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Click Away Listener para Bottom Sheet */}
      {isMobile && bottomSheetOpen && (
        <ClickAwayListener onClickAway={() => setBottomSheetOpen(false)}>
          <div />
        </ClickAwayListener>
      )}

      {/* TODOS OS MODAIS COMPLETOS - mantidos iguais */}
      <FlowBuilderAddTextModal
        open={modalAddText}
        onSave={textAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddText}
      />
      <FlowBuilderIntervalModal
        open={modalAddInterval}
        onSave={intervalAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddInterval}
      />
      <FlowBuilderMenuModal
        open={modalAddMenu}
        onSave={menuAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddMenu}
      />
      <FlowBuilderAddImgModal
        open={modalAddImg}
        onSave={imgAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddImg}
      />
      <FlowBuilderAddAudioModal
        open={modalAddAudio}
        onSave={audioAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddAudio}
      />
      <FlowBuilderRandomizerModal
        open={modalAddRandomizer}
        onSave={randomizerAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddRandomizer}
      />
      <FlowBuilderAddVideoModal
        open={modalAddVideo}
        onSave={videoAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddVideo}
      />
      <FlowBuilderSingleBlockModal
        open={modalAddSingleBlock}
        onSave={singleBlockAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddSingleBlock}
      />
      <FlowBuilderTicketModal
        open={modalAddTicket}
        onSave={ticketAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddTicket}
      />
      <FlowBuilderOpenAIModal
        open={modalAddOpenAI}
        onSave={openaiAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddOpenAI}
      />
      <FlowBuilderGeminiModal
        open={modalAddGemini}
        onSave={geminiAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddGemini}
      />
      <FlowBuilderAddTagModal
        open={modalAddTag}
        onSave={tagAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddTag}
      />
      <FlowBuilderRemoveTagModal
        open={modalAddRemoveTag}
        onSave={removeTagAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={() => setModalAddRemoveTag(null)}
      />
      <FlowBuilderAddSwitchFlowModal
        open={modalAddSwitchFlow}
        onSave={switchFlowAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddSwitchFlow}
      />
      <FlowBuilderAddAttendantModal
        open={modalAddAttendant}
        onSave={attendantAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddAttendant}
      />
      <FlowBuilderInputModal
        open={modalAddInput}
        onSave={inputAdd}
        data={dataNode}
        onUpdate={updateNode}
        close={setModalAddInput}
      />
    </div>
  );
};