/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useState, useEffect, useMemo } from "react";
import { useHistory } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
// import {  Button, Grid } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { useTheme } from "@material-ui/core/styles";
import { IconButton } from "@mui/material";
import { Groups, SaveAlt } from "@mui/icons-material";

import CallIcon from "@material-ui/icons/Call";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import GroupAddIcon from "@material-ui/icons/GroupAdd";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import FilterListIcon from "@material-ui/icons/FilterList";
import ClearIcon from "@material-ui/icons/Clear";
import SendIcon from "@material-ui/icons/Send";
import MessageIcon from "@material-ui/icons/Message";
import AccessAlarmIcon from "@material-ui/icons/AccessAlarm";
import TimerIcon from "@material-ui/icons/Timer";
import * as XLSX from "xlsx";
import CheckCircleOutlineIcon from "@material-ui/icons/RecordVoiceOver";
import ErrorOutlineIcon from "@material-ui/icons/RecordVoiceOver";

import { grey, blue } from "@material-ui/core/colors";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import TabPanel from "../../components/TabPanel";
import TableAttendantsStatus from "../../components/Dashboard/TableAttendantsStatus";
import { isArray } from "lodash";

import { AuthContext } from "../../context/Auth/AuthContext";

import useDashboard from "../../hooks/useDashboard";
import useContacts from "../../hooks/useContacts";
import useMessages from "../../hooks/useMessages";
import { ChatsUser } from "./ChartsUser";

import useActivities from "../../hooks/useActivities";
import useProjects from "../../hooks/useProjects";
import { isEmpty } from "lodash";
import moment from "moment";
import "moment/locale/pt-br";
import { ChartsDate } from "./ChartsDate";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  Container,
  Stack,
  SvgIcon,
  Tab,
  Tabs,
  LinearProgress,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { i18n } from "../../translate/i18n";
import Grid2 from "@mui/material/Unstable_Grid2";
import ForbiddenPage from "../../components/ForbiddenPage";
import { ArrowDownward, ArrowUpward } from "@material-ui/icons";
import api from "../../services/api";
import { DrawerContext } from "../../context/DrawerContext";

