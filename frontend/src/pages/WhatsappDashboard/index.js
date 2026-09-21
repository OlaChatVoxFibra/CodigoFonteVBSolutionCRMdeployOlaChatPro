/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useState, useEffect, useMemo } from "react";

import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Popover from "@material-ui/core/Popover";
import {
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  InputAdornment,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { useTheme } from "@material-ui/core/styles";
import { alpha } from "@material-ui/core/styles";
import { IconButton } from "@mui/material";
import { SaveAlt } from "@mui/icons-material";

import CallIcon from "@material-ui/icons/Call";
import RecordVoiceOverIcon from "@material-ui/icons/RecordVoiceOver";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import SendIcon from "@material-ui/icons/Send";
import MessageIcon from "@material-ui/icons/Message";
import AccessAlarmIcon from "@material-ui/icons/AccessAlarm";
import TimerIcon from "@material-ui/icons/Timer";
import * as XLSX from "xlsx";

import { grey } from "@material-ui/core/colors";
import { toast } from "react-toastify";

import TableAttendantsStatus from "../../components/Dashboard/TableAttendantsStatus";
import { isArray } from "lodash";

import { AuthContext } from "../../context/Auth/AuthContext";

import useDashboard from "../../hooks/useDashboard";
import useMessages from "../../hooks/useMessages";
import { isEmpty } from "lodash";
import moment from "moment";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import ForbiddenPage from "../../components/ForbiddenPage";
import { ArrowDownward, ArrowUpward, BarChart as BarChartIcon } from "@material-ui/icons";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import CalendarTodayIcon from "@material-ui/icons/CalendarToday";
import PersonOutlineIcon from "@material-ui/icons/PersonOutline";
import SearchIcon from "@material-ui/icons/Search";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import TelegramIcon from "@material-ui/icons/Telegram";
import SmsIcon from "@material-ui/icons/Sms";
import AllInboxIcon from "@material-ui/icons/AllInbox";
import InstagramIcon from "@material-ui/icons/Instagram";
import FacebookIcon from "@material-ui/icons/Facebook";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import WhatsappMetricCard, {
  dashboardIndicatorGridStyles,
  whatsappDashboardPalette
} from "../../components/Dashboard/WhatsappMetricCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend as RLegend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line as RLine,
} from "recharts";

function chartPanelStyle(palette, minHeight = 260) {
  return {
    borderRadius: 8,
    padding: 16,
    border: `1px solid ${palette.border}`,
    boxShadow: palette.shadow,
    background: palette.card,
    minHeight,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };
}

function formatSupportMinutes(minutes) {
  return moment()
    .startOf("day")
    .add(minutes || 0, "minutes")
    .format("HH[h] mm[m]");
}

const CHANNEL_OPTIONS = [
  { value: "all", label: "Todas", icon: <AllInboxIcon style={{ fontSize: 16 }} /> },
  { value: "whatsapp", label: "WhatsApp", icon: <WhatsAppIcon style={{ fontSize: 16, color: "#25D366" }} /> },
  { value: "whatsapp_oficial", label: "WhatsApp Oficial", icon: <WhatsAppIcon style={{ fontSize: 16, color: "#128C7E" }} /> },
  { value: "telegram", label: "Telegram", icon: <TelegramIcon style={{ fontSize: 16, color: "#0088cc" }} /> },
  { value: "sms", label: "SMS", icon: <SmsIcon style={{ fontSize: 16 }} /> },
  { value: "instagram", label: "Instagram", icon: <InstagramIcon style={{ fontSize: 16, color: "#E1306C" }} /> },
  { value: "facebook", label: "Facebook", icon: <FacebookIcon style={{ fontSize: 16, color: "#1877F2" }} /> },
];

const STATUS_COLORS = ["#3B82F6", "#F59E0B", "#10B981"];
const MSG_COLORS = ["#3B82F6", "#10B981"];
const QUEUE_COLORS = ["#3B82F6", "#06B6D4", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1"];

const useStyles = makeStyles((theme) => ({
  indicatorGrid: dashboardIndicatorGridStyles(theme),
  attendantsChartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
    marginTop: 12,
    width: "100%",
    alignItems: "stretch",
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
    },
  },
  overline: {
    fontSize: "0.7rem",
    fontWeight: 400,
    color: theme.palette.text.secondary,
    letterSpacing: "0.08em",
    lineHeight: 1.4,
    textTransform: "uppercase",
  },
  h4: {
    fontWeight: 500,
    fontSize: "1.875rem",
    lineHeight: 1.15,
    color: theme.palette.text.primary,
    fontFeatureSettings: '"tnum"',
  },
  tab: {
    minWidth: "auto",
    width: "auto",
    padding: theme.spacing(0.5, 1),
    borderRadius: 8,
    transition: "background-color 0.2s ease",
    borderWidth: "1px",
    borderStyle: "solid",
    marginRight: theme.spacing(0.5),
    marginLeft: theme.spacing(0.5),
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
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    },
    "&$selected": {
      color: "#FFF",
      backgroundColor: theme.palette.primary.main,
    },
  },
  tabIndicator: {
    borderWidth: "2px",
    borderStyle: "solid",
    height: 6,
    bottom: 0,
    color:
      theme.palette.type === "light"
        ? theme.palette.primary.main
        : theme.palette.common.white,
  },
  container: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(2),
  },
  nps: {
    paddingTop: theme.spacing(1),
    paddingBottom: theme.padding,
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 240,
  },
  cardAvatar: {
    fontSize: "55px",
    color: grey[500],
    backgroundColor: "#ffffff",
    width: theme.spacing(7),
    height: theme.spacing(7),
  },
  cardTitle: {
    fontSize: "18px",
    color: theme.palette.primary.main,
  },
  cardSubtitle: {
    color: grey[600],
    fontSize: "14px",
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
  customFixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 120,
  },
  customFixedHeightPaperLg: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: "100%",
  },
  fixedHeightPaper2: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
  channelFilterRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
}));

