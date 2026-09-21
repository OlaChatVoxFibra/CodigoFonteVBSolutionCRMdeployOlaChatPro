/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// Re-saved
import React, { useState, useEffect, useMemo, useRef } from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
  List as ListIcon,
  CalendarToday as CalendarIcon,
  ViewWeek as KanbanIcon,
  Dashboard as DashboardIcon,
  Close as CloseIcon,
  Fullscreen as FullscreenIcon, // Mantendo import original se precisar reverter
  FullscreenExit as FullscreenExitIcon,
  Settings as SettingsIcon,
  ZoomOutMap as ZoomOutMapIcon,
  ExpandMore as ExpandMoreIcon,
  EventNote as EventNoteIcon
} from "@material-ui/icons";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Popover,
  Grid
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import api from "../../services/api";

import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import "../Schedules/Schedules.css";
import "moment/locale/pt-br";

import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import KanbanBoard from "../../components/KanbanBoard";
import ActivityDetailsModal from "../../components/ActivityDetailsModal";
import CreateActivityModal from "../../components/CreateActivityModal";
import ConfigureKanbanModal from "../../components/ConfigureKanbanModal";
import useActivities from "../../hooks/useActivities";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import activitiesService from "../../services/activitiesService";
import activityStagesService from "../../services/activityStagesService";
import convertedLeadsService from "../../services/convertedLeadsService";

// Charts (igual ao Dashboard de Leads/Vendas)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import InsertChartOutlinedIcon from "@material-ui/icons/InsertChartOutlined";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import ScheduleIcon from "@material-ui/icons/Schedule";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

const localizer = momentLocalizer(moment);

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
    height: "100%",
    overflow: "hidden",
  },
  dashboardCard: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing(2),
  },
  cardValue: {
    fontSize: "2rem",
    fontWeight: "bold",
    color: theme.palette.primary.main,
  },
  cardLabel: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1),
  },
}));
// Helpers
const formatDate = (value) => {
  if (!value) return '';
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return String(value);
  }
};

const mapTypeLabel = (type) => {
  const t = String(type || '').toLowerCase();
  if (t === 'task') return 'Tarefa';
  if (t === 'call') return 'Ligação';
  if (t === 'email') return 'E-mail';
  if (t === 'meeting') return 'Reunião';
  return type || '';
};

const mapStatusLabel = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'in_progress') return 'Em progresso';
  if (s === 'pending') return 'Pendente';
  if (s === 'completed') return 'Concluído';
  if (s === 'backlog') return 'Backlog';
  return status || '';
};

const defaultActivityStages = [
  { key: 'backlog', label: 'Backlog', color: '#4B5563' },
  { key: 'pending', label: 'Pendente', color: '#4B5563' },
  { key: 'in_progress', label: 'Em Progresso', color: '#F97316' },
  { key: 'completed', label: 'Concluído', color: '#10B981' }
];