const useStyles = makeStyles((theme) => ({
  overline: {
    fontSize: "0.9rem",
    fontWeight: 300,
    color: theme.palette.text.secondary,
    letterSpacing: "0.5px",
    lineHeight: 2.5,
    textTransform: "uppercase",
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  greetingContainer: {
    marginBottom: theme.spacing(0.5),
    marginLeft: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing(0.75),
    paddingRight: theme.spacing(1.5),
  },
  greetingTitle: {
    fontWeight: 300,
    marginBottom: theme.spacing(0.15),
    fontSize: "1.15rem",
    lineHeight: 1.35,
    letterSpacing: "0.02em",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  greetingSubtitle: {
    color: theme.palette.text.secondary,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  miniTopbar: {
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.chromeSurface || theme.palette.background.default
        : "#ffffff",
    borderRadius: 0,
    padding: theme.spacing(0.625, 1.5),
    minHeight: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: theme.spacing(0.5),
    marginTop: 0,
    marginBottom: theme.spacing(0.5),
    width: "100%",
    boxShadow: "none",
    borderBottom:
      theme.palette.type === "dark"
        ? "1px solid rgba(255, 255, 255, 0.06)"
        : "1px solid #eef0f3",
    position: "sticky",
    top: 0,
    zIndex: 5,
  },
  miniTopbarRight: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  miniTopbarIconSmall: {
    width: 16,
    height: 16,
  },
  miniTopbarClock: {
    color: theme.palette.text.secondary,
    fontSize: "0.74rem",
    fontWeight: 300,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    [theme.breakpoints.up("lg")]: {
      fontSize: "0.78rem",
    },
    [theme.breakpoints.up("xl")]: {
      fontSize: "0.8rem",
    },
  },
  blocksWrapper: {
    width: "100%",
    maxWidth: "100%",
    margin: "0 auto",
  },
  blockPaper: {
    padding: theme.spacing(1),
    borderRadius: 10,
    backgroundColor: theme.palette.background.paper,
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255, 255, 255, 0.08)"
        : "1px solid rgba(15, 23, 42, 0.06)",
    boxShadow:
      theme.palette.mode === "light"
        ? "0 1px 2px rgba(15, 23, 42, 0.04)"
        : theme.shadows[2],
    aspectRatio: "1 / 0.85",
    minHeight: 140,
    width: "100%",
    margin: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transition: "box-shadow 0.25s cubic-bezier(0.4,0,0.2,1), border-color 0.25s ease, transform 0.25s cubic-bezier(0.4,0,0.2,1)",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow:
        theme.palette.type === "dark"
          ? "0 8px 24px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(0, 0, 0, 0.3)"
          : "0 8px 24px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.06)",
      borderColor:
        theme.palette.type === "dark"
          ? "rgba(255, 255, 255, 0.14)"
          : "rgba(15, 23, 42, 0.1)",
    },
    "&:hover $dragHandleBtn": {
      visibility: "visible",
    },
    [theme.breakpoints.down("sm")]: {
      minHeight: 130,
    },
    [theme.breakpoints.up("lg")]: {
      minHeight: 160,
    },
    [theme.breakpoints.up("xl")]: {
      minHeight: 180,
    },
  },
  blockHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(1.5),
    position: "relative",
  },
  blockHeaderTitle: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    fontWeight: 300,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  blockHeaderIcon: {
    width: 12,
    height: 12,
    flexShrink: 0,
    color: theme.palette.text.secondary,
    stroke: theme.palette.type === "dark" ? "#e5e7eb" : "#111",
    strokeWidth: 1.75,
  },
  dragHandleBtn: {
    position: "absolute",
    right: theme.spacing(0.5),
    top: theme.spacing(0.5),
    padding: 4,
    visibility: "hidden",
  },
  blockPaperHover: {},
  blockContent: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    paddingRight: theme.spacing(0.5),
  },
  blockTitle: {
    fontWeight: 500,
    fontSize: "0.65rem",
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    letterSpacing: "0.01em",
  },
  blockList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    marginTop: theme.spacing(1),
  },
  blockListItem: {
    display: "flex",
    flexDirection: "column",
    padding: theme.spacing(0.875, 1),
    borderRadius: 10,
    marginBottom: theme.spacing(0.75),
    cursor: "pointer",
    backgroundColor:
      theme.palette.mode === "light"
        ? "#f9fafb"
        : "rgba(255,255,255,0.04)",
    transition: "background-color 0.15s ease, box-shadow 0.15s ease",
    "&:hover": {
      backgroundColor:
        theme.palette.mode === "light"
          ? "#f3f4f6"
          : "rgba(255,255,255,0.08)",
      boxShadow:
        theme.palette.mode === "light"
          ? "inset 0 0 0 1px rgba(0,0,0,0.04)"
          : "inset 0 0 0 1px rgba(255,255,255,0.06)",
    },
  },
  blockItemTitle: {
    fontSize: "0.8rem !important",
    fontWeight: 300,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    lineHeight: 1.35,
  },
  blockItemMeta: {
    fontSize: "0.7rem !important",
    color: theme.palette.text.secondary,
    marginTop: 2,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    lineHeight: 1.35,
  },
  dotLine: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  agendaItem: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(0.75, 1),
    borderRadius: 10,
    marginBottom: theme.spacing(0.75),
    cursor: "pointer",
    colorScheme: "light",
    color: "#1f2937 !important",
    transition: "background-color 0.15s ease, box-shadow 0.15s ease",
    "& .MuiTypography-root, & span, & div": {
      color: "#1f2937 !important",
    },
    "&:hover": {
      backgroundColor:
        theme.palette.mode === "light"
          ? "#e5e7eb"
          : "rgba(255,255,255,0.08)",
      boxShadow:
        theme.palette.mode === "light"
          ? "inset 0 0 0 1px rgba(0,0,0,0.04)"
          : "inset 0 0 0 1px rgba(255,255,255,0.06)",
    },
  },
  agendaTime: {
    fontSize: "0.7rem !important",
    color: "#374151 !important",
    minWidth: 40,
    textAlign: "right",
    fontWeight: 300,
    marginTop: 0,
    flexShrink: 0,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    lineHeight: 1.35,
  },
  agendaHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(1),
  },
  agendaDate: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: "0.76rem",
    fontWeight: 300,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  agendaControls: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
  },
  todayButton: {
    textTransform: "none",
    padding: theme.spacing(0.5, 1.2),
    minHeight: 28,
    fontWeight: 300,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  h4: {
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeight: 300,
    fontSize: "2rem",
    lineHeight: 1,
    color: theme.palette.text.primary,
  },
  tab: {
    minWidth: "auto",
    width: "auto",
    padding: theme.spacing(0.5, 1),
    borderRadius: 8,
    transition: "0.3s",
    borderWidth: "1px",
    borderStyle: "solid",
    marginRight: theme.spacing(0.5),
    marginLeft: theme.spacing(0.5),
    fontWeight: 300,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',

    [theme.breakpoints.down("lg")]: {
      fontSize: "0.9rem",
      padding: theme.spacing(0.4, 0.8),
      marginRight: theme.spacing(0.4),
      marginLeft: theme.spacing(0.4),
    },
    [theme.breakpoints.down("md")]: {
      fontSize: "0.8rem",
      padding: theme.spacing(0.3, 0.6),
      marginRight: theme.spacing(0.3),
      marginLeft: theme.spacing(0.3),
    },
    "&:hover": {
      backgroundColor: "rgba(6, 81, 131, 0.3)",
    },
    "&$selected": {
      color: theme.palette.primary.contrastText,
      backgroundColor: theme.palette.primary.main,
    },
  },
  tabIndicator: {
    borderWidth: "2px",
    borderStyle: "solid",
    height: 6,
    bottom: 0,
    color:
      theme.palette.mode === "light"
        ? theme.palette.primary.main
        : theme.palette.primary.contrastText,
  },
  container: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
  },
  nps: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.padding,
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    flexDirection: "column",
    height: 240,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  cardAvatar: {
    fontSize: "55px",
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    width: theme.spacing(7),
    height: theme.spacing(7),
  },
  cardTitle: {
    fontSize: "18px",
    color: theme.palette.primary.main,
    fontWeight: 300,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  cardSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "14px",
    fontWeight: 300,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  alignRight: {
    textAlign: "right",
  },
  fullWidth: {
    width: "100%",
  },
  selectContainer: {
    width: "100%",
    textAlign: "left",
  },
  iframeDashboard: {
    width: "100%",
    height: "calc(100vh - 64px)",
    border: "none",
  },
  customFixedHeightPaperLg: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: 300,
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(2),
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  mainContainer: {
    padding: 0,
    paddingTop: 0,
    height: "auto !important",
  },
  mainPaper: {
    flex: "none",
    overflowY: "visible",
    overflowX: "hidden",
    ...theme.scrollbarStyles,
    backgroundColor:
      theme.palette.mode === "light"
        ? "#f3f6fb !important"
        : "transparent !important",
    borderRadius: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  paper: {
    padding: theme.spacing(2),
    borderRadius: 12,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[1],
  },
  barContainer: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(1),
  },
  progressBar: {
    flex: 1,
    marginRight: theme.spacing(1),
    borderRadius: 5,
    height: 10,
  },
  progressLabel: {
    minWidth: 50,
    textAlign: "right",
    fontWeight: 300,
    color: theme.palette.mode === "light" ? theme.palette.text.secondary : theme.palette.text.primary,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  infoCard: {
    padding: theme.spacing(1.5),
    textAlign: "center",
    borderRadius: 10,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255, 255, 255, 0.08)"
        : "1px solid rgba(15, 23, 42, 0.06)",
    backgroundColor: theme.palette.background.paper,
    marginBottom: theme.spacing(1.5),
    transition: "box-shadow 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1), border-color 0.25s ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow:
        theme.palette.type === "dark"
          ? "0 8px 24px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(0, 0, 0, 0.3)"
          : "0 8px 24px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.06)",
      borderColor:
        theme.palette.type === "dark"
          ? "rgba(255, 255, 255, 0.14)"
          : "rgba(15, 23, 42, 0.1)",
    },
  },
  infoIcon: {
    fontSize: "2rem",
    color: theme.palette.primary.main,
    marginBottom: theme.spacing(1),
  },
  settingsDialogPaper: {
    borderRadius: "36px !important",
    padding: theme.spacing(1.5),
    overflow: "hidden",
  },
  settingsDialogTitle: {
    fontWeight: 300,
    fontSize: "1.1rem",
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  dialogButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 300,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  dialogCancelButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 300,
    borderColor: "#131B2D !important",
    color: "#131B2D !important",
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    "&:hover": {
      backgroundColor: "rgba(19, 27, 45, 0.06) !important",
      borderColor: "#131B2D !important",
    },
  },
  dialogAddButton: {
    borderRadius: 10,
    textTransform: "none",
    fontWeight: 300,
    backgroundColor: "#131B2D !important",
    color: "#FFFFFF !important",
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    "&:hover": {
      backgroundColor: "#0f1525 !important",
    },
  },
}));