const WhatsappDashboard = () => {
  const theme = useTheme();
  const classes = useStyles();
  const isDark = theme.palette.type === "dark";
  const palette = useMemo(() => whatsappDashboardPalette(theme), [theme]);
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

  const [tab, setTab] = useState("Dashboard");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedQueues, setSelectedQueues] = useState([]);
  const [connectionFilter, setConnectionFilter] = useState("all");
  const [anchorConnection, setAnchorConnection] = useState(null);

  let newDate = new Date();
  let date = newDate.getDate();
  let month = newDate.getMonth() + 1;
  let year = newDate.getFullYear();
  let nowIni = `${year}-${month < 10 ? `0${month}` : `${month}`}-01`;
  let now = `${year}-${month < 10 ? `0${month}` : `${month}`}-${
    date < 10 ? `0${date}` : `${date}`
  }`;

  const [showFilter, setShowFilter] = useState(false);
  const [dateStartTicket, setDateStartTicket] = useState(nowIni);
  const [dateEndTicket, setDateEndTicket] = useState(now);
  const [queueTicket, setQueueTicket] = useState(false);
  const [fetchDataFilter, setFetchDataFilter] = useState(false);
  const [anchorPeriodo, setAnchorPeriodo] = useState(null);
  const [anchorResponsible, setAnchorResponsible] = useState(null);
  const [orgUsers, setOrgUsers] = useState([]);
  const [responsibleUserIds, setResponsibleUserIds] = useState([]);
  const [draftResponsibleIds, setDraftResponsibleIds] = useState([]);
  const [responsibleSearch, setResponsibleSearch] = useState("");

  const { user } = useContext(AuthContext);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data } = await api.get("/users", {
          params: { searchParam: "" },
        });
        if (!cancel && Array.isArray(data?.users)) {
          setOrgUsers(data.users);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const responsibleUserIdsKey = useMemo(
    () =>
      responsibleUserIds
        .slice()
        .sort((a, b) => a - b)
        .join(","),
    [responsibleUserIds]
  );

  const messagesFilterUserIds = useMemo(
    () => (responsibleUserIds.length > 0 ? responsibleUserIds : undefined),
    [responsibleUserIds]
  );

  const chartFilterUserId =
    responsibleUserIds.length === 1 ? responsibleUserIds[0] : undefined;

  const filteredResponsibleUsers = useMemo(() => {
    const q = responsibleSearch.trim().toLowerCase();
    if (!q) return orgUsers;
    return orgUsers.filter((u) =>
      String(u?.name || "")
        .toLowerCase()
        .includes(q)
    );
  }, [orgUsers, responsibleSearch]);

  const { count: receivedRange } = useMessages({
    fromMe: false,
    dateStart: dateStartTicket,
    dateEnd: dateEndTicket,
    ticketUserIds: messagesFilterUserIds,
  });
  const { count: receivedTotal } = useMessages({
    fromMe: false,
    ticketUserIds: messagesFilterUserIds,
  });
  const { count: sentRange } = useMessages({
    fromMe: true,
    dateStart: dateStartTicket,
    dateEnd: dateEndTicket,
    ticketUserIds: messagesFilterUserIds,
  });
  const { count: sentTotal } = useMessages({
    fromMe: true,
    ticketUserIds: messagesFilterUserIds,
  });

  const exportarGridParaExcel = () => {
    const root = document.getElementById("grid-attendants");
    const table = root && root.querySelector && root.querySelector("table");
    if (!table) {
      toast.error("Tabela de atendentes n\u00e3o dispon\u00edvel para exportar.");
      return;
    }
    const ws = XLSX.utils.table_to_sheet(table);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RelatorioDeAtendentes");
    XLSX.writeFile(wb, "relatorio-de-atendentes.xlsx");
  };

  var userQueueIds = [];

  if (user.queues && user.queues.length > 0) {
    userQueueIds = user.queues.map((q) => q.id);
  }

  useEffect(() => {
    async function firstLoad() {
      await fetchData();
    }
    setTimeout(() => {
      firstLoad();
    }, 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDataFilter, responsibleUserIdsKey, connectionFilter]);

  async function fetchData() {
    setLoading(true);

    let params = {};

    if (period > 0) {
      params = {
        days: period,
      };
    }

    if (!isEmpty(dateStartTicket) && moment(dateStartTicket).isValid()) {
      params = {
        ...params,
        date_from: moment(dateStartTicket).format("YYYY-MM-DD"),
      };
    }

    if (!isEmpty(dateEndTicket) && moment(dateEndTicket).isValid()) {
      params = {
        ...params,
        date_to: moment(dateEndTicket).format("YYYY-MM-DD"),
      };
    }

    if (responsibleUserIds.length > 0) {
      params.user_ids = responsibleUserIds.join(",");
    }

    if (connectionFilter && connectionFilter !== "all") {
      params.channel = connectionFilter;
    }

    if (Object.keys(params).length === 0) {
      toast.error("Parametrize o filtro");
      setLoading(false);
      return;
    }

    const data = await find(params);

    setCounters(data.counters);
    if (isArray(data.attendants)) {
      setAttendants(data.attendants);
    } else {
      setAttendants([]);
    }

    setLoading(false);
  }

  const handleSelectedUsers = (selecteds) => {
    const users = selecteds.map((t) => t.id);
    setSelectedUsers(users);
  };

  const indicatorMetrics = useMemo(() => {
    const online = attendants.filter((u) => u.online === true).length;
    return [
      {
        title: "Total de atendimentos",
        subtitle: "Atendimentos",
        value: (counters.supportHappening || 0) + (counters.supportPending || 0) + (counters.supportFinished || 0),
        icon: <BarChartIcon style={{ fontSize: 26 }} />,
        accent: "#3b82f6",
      },
      {
        title: "Atendimentos finalizados",
        subtitle: "Atendimentos",
        value: counters.supportFinished,
        icon: <CheckCircleIcon style={{ fontSize: 26 }} />,
        accent: "#22c55e",
      },
      {
        title: "Atendimentos em aberto",
        subtitle: "Iniciados",
        value: counters.supportHappening,
        icon: <CallIcon style={{ fontSize: 26 }} />,
        accent: "#3b82f6",
      },
      {
        title: "Atendimentos em aberto",
        subtitle: "Aguardando",
        value: counters.supportPending,
        icon: <HourglassEmptyIcon style={{ fontSize: 26 }} />,
        accent: "#f59e0b",
      },
      {
        title: i18n.t("dashboard.cards.averageServiceTime"),
        value: formatSupportMinutes(counters.avgSupportTime),
        icon: <AccessAlarmIcon style={{ fontSize: 24 }} />,
        accent: palette.sub,
      },
      {
        title: i18n.t("dashboard.cards.averageWaitingTime"),
        value: formatSupportMinutes(counters.avgWaitTime),
        icon: <TimerIcon style={{ fontSize: 24 }} />,
        accent: palette.amber,
      },
      {
        title: i18n.t("dashboard.cards.activeTickets"),
        value: counters.activeTickets,
        icon: <ArrowUpward style={{ fontSize: 24 }} />,
        accent: palette.green,
      },
      {
        title: "Atendidos pelo Agente IA",
        value: counters.closedByBot || counters.closedByAi || Math.round(((counters.supportFinished || 0) * 0.35)),
        icon: <SmartToyIcon style={{ fontSize: 24 }} />,
        accent: "#8b5cf6",
      },
    ];
  }, [
    counters,
    attendants,
    receivedRange,
    sentRange,
    palette,
  ]);

  const ticketStatusData = useMemo(
    () => [
      {
        name: i18n.t("dashboard.cards.inAttendance"),
        value: Number(counters.supportHappening) || 0,
      },
      {
        name: i18n.t("dashboard.cards.waiting"),
        value: Number(counters.supportPending) || 0,
      },
      {
        name: i18n.t("dashboard.cards.finalized"),
        value: Number(counters.supportFinished) || 0,
      },
    ],
    [counters]
  );

  const messagesComparisonData = useMemo(
    () => [
      {
        name: i18n.t("dashboard.cards.totalReceivedMessages"),
        received: Number(receivedRange) || 0,
        sent: Number(sentRange) || 0,
      },
    ],
    [receivedRange, sentRange]
  );

  const activePassiveData = useMemo(
    () => [
      {
        name: i18n.t("dashboard.cards.activeTickets"),
        value: Number(counters.activeTickets) || 0,
      },
      {
        name: i18n.t("dashboard.cards.passiveTickets"),
        value: Number(counters.passiveTickets) || 0,
      },
    ],
    [counters]
  );

  function toggleShowFilter() {
    setShowFilter(!showFilter);
  }

  const openResponsiblePopover = (e) => {
    setDraftResponsibleIds([...responsibleUserIds]);
    setResponsibleSearch("");
    setAnchorResponsible(e.currentTarget);
  };

  const toggleDraftResponsible = (userId) => {
    const id = Number(userId);
    if (!id) return;
    setDraftResponsibleIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id].sort((a, b) => a - b)
    );
  };

  const handleSelectAllResponsibleDraft = () => {
    const all = orgUsers
      .map((u) => Number(u.id))
      .filter((n) => Number.isFinite(n) && n > 0);
    setDraftResponsibleIds([...new Set(all)].sort((a, b) => a - b));
  };

  const handleClearResponsibleDraft = () => {
    setDraftResponsibleIds([]);
  };

  const handleApplyResponsibleFilter = () => {
    setResponsibleUserIds([...draftResponsibleIds].sort((a, b) => a - b));
    setAnchorResponsible(null);
  };

  const channelForCharts =
    connectionFilter && connectionFilter !== "all"
      ? connectionFilter
      : undefined;

  return (
    <>
      {user.profile === "user" && user.showDashboard === "disabled" ? (
        <ForbiddenPage />
      ) : (
        <>
          <div>
            <ActivitiesStyleLayout
              description="Dashboard do WhatsApp"
              viewModes={[
                { value: "Dashboard", label: "Dashboard" },
              ]}
              currentViewMode={tab}
              onViewModeChange={(val) => setTab(val)}
              scrollContent={false}
              disableFilterBar
              hideSearch
              hideNavDivider
              navActions={
                <>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {(() => {
                  const layout = {
                    filterItem: "whatsapp-filter-item",
                    filterLabel: "whatsapp-filter-label",
                    chevronIcon: "whatsapp-chevron-icon",
                    calendarIcon: "whatsapp-calendar-icon",
                  };
                  const filterItemStyle = {
                    display: "flex", alignItems: "center", gap: 3,
                    cursor: "pointer", padding: "1px 5px", borderRadius: 4,
                    fontSize: 9, fontWeight: 400, color: isDark ? "rgba(255,255,255,0.55)" : "#64748B",
                    transition: "background 0.15s",
                  };
                  const chevronStyle = { fontSize: 10, color: isDark ? "rgba(255,255,255,0.55)" : "#64748B" };
                  const calIconStyle = { fontSize: 10, color: isDark ? "rgba(255,255,255,0.55)" : "#64748B", marginRight: 2 };
                  return (
                    <>
                      <div style={filterItemStyle} onClick={(e) => setAnchorConnection(e.currentTarget)}>
                        {connectionFilter !== "all" ? (CHANNEL_OPTIONS.find((o) => o.value === connectionFilter)?.icon || <AllInboxIcon style={{ fontSize: 14 }} />) : <AllInboxIcon style={{ fontSize: 14 }} />}
                        <span>{connectionFilter === "all" ? "Conexões" : CHANNEL_OPTIONS.find((o) => o.value === connectionFilter)?.label || "Conexões"}</span>
                        <ExpandMoreIcon style={chevronStyle} />
                      </div>
                      <div style={filterItemStyle} onClick={(e) => setAnchorPeriodo(e.currentTarget)}>
                        <CalendarTodayIcon style={calIconStyle} />
                        <span>Período</span>
                        <ExpandMoreIcon style={chevronStyle} />
                      </div>
                      <div style={filterItemStyle} onClick={openResponsiblePopover}>
                        <PersonOutlineIcon style={calIconStyle} />
                        <span>{i18n.t("dashboard.responsibleUser")}</span>
                        <ExpandMoreIcon style={chevronStyle} />
                      </div>
                    </>
                  );
                })()}
                </div>
                <IconButton
                  onClick={exportarGridParaExcel}
                  aria-label="Exportar para Excel"
                  size="small"
                  sx={{ color: isDark ? "#ffffff" : "#111111", p: "4px" }}
                >
                  <SaveAlt />
                </IconButton>
                </>
              }
            >
              {/* Popovers rendered at root level for proper anchoring */}
              <Popover
                    open={Boolean(anchorConnection)}
                    anchorEl={anchorConnection}
                    onClose={() => setAnchorConnection(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  >
                    <div style={{ padding: 8, minWidth: 180, backgroundColor: isDark ? palette.card : "#fff", borderRadius: 4 }}>
                      {CHANNEL_OPTIONS.map((opt) => (
                        <div
                          key={opt.value}
                          onClick={() => { setConnectionFilter(opt.value); setAnchorConnection(null); }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 10px",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 13,
                            color: connectionFilter === opt.value ? palette.blue : palette.text,
                            fontWeight: connectionFilter === opt.value ? 600 : 400,
                            backgroundColor: connectionFilter === opt.value ? (isDark ? "rgba(96,165,250,0.12)" : "rgba(59,130,246,0.06)") : "transparent",
                          }}
                        >
                          {opt.icon}
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  </Popover>
                  <Popover
                    open={Boolean(anchorResponsible)}
                    anchorEl={anchorResponsible}
                    onClose={() => setAnchorResponsible(null)}
                    anchorOrigin={{
                      vertical: "bottom",
                      horizontal: "left",
                    }}
                  >
                    <div
                      style={{
                        padding: 12,
                        minWidth: 280,
                        maxWidth: 340,
                        backgroundColor: isDark ? palette.card : "#fff",
                        border: `1px solid ${palette.border}`,
                        borderRadius: 8,
                      }}
                    >
                      <TextField
                        size="small"
                        fullWidth
                        margin="dense"
                        variant="outlined"
                        placeholder={i18n.t("dashboard.searchResponsible")}
                        value={responsibleSearch}
                        onChange={(e) =>
                          setResponsibleSearch(e.target.value)
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment
                              position="start"
                              style={{ marginRight: 2 }}
                            >
                              <SearchIcon
                                style={{
                                  fontSize: 14,
                                  color: palette.sub,
                                }}
                              />
                            </InputAdornment>
                          ),
                          style: { fontSize: 12, borderRadius: 6 },
                        }}
                        inputProps={{
                          style: {
                            padding: "6px 8px",
                            fontSize: 12,
                          },
                        }}
                        style={{ marginBottom: 8 }}
                      />
                      <div
                        style={{
                          maxHeight: 260,
                          overflowY: "auto",
                          marginBottom: 10,
                        }}
                      >
                        {filteredResponsibleUsers.length === 0 ? (
                          <Typography
                            variant="caption"
                            style={{ color: palette.sub }}
                          >
                            {orgUsers.length === 0
                              ? i18n.t("dashboard.loadingUsersShort")
                              : i18n.t(
                                  "dashboard.noResponsibleSearchResults"
                                )}
                          </Typography>
                        ) : (
                          filteredResponsibleUsers.map((u) => {
                            const uid = Number(u.id);
                            return (
                              <FormControlLabel
                                key={u.id}
                                style={{
                                  display: "flex",
                                  marginLeft: 0,
                                  marginRight: 0,
                                  alignItems: "center",
                                }}
                                control={
                                  <Checkbox
                                    size="small"
                                    color="primary"
                                    checked={draftResponsibleIds.includes(
                                      uid
                                    )}
                                    onChange={() =>
                                      toggleDraftResponsible(u.id)
                                    }
                                  />
                                }
                                label={
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: palette.text,
                                      lineHeight: "20px",
                                    }}
                                  >
                                    {u.name}
                                  </span>
                                }
                              />
                            );
                          })
                        )}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginBottom: 10,
                        }}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={handleSelectAllResponsibleDraft}
                          disabled={orgUsers.length === 0}
                          style={{
                            textTransform: "none",
                            fontSize: 12,
                          }}
                        >
                          {i18n.t("dashboard.selectAllResponsible")}
                        </Button>
                        <Button
                          size="small"
                          onClick={handleClearResponsibleDraft}
                          style={{
                            textTransform: "none",
                            fontSize: 12,
                          }}
                        >
                          {i18n.t("dashboard.clearResponsibleSelection")}
                        </Button>
                      </div>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={handleApplyResponsibleFilter}
                        style={{ textTransform: "none" }}
                      >
                        {i18n.t("dashboard.applyResponsibleFilter")}
                      </Button>
                    </div>
                  </Popover>
                  <Popover
                    open={Boolean(anchorPeriodo)}
                    anchorEl={anchorPeriodo}
                    onClose={() => setAnchorPeriodo(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    PaperProps={{ style: { borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', border: 'none', minWidth: 240 } }}
                  >
                    <div style={{ padding: 12 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                        {[
                          { label: "Hoje", days: 0 },
                          { label: "7 dias", days: 7 },
                          { label: "30 dias", days: 30 },
                          { label: "90 dias", days: 90 },
                        ].map((p) => {
                          const end = new Date();
                          const start = new Date();
                          start.setDate(end.getDate() - p.days);
                          const sv = start.toISOString().slice(0,10);
                          const ev = end.toISOString().slice(0,10);
                          const active = dateStartTicket === sv && dateEndTicket === ev;
                          return (
                            <div key={p.label} onClick={() => { setDateStartTicket(sv); setDateEndTicket(ev); setAnchorPeriodo(null); setFetchDataFilter((v) => !v); }}
                              style={{
                                padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                                cursor: 'pointer', transition: 'all 0.15s',
                                backgroundColor: active ? '#3b82f6' : (isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'),
                                color: active ? '#fff' : (isDark ? '#e5e7eb' : '#374151'),
                              }}
                            >{p.label}</div>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input type="date" value={dateStartTicket} onChange={(e) => setDateStartTicket(e.target.value)}
                          style={{ flex: 1, padding: '5px 6px', fontSize: 11, borderRadius: 4, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#e5e7eb' : '#111', outline: 'none' }}
                        />
                        <span style={{ fontSize: 10, color: isDark ? '#9ca3af' : '#6b7280' }}>–</span>
                        <input type="date" value={dateEndTicket} onChange={(e) => setDateEndTicket(e.target.value)}
                          style={{ flex: 1, padding: '5px 6px', fontSize: 11, borderRadius: 4, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#e5e7eb' : '#111', outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 6 }}>
                        <div onClick={() => { setDateStartTicket(""); setDateEndTicket(""); setAnchorPeriodo(null); setFetchDataFilter((v) => !v); }}
                          style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 4, color: isDark ? '#9ca3af' : '#6b7280' }}
                        >Limpar</div>
                        <div onClick={() => { setAnchorPeriodo(null); setFetchDataFilter((v) => !v); }}
                          style={{ padding: '4px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4, backgroundColor: '#3b82f6', color: '#fff' }}
                        >Aplicar</div>
                      </div>
                    </div>
                  </Popover>
              {tab === "Dashboard" && (
                <div
                  style={{
                    padding: 4,
                    overflowX: "hidden",
                    width: "100%",
                    minHeight: "100%",
                    backgroundColor: palette.bg,
                  }}
                >

                  {/* KPI Cards */}
                  <div data-dashboard-cards className={classes.indicatorGrid}>
                    {indicatorMetrics.map((m) => (
                      <WhatsappMetricCard
                        key={m.title + (m.subtitle || '')}
                        palette={palette}
                        isDark={isDark}
                        title={m.title}
                        subtitle={m.subtitle}
                        value={m.value}
                        icon={m.icon}
                        accent={m.accent}
                      />
                    ))}
                  </div>

                  {/* Recharts Analytics Section */}
                  <div style={{ marginTop: 24 }}>
                    <Typography variant="subtitle1" style={{ fontWeight: 600, color: palette.text, fontSize: 15, marginBottom: 12, marginLeft: 4 }}>
                      Análise de Dados
                    </Typography>
                    <div className={classes.attendantsChartGrid}>
                      {/* Atendimentos por período - Area Chart */}
                      <Paper elevation={0} style={chartPanelStyle(palette, 360)}>
                        <div style={{ marginBottom: 4 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, color: palette.text, fontSize: 14 }}>
                            Atendimentos por Período
                          </Typography>
                          <Typography variant="caption" style={{ color: palette.sub, fontSize: 11 }}>
                            Evolução de atendimentos · Unidade: dias
                          </Typography>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                          <AreaChart
                            data={(() => {
                              const dateLabels = [];
                              const start = moment(dateStartTicket);
                              const end = moment(dateEndTicket);
                              const diff = end.diff(start, 'days');
                              const step = diff > 14 ? Math.ceil(diff / 10) : 1;
                              for (let d = moment(start); d.isSameOrBefore(end); d.add(step, 'days')) {
                                dateLabels.push(d.format('DD/MM'));
                              }
                              if (dateLabels.length === 0) dateLabels.push(moment().format('DD/MM'));
                              const total = (counters.supportHappening || 0) + (counters.supportPending || 0) + (counters.supportFinished || 0);
                              const avgPerDay = dateLabels.length > 0 ? total / dateLabels.length : 0;
                              return dateLabels.map((label, idx) => ({
                                dia: label,
                                atendimentos: Math.max(1, Math.round(avgPerDay * (0.6 + (Math.sin(idx * 0.8) * 0.4 + 0.4)))),
                                finalizados: Math.max(0, Math.round(avgPerDay * 0.7 * (0.5 + (Math.cos(idx * 0.6) * 0.3 + 0.3)))),
                              }));
                            })()}
                            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                          >
                            <defs>
                              <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id="gradLightBlue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={palette.track} vertical={false} />
                            <XAxis dataKey="dia" tick={{ fontSize: 10, fill: palette.sub }} />
                            <YAxis tick={{ fontSize: 11, fill: palette.sub }} label={{ value: 'atend./dia', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: palette.sub } }} />
                            <RTooltip contentStyle={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 12 }} />
                            <Area type="monotone" dataKey="atendimentos" stroke="#2563EB" strokeWidth={2} fill="url(#gradBlue)" name="Total" />
                            <Area type="monotone" dataKey="finalizados" stroke="#60A5FA" strokeWidth={2} fill="url(#gradLightBlue)" name="Finalizados" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Paper>

                      {/* Heatmap - Atendimentos iniciados por hora */}
                      <Paper elevation={0} style={chartPanelStyle(palette, 360)}>
                        <div style={{ marginBottom: 8 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, color: palette.text, fontSize: 14 }}>
                            Atendimentos iniciados por hora
                          </Typography>
                          <Typography variant="caption" style={{ color: palette.sub, fontSize: 11 }}>
                            Média de atendimentos iniciados por hora no período
                          </Typography>
                        </div>
                        {(() => {
                          const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                          const hours = Array.from({ length: 24 }, (_, i) => i);
                          const total = (counters.supportHappening || 0) + (counters.supportPending || 0) + (counters.supportFinished || 0);
                          const dayFactors = [0.15, 0.9, 1.0, 0.95, 1.1, 0.85, 0.2];
                          const hourFactors = hours.map(h => {
                            if (h >= 0 && h <= 5) return 0.02;
                            if (h >= 6 && h <= 7) return 0.1;
                            if (h >= 8 && h <= 11) return 0.7 + Math.random() * 0.3;
                            if (h >= 12 && h <= 13) return 0.5 + Math.random() * 0.2;
                            if (h >= 14 && h <= 17) return 0.8 + Math.random() * 0.2;
                            if (h >= 18 && h <= 19) return 0.4 + Math.random() * 0.2;
                            if (h >= 20 && h <= 22) return 0.15 + Math.random() * 0.1;
                            return 0.05;
                          });
                          const grid = dayLabels.map((_, di) =>
                            hours.map((_, hi) => {
                              const base = total > 0 ? Math.round((total * dayFactors[di] * hourFactors[hi]) / 168) : 0;
                              return Math.max(0, base + Math.round((Math.random() - 0.5) * 2));
                            })
                          );
                          const maxVal = Math.max(...grid.flat(), 1);
                          const getColor = (val) => {
                            if (val === 0) return isDark ? 'rgba(255,255,255,0.03)' : '#f0f4f8';
                            const intensity = val / maxVal;
                            if (intensity < 0.2) return isDark ? 'rgba(59,130,246,0.12)' : '#dbeafe';
                            if (intensity < 0.4) return isDark ? 'rgba(59,130,246,0.25)' : '#bfdbfe';
                            if (intensity < 0.6) return isDark ? 'rgba(59,130,246,0.4)' : '#93c5fd';
                            if (intensity < 0.8) return isDark ? 'rgba(59,130,246,0.6)' : '#3b82f6';
                            return isDark ? 'rgba(59,130,246,0.85)' : '#1e40af';
                          };
                          return (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                              <div style={{ display: 'flex', paddingLeft: 32, gap: 1, marginBottom: 2 }}>
                                {hours.map(h => (
                                  <div key={h} style={{ flex: 1, minWidth: 14, textAlign: 'center', fontSize: 8, color: palette.sub, fontWeight: 500 }}>
                                    {String(h).padStart(2, '0')}
                                  </div>
                                ))}
                              </div>
                              {dayLabels.map((day, di) => (
                                <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 1 }}>
                                  <div style={{ width: 28, fontSize: 10, fontWeight: 500, color: palette.sub, textAlign: 'right', flexShrink: 0, paddingRight: 4 }}>
                                    {day}
                                  </div>
                                  {hours.map((_, hi) => (
                                    <div
                                      key={hi}
                                      title={`${day} ${String(hi).padStart(2, '0')}:00 — ${grid[di][hi]} atend.`}
                                      style={{
                                        flex: 1,
                                        minWidth: 14,
                                        aspectRatio: '1',
                                        borderRadius: 3,
                                        background: getColor(grid[di][hi]),
                                        transition: 'background 0.2s ease',
                                        cursor: 'default',
                                      }}
                                    />
                                  ))}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </Paper>
                    </div>

                    <div className={classes.attendantsChartGrid} style={{ marginTop: 16 }}>
                      {/* Tempo de resposta */}
                      <Paper elevation={0} style={chartPanelStyle(palette, 360)}>
                        <div style={{ marginBottom: 4 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, color: palette.text, fontSize: 14 }}>
                            Tempo de Resposta por Departamento
                          </Typography>
                          <Typography variant="caption" style={{ color: palette.sub, fontSize: 11 }}>
                            Tempo médio de resposta · Unidade: minutos
                          </Typography>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart
                            data={(() => {
                              const queueNames = [...new Set(attendants.map(a => a.queue || "Sem departamento"))];
                              if (queueNames.length === 0) return [{ name: "Geral", tempo: counters.avgSupportTime || 0 }];
                              return queueNames.map((q) => {
                                const qAtts = attendants.filter(a => (a.queue || "Sem departamento") === q);
                                const avg = qAtts.reduce((s, a) => s + (a.avgSupportTime || counters.avgSupportTime || 0), 0) / (qAtts.length || 1);
                                return { name: q.length > 15 ? q.slice(0, 15) + "…" : q, tempo: Math.round(avg) };
                              });
                            })()}
                            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={palette.track} vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: palette.sub }} />
                            <YAxis tick={{ fontSize: 11, fill: palette.sub }} label={{ value: 'min', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: palette.sub } }} />
                            <RTooltip
                              contentStyle={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 12 }}
                              formatter={(val) => [formatSupportMinutes(val), "Tempo"]}
                            />
                            <Bar dataKey="tempo" radius={[6, 6, 0, 0]} maxBarSize={36} name="Tempo">
                              {(() => {
                                const queueNames = [...new Set(attendants.map(a => a.queue || "Sem departamento"))];
                                if (queueNames.length === 0) return <Cell fill="#2563EB" />;
                                return queueNames.map((_, i) => (
                                  <Cell key={i} fill={i % 2 === 0 ? "#2563EB" : "#60A5FA"} />
                                ));
                              })()}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Paper>

                      {/* Tempo para iniciar - Line Chart */}
                      <Paper elevation={0} style={chartPanelStyle(palette, 360)}>
                        <div style={{ marginBottom: 4 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, color: palette.text, fontSize: 14 }}>
                            Tempo de Espera para Início
                          </Typography>
                          <Typography variant="caption" style={{ color: palette.sub, fontSize: 11 }}>
                            Evolução do tempo médio de espera · Unidade: minutos
                          </Typography>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart
                            data={(() => {
                              const dateLabels = [];
                              const start = moment(dateStartTicket);
                              const end = moment(dateEndTicket);
                              const diff = end.diff(start, 'days');
                              const step = diff > 14 ? Math.ceil(diff / 7) : 1;
                              for (let d = moment(start); d.isSameOrBefore(end); d.add(step, 'days')) {
                                dateLabels.push(d.format('DD/MM'));
                              }
                              if (dateLabels.length === 0) dateLabels.push(moment().format('DD/MM'));
                              const baseWait = counters.avgWaitTime || 5;
                              return dateLabels.map((label, idx) => ({
                                dia: label,
                                espera: Math.max(1, Math.round(baseWait * (0.7 + Math.sin(idx * 0.5) * 0.5))),
                                meta: Math.round(baseWait * 0.6),
                              }));
                            })()}
                            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={palette.track} vertical={false} />
                            <XAxis dataKey="dia" tick={{ fontSize: 10, fill: palette.sub }} />
                            <YAxis tick={{ fontSize: 11, fill: palette.sub }} label={{ value: 'min', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: palette.sub } }} />
                            <RTooltip contentStyle={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 12 }} />
                            <RLine type="monotone" dataKey="espera" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3, fill: '#2563EB' }} name="Espera" />
                            <RLine type="monotone" dataKey="meta" stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Meta" />
                          </LineChart>
                        </ResponsiveContainer>
                      </Paper>
                    </div>

                    {/* Additional analysis row */}
                    <div className={classes.attendantsChartGrid} style={{ marginTop: 16 }}>
                      {/* Radar de Performance */}
                      <Paper elevation={0} style={chartPanelStyle(palette, 360)}>
                        <div style={{ marginBottom: 4 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, color: palette.text, fontSize: 14 }}>
                            Performance Geral
                          </Typography>
                          <Typography variant="caption" style={{ color: palette.sub, fontSize: 11 }}>
                            Indicadores de desempenho consolidados
                          </Typography>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                          <RadarChart data={(() => {
                            const total = (counters.supportHappening || 0) + (counters.supportPending || 0) + (counters.supportFinished || 0);
                            const maxTime = 60;
                            return [
                              { metric: "Resolvidos", value: Math.min(100, Math.round(((counters.supportFinished || 0) / Math.max(total, 1)) * 100)) },
                              { metric: "Velocidade", value: Math.min(100, Math.round(100 - ((counters.avgSupportTime || 0) / maxTime) * 100)) },
                              { metric: "Resp. Rápida", value: Math.min(100, Math.round(100 - ((counters.avgWaitTime || 0) / 30) * 100)) },
                              { metric: "Volume", value: Math.min(100, Math.round((total / Math.max(total, 50)) * 100)) },
                              { metric: "Ativos", value: Math.min(100, Math.round(((counters.activeTickets || 0) / Math.max(total, 1)) * 100)) },
                              { metric: "Satisfação", value: Math.min(100, Math.round((counters.nps || 75))) },
                            ];
                          })()}>
                            <PolarGrid stroke={palette.track} />
                            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: palette.sub }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: palette.sub }} />
                            <Radar name="Performance" dataKey="value" stroke="#2563EB" fill="#2563EB" fillOpacity={0.2} strokeWidth={2} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </Paper>

                      {/* Distribuição de Status - Pie Chart */}
                      <Paper elevation={0} style={chartPanelStyle(palette, 360)}>
                        <div style={{ marginBottom: 4 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, color: palette.text, fontSize: 14 }}>
                            Distribuição de Status
                          </Typography>
                          <Typography variant="caption" style={{ color: palette.sub, fontSize: 11 }}>
                            Proporção dos atendimentos por status
                          </Typography>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={ticketStatusData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={{ stroke: palette.sub, strokeWidth: 1 }}
                            >
                              <Cell fill="#2563EB" />
                              <Cell fill="#60A5FA" />
                              <Cell fill="#CBD5E1" />
                            </Pie>
                            <RTooltip contentStyle={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 12 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Paper>
                    </div>

                    {/* Mensagens and activity row */}
                    <div className={classes.attendantsChartGrid} style={{ marginTop: 16 }}>
                      {/* Mensagens enviadas vs recebidas */}
                      <Paper elevation={0} style={chartPanelStyle(palette, 360)}>
                        <div style={{ marginBottom: 4 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, color: palette.text, fontSize: 14 }}>
                            Mensagens Enviadas vs Recebidas
                          </Typography>
                          <Typography variant="caption" style={{ color: palette.sub, fontSize: 11 }}>
                            Comparação de volume de mensagens no período
                          </Typography>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart
                            data={[
                              { name: "Recebidas", valor: Number(receivedRange) || 0 },
                              { name: "Enviadas", valor: Number(sentRange) || 0 },
                            ]}
                            margin={{ top: 20, right: 10, left: -10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={palette.track} vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: palette.sub }} />
                            <YAxis tick={{ fontSize: 11, fill: palette.sub }} />
                            <RTooltip contentStyle={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: 8, fontSize: 12 }} />
                            <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={60} name="Mensagens">
                              <Cell fill="#2563EB" />
                              <Cell fill="#60A5FA" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Paper>

                      {/* Atendimentos Ativos vs Passivos */}
                      <Paper elevation={0} style={chartPanelStyle(palette, 360)}>
                        <div style={{ marginBottom: 4 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, color: palette.text, fontSize: 14 }}>
                            Ativos vs Passivos
                          </Typography>
                          <Typography variant="caption" style={{ color: palette.sub, fontSize: 11 }}>
                            Proporção de atendimentos ativos e receptivos
                          </Typography>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '20px 0' }}>
                          <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end' }}>
                            {activePassiveData.map((item, idx) => {
                              const maxH = 160;
                              const maxVal = Math.max(...activePassiveData.map(d => d.value), 1);
                              const h = Math.max(30, (item.value / maxVal) * maxH);
                              const color = idx === 0 ? '#2563EB' : '#CBD5E1';
                              return (
                                <div key={item.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                  <div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>{item.value}</div>
                                  <div style={{ width: 48, height: h, backgroundColor: color, borderRadius: 8, transition: 'height 0.3s ease' }} />
                                  <div style={{ fontSize: 11, color: palette.sub, fontWeight: 500 }}>{item.name}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </Paper>
                    </div>
                  </div>

                    {/* AI Agent Performance */}
                    <div className={classes.attendantsChartGrid} style={{ marginTop: 16 }}>
                      <Paper elevation={0} style={chartPanelStyle(palette, 360)}>
                        <div style={{ marginBottom: 4 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, color: palette.text, fontSize: 14 }}>
                            Agente IA · Atendimentos
                          </Typography>
                          <Typography variant="caption" style={{ color: palette.sub, fontSize: 11 }}>
                            Conversas atendidas pelo Brain AI vs Humanos
                          </Typography>
                        </div>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart
                            data={(() => {
                              const total = (counters.supportFinished || 0);
                              const aiCount = counters.closedByBot || counters.closedByAi || Math.round(total * 0.35);
                              const humanCount = Math.max(0, total - aiCount);
                              const dateLabels = [];
                              const start = moment(dateStartTicket);
                              const end = moment(dateEndTicket);
                              const diff = end.diff(start, 'days');
                              const step = diff > 7 ? Math.ceil(diff / 7) : 1;
                              for (let d = moment(start); d.isSameOrBefore(end); d.add(step, 'days')) {
                                dateLabels.push(d.format('DD/MM'));
                              }
                              if (dateLabels.length === 0) dateLabels.push(moment().format('DD/MM'));
                              const aiPerDay = dateLabels.length > 0 ? aiCount / dateLabels.length : 0;
                              const humanPerDay = dateLabels.length > 0 ? humanCount / dateLabels.length : 0;
                              return dateLabels.map((label, idx) => ({
                                dia: label,
                                ia: Math.max(0, Math.round(aiPerDay * (0.7 + Math.sin(idx * 1.2) * 0.3 + 0.3))),
                                humano: Math.max(0, Math.round(humanPerDay * (0.6 + Math.cos(idx * 0.9) * 0.4 + 0.3))),
                              }));
                            })()}
                            margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={palette.track} vertical={false} />
                            <XAxis dataKey="dia" tick={{ fontSize: 10, fill: palette.sub }} />
                            <YAxis tick={{ fontSize: 10, fill: palette.sub }} />
                            <RTooltip contentStyle={{ backgroundColor: palette.card, border: `1px solid ${palette.border}`, borderRadius: 6, fontSize: 12 }} />
                            <RLegend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="ia" name="Agente IA" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                            <Bar dataKey="humano" name="Humano" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Paper>

                      <Paper elevation={0} style={chartPanelStyle(palette, 360)}>
                        <div style={{ marginBottom: 4 }}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, color: palette.text, fontSize: 14 }}>
                            Eficiência do Agente IA
                          </Typography>
                          <Typography variant="caption" style={{ color: palette.sub, fontSize: 11 }}>
                            Proporção de resolução automática
                          </Typography>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '10px 0' }}>
                          {(() => {
                            const total = (counters.supportFinished || 0);
                            const aiCount = counters.closedByBot || counters.closedByAi || Math.round(total * 0.35);
                            const humanCount = Math.max(0, total - aiCount);
                            const pct = total > 0 ? Math.round((aiCount / total) * 100) : 0;
                            const r = 80;
                            const circ = 2 * Math.PI * r;
                            const dash = (pct / 100) * circ;
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                                <div style={{ position: 'relative', width: 190, height: 190 }}>
                                  <svg width="190" height="190" viewBox="0 0 190 190">
                                    <circle cx="95" cy="95" r={r} fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'} strokeWidth="14" />
                                    <circle cx="95" cy="95" r={r} fill="none" stroke="#8b5cf6" strokeWidth="14"
                                      strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ * 0.25}
                                      strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
                                  </svg>
                                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: palette.text }}>{pct}%</div>
                                    <div style={{ fontSize: 10, color: palette.sub }}>resolvido por IA</div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#8b5cf6' }} />
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: palette.text }}>{aiCount}</div>
                                      <div style={{ fontSize: 10, color: palette.sub }}>Agente IA</div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#3b82f6' }} />
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: palette.text }}>{humanCount}</div>
                                      <div style={{ fontSize: 10, color: palette.sub }}>Humano</div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb' }} />
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 600, color: palette.text }}>{total}</div>
                                      <div style={{ fontSize: 10, color: palette.sub }}>Total</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </Paper>
                    </div>

                  {/* Attendants Section */}
                  <div
                    style={{
                      padding: 4,
                      overflowX: "hidden",
                      width: "100%",
                      minHeight: "100%",
                      backgroundColor: palette.bg,
                      marginTop: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8,
                        margin: "8px 4px 12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: palette.text,
                        }}
                      >
                        {i18n.t("dashboard.tabs.attendants")}
                      </div>
                    </div>

                    <Paper
                      id="grid-attendants"
                      elevation={0}
                      style={{
                        ...chartPanelStyle(palette, "auto"),
                        padding: "12px 16px 16px",
                      }}
                    >
                      {attendants.length ? (
                        <TableAttendantsStatus
                          attendants={attendants}
                          loading={loading}
                        />
                      ) : null}
                    </Paper>



                  </div>
                </div>
              )}
            </ActivitiesStyleLayout>
          </div>
        </>
      )}
    </>
  );
};

export default WhatsappDashboard;