// Sub-component for List View
const ActivitiesList = ({ activities }) => {
  return (
    <TableContainer component={Paper} style={{ height: '100%', overflow: 'auto' }}>
      <Table stickyHeader aria-label="activities table">
        <TableHead>
          <TableRow>
            <TableCell>Título</TableCell>
            <TableCell>CRM</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Data</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {activities.length > 0 ? (
            activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell component="th" scope="row">
                  {activity.title}
                </TableCell>
                <TableCell>
                  
                </TableCell>
                <TableCell>{mapTypeLabel(activity.type)}</TableCell>
                <TableCell>{formatDate(activity.date)}</TableCell>
                <TableCell>
                  <Chip 
                    label={mapStatusLabel(activity.status)} 
                    size="small" 
                    color={String(activity.status).toLowerCase() === 'completed' ? 'primary' : 'default'} 
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">
                Nenhuma atividade encontrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Sub-component for Calendar View – layout equivalente a /schedules
const ActivitiesCalendar = ({ activities, onCreate }) => {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const calPaperBg =
    theme.palette.type === "dark"
      ? theme.palette.dashboardCard || "#353538"
      : undefined;
  const MiniMonth = ({ value, onChange }) => {
    const m = moment(value);
    const start = m.clone().startOf("month").startOf("week");
    const end = m.clone().endOf("month").endOf("week");
    const day = start.clone().subtract(1, "day");
    const days = [];
    while (day.isBefore(end, "day")) days.push(day.add(1, "day").clone());
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return (
      <div className="mini-cal">
        <div className="mini-cal-grid">
          {["D","S","T","Q","Q","S","S"].map((d,i) => <div key={i} className="mini-cal-header">{d}</div>)}
          {weeks.flat().map((d, idx) => {
            const isCurrentMonth = d.month() === m.month();
            const isToday = d.isSame(moment(), "day");
            const isSelected = d.isSame(m, "day");
            const cls = ["mini-cal-day", !isCurrentMonth ? "mini-cal-off" : "", isToday ? "mini-cal-today" : "", isSelected ? "mini-cal-selected" : ""].join(" ");
            return <button key={idx} type="button" className={cls} onClick={() => onChange(d.toDate())}>{d.date()}</button>;
          })}
        </div>
      </div>
    );
  };
  const CustomToolbar = (toolbarProps) => {
    const setView = (v) => toolbarProps.onView(v);
    const goToday = () => toolbarProps.onNavigate("TODAY");
    const goPrev = () => toolbarProps.onNavigate("PREV");
    const goNext = () => toolbarProps.onNavigate("NEXT");
    const monthRaw = moment(toolbarProps.date).format("MMMM, YYYY");
    const label = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
    return (
      <div className="rbc-toolbar">
        <span className="rbc-btn-group">
          <button type="button" className="btn-naked" onClick={goToday}>Hoje</button>
        </span>
        <span className="rbc-toolbar-label">
          <button type="button" className="btn-naked chevron" onClick={goPrev}>‹</button>
          <span className="month-label">{label}</span>
          <button type="button" className="btn-naked chevron" onClick={goNext}>›</button>
        </span>
        <span className="rbc-btn-group">
          <button type="button" className={`btn-naked ${toolbarProps.view === "day" ? "active" : ""}`} onClick={() => setView("day")}>Dia</button>
          <button type="button" className={`btn-naked ${toolbarProps.view === "week" ? "active" : ""}`} onClick={() => setView("week")}>Semana</button>
          <button type="button" className={`btn-naked ${toolbarProps.view === "month" ? "active" : ""}`} onClick={() => setView("month")}>Mês</button>
        </span>
      </div>
    );
  };
  const events = useMemo(() => {
    return activities.map(a => ({
      title: a.title,
      start: new Date(a.date),
      end: new Date(a.dateEnd || a.date),
      allDay: true,
      resource: a
    }));
  }, [activities]);
  const eventPropGetter = (event) => {
    const now = new Date();
    const start = new Date(event.start);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const isPast = eventDate < today;
    const isToday = eventDate.getTime() === today.getTime();
    const status = String(event.resource.status || "").toLowerCase();
    let style = { backgroundColor: "#DBEAFE", border: "1px solid #BFDBFE", color: "#1E40AF", borderRadius: 10, padding: "6px 8px", fontSize: 12 };
    if (status === "completed" || status === "concluído") style = { backgroundColor: "#D1FAE5", border: "1px solid #A7F3D0", color: "#065F46", borderRadius: 10, padding: "6px 8px", fontSize: 12 };
    else if (isPast) style = { backgroundColor: "#FEE2E2", border: "1px solid #FCA5A5", color: "#991B1B", borderRadius: 10, padding: "6px 8px", fontSize: 12 };
    else if (isToday) style = { backgroundColor: "#FEF3C7", border: "1px solid #FDE68A", color: "#92400E", borderRadius: 10, padding: "6px 8px", fontSize: 12 };
    return { style };
  };
  const total = activities.length;
  const conclu = activities.filter(a => String(a.status).toLowerCase() === "completed").length;
  return (
    <div
      className="schedules-page"
      data-theme={theme.palette.type}
      style={{ paddingTop: 8, maxWidth: "100%", boxSizing: "border-box" }}
    >
      <Grid container spacing={2} style={{ margin: 0, maxWidth: "100%" }}>
        <Grid item xs={12} md={9} lg={9} style={{ minWidth: 0 }}>
          <Paper style={{ padding: 8, backgroundColor: calPaperBg }}>
            <Calendar
              localizer={localizer}
              components={{ toolbar: CustomToolbar }}
              views={["day","week","month"]}
              events={events}
              startAccessor="start"
              endAccessor="end"
              eventPropGetter={eventPropGetter}
              selectable
              onSelectSlot={(slot) => {
                setSelectedDate(slot.start);
                onCreate && onCreate();
              }}
              style={{ height: "calc(100vh - 160px)" }}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={3} lg={3}>
          <div className="right-aside">
            <div className="aside-top-actions">
              <button className="aside-action" onClick={onCreate}>Criar Atividade</button>
            </div>
            <Paper className="aside-card mini-calendar-card" variant="outlined">
              <div className="aside-header">
                <Typography className="aside-month" variant="body2">
                  {moment(selectedDate).format("MMMM, YYYY")}
                </Typography>
              </div>
              <div className="aside-body">
                <MiniMonth value={selectedDate} onChange={setSelectedDate} />
              </div>
            </Paper>
            <Paper className="aside-card activity-card" variant="outlined">
              <div className="aside-header">
                <Typography className="aside-title" variant="body2">Atividade</Typography>
              </div>
              {(() => {
                const recent = [...activities].sort((a,b) => new Date(b.date) - new Date(a.date))[0];
                return (
                  <div className="activity-item">
                    <div className="activity-icon"><EventNoteIcon style={{ fontSize: 18 }} /></div>
                    <div className="activity-info">
                      <div className="activity-title">{recent?.title || "—"}</div>
                      <div className="activity-sub">{recent?.type || "—"}</div>
                    </div>
                    <div className="activity-time">{recent ? moment(recent.date).format("HH:mm") : "—"}</div>
                  </div>
                );
              })()}
              <div className="donut-center" style={{ position: "static", transform: "none", textAlign: "left" }}>
                <div className="donut-total" style={{ fontSize: 24 }}>{total}</div>
                <div className="donut-label">Total</div>
                <div className="donut-label">Concluídas: {conclu}</div>
              </div>
            </Paper>
          </div>
        </Grid>
      </Grid>
    </div>
  );
};

const Activities = () => {
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const classes = useStyles();
  const [viewMode, setViewMode] = useState("board");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [selectedResponsible, setSelectedResponsible] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [anchorResp, setAnchorResp] = useState(null);
  const [anchorEmpresa, setAnchorEmpresa] = useState(null);
  const [anchorPeriodo, setAnchorPeriodo] = useState(null);
  const [anchorTodos, setAnchorTodos] = useState(null);
  const [activitiesState, setActivitiesState] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityToEdit, setActivityToEdit] = useState(null);
  const kanbanRef = useRef(null);
  const [activityStagesState, setActivityStagesState] = useState([]);
  const [stagesDrawerOpen, setStagesDrawerOpen] = useState(false);
  const [localStages, setLocalStages] = useState([]);
  const [hoveredKpi, setHoveredKpi] = useState(null);
  
  // Use existing hook
  const { activities, loading, count, hasMore } = useActivities({
    searchParam,
    pageNumber,
    dateStart,
    dateEnd,
    refreshSignal: 0
  });

  useEffect(() => {
    async function fetchFilters() {
      try {
        const resp = await convertedLeadsService.list({ searchParam: "", pageNumber: 1 });
        const list = (resp && resp.leads) ? resp.leads : [];
        setContactsList(list);
        const { data: usersResp } = await api.get("/users", { params: { searchParam: "" } });
        setUsersList(usersResp?.users || []);
      } catch (err) {
        // ignore
      }
    }
    fetchFilters();
  }, []);

  useEffect(() => {
    setActivitiesState(activities);
  }, [activities]);

  const handleSearch = (value) => {
    setSearchParam(value);
  };

  const handleCreateActivity = () => {
    setActivityToEdit(null);
    setDrawerOpen(true);
  };

  const viewModes = [
    { value: "board", label: "Quadro", icon: <KanbanIcon /> },
    { value: "list", label: "Lista", icon: <ListIcon /> },
    { value: "calendar", label: "Calendário", icon: <CalendarIcon /> },
    { value: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  ];

  // Filters placeholder
  const filters = [
    {
      label: "Status",
      value: statusFilter,
      options: [
        { value: "pending", label: "Pendente" },
        { value: "in_progress", label: "Em Progresso" },
        { value: "completed", label: "Concluído" },
      ],
      onChange: (val) => setStatusFilter(val)
    }
  ];

  const filteredActivities = useMemo(() => {
    let base = activitiesState.filter(a => String(a.type || "").toLowerCase() !== "event");
    if (statusFilter) {
      base = base.filter((activity) => String(activity.status || "") === statusFilter);
    }
    if (selectedResponsible && (selectedResponsible.id || selectedResponsible.name)) {
      const idVal = selectedResponsible.id ? String(selectedResponsible.id) : null;
      const nameVal = selectedResponsible.name ? String(selectedResponsible.name).toLowerCase() : null;
      base = base.filter(a => {
        const idMatch = idVal ? String(a.userId || "") === idVal : false;
        const nameMatch = nameVal ? String(a.owner || "").toLowerCase().includes(nameVal) : false;
        return idMatch || nameMatch;
      });
    }
    // Empresa: filtra por correspondência de ID ou nome em campos conhecidos
    if (selectedCompany && (selectedCompany.id || selectedCompany.name)) {
      const cid = selectedCompany.id ? String(selectedCompany.id) : null;
      const cname = String(selectedCompany.name || "").toLowerCase().trim();
      base = base.filter(a => {
        const compId = a?.companyId || a?.company?.id || a?.project?.company?.id;
        const compName = (a?.company?.name || a?.project?.company?.name || a?.project?.name || a?.title || a?.description || "").toLowerCase();
        const byId = cid ? String(compId || "") === cid : false;
        const byName = cname ? compName.includes(cname) : false;
        return byId || byName;
      });
    }
    // Período: usa a data principal da atividade (date) com fallback para createdAt/updatedAt
    const startOk = (d) => {
      if (!dateStart) return true;
      try {
        const cmp = new Date(dateStart); cmp.setHours(0,0,0,0);
        const dt = new Date(d); return dt >= cmp;
      } catch { return true; }
    };
    const endOk = (d) => {
      if (!dateEnd) return true;
      try {
        const cmp = new Date(dateEnd); cmp.setHours(23,59,59,999);
        const dt = new Date(d); return dt <= cmp;
      } catch { return true; }
    };
    if (dateStart || dateEnd) {
      base = base.filter(a => {
        const when = a?.date || a?.createdAt || a?.updatedAt || Date.now();
        return startOk(when) && endOk(when);
      });
    }
    return base;
  }, [activitiesState, statusFilter, selectedResponsible, selectedCompany, dateStart, dateEnd]);

  // Calculate quick stats for the header (respeita filtros)
  const headerStats = useMemo(() => {
    const base = filteredActivities;
    const total = base.length;
    const completed = base.filter(a => a.status === 'completed' || a.status === 'Concluído').length;
    return [
      { label: "Total", value: total, color: "#2563eb" },
      { label: "Concluídas", value: completed, color: "#22c55e" }
    ];
  }, [filteredActivities]);

  useEffect(() => {
    const onFsChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      setIsFullscreen(!!fsEl && (fsEl === kanbanRef.current));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    document.addEventListener("mozfullscreenchange", onFsChange);
    document.addEventListener("MSFullscreenChange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("mozfullscreenchange", onFsChange);
      document.removeEventListener("MSFullscreenChange", onFsChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadStages = async () => {
      try {
        const list = await activityStagesService.list();
        if (mounted && Array.isArray(list) && list.length) {
          setActivityStagesState(list);
        }
      } catch (_) {
        // silencioso
      }
    };
    loadStages();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (stagesDrawerOpen) {
      const base = activityStagesState.length ? activityStagesState : defaultActivityStages;
      // deep clone
      setLocalStages(JSON.parse(JSON.stringify(base)));
    }
  }, [stagesDrawerOpen, activityStagesState]);

  const requestFs = (el) => {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
  };

  const exitFs = () => {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
  };

  const handleToggleKanbanFullscreen = () => {
    if (viewMode !== "board") return;
    if (!kanbanRef.current) return;
    if (isFullscreen) {
      exitFs();
    } else {
      requestFs(kanbanRef.current);
    }
  };

  const actionsRight = (
    <>
      
      {/* Removidos botões de setas da navbar */}
      <IconButton
        title="Expandir Kanban"
        onClick={handleToggleKanbanFullscreen}
        color="default"
        size="small"
        style={{ color: '#6b7280', padding: 4, width: 32, height: 32 }}
      >
        {isFullscreen ? <FullscreenExitIcon style={{ fontSize: 18 }} /> : <ZoomOutMapIcon style={{ fontSize: 18 }} />}
      </IconButton>
      <IconButton
        title="Configurações"
        color="default"
        size="small"
        style={{ color: '#6b7280', padding: 4, width: 32, height: 32 }}
        onClick={() => setStagesDrawerOpen(true)}
      >
        <SettingsIcon style={{ fontSize: 18 }} />
      </IconButton>
    </>
  );

  const rightFilters = ({ classes: layout }) => (
    <>
      <div className={layout.filterItem} onClick={(e) => setAnchorResp(e.currentTarget)}>
        <Typography className={layout.filterLabel}>Responsável</Typography>
        <ExpandMoreIcon className={layout.chevronIcon} style={{ fontSize: 11 }} />
      </div>
      <Popover
        open={Boolean(anchorResp)}
        anchorEl={anchorResp}
        onClose={() => setAnchorResp(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div style={{ padding: 8, width: 220 }}>
          <Autocomplete
            fullWidth
            value={selectedResponsible}
            options={usersList}
            onChange={(e, val) => setSelectedResponsible(val)}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Responsável"
                variant="outlined"
                size="small"
                placeholder="Selecione"
                InputProps={{ ...params.InputProps, style: { fontSize: 13 } }}
                InputLabelProps={{ style: { fontSize: 12 } }}
              />
            )}
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setSelectedResponsible(null)}>Limpar</Button>
          </div>
        </div>
      </Popover>

      <div className={layout.filterItem} onClick={(e) => setAnchorEmpresa(e.currentTarget)}>
        <Typography className={layout.filterLabel}>Empresa</Typography>
        <ExpandMoreIcon className={layout.chevronIcon} style={{ fontSize: 11 }} />
      </div>
      <Popover
        open={Boolean(anchorEmpresa)}
        anchorEl={anchorEmpresa}
        onClose={() => setAnchorEmpresa(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div style={{ padding: 8, width: 220 }}>
          <Autocomplete
            fullWidth
            value={selectedCompany}
            options={contactsList}
            onChange={(e, val) => setSelectedCompany(val)}
            getOptionLabel={(option) => option.name || option.number || String(option.id)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Empresa"
                variant="outlined"
                size="small"
                placeholder="Pesquisar..."
                InputProps={{ ...params.InputProps, style: { fontSize: 13 } }}
                InputLabelProps={{ style: { fontSize: 12 } }}
              />
            )}
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setSelectedCompany(null)}>Limpar</Button>
          </div>
        </div>
      </Popover>

      <div className={layout.filterItem} onClick={(e) => setAnchorPeriodo(e.currentTarget)}>
        <CalendarIcon className={layout.calendarIcon} style={{ fontSize: 11 }} />
        <Typography className={layout.filterLabel}>
          {dateStart && dateEnd ? `${dateStart.slice(8,10)}/${dateStart.slice(5,7)} – ${dateEnd.slice(8,10)}/${dateEnd.slice(5,7)}` : "Período"}
        </Typography>
        <ExpandMoreIcon className={layout.chevronIcon} style={{ fontSize: 11 }} />
      </div>
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
              const active = dateStart === sv && dateEnd === ev;
              return (
                <div key={p.label} onClick={() => { setDateStart(sv); setDateEnd(ev); setAnchorPeriodo(null); }}
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
            <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
              style={{ flex: 1, padding: '5px 6px', fontSize: 11, borderRadius: 4, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#e5e7eb' : '#111', outline: 'none' }}
            />
            <span style={{ fontSize: 10, color: isDark ? '#9ca3af' : '#6b7280' }}>–</span>
            <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
              style={{ flex: 1, padding: '5px 6px', fontSize: 11, borderRadius: 4, border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, background: isDark ? 'rgba(255,255,255,0.06)' : '#fff', color: isDark ? '#e5e7eb' : '#111', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, gap: 6 }}>
            <div onClick={() => { setDateStart(""); setDateEnd(""); setSelectedCompany(null); setSelectedResponsible(null); setAnchorPeriodo(null); }}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 4, color: isDark ? '#9ca3af' : '#6b7280' }}
            >Limpar</div>
            <div onClick={() => setAnchorPeriodo(null)}
              style={{ padding: '4px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4, backgroundColor: '#3b82f6', color: '#fff' }}
            >Aplicar</div>
          </div>
        </div>
      </Popover>
    </>
  );

  return (
    <>
    <ActivitiesStyleLayout
      title={null}
      description="Gerencie suas tarefas e atividades"
      onCreateClick={handleCreateActivity}
      searchPlaceholder="Buscar atividades..."
      searchValue={searchParam}
      onSearchChange={handleSearch}
      filters={filters}
      stats={[]}
      navActions={actionsRight}
      viewModes={viewModes}
      currentViewMode={viewMode}
      onViewModeChange={setViewMode}
      rightFilters={rightFilters}
      scrollContent={viewMode !== "dashboard" && viewMode !== "calendar"}
      contentEdgeToEdge={viewMode === "dashboard"}
    >
      {loading ? (
        <div style={{ padding: 20, textAlign: "center" }}>Carregando...</div>
      ) : (
        <>
          {viewMode === "dashboard" && (() => {
            const isDark = theme.palette.type === "dark";
            const palette = isDark
              ? {
                  bg: theme.palette.dashboardCanvas || "#000000",
                  card: theme.palette.dashboardCard || "#252526",
                  text: "#f4f4f5",
                  sub: "#94a3b8",
                  border: "rgba(255,255,255,0.12)",
                  shadow: "0 4px 16px rgba(0,0,0,0.45)",
                  blue: "#60a5fa",
                  blueDark: "#3b82f6",
                  blueLight: "#93c5fd",
                  green: "#34d399",
                  red: "#f87171",
                  amber: "#fbbf24",
                  gray: "#9ca3af",
                }
              : {
                  bg: "#F8FAFC",
                  card: "#FFFFFF",
                  text: "#0F172A",
                  sub: "#64748B",
                  border: "#E2E8F0",
                  shadow: "0 2px 8px rgba(2,6,23,0.06)",
                  blue: "#3B82F6",
                  blueDark: "#2563EB",
                  blueLight: "#60A5FA",
                  green: "#10B981",
                  red: "#EF4444",
                  amber: "#F59E0B",
                  gray: "#6B7280",
                };
            const todayMid = new Date(); todayMid.setHours(0,0,0,0);
            const total = filteredActivities.length;
            const completed = filteredActivities.filter(a => String(a.status).toLowerCase() === "completed").length;
            const inProgress = filteredActivities.filter(a => String(a.status).toLowerCase() === "in_progress").length;
            const overdue = filteredActivities.filter(a => {
              if (!a?.date) return false;
              const d = new Date(a.date);
              const st = String(a.status || "").toLowerCase();
              return d < todayMid && st !== "completed";
            }).length;

            // Séries diárias por status para percentuais/sparkline
            const dayKeyLocal = (d) => {
              try {
                const dt = new Date(d);
                if (isNaN(dt.getTime())) return null;
                return dt.toISOString().slice(0,10);
              } catch { return null; }
            };
            const createdPerDay = {};
            const completedPerDay = {};
            const inProgPerDay = {};
            const overduePerDay = {};
            filteredActivities.forEach(a => {
              const k = dayKeyLocal(a.date || a.createdAt || Date.now());
              if (!k) return;
              createdPerDay[k] = (createdPerDay[k] || 0) + 1;
              const st = String(a.status || "").toLowerCase();
              if (st === "completed") completedPerDay[k] = (completedPerDay[k] || 0) + 1;
              if (st === "in_progress") inProgPerDay[k] = (inProgPerDay[k] || 0) + 1;
              const d = new Date(a.date || Date.now());
              if (d < todayMid && st !== "completed") overduePerDay[k] = (overduePerDay[k] || 0) + 1;
            });
            const sortKeys = (obj) => Object.keys(obj || {}).sort();
            const seriesFrom = (obj) => sortKeys(obj).map(k => obj[k]);
            const createdSeries = seriesFrom(createdPerDay);
            const completedSeries = seriesFrom(completedPerDay);
            const inProgSeries = seriesFrom(inProgPerDay);
            const overdueSeries = seriesFrom(overduePerDay);
            const computeDelta = (arr) => {
              if (!Array.isArray(arr) || arr.length < 2) return 0;
              const last = Number(arr[arr.length - 1] || 0);
              const prev = Number(arr[arr.length - 2] || 0);
              if (prev === 0) return 0;
              return ((last - prev) / prev) * 100;
            };

            const kpis = [
              { label: "Total de Atividades", value: total, color: palette.blueDark, badgeBg: `${palette.blueDark}18`, delta: computeDelta(createdSeries), icon: <InsertChartOutlinedIcon style={{ color: palette.blueDark }} />, spark: createdSeries },
              { label: "Concluídas", value: completed, color: palette.green, badgeBg: `${palette.green}18`, delta: computeDelta(completedSeries), icon: <CheckCircleOutlineIcon style={{ color: palette.green }} />, spark: completedSeries },
              { label: "Em Progresso", value: inProgress, color: palette.amber, badgeBg: `${palette.amber}18`, delta: computeDelta(inProgSeries), icon: <ScheduleIcon style={{ color: palette.amber }} />, spark: inProgSeries },
              { label: "Atrasadas", value: overdue, color: palette.red, badgeBg: `${palette.red}18`, delta: computeDelta(overdueSeries), icon: <ErrorOutlineIcon style={{ color: palette.red }} />, spark: overdueSeries }
            ];

            // Agrupar por mês (Criadas vs Concluídas)
            const monthKey = (d) => {
              try {
                const dt = new Date(d);
                if (isNaN(dt.getTime())) return null;
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, "0");
                return `${y}-${m}`;
              } catch { return null; }
            };
            const createdMap = {};
            const doneMap = {};
            filteredActivities.forEach(a => {
              const key = monthKey(a.date || a.createdAt || Date.now());
              if (!key) return;
              createdMap[key] = (createdMap[key] || 0) + 1;
              const st = String(a.status || "").toLowerCase();
              if (st === "completed") doneMap[key] = (doneMap[key] || 0) + 1;
            });
            const months = Array.from(new Set([...Object.keys(createdMap), ...Object.keys(doneMap)])).sort();
            // Labels humanizados PT-BR
            const labelFromKey = (k) => {
              const [yy, mm] = k.split("-");
              const d = new Date(Number(yy), Number(mm) - 1, 1);
              return d.toLocaleDateString("pt-BR", { month: "short" });
            };
            const labelsCreatedDone = months.map(labelFromKey);
            const dataCreated = months.map(k => createdMap[k] || 0);
            const dataDone = months.map(k => doneMap[k] || 0);

            // Donut por Etapa (status)
            const stages = (activityStagesState.length ? activityStagesState : defaultActivityStages);
            const stageOrder = stages.map(s => s.key);
            const stageLabelByKey = stages.reduce((acc, s) => { acc[s.key] = s.label; return acc; }, {});
            const stageColorByKey = stages.reduce((acc, s) => { acc[s.key] = s.color || palette.gray; return acc; }, {});
            const stageCounts = stageOrder.map(k =>
              filteredActivities.filter(a => String(a.status).toLowerCase() === String(k).toLowerCase()).length
            );
            const stageLabels = stageOrder.map(k => stageLabelByKey[k] || k);
            const stageColors = stageOrder.map(k => stageColorByKey[k]);

            // Gráfico por Tipo
            const typeMap = {};
            filteredActivities.forEach(a => {
              const t = String(a.type || "outros").toLowerCase();
              typeMap[t] = (typeMap[t] || 0) + 1;
            });
            const typeLabels = Object.keys(typeMap);
            const humanizeType = (t) => {
              const key = String(t || "").toLowerCase();
              if (key === "task") return "Tarefa";
              return key.charAt(0).toUpperCase() + key.slice(1);
            };
            const typeValues = typeLabels.map(k => typeMap[k]);

            // Linha diária (total criado por dia)
            const dayKey = (d) => {
              try {
                const dt = new Date(d);
                if (isNaN(dt.getTime())) return null;
                return dt.toISOString().slice(0,10);
              } catch { return null; }
            };
            const perDay = {};
            filteredActivities.forEach(a => {
              const k = dayKey(a.date || a.createdAt || Date.now());
              if (!k) return;
              perDay[k] = (perDay[k] || 0) + 1;
            });
            const dayKeys = Object.keys(perDay).sort();
            const dayLabels = dayKeys;
            const dayValues = dayKeys.map(k => perDay[k]);

            const barOptions = {
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: { top: 18, right: 12, left: 4, bottom: 8 } },
              plugins: {
                legend: { position: "bottom" },
                datalabels: {
                  display: true,
                  color: palette.text,
                  anchor: "end",
                  align: "top",
                  offset: 4,
                  clamp: true,
                  clip: false,
                  formatter: (v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v),
                  font: { weight: "600", size: 10 }
                }
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: palette.sub } },
                y: {
                  grid: { color: isDark ? "rgba(255,255,255,0.08)" : "#E6F0FF" },
                  ticks: { color: palette.sub },
                },
              }
            };
            const barCreatedDone = {
              labels: labelsCreatedDone,
              datasets: [
                { label: "Concluídas", data: dataDone, backgroundColor: palette.blueLight, borderRadius: 6, maxBarThickness: 22 },
                { label: "Criadas", data: dataCreated, backgroundColor: palette.blueDark, borderRadius: 6, maxBarThickness: 22 }
              ]
            };

            const singlePoint = (dayValues || []).length <= 1;
            const maxVal = Math.max(0, ...(dayValues || []));
            const suggestedMax = maxVal <= 1 ? 1.2 : maxVal * 1.1;
            const lineOptions = {
              responsive: true,
              maintainAspectRatio: false,
              layout: { padding: { top: 18, right: 12, left: 4, bottom: 8 } },
              plugins: {
                legend: { display: false },
                datalabels: {
                  display: singlePoint,
                  color: palette.text,
                  anchor: "center",
                  align: "top",
                  offset: 6,
                  clamp: true,
                  clip: false,
                  formatter: (v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v),
                  font: { weight: "600", size: 10 }
                }
              },
              elements: { point: { radius: singlePoint ? 6 : 2 } },
              spanGaps: true,
              scales: {
                x: { grid: { display: false }, ticks: { color: palette.sub } },
                y: {
                  grid: { color: isDark ? "rgba(255,255,255,0.08)" : "#E6F0FF" },
                  ticks: { color: palette.sub },
                  beginAtZero: true,
                  suggestedMax,
                  grace: "10%",
                },
              }
            };
            const linePerDay = {
              labels: dayLabels,
              datasets: [{
                label: "Atividades",
                data: dayValues,
                fill: true,
                borderColor: palette.blueDark,
                backgroundColor: "rgba(37,99,235,0.10)",
                tension: 0.35
              }]
            };

            const pending = filteredActivities.filter(a => String(a.status).toLowerCase() === "pending").length;
            const backlog = filteredActivities.filter(a => String(a.status).toLowerCase() === "backlog").length;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            const ownerMap = {};
            filteredActivities.forEach(a => {
              const name = a.owner || a.userName || "Sem responsável";
              if (!ownerMap[name]) ownerMap[name] = { name, total: 0, completed: 0, inProgress: 0, overdue: 0 };
              ownerMap[name].total += 1;
              const st = String(a.status || "").toLowerCase();
              if (st === "completed") ownerMap[name].completed += 1;
              if (st === "in_progress") ownerMap[name].inProgress += 1;
              if (a.date) {
                const d = new Date(a.date);
                if (d < todayMid && st !== "completed") ownerMap[name].overdue += 1;
              }
            });
            const rankingRows = Object.values(ownerMap).sort((a, b) => b.completed - a.completed || b.total - a.total);

            const weekdayMap = { 0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb" };
            const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
            filteredActivities.forEach(a => {
              const d = new Date(a.date || a.createdAt || Date.now());
              if (!isNaN(d.getTime())) weekdayCounts[d.getDay()]++;
            });

            const boxH = 260;
            const chartH = 200;
            const titleStyle = { fontSize: 14, color: palette.text, marginBottom: 6, fontWeight: 400 };

            return (
              <div style={{
                padding: 4,
                overflowX: "hidden",
                overflowY: "hidden",
                width: "100%",
                height: "auto",
                backgroundColor: palette.bg,
                minHeight: "100%",
              }}>
                <div data-dashboard-cards style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  gap: 10,
                  margin: 0,
                }}>
                  {[
                    { label: "Total de Atividades", value: total, icon: <InsertChartOutlinedIcon style={{ color: palette.blueDark }} />, color: palette.blueDark, sub: `Média 7d: ${(createdSeries.slice(-7).reduce((a,b)=>a+b,0)/Math.max(createdSeries.slice(-7).length,1)).toFixed(1)}` },
                    { label: "Concluídas", value: completed, icon: <CheckCircleOutlineIcon style={{ color: palette.green }} />, color: palette.green, sub: `Taxa: ${completionRate}%` },
                    { label: "Em Progresso", value: inProgress, icon: <ScheduleIcon style={{ color: palette.amber }} />, color: palette.amber, sub: `${total > 0 ? Math.round((inProgress/total)*100) : 0}% do total` },
                    { label: "Atrasadas", value: overdue, icon: <ErrorOutlineIcon style={{ color: palette.red }} />, color: palette.red, sub: `${total > 0 ? Math.round((overdue/total)*100) : 0}% do total` },
                    { label: "Eficiência", value: `${completionRate}%`, icon: <CheckCircleOutlineIcon style={{ color: palette.amber }} />, color: palette.amber, sub: `Concluídas: ${completed} · Restantes: ${total - completed}` },
                  ].map((c) => (
                    <Paper key={c.label} elevation={0} style={{
                      borderRadius: 8,
                      padding: '12px 14px',
                      border: `1px solid ${palette.border}`,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      minHeight: 72,
                      background: isDark ? palette.card : "#FFFFFF",
                      transition: "box-shadow 150ms ease",
                      overflow: "hidden",
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ fontSize: 11, color: palette.sub, fontWeight: 500, lineHeight: 1.3, marginBottom: 2 }}>
                          {c.label}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 22, color: palette.text, fontFeatureSettings: '"tnum"', lineHeight: 1.1 }}>
                          {c.value != null ? c.value : "\u2014"}
                        </div>
                        <div style={{ fontSize: 10, color: palette.sub, fontWeight: 400, lineHeight: 1.3, marginTop: 2, opacity: 0.7 }}>
                          {c.sub}
                        </div>
                      </div>
                      <div style={{ color: c.color, opacity: 0.7, flexShrink: 0, marginLeft: 8 }}>
                        {c.icon}
                      </div>
                    </Paper>
                  ))}
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                  marginTop: 12,
                  width: "100%",
                  alignItems: "stretch",
                }}>
                  <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, height: boxH, background: palette.card }}>
                    <div style={titleStyle}>Atividades por Dia</div>
                    <div style={{ height: chartH }}>
                      <Line data={linePerDay} options={lineOptions} />
                    </div>
                  </Paper>

                  <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, height: boxH, background: palette.card }}>
                    <div style={titleStyle}>Criadas vs Concluídas</div>
                    <div style={{ height: chartH }}>
                      <Bar options={barOptions} data={barCreatedDone} />
                    </div>
                  </Paper>

                  <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card, overflow: 'hidden' }}>
                    <div style={titleStyle}>Ranking de Responsáveis</div>
                    <div style={{ overflowX: 'auto', marginTop: 8 }}>
                      {(() => {
                        if (!rankingRows.length) return <div style={{ textAlign: 'center', padding: 20, color: palette.sub, fontSize: 12 }}>Sem dados</div>;
                        const thStyle = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: palette.sub, padding: '6px 8px', borderBottom: `1px solid ${palette.border}`, whiteSpace: 'nowrap' };
                        const tdStyle = { fontSize: 12, padding: '8px 8px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f2f5'}`, whiteSpace: 'nowrap' };
                        return (
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={{ ...thStyle, width: 32 }}>#</th>
                                <th style={thStyle}>Nome</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Total</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Concluídas</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Eficiência</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Atrasadas</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rankingRows.map((r, i) => {
                                const eff = r.total > 0 ? ((r.completed / r.total) * 100).toFixed(0) : "0";
                                return (
                                  <tr key={r.name} style={{ transition: 'background 0.1s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <td style={{ ...tdStyle, fontWeight: 700, color: i < 3 ? '#f59e0b' : palette.sub, textAlign: 'center' }}>{i + 1}</td>
                                    <td style={tdStyle}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                          width: 26, height: 26, borderRadius: '50%',
                                          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          fontSize: 10, fontWeight: 600, color: isDark ? '#d1d5db' : '#6B7280', flexShrink: 0,
                                        }}>
                                          {(r.name || "?")[0]?.toUpperCase()}
                                        </div>
                                        <span style={{ fontWeight: 500 }}>{r.name}</span>
                                      </div>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 500 }}>{r.total}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#10b981' }}>{r.completed}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                      <span style={{
                                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                        backgroundColor: Number(eff) >= 50 ? (isDark ? 'rgba(16,185,129,0.12)' : '#d1fae5') : (isDark ? 'rgba(245,158,11,0.12)' : '#fef3c7'),
                                        color: Number(eff) >= 50 ? '#10b981' : '#f59e0b',
                                      }}>{eff}%</span>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center', color: '#ef4444', fontWeight: 500 }}>{r.overdue}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </Paper>

                  <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card }}>
                    <div style={titleStyle}>Distribuição por Etapa</div>
                    {(() => {
                      const totalStages = stageCounts.reduce((a, b) => a + b, 0) || 1;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
                          <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                            <svg viewBox="0 0 42 42" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                              {(() => {
                                let offset = 0;
                                return stageCounts.map((val, i) => {
                                  const pct = (val / totalStages) * 100;
                                  const dash = `${pct} ${100 - pct}`;
                                  const el = <circle key={i} cx="21" cy="21" r="15.91549" fill="none" stroke={stageColors[i]} strokeWidth="4" strokeDasharray={dash} strokeDashoffset={-offset} />;
                                  offset += pct;
                                  return el;
                                });
                              })()}
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>{total}</div>
                              <div style={{ fontSize: 8, color: palette.sub }}>Total</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                            {stageLabels.map((label, i) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: stageColors[i], flexShrink: 0 }} />
                                <span style={{ color: palette.text, fontWeight: 500, flex: 1 }}>{label}</span>
                                <span style={{ color: palette.sub, fontWeight: 600 }}>{stageCounts[i]}</span>
                                <span style={{ color: palette.sub, fontSize: 10 }}>{((stageCounts[i] / totalStages) * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </Paper>

                  <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card }}>
                    <div style={titleStyle}>Atividade por Hora</div>
                    <div style={{ fontSize: 10, color: palette.sub, marginBottom: 8 }}>Concentração de atividades por dia/hora</div>
                    {(() => {
                      const dayLabelsHeat = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                      const hours = Array.from({ length: 24 }, (_, i) => i);
                      const grid = dayLabelsHeat.map(() => hours.map(() => 0));
                      filteredActivities.forEach(a => {
                        try {
                          const dt = new Date(a.date || a.createdAt);
                          if (!isNaN(dt.getTime())) {
                            grid[dt.getDay()][dt.getHours()] += 1;
                          }
                        } catch {}
                      });
                      const maxV = Math.max(...grid.flat(), 1);
                      const getColor = (val) => {
                        if (val === 0) return isDark ? 'rgba(255,255,255,0.03)' : '#f0f4f8';
                        const intensity = val / maxV;
                        if (intensity < 0.25) return isDark ? 'rgba(59,130,246,0.12)' : '#dbeafe';
                        if (intensity < 0.5) return isDark ? 'rgba(59,130,246,0.25)' : '#93c5fd';
                        if (intensity < 0.75) return isDark ? 'rgba(59,130,246,0.5)' : '#3b82f6';
                        return isDark ? 'rgba(59,130,246,0.8)' : '#1e40af';
                      };
                      return (
                        <div style={{ overflow: 'auto' }}>
                          <div style={{ display: 'flex', paddingLeft: 28, gap: 1, marginBottom: 2 }}>
                            {hours.map(h => <div key={h} style={{ flex: 1, minWidth: 10, textAlign: 'center', fontSize: 7, color: palette.sub }}>{String(h).padStart(2, '0')}</div>)}
                          </div>
                          {dayLabelsHeat.map((day, di) => (
                            <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 1 }}>
                              <div style={{ width: 24, fontSize: 9, fontWeight: 500, color: palette.sub, textAlign: 'right', flexShrink: 0, paddingRight: 3 }}>{day}</div>
                              {hours.map((_, hi) => (
                                <div key={hi} title={`${day} ${String(hi).padStart(2,'0')}:00 — ${grid[di][hi]} ativ.`} style={{ flex: 1, minWidth: 10, aspectRatio: '1', borderRadius: 2, background: getColor(grid[di][hi]), transition: 'background 0.2s ease' }} />
                              ))}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </Paper>

                  <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card }}>
                    <div style={titleStyle}>Atividades por Tipo</div>
                    {(() => {
                      const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];
                      const totalTypes = typeValues.reduce((a, b) => a + b, 0) || 1;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
                          <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                            <svg viewBox="0 0 42 42" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                              {(() => {
                                let offset = 0;
                                return typeValues.map((val, i) => {
                                  const pct = (val / totalTypes) * 100;
                                  const dash = `${pct} ${100 - pct}`;
                                  const el = <circle key={i} cx="21" cy="21" r="15.91549" fill="none" stroke={colors[i % colors.length]} strokeWidth="4" strokeDasharray={dash} strokeDashoffset={-offset} />;
                                  offset += pct;
                                  return el;
                                });
                              })()}
                            </svg>
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>{total}</div>
                              <div style={{ fontSize: 8, color: palette.sub }}>Total</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                            {typeLabels.map((label, i) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors[i % colors.length], flexShrink: 0 }} />
                                <span style={{ color: palette.text, fontWeight: 500, flex: 1 }}>{humanizeType(label)}</span>
                                <span style={{ color: palette.sub, fontWeight: 600 }}>{typeValues[i]}</span>
                                <span style={{ color: palette.sub, fontSize: 10 }}>{((typeValues[i] / totalTypes) * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </Paper>

                  <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card }}>
                    <div style={titleStyle}>Roadmap de Atividades</div>
                    <div style={{ fontSize: 10, color: palette.sub, marginBottom: 10 }}>Últimas atividades criadas/atualizadas</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 200, overflowY: 'auto' }}>
                      {(() => {
                        const sorted = [...filteredActivities].sort((a, b) => new Date(b.updatedAt || b.createdAt || b.date) - new Date(a.updatedAt || a.createdAt || a.date)).slice(0, 10);
                        if (!sorted.length) return <div style={{ textAlign: 'center', padding: 16, color: palette.sub, fontSize: 11 }}>Sem dados</div>;
                        const statusColors = { completed: '#10B981', in_progress: '#F59E0B', pending: '#3B82F6', backlog: '#6B7280' };
                        return sorted.map((a, idx) => {
                          const st = String(a.status || 'pending').toLowerCase();
                          const color = statusColors[st] || palette.blueDark;
                          const dateStr = (() => { try { return moment(a.updatedAt || a.createdAt || a.date).format('DD/MM HH:mm'); } catch { return ''; } })();
                          return (
                            <div key={a.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderBottom: idx < sorted.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f0f2f5'}` : 'none' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
                                {idx < sorted.length - 1 && <div style={{ width: 1, height: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', marginTop: 2 }} />}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: palette.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || `Atividade #${a.id}`}</div>
                                <div style={{ fontSize: 10, color: palette.sub, display: 'flex', gap: 8, marginTop: 1 }}>
                                  <span>{dateStr}</span>
                                  <span style={{ color, fontWeight: 600 }}>{mapStatusLabel(a.status)}</span>
                                  <span>{mapTypeLabel(a.type)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </Paper>

                  <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card }}>
                    <div style={titleStyle}>Insights</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
                      {(() => {
                        const suggestions = [];
                        if (overdue > 0 && overdue > completed) suggestions.push({ icon: '\u26A0\uFE0F', text: `Você tem ${overdue} atividades atrasadas, mais do que concluídas (${completed}). Priorize as pendências.`, type: 'warn' });
                        if (completionRate >= 70) suggestions.push({ icon: '\uD83C\uDFAF', text: `Excelente! Taxa de conclusão em ${completionRate}%. Continue assim.`, type: 'success' });
                        if (completionRate < 30 && total > 3) suggestions.push({ icon: '\uD83D\uDCC9', text: `Taxa de conclusão baixa (${completionRate}%). Revise prioridades e prazos.`, type: 'warn' });
                        if (inProgress > total * 0.5 && total > 3) suggestions.push({ icon: '\uD83D\uDCA1', text: `${inProgress} atividades em progresso. Considere finalizar antes de iniciar novas.`, type: 'info' });
                        if (pending > completed && total > 3) suggestions.push({ icon: '\uD83D\uDC64', text: `${pending} atividades pendentes aguardando ação. Distribua as tarefas.`, type: 'info' });
                        if (total === 0) suggestions.push({ icon: '\uD83D\uDE80', text: 'Nenhuma atividade cadastrada. Comece criando suas primeiras tarefas.', type: 'info' });
                        if (!suggestions.length) suggestions.push({ icon: '\u2705', text: 'Tudo em ordem! Continue acompanhando suas métricas.', type: 'success' });
                        const bgByType = { warn: isDark ? 'rgba(245,158,11,0.08)' : '#fef3c7', info: isDark ? 'rgba(59,130,246,0.08)' : '#dbeafe', success: isDark ? 'rgba(16,185,129,0.08)' : '#d1fae5' };
                        return suggestions.map((s, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, backgroundColor: bgByType[s.type] || bgByType.info }}>
                            <span style={{ fontSize: 16, lineHeight: 1 }}>{s.icon}</span>
                            <span style={{ fontSize: 12, color: palette.text, lineHeight: 1.5 }}>{s.text}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </Paper>
                </div>
              </div>
            );
          })()}
          {viewMode === "list" && <ActivitiesList activities={filteredActivities} />}
          {viewMode === "calendar" && <ActivitiesCalendar activities={filteredActivities} onCreate={handleCreateActivity} />}
          {viewMode === "board" && (
            <div ref={kanbanRef} style={{ height: '100%', width: '100%' }}>
              <KanbanBoard
                columns={(activityStagesState.length ? activityStagesState : defaultActivityStages).map((s, idx) => ({
                  id: String(s.key || s.id || `stage_${idx}`),
                  title: s.label || s.name || `Etapa ${idx + 1}`,
                  color: s.color || "#4B5563",
                }))}
                activities={filteredActivities}
                users={usersList}
                onActivityClick={(activity) => {
                  setSelectedActivity(activity);
                  setDetailsOpen(true);
                }}
                onMove={async (activityId, sourceCol, destCol) => {
                  if (sourceCol === destCol) return;
                  const id = Number(activityId);
                  const map = {
                    backlog: 'backlog',
                    pending: 'pending',
                    in_progress: 'in_progress',
                    completed: 'completed'
                  };
                  const newStatus = map[destCol] || destCol;
                  setActivitiesState(prev => {
                    const next = prev.map(a => a.id === id ? { ...a, status: newStatus } : a);
                    return next;
                  });
                  try {
                    await activitiesService.update(id, { status: newStatus });
                  } catch (err) {
                    toastError(err);
                  }
                }}
                onDelete={async (activity) => {
                  const id = Number(activity.id);
                  try {
                    await activitiesService.delete(id);
                    setActivitiesState(prev => prev.filter(a => a.id !== id));
                    toast.success("Atividade excluída.");
                  } catch (err) {
                    toastError(err);
                  }
                }}
                onAdd={() => handleCreateActivity()}
              />
            </div>
          )}
        </>
      )}
    </ActivitiesStyleLayout>

    <ActivityDetailsModal
      open={detailsOpen}
      onClose={() => setDetailsOpen(false)}
      activity={selectedActivity}
      stages={activityStagesState.length ? activityStagesState : defaultActivityStages}
      users={usersList}
      onUpdated={(updated) => {
        setSelectedActivity(updated);
        setActivitiesState((prev) =>
          prev.map((a) =>
            Number(a.id) === Number(updated.id) ? { ...a, ...updated } : a
          )
        );
      }}
      onDelete={async (activity) => {
        const id = Number(activity.id);
        try {
          await activitiesService.delete(id);
          setActivitiesState(prev => prev.filter(a => a.id !== id));
          setDetailsOpen(false);
          toast.success("Atividade excluída.");
        } catch (err) {
          toastError(err);
        }
      }}
    />

    <CreateActivityModal
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      activity={activityToEdit}
      onSave={(savedActivity) => {
         setActivitiesState((prev) => {
             // Garante que o ID da atividade salva seja um número para comparação consistente
             const savedId = Number(savedActivity.id);
             
             // Procura se já existe uma atividade com esse ID
             const exists = prev.some(a => Number(a.id) === savedId);
             
             if (exists) {
                 // Se existe, atualiza o item no array
                 return prev.map(a => Number(a.id) === savedId ? savedActivity : a);
             } else {
                 // Se não existe, adiciona no início
                 return [savedActivity, ...prev];
             }
         });
         // Reseta o estado de edição para evitar conflitos futuros
         setActivityToEdit(null);
      }}
    />

    <ConfigureKanbanModal
      open={stagesDrawerOpen}
      onClose={() => setStagesDrawerOpen(false)}
      stages={localStages}
      onStagesChange={setLocalStages}
      nameField="label"
      idField="key"
      onSave={async () => {
        try {
          const saved = await activityStagesService.bulkSave(localStages);
          setActivityStagesState(saved);
          setStagesDrawerOpen(false);
        } catch (err) {
          toastError(err);
        }
      }}
    />
    </>
  );
};

export default Activities;