const defaultBlocks = [
  { id: "pendingActivities", title: "Atividades Pendentes" },
  { id: "agenda", title: "Agenda" },
  { id: "recentActivities", title: "Atividades Recentes" },
  { id: "recentProjects", title: "Últimos Projetos" },
];

const Dashboard = () => {
  const theme = useTheme();
  const classes = useStyles();
  moment.locale("pt-br");
  const [counters, setCounters] = useState({});
  const [attendants, setAttendants] = useState([]);
  const [filterType, setFilterType] = useState(1);
  const [period, setPeriod] = useState(0);
  const [dateFrom, setDateFrom] = useState(
    moment("1", "D").format("YYYY-MM-DD")
  );
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [loading, setLoading] = useState(false);
  const { find } = useDashboard();

  //FILTROS NPS
  const [tab, setTab] = useState("Indicadores");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedQueues, setSelectedQueues] = useState([]);

  let newDate = new Date();
  let date = newDate.getDate();
  let month = newDate.getMonth() + 1;
  let year = newDate.getFullYear();
  let nowIni = `${year}-${month < 10 ? `0${month}` : `${month}`}-01`;

  let now = `${year}-${month < 10 ? `0${month}` : `${month}`
    }-${date < 10 ? `0${date}` : `${date}`}`;

  const [showFilter, setShowFilter] = useState(false);
  const [dateStartTicket, setDateStartTicket] = useState(nowIni);
  const [dateEndTicket, setDateEndTicket] = useState(now);
  const [queueTicket, setQueueTicket] = useState(false);
  const [fetchDataFilter, setFetchDataFilter] = useState(false);
  const [blockOrder, setBlockOrder] = useState(defaultBlocks.map((b) => b.id));
  const [blockConfigs, setBlockConfigs] = useState(defaultBlocks);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addDueActivities, setAddDueActivities] = useState(false);
  const [addDueProjects, setAddDueProjects] = useState(false);
  const [schedulesToday, setSchedulesToday] = useState([]);

  const { user } = useContext(AuthContext);
  const { activities, loading: loadingActivities } = useActivities({
    searchParam: "",
    pageNumber: 1,
  });
  const { projects, loading: loadingProjects } = useProjects({
    pageNumber: 1,
    searchParam: "",
  });
  const drawerCtx = useContext(DrawerContext);
  const drawerOpen = drawerCtx && typeof drawerCtx.drawerOpen !== "undefined" ? drawerCtx.drawerOpen : false;
  const toggleDrawer = () => {
    if (drawerCtx && typeof drawerCtx.setDrawerOpen === "function") {
      drawerCtx.setDrawerOpen(!drawerOpen);
    }
  };

  const exportarGridParaExcel = () => {
    const ws = XLSX.utils.table_to_sheet(
      document.getElementById("grid-attendants")
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RelatorioDeAtendentes");
    XLSX.writeFile(wb, "relatorio-de-atendentes.xlsx");
  };

  var userQueueIds = [];

  if (user.queues && user.queues.length > 0) {
    userQueueIds = user.queues.map((q) => q.id);
  }

  useEffect(() => {
    const storageKey = `dashboard-block-order-${user.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validIds = defaultBlocks.map((b) => b.id);
        const filtered = parsed.filter((id) => validIds.includes(id));
        const missing = validIds.filter((id) => !filtered.includes(id));
        setBlockOrder([...filtered, ...missing]);
      } catch (e) {
        setBlockOrder(defaultBlocks.map((b) => b.id));
      }
    } else {
      setBlockOrder(defaultBlocks.map((b) => b.id));
    }
  }, [user.id]);

  useEffect(() => {
    let isMounted = true;
    
    async function firstLoad() {
      if (isMounted) {
        console.log('Executando firstLoad...');
        await fetchData();
      }
    }
    
    const timeoutId = setTimeout(() => {
      firstLoad();
    }, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDataFilter]);

  async function fetchData() {
    setLoading(true);
    console.log('Iniciando fetchData...');
  
    let params = {};
  
    // Construir parâmetros de filtro
    if (period > 0) {
      params = {
        days: period,
      };
      console.log('Usando filtro por dias:', period);
    } else {
      // Se não há período específico, usar as datas
      if (!isEmpty(dateStartTicket) && moment(dateStartTicket).isValid()) {
        params = {
          ...params,
          date_from: moment(dateStartTicket).format("YYYY-MM-DD"),
        };
        console.log('Data de início:', dateStartTicket);
      }
  
      if (!isEmpty(dateEndTicket) && moment(dateEndTicket).isValid()) {
        params = {
          ...params,
          date_to: moment(dateEndTicket).format("YYYY-MM-DD"),
        };
        console.log('Data de fim:', dateEndTicket);
      }
    }
  
    // Se nenhum parâmetro foi definido, usar período padrão de 30 dias
    if (Object.keys(params).length === 0) {
      console.log('Nenhum filtro definido, usando 30 dias como padrão');
      params = { days: 30 };
    }
  
    console.log('Parâmetros finais para busca:', params);
  
    try {
      const data = await find(params);
      console.log('Dados recebidos no componente:', data);
  
      // Garantir que counters sempre tenha valores válidos
      const safeCounters = data.counters || {};
      
      // Verificar especificamente o campo tickets
      console.log('Campo tickets recebido:', safeCounters.tickets);
      
      setCounters(safeCounters);
      
      if (isArray(data.attendants)) {
        setAttendants(data.attendants);
      } else {
        console.warn('Attendants não é um array:', data.attendants);
        setAttendants([]);
      }
  
      console.log('Estado atualizado - Counters:', safeCounters);
      console.log('Estado atualizado - Attendants:', data.attendants);
      
      // Log específico para verificar se o campo tickets está presente
      console.log('Valor de tickets no estado:', safeCounters.tickets);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados do dashboard');
      
      // Definir valores padrão em caso de erro
      setCounters({
        avgSupportTime: 0,
        avgWaitTime: 0,
        supportFinished: 0,
        supportHappening: 0,
        supportPending: 0,
        supportGroups: 0,
        leads: 0,
        activeTickets: 0,
        passiveTickets: 0,
        tickets: 0,
        waitRating: 0,
        withoutRating: 0,
        withRating: 0,
        percRating: 0,
        npsPromotersPerc: 0,
        npsPassivePerc: 0,
        npsDetractorsPerc: 0,
        npsScore: 0
      });
      setAttendants([]);
    } finally {
      setLoading(false);
    }
  }

  const handleSelectedUsers = (selecteds) => {
    const users = selecteds.map((t) => t.id);
    setSelectedUsers(users);
  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  function formatTime(minutes) {
    return moment().startOf("day").add(minutes, "minutes").format("HH[h] mm[m]");
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(blockOrder);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setBlockOrder(items);
    const storageKey = `dashboard-block-order-${user.id}`;
    localStorage.setItem(storageKey, JSON.stringify(items));
  };

  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    let base;
    if (hour < 12) {
      base = "Bom dia";
    } else if (hour < 18) {
      base = "Boa tarde";
    } else {
      base = "Boa noite";
    }
    return `${base}, ${user.name}`;
  }, [user.name]);

  async function loadTodaySchedules() {
    try {
      const { data } = await api.get("/schedules", {
        params: { pageNumber: 1, searchParam: "" },
      });
      const todayStr = moment().format("YYYY-MM-DD");
      const filtered = (data?.schedules || []).filter((s) => {
        const base = s.sendAt || s.date || s.startAt || s.startDate || s.createdAt;
        const dt = moment(base).local().format("YYYY-MM-DD");
        return dt === todayStr;
      });
      setSchedulesToday(filtered.slice(0, 5));
    } catch (e) {
      setSchedulesToday([]);
    }
  }

  const history = useHistory();
  const [nowText, setNowText] = useState(moment().format("ddd, D MMM • HH:mm"));
  useEffect(() => {
    const id = setInterval(() => {
      setNowText(moment().format("ddd, D MMM • HH:mm"));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadTodaySchedules();
  }, []);

  // Ícones distintos por bloco (cabeçalho)
  const renderHeaderIconById = (blockId) => {
    if (blockId === "agenda") {
      return (
        <svg className={classes.blockHeaderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    }
    if (blockId === "pendingActivities" || blockId === "dueActivities") {
      return (
        <svg className={classes.blockHeaderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="18" rx="3" ry="3" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    }
    if (blockId === "recentProjects" || blockId === "dueProjects") {
      return (
        <svg className={classes.blockHeaderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M3 7h18v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M3 7l3-3h6l3 3" />
        </svg>
      );
    }
    // recentActivities (relógio)
    return (
      <svg className={classes.blockHeaderIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    );
  };

  const pendingActivities = useMemo(() => {
    return activities
      .filter((a) => {
        const statusOk = a.status === "pending" || a.status === "A Fazer";
        const t = String(a.type || "").toLowerCase();
        const isEvent = t === "event";
        return statusOk && !isEvent;
      })
      .slice(0, 5);
  }, [activities]);

  const recentActivities = useMemo(() => {
    return [...activities]
      .filter((a) => {
        const t = String(a.type || "").toLowerCase();
        return t !== "event";
      })
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date) - new Date(a.date);
      })
      .slice(0, 5);
  }, [activities]);

  const recentProjects = useMemo(() => {
    return [...projects].slice(0, 5);
  }, [projects]);

  const dueActivities = useMemo(() => {
    const limit = moment().add(7, "days");
    return activities
      .filter((a) => {
        const t = String(a.type || "").toLowerCase();
        if (t === "event") return false;
        if (!a?.date) return false;
        const d = moment(a.date);
        return d.isSameOrAfter(moment(), "day") && d.isSameOrBefore(limit, "day");
      })
      .slice(0, 5);
  }, [activities]);

  const dueProjects = useMemo(() => {
    const limit = moment().add(7, "days");
    return projects
      .filter((p) => {
        const key = p?.dueDate || p?.deadline || p?.date;
        if (!key) return false;
        const d = moment(key);
        return d.isSameOrAfter(moment(), "day") && d.isSameOrBefore(limit, "day");
      })
      .slice(0, 5);
  }, [projects]);

  const agendaEvents = useMemo(() => {
    const today = moment();
    const fromSchedules = (schedulesToday || []).map((e) => ({
      type: "schedule",
      time: e?.sendAt || e?.date || e?.startAt || e?.startDate || e?.createdAt || null,
      title: e?.title || e?.contact?.name || "Evento",
    })).filter(Boolean);
    const fromActivities = (activities || [])
      .filter((a) => a?.date && moment(a.date).isSame(today, "day"))
      .map((a) => ({
        type: "activity",
        time: a?.date || null,
        title: a?.title || "Atividade",
      }));
    const fromProjects = (projects || [])
      .filter((p) => {
        const key = p?.dueDate || p?.deadline || p?.date || p?.createdAt;
        if (!key) return false;
        return moment(key).isSame(today, "day");
      })
      .map((p) => ({
        type: "project",
        time: p?.time || p?.dueDate || p?.deadline || p?.date || p?.createdAt || null,
        title: p?.title || p?.name || "Projeto",
      }));
    const norm = (val) => (val ? moment(val).format("HH:mm") : "99:99");
    return [...fromSchedules, ...fromActivities, ...fromProjects].sort(
      (a, b) => norm(a.time).localeCompare(norm(b.time))
    );
  }, [schedulesToday, activities, projects]);

  const getProjectStatusLabel = (status) => {
    const s = String(status || "").toLowerCase().replace("-", "_");
    if (["in_progress", "em progresso", "em_progresso", "active", "ativo"].includes(s)) return "Em progresso";
    if (["completed", "concluído", "concluido", "finalizado", "finalizada", "done"].includes(s)) return "Concluído";
    if (["pending", "pendente", "a fazer", "a_fazer", "todo", "to_do"].includes(s)) return "Pendente";
    if (["backlog"].includes(s)) return "Backlog";
    return status || "Backlog";
  };

  const renderBlockContent = (id) => {
    if (id === "pendingActivities") {
      if (loadingActivities) {
        return (
          <Typography color="textSecondary">Carregando atividades...</Typography>
        );
      }
      if (!pendingActivities.length) {
        return (
          <Typography color="textSecondary">
            Nenhuma atividade pendente encontrada.
          </Typography>
        );
      }
      return (
        <ul className={classes.blockList}>
          {pendingActivities.map((a) => {
            const color = "#f59e0b"; // laranja
            const hasDate = !!a.date;
            const d = hasDate ? moment(a.date) : null;
            const isFuture = d ? d.isAfter(moment()) : false;
            const isOverdue = hasDate ? (!isFuture && !d.isSame(moment(), "day")) : false;
            const when = d ? d.fromNow(true) : "-";
            const metaText = hasDate
              ? (isFuture
                  ? `Atividade a vencer em ${when}`
                  : d.isSame(moment(), "day")
                    ? `Atividade vence hoje às ${d.format("HH:mm")}`
                    : `Atividade vencida há ${when}`)
              : "-";
            return (
              <li
                key={a.id}
                className={classes.blockListItem}
                onClick={() => history.push("/activities")}
              >
                <div className={classes.dotLine}>
                  <span className={classes.dot} style={{ backgroundColor: color }} />
                  <Typography className={classes.blockItemTitle}>
                    {a.title || "Sem título"}
                  </Typography>
                </div>
                <Typography
                  className={classes.blockItemMeta}
                  title={hasDate ? d.format("DD/MM/YYYY HH:mm") : "-"}
                  style={isOverdue ? { color: "#ef4444", fontWeight: 400 } : undefined}
                >
                  {metaText}
                </Typography>
              </li>
            );
          })}
        </ul>
      );
    }
    if (id === "agenda") {
      const items = agendaEvents;
      return (
        <div>
          <div className={classes.agendaHeader}>
            <div className={classes.agendaDate}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{moment().format("dddd, D [de] MMM")}</span>
            </div>
            <div className={classes.agendaControls}>
              <Button variant="outlined" size="small" className={classes.todayButton} onClick={loadTodaySchedules}>
                Hoje
              </Button>
            </div>
          </div>
          {items.length === 0 ? (
            <Typography color="textSecondary">Nenhum evento para hoje.</Typography>
          ) : (
            items.map((e, idx) => {
              const palette = ["#dbeafe", "#dcfce7", "#EDE9FE"];
              const bg = palette[idx % palette.length];
              const color =
                e.type === "schedule" ? "#3b82f6" : e.type === "activity" ? "#10b981" : "#8b5cf6";
              return (
                <div
                  key={`${e.type}-${idx}`}
                  className={classes.agendaItem}
                  data-agenda-event
                  style={{ backgroundColor: bg, colorScheme: "light" }}
                  onClick={() => history.push("/schedules")}
                >
                  <span className={classes.dot} style={{ backgroundColor: color }} />
                  <Typography className={`${classes.blockItemMeta} ${classes.agendaTime}`} component="span">
                    {e.time ? moment(e.time).format("HH:mm") : "--:--"}
                  </Typography>
                  <Typography className={classes.blockItemTitle} style={{ flex: 1 }}>
                    {e.title}
                  </Typography>
                </div>
              );
            })
          )}
        </div>
      );
    }
    if (id === "recentActivities") {
      if (loadingActivities) {
        return (
          <Typography color="textSecondary">Carregando atividades...</Typography>
        );
      }
      if (!recentActivities.length) {
        return (
          <Typography color="textSecondary">
            Nenhuma atividade recente encontrada.
          </Typography>
        );
      }
      return (
        <ul className={classes.blockList}>
          {recentActivities.map((a, idx) => {
            const status = (a.status || "").toLowerCase();
            let color = "#3b82f6"; // em andamento
            let label = "Em andamento";
            if (status.includes("done") || status.includes("concl")) {
              color = "#10b981"; label = "Concluído";
            } else if (status.includes("pend")) {
              color = "#f59e0b"; label = "Pendente";
            }
            const hasDate = !!a.date;
            const d = hasDate ? moment(a.date) : null;
            const isFuture = d ? d.isAfter(moment()) : false;
            const isOverdue = hasDate ? (!isFuture && !d.isSame(moment(), "day")) : false;
            const when = d ? d.fromNow(true) : "-";
            const metaText = hasDate
              ? (isFuture
                  ? `Atividade a vencer em ${when}`
                  : d.isSame(moment(), "day")
                    ? `Atividade vence hoje às ${d.format("HH:mm")}`
                    : `Atividade vencida há ${when}`)
              : "-";
            return (
              <li
                key={a.id}
                className={classes.blockListItem}
                onClick={() => history.push("/activities")}
              >
                <div className={classes.dotLine}>
                  <span className={classes.dot} style={{ backgroundColor: color }} />
                  <Typography className={classes.blockItemTitle}>
                    {a.title || "Sem título"}
                  </Typography>
                </div>
                <Typography
                  className={classes.blockItemMeta}
                  title={hasDate ? d.format("DD/MM/YYYY HH:mm") : "-"}
                  style={isOverdue ? { color: "#ef4444", fontWeight: 400 } : undefined}
                >
                  {metaText}
                </Typography>
              </li>
            );
          })}
        </ul>
      );
    }
    if (id === "recentProjects") {
      if (loadingProjects) {
        return (
          <Typography color="textSecondary">Carregando projetos...</Typography>
        );
      }
      if (!recentProjects.length) {
        return (
          <Typography color="textSecondary">
            Nenhum projeto encontrado.
          </Typography>
        );
      }
      return (
        <ul className={classes.blockList}>
          {recentProjects.map((p) => {
            const status = (p.status || "").toLowerCase();
            let color = "#3b82f6";
            if (status.includes("done") || status.includes("concl")) color = "#10b981";
            if (status.includes("pend")) color = "#f59e0b";
            return (
              <li
                key={p.id}
                className={classes.blockListItem}
                onClick={() => history.push("/projects")}
              >
                <div className={classes.dotLine}>
                  <span className={classes.dot} style={{ backgroundColor: color }} />
                  <Typography className={classes.blockItemTitle}>
                    {p.title || p.name || "Sem título"}
                  </Typography>
                </div>
                <Typography className={classes.blockItemMeta}>
                  {getProjectStatusLabel(p.status)}
                </Typography>
              </li>
            );
          })}
        </ul>
      );
    }
    if (id === "dueActivities") {
      if (!dueActivities.length) {
        return (
          <Typography color="textSecondary">
            Nenhuma atividade a vencer nos próximos 7 dias.
          </Typography>
        );
      }
      return (
        <ul className={classes.blockList}>
          {dueActivities.map((a) => (
            <li
              key={a.id}
              className={classes.blockListItem}
              onClick={() => history.push("/activities")}
            >
              <Typography className={classes.blockItemTitle}>
                {a.title || "Sem título"}
              </Typography>
              <Typography className={classes.blockItemMeta}>
                {a.date}
              </Typography>
            </li>
          ))}
        </ul>
      );
    }
    if (id === "dueProjects") {
      if (!dueProjects.length) {
        return (
          <Typography color="textSecondary">
            Nenhum projeto a vencer nos próximos 7 dias.
          </Typography>
        );
      }
      return (
        <ul className={classes.blockList}>
          {dueProjects.map((p) => (
            <li
              key={p.id}
              className={classes.blockListItem}
              onClick={() => history.push("/projects")}
            >
              <Typography className={classes.blockItemTitle}>
                {p.title || p.name || "Projeto"}
              </Typography>
              <Typography className={classes.blockItemMeta}>
                {p.status || moment(p.dueDate || p.deadline || p.date).format("DD/MM/YYYY")}
              </Typography>
            </li>
          ))}
        </ul>
      );
    }
    return null;
  };

  const handleOpenSettings = () => setSettingsOpen(true);
  const handleCloseSettings = () => setSettingsOpen(false);
  const handleApplySettings = () => {
    const newBlocks = [...blockConfigs];
    if (addDueActivities && !newBlocks.find((b) => b.id === "dueActivities")) {
      newBlocks.push({ id: "dueActivities", title: "Atividades a Vencer" });
    }
    if (addDueProjects && !newBlocks.find((b) => b.id === "dueProjects")) {
      newBlocks.push({ id: "dueProjects", title: "Projetos à Vencer" });
    }
    setBlockConfigs(newBlocks);
    const order = [...blockOrder];
    if (addDueActivities && !order.includes("dueActivities")) {
      order.push("dueActivities");
    }
    if (addDueProjects && !order.includes("dueProjects")) {
      order.push("dueProjects");
    }
    setBlockOrder(order);
    handleCloseSettings();
  };

  const GetUsers = () => {
    let count;
    let userOnline = 0;
    attendants.forEach((user) => {
      if (user.online === true) {
        userOnline = userOnline + 1;
      }
    });
    count = userOnline === 0 ? 0 : userOnline;
    return count;
  };

  const GetContacts = (all) => {
    let props = {};
    if (all) {
      props = {};
    } else {
      props = {
        dateStart: dateStartTicket,
        dateEnd: dateEndTicket,
      };
    }
    const { count } = useContacts(props);
    return count;
  };

  const GetMessages = (all, fromMe) => {
    let props = {};
    if (all) {
      if (fromMe) {
        props = {
          fromMe: true,
        };
      } else {
        props = {
          fromMe: false,
        };
      }
    } else {
      if (fromMe) {
        props = {
          fromMe: true,
          dateStart: dateStartTicket,
          dateEnd: dateEndTicket,
        };
      } else {
        props = {
          fromMe: false,
          dateStart: dateStartTicket,
          dateEnd: dateEndTicket,
        };
      }
    }
    const { count } = useMessages(props);
    return count;
  };

  function toggleShowFilter() {
    setShowFilter(!showFilter);
  }

  return (
    <>
      {user.profile === "user" && user.showDashboard === "disabled" ? (
        <ForbiddenPage />
      ) : (
        <MainContainer className={classes.mainContainer} autoHeight>
          <Paper
            className={classes.mainPaper}
            elevation={0}
          >
            <Container
              maxWidth={false}
              className={classes.container}
              style={{
                padding: 0,
                maxWidth: "100%",
                overflowX: "hidden",
                marginTop: 0,
              }}
            >
              <div className={classes.miniTopbar}>
                {drawerCtx && drawerCtx.setDrawerOpen && !drawerOpen && (
                  <IconButton
                    size="small"
                    onClick={toggleDrawer}
                    aria-label="Alternar menu lateral"
                    title="Menu"
                    style={{ color: theme.palette.text.primary }}
                  >
                    <MenuIcon style={{ fontSize: 16 }} />
                  </IconButton>
                )}
                <div className={classes.miniTopbarRight}>
                  <div className={classes.miniTopbarClock} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                    <span>{nowText}</span>
                  </div>
                  <IconButton
                    size="small"
                    className={classes.miniTopbarButton}
                    onClick={handleOpenSettings}
                    aria-label="Mais opções"
                    title="Mais"
                  >
                    <MoreHorizIcon style={{ fontSize: 16, color: theme.palette.text.primary }} />
                  </IconButton>
                </div>
              </div>
              <div className={classes.greetingContainer}>
                <Typography
                  variant="h6"
                  component="h1"
                  className={classes.greetingTitle}
                  data-dashboard-greeting="true"
                >
                  {greetingText}
                </Typography>
              </div>
              <div className={classes.blocksWrapper}>
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="dashboard-blocks">
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        >
                        <Grid2
                          container
                          spacing={1}
                          className={classes.container}
                            style={{ margin: 0, width: "100%", marginTop: 0 }}
                        >
                          {blockOrder.map((id, index) => {
                            const config = (blockConfigs || []).find((b) => b.id === id) ||
                              defaultBlocks.find((b) => b.id === id);
                            if (!config) return null;
                            return (
                              <Draggable
                                key={id}
                                draggableId={id}
                                index={index}
                              >
                                {(dragProvided) => (
                                  <Grid2
                                    item
                                    xs={12}
                                    sm={6}
                                    md={6}
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                  >
                                    <Paper className={classes.blockPaper}>
                                      <div className={classes.blockHeader}>
                                        <div className={classes.blockHeaderTitle}>
                                          {renderHeaderIconById(id)}
                                          <Typography variant="h6" className={classes.blockTitle}>
                                            {config.title}
                                          </Typography>
                                        </div>
                                        <IconButton
                                          className={classes.dragHandleBtn}
                                          {...dragProvided.dragHandleProps}
                                          aria-label="Mover bloco"
                                          title="Arraste para mover"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="9" cy="7" r="1.5"/>
                                            <circle cx="15" cy="7" r="1.5"/>
                                            <circle cx="9" cy="12" r="1.5"/>
                                            <circle cx="15" cy="12" r="1.5"/>
                                            <circle cx="9" cy="17" r="1.5"/>
                                            <circle cx="15" cy="17" r="1.5"/>
                                          </svg>
                                        </IconButton>
                                      </div>
                                      <div className={classes.blockContent}>
                                        {renderBlockContent(id)}
                                      </div>
                                    </Paper>
                                  </Grid2>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </Grid2>
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </Container>
          </Paper>
          <Dialog open={settingsOpen} onClose={handleCloseSettings} classes={{ paper: classes.settingsDialogPaper }}>
            <DialogTitle className={classes.settingsDialogTitle}>Adicionar blocos</DialogTitle>
            <DialogContent>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={addDueActivities}
                      onChange={(e) => setAddDueActivities(e.target.checked)}
                    />
                  }
                  label="Atividades a Vencer"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={addDueProjects}
                      onChange={(e) => setAddDueProjects(e.target.checked)}
                    />
                  }
                  label="Projetos à Vencer"
                />
              </FormGroup>
            </DialogContent>
            <DialogActions>
              <Button variant="outlined" onClick={handleCloseSettings} className={classes.dialogCancelButton}>
                Cancelar
              </Button>
              <Button variant="contained" onClick={handleApplySettings} className={classes.dialogAddButton}>
                Adicionar
              </Button>
            </DialogActions>
          </Dialog>
        </MainContainer>
      )}
    </>
  );
};

export default Dashboard;
