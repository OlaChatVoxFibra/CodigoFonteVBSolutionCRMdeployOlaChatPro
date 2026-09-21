/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
  List as ListIcon,
  CalendarToday as CalendarIcon,
  ViewWeek as KanbanIcon,
  Dashboard as DashboardIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Settings as SettingsIcon,
  ZoomOutMap as ZoomOutMapIcon
} from "@material-ui/icons";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Popover,
  Grid,
  TextField,
  Button,
  Typography
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import "../Schedules/Schedules.css";
import "moment/locale/pt-br";
import FolderOpenIcon from "@material-ui/icons/FolderOpen";

import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import ProjectKanbanBoard from "../../components/ProjectKanbanBoard"; // Novo componente
import ProjectDetailsModal from "../../components/ProjectDetailsModal"; // Novo componente
import CreateProjectModal from "../../components/CreateProjectModal"; // Novo componente
import ConfigureKanbanModal from "../../components/ConfigureKanbanModal";
import useProjects from "../../hooks/useProjects"; // Novo hook
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import projectsService from "../../services/projectsService"; // Novo serviço
import convertedLeadsService from "../../services/convertedLeadsService";
import api from "../../services/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import useAppTranslation from "../../hooks/useAppTranslation";
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
  ArcElement,
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
}));

// Sub-component for List View
const ProjectsList = ({ projects }) => {
  return (
    <TableContainer component={Paper} style={{ height: '100%', overflow: 'auto' }}>
      <Table stickyHeader aria-label="projects table">
        <TableHead>
          <TableRow>
            <TableCell>Nome</TableCell>
            <TableCell>CRM</TableCell>
            <TableCell>Descrição</TableCell>
            <TableCell>Empresa</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Criado em</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {projects.length > 0 ? (
            projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell component="th" scope="row">
                  {project.name}
                </TableCell>
                <TableCell>
                  
                </TableCell>
                <TableCell>{project.description}</TableCell>
                <TableCell>{project.company ? project.company.name : project.companyId}</TableCell>
                <TableCell>
                  <Chip 
                    label={
                      project.status === 'active' || project.status === 'in_progress'
                        ? 'Ativo'
                        : project.status === 'completed'
                          ? 'Concluído'
                          : project.status === 'pending' || project.status === 'pendente'
                            ? 'Pendente'
                            : project.status === 'backlog'
                              ? 'Backlog'
                              : 'Arquivado'
                    } 
                    size="small" 
                    color={project.status === 'active' ? 'primary' : 'default'} 
                  />
                </TableCell>
                <TableCell>{new Date(project.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} align="center">
                Nenhum projeto encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Sub-component for Calendar View – com layout /schedules
const ProjectsCalendar = ({ projects, onCreate }) => {
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
    return projects.map(p => ({
      title: p.name,
      start: new Date(p.date || p.deadlineAt || p.createdAt),
      end: new Date(p.dateEnd || p.date || p.deadlineAt || p.createdAt),
      allDay: true,
      resource: p
    }));
  }, [projects]);
  const eventPropGetter = (event) => {
    const status = String(event.resource.status || "").toLowerCase();
    let style = { backgroundColor: "#DBEAFE", border: "1px solid #BFDBFE", color: "#1E40AF", borderRadius: 10, padding: "6px 8px", fontSize: 12 };
    if (status === "completed") style = { backgroundColor: "#D1FAE5", border: "1px solid #A7F3D0", color: "#065F46", borderRadius: 10, padding: "6px 8px", fontSize: 12 };
    if (status === "archived") style = { backgroundColor: "#F3F4F6", border: "1px solid #E5E7EB", color: "#374151", borderRadius: 10, padding: "6px 8px", fontSize: 12 };
    return { style };
  };
  const total = projects.length;
  const concluded = projects.filter(p => String(p.status).toLowerCase() === "completed").length;
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
        <Grid item xs={12} md={3} lg={3} style={{ minWidth: 0 }}>
          <div className="right-aside">
            <div className="aside-top-actions">
              <button className="aside-action" onClick={onCreate}>Novo Projeto</button>
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
                <Typography className="aside-title" variant="body2">Projeto</Typography>
              </div>
              {(() => {
                const recent = [...projects].sort((a,b) => new Date(b.updatedAt||b.createdAt) - new Date(a.updatedAt||a.createdAt))[0];
                return (
                  <div className="activity-item">
                    <div className="activity-icon"><FolderOpenIcon style={{ fontSize: 18 }} /></div>
                    <div className="activity-info">
                      <div className="activity-title">{recent?.name || "—"}</div>
                      <div className="activity-sub">{recent?.company?.name || recent?.companyId || "Sem empresa"}</div>
                    </div>
                    <div className="activity-time">{recent ? moment(recent.updatedAt||recent.createdAt).format("HH:mm") : "—"}</div>
                  </div>
                );
              })()}
              <div className="donut-center" style={{ position: "static", transform: "none", textAlign: "left" }}>
                <div className="donut-total" style={{ fontSize: 24 }}>{total}</div>
                <div className="donut-label">Total</div>
                <div className="donut-label">Concluídos: {concluded}</div>
              </div>
            </Paper>
          </div>
        </Grid>
      </Grid>
    </div>
  );
};

const Projects = () => {
  const { t } = useAppTranslation();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const classes = useStyles();
  const [viewMode, setViewMode] = useState("board");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [hoveredKpi, setHoveredKpi] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [anchorResp, setAnchorResp] = useState(null);
  const [anchorEmpresa, setAnchorEmpresa] = useState(null);
  const [anchorPeriodo, setAnchorPeriodo] = useState(null);
  const [anchorTodos, setAnchorTodos] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [contactsList, setContactsList] = useState([]);
  const [selectedResponsible, setSelectedResponsible] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [projectsState, setProjectsState] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const kanbanRef = useRef(null);
  const [stagesDrawerOpen, setStagesDrawerOpen] = useState(false);
  const [projectStagesState, setProjectStagesState] = useState([]);
  const [localStages, setLocalStages] = useState([]);
  
  const { projects, loading, count, hasMore } = useProjects({
    searchParam,
    pageNumber,
    refreshSignal: 0
  });

  useEffect(() => {
    setProjectsState(projects);
  }, [projects]);

  // Carrega estágios do Kanban de Projetos do localStorage (frontend-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("project-stages");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          setProjectStagesState(parsed);
        }
      }
    } catch {}
  }, []);

  const defaultStageTemplates = useMemo(() => ([
    { id: 'backlog', title: t('modules.projects.stages.backlog'), color: '#6b7280' },
    { id: 'pending', title: t('modules.projects.stages.pending'), color: '#f59e0b' },
    { id: 'in_progress', title: t('modules.projects.stages.inProgress'), color: '#2563eb' },
    { id: 'completed', title: t('modules.projects.stages.completed'), color: '#10B981' }
  ]), [t]);

  const translateStageTitle = useCallback((stage) => {
    const keyMap = {
      backlog: 'backlog',
      pending: 'pending',
      in_progress: 'inProgress',
      completed: 'completed',
    };
    const key = keyMap[stage?.id];
    if (!key) return stage;
    return { ...stage, title: t(`modules.projects.stages.${key}`) };
  }, [t]);

  const displayColumns = useMemo(() => {
    const base = (projectStagesState && projectStagesState.length)
      ? projectStagesState
      : defaultStageTemplates;
    return base.map(translateStageTitle);
  }, [projectStagesState, defaultStageTemplates, translateStageTitle]);

  useEffect(() => {
    if (stagesDrawerOpen) {
      const base = (projectStagesState && projectStagesState.length)
        ? projectStagesState
        : defaultStageTemplates;
      setLocalStages(JSON.parse(JSON.stringify(base)));
    }
  }, [stagesDrawerOpen, projectStagesState, defaultStageTemplates]);

  const handleSearch = (value) => {
    setSearchParam(value);
  };

  const handleCreateProject = () => {
    setProjectToEdit(null);
    setDrawerOpen(true);
  };

  const viewModes = [
    { value: "board", label: "Quadro", icon: <KanbanIcon /> },
    { value: "list", label: "Lista", icon: <ListIcon /> },
    { value: "calendar", label: "Calendário", icon: <CalendarIcon /> },
    { value: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  ];

  const filters = [
    {
      label: "Status",
      value: statusFilter,
      options: [
        { value: "active", label: "Ativo" },
        { value: "completed", label: "Concluído" },
        { value: "archived", label: "Arquivado" },
      ],
      onChange: (val) => setStatusFilter(val)
    }
  ];

  const filteredProjects = useMemo(() => {
    let base = projectsState;

    // Busca geral por termo (nome, descrição, empresa)
    if (searchParam) {
      const term = String(searchParam || "").trim().toLowerCase();
      if (term) {
        base = base.filter((p) => {
          const n = String(p?.name || "").toLowerCase();
          const d = String(p?.description || "").toLowerCase();
          const c = String(p?.company?.name || "").toLowerCase();
          return n.includes(term) || d.includes(term) || c.includes(term);
        });
      }
    }

    // Status
    if (statusFilter) {
      base = base.filter((p) => String(p.status || "") === String(statusFilter));
    }

    // Responsável
    if (selectedResponsible && (selectedResponsible.id || selectedResponsible.name)) {
      const rid = selectedResponsible.id;
      const rname = (selectedResponsible.name || "").toLowerCase();
      base = base.filter((p) => {
        const pid = p?.userId || p?.user?.id;
        const pname = (p?.user?.name || p?.user?.email || "").toLowerCase();
        return (rid && String(pid) === String(rid)) || (!!rname && pname.includes(rname));
      });
    }

    // Empresa: aceitar correspondência por ID (companyId) ou por nome
    if (selectedCompany && (selectedCompany.id || selectedCompany.name)) {
      const cid = selectedCompany.id ? String(selectedCompany.id) : null;
      const cname = String(selectedCompany.name || "").toLowerCase();
      base = base.filter((p) => {
        const byId =
          (cid && String(p?.companyId || p?.company?.id) === cid);
        const byName =
          cname &&
          (
            String(p?.name || "").toLowerCase().includes(cname) ||
            String(p?.description || "").toLowerCase().includes(cname) ||
            String(p?.company?.name || "").toLowerCase().includes(cname)
          );
        return byId || byName;
      });
    }

    // Período (por data de criação)
    const startOk = (d) => {
      if (!dateStart) return true;
      try {
        const cmp = new Date(dateStart);
        cmp.setHours(0, 0, 0, 0);
        const dt = new Date(d);
        return dt >= cmp;
      } catch { return true; }
    };
    const endOk = (d) => {
      if (!dateEnd) return true;
      try {
        const cmp = new Date(dateEnd);
        cmp.setHours(23, 59, 59, 999);
        const dt = new Date(d);
        return dt <= cmp;
      } catch { return true; }
    };
    if (dateStart || dateEnd) {
      base = base.filter((p) => {
        const when = p?.createdAt || p?.updatedAt || Date.now();
        return startOk(when) && endOk(when);
      });
    }

    return base;
  }, [projectsState, searchParam, statusFilter, selectedResponsible, selectedCompany, dateStart, dateEnd]);

  const headerStats = useMemo(() => {
    const total = filteredProjects.length;
    const completed = filteredProjects.filter(p => p.status === 'completed').length;
    return [
      { label: "Total", value: total, color: "#2563eb" },
      { label: "Concluídos", value: completed, color: "#22c55e" }
    ];
  }, [filteredProjects]);

  // Fullscreen logic (mesma de Activities)
  useEffect(() => {
    // carregar opções de filtros (Responsável/Empresa)
    async function fetchFilters() {
      try {
        const { data: usersResp } = await api.get("/users", { params: { searchParam: "" } });
        setUsersList(usersResp?.users || []);
      } catch (_) {}
      try {
        const data = await convertedLeadsService.list({ pageNumber: 1 });
        const list = Array.isArray(data?.leads) ? data.leads : [];
        setContactsList(list);
      } catch (_) {}
    }
    fetchFilters();

    const onFsChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
      setIsFullscreen(!!fsEl && (fsEl === kanbanRef.current));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, []);

  const requestFs = (el) => {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  };

  const exitFs = () => {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
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
        <Typography className={layout.filterLabel}>{t("modules.common.owner")}</Typography>
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
            getOptionLabel={(option) => option.name || option.email || String(option.id)}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("modules.common.owner")}
                variant="outlined"
                size="small"
                placeholder={t("common.select", { defaultValue: "Selecione" })}
                InputProps={{ ...params.InputProps, style: { fontSize: 13 } }}
                InputLabelProps={{ style: { fontSize: 12 } }}
              />
            )}
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setSelectedResponsible(null)}>{t("modules.common.clear")}</Button>
          </div>
        </div>
      </Popover>

      <div className={layout.filterItem} onClick={(e) => setAnchorEmpresa(e.currentTarget)}>
        <Typography className={layout.filterLabel}>{t("modules.common.company")}</Typography>
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
                label={t("modules.common.company")}
                variant="outlined"
                size="small"
                placeholder={t("modules.common.search")}
                InputProps={{ ...params.InputProps, style: { fontSize: 13 } }}
                InputLabelProps={{ style: { fontSize: 12 } }}
              />
            )}
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setSelectedCompany(null)}>{t("modules.common.clear")}</Button>
          </div>
        </div>
      </Popover>

      <div className={layout.filterItem} onClick={(e) => setAnchorPeriodo(e.currentTarget)}>
        <CalendarIcon className={layout.calendarIcon} style={{ fontSize: 11 }} />
        <Typography className={layout.filterLabel}>
          {dateStart && dateEnd ? `${dateStart.slice(8,10)}/${dateStart.slice(5,7)} – ${dateEnd.slice(8,10)}/${dateEnd.slice(5,7)}` : t("modules.common.period")}
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
              { label: t("modules.common.today"), days: 0 },
              { label: t("modules.common.days7"), days: 7 },
              { label: t("modules.common.days30"), days: 30 },
              { label: t("modules.common.days90"), days: 90 },
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
            <div onClick={() => { setDateStart(""); setDateEnd(""); setAnchorPeriodo(null); }}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 4, color: isDark ? '#9ca3af' : '#6b7280' }}
            >{t("modules.common.clear")}</div>
            <div onClick={() => setAnchorPeriodo(null)}
              style={{ padding: '4px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4, backgroundColor: '#3b82f6', color: '#fff' }}
            >{t("modules.common.apply")}</div>
          </div>
        </div>
      </Popover>

      {(() => { void(anchorTodos); void(setAnchorTodos); return null; })()}
    </>
  );

  return (
    <>
    <ActivitiesStyleLayout
      title={null}
      description={t("modules.projects.description")}
      onCreateClick={handleCreateProject}
      searchPlaceholder={t("modules.projects.searchPlaceholder")}
      searchValue={searchParam}
      onSearchChange={handleSearch}
      filters={filters}
      stats={[]} // headerStats removido se quiser clean igual ao layout novo
      navActions={actionsRight}
      viewModes={viewModes}
      currentViewMode={viewMode}
      onViewModeChange={setViewMode}
      rightFilters={rightFilters}
      scrollContent={viewMode !== "dashboard" && viewMode !== "calendar"}
      contentEdgeToEdge={viewMode === "dashboard"}
    >
      {loading ? (
        <div style={{ padding: 20, textAlign: "center" }}>{t("modules.common.loading")}</div>
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
            const total = filteredProjects.length;
            const completed = filteredProjects.filter(p => String(p.status).toLowerCase() === "completed").length;
            const inProgress = filteredProjects.filter(p => {
              const s = String(p.status || "").toLowerCase();
              return s === "in_progress" || s === "active";
            }).length;
            const overdue = filteredProjects.filter(p => {
              const s = String(p.status || "").toLowerCase();
              if (s === "completed") return false;
              const acts = Array.isArray(p.activities) ? p.activities : [];
              return acts.some(a => {
                const st = String(a.status || "").toLowerCase();
                if (st === "completed") return false;
                if (!a?.date) return false;
                const d = new Date(a.date);
                return d < todayMid;
              });
            }).length;

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
            filteredProjects.forEach(p => {
              const k = dayKeyLocal(p.createdAt || Date.now());
              if (k) createdPerDay[k] = (createdPerDay[k] || 0) + 1;
              const s = String(p.status || "").toLowerCase();
              if (s === "completed") {
                const kc = dayKeyLocal(p.updatedAt || p.createdAt || Date.now());
                if (kc) completedPerDay[kc] = (completedPerDay[kc] || 0) + 1;
              }
              if (s === "in_progress" || s === "active") {
                const ki = dayKeyLocal(p.updatedAt || p.createdAt || Date.now());
                if (ki) inProgPerDay[ki] = (inProgPerDay[ki] || 0) + 1;
              }
              const hasOver = (Array.isArray(p.activities) ? p.activities : []).some(a => {
                const st = String(a.status || "").toLowerCase();
                if (st === "completed") return false;
                const d = a?.date ? new Date(a.date) : null;
                return !!d && d < todayMid;
              });
              if (hasOver) {
                const ko = dayKeyLocal(p.updatedAt || p.createdAt || Date.now());
                if (ko) overduePerDay[ko] = (overduePerDay[ko] || 0) + 1;
              }
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
              { label: "Total de Projetos", value: total, color: palette.blueDark, badgeBg: `${palette.blueDark}18`, delta: computeDelta(createdSeries), icon: <InsertChartOutlinedIcon style={{ color: palette.blueDark }} />, spark: createdSeries },
              { label: "Concluídos", value: completed, color: palette.green, badgeBg: `${palette.green}18`, delta: computeDelta(completedSeries), icon: <CheckCircleOutlineIcon style={{ color: palette.green }} />, spark: completedSeries },
              { label: "Em Progresso", value: inProgress, color: palette.amber, badgeBg: `${palette.amber}18`, delta: computeDelta(inProgSeries), icon: <ScheduleIcon style={{ color: palette.amber }} />, spark: inProgSeries },
              { label: "Atrasados", value: overdue, color: palette.red, badgeBg: `${palette.red}18`, delta: computeDelta(overdueSeries), icon: <ErrorOutlineIcon style={{ color: palette.red }} />, spark: overdueSeries }
            ];

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
            filteredProjects.forEach(p => {
              const key = monthKey(p.createdAt || Date.now());
              if (key) createdMap[key] = (createdMap[key] || 0) + 1;
              if (String(p.status || "").toLowerCase() === "completed") {
                const kd = monthKey(p.updatedAt || p.createdAt || Date.now());
                if (kd) doneMap[kd] = (doneMap[kd] || 0) + 1;
              }
            });
            const months = Array.from(new Set([...Object.keys(createdMap), ...Object.keys(doneMap)])).sort();
            const labelFromKey = (k) => {
              const [yy, mm] = k.split("-");
              const d = new Date(Number(yy), Number(mm) - 1, 1);
              return d.toLocaleDateString("pt-BR", { month: "short" });
            };
            const labelsCreatedDone = months.map(labelFromKey);
            const dataCreated = months.map(k => createdMap[k] || 0);
            const dataDone = months.map(k => doneMap[k] || 0);

            const statusKey = (s) => {
              const v = String(s || "").toLowerCase();
              if (["backlog"].includes(v)) return "backlog";
              if (["pending","pendente"].includes(v)) return "pending";
              if (["in_progress","em progresso","active","ativo"].includes(v)) return "in_progress";
              if (["completed","concluído","concluido"].includes(v)) return "completed";
              if (["archived","arquivado"].includes(v)) return "archived";
              return "backlog";
            };
            const stageOrder = ["backlog","pending","in_progress","completed"];
            const stageLabelByKey = {
              backlog: "Backlog",
              pending: "Pendente",
              in_progress: "Em Progresso",
              completed: "Concluído"
            };
            const stageColorByKey = {
              backlog: palette.gray,
              pending: palette.gray,
              in_progress: palette.amber,
              completed: palette.green
            };
            const stageCounts = stageOrder.map(k => filteredProjects.filter(p => statusKey(p.status) === k).length);
            const stageLabels = stageOrder.map(k => stageLabelByKey[k]);
            const stageColors = stageOrder.map(k => stageColorByKey[k]);

            // Ranking por Responsável (média de progresso)
            const clampPct = (v) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));
            const deriveProgress = (p) => {
              const stKey = statusKey(p?.status);
              if (stKey === "completed") return 100;
              const val = Number(p?.progress);
              if (Number.isFinite(val)) return clampPct(val);
              const acts = Array.isArray(p?.activities) ? p.activities : [];
              if (acts.length > 0) {
                const total = acts.length;
                const done = acts.filter(a => String(a.status || "").toLowerCase() === "completed").length;
                return clampPct((done / total) * 100);
              }
              const idx = Math.max(0, stageOrder.findIndex(k => k === stKey));
              const denom = Math.max(1, stageOrder.length - 1);
              return Math.round((idx / denom) * 100);
            };
            const respMap = {};
            filteredProjects.forEach(p => {
              const respName =
                (p?.user && (p.user.name || p.user.email)) ||
                (p?.userId ? `Usuário ${p.userId}` : "Sem responsável");
              const prog = deriveProgress(p);
              if (!respMap[respName]) respMap[respName] = { sum: 0, count: 0 };
              respMap[respName].sum += prog;
              respMap[respName].count += 1;
            });
            const ranking = Object.entries(respMap).map(([name, v]) => ({
              name,
              avg: v.count ? v.sum / v.count : 0,
              count: v.count
            })).sort((a, b) => b.avg - a.avg).slice(0, 6);
            const rankLabels = ranking.map(r => r.name);
            const rankValues = ranking.map(r => Number(r.avg.toFixed(1)));
            const rankCounts = ranking.map(r => r.count);
            const barRankOptions = {
              responsive: true,
              indexAxis: 'y',
              maintainAspectRatio: false,
              layout: { padding: { top: 18, right: 24, left: 4, bottom: 8 } },
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (ctx) => {
                      const i = ctx.dataIndex;
                      return `${rankValues[i]}% • ${rankCounts[i]} proj`;
                    }
                  }
                },
                datalabels: {
                  color: palette.text,
                  anchor: "end",
                  align: "right",
                  clamp: true,
                  clip: false,
                  offset: 2,
                  formatter: (v, ctx) => {
                    const i = ctx.dataIndex;
                    return `${v}%  (${rankCounts[i]})`;
                  },
                  font: { weight: "600", size: 10 }
                }
              },
              scales: {
                x: {
                  grid: { color: isDark ? "rgba(255,255,255,0.08)" : "#E6F0FF" },
                  ticks: {
                    color: palette.sub,
                    callback: (val) => `${val}%`,
                    max: 105,
                    min: 0
                  },
                  suggestedMax: 105
                },
                y: { grid: { display: false }, ticks: { color: palette.sub } }
              }
            };
            const barRankData = {
              labels: rankLabels,
              datasets: [
                { label: "Média de progresso", data: rankValues, backgroundColor: palette.blueDark, borderRadius: 6, barThickness: 18, maxBarThickness: 22 }
              ]
            };

            const perDay = {};
            filteredProjects.forEach(p => {
              const k = dayKeyLocal(p.createdAt || Date.now());
              if (k) perDay[k] = (perDay[k] || 0) + 1;
            });
            const dayKeys = Object.keys(perDay).sort();
            const dayLabels = dayKeys;
            const dayValues = dayKeys.map(k => perDay[k]);

            const cardStyle = {
              borderRadius: 12,
              padding: 12,
              border: `1px solid ${palette.border}`,
              boxShadow: palette.shadow,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 6,
              minHeight: 110,
              background: isDark
                ? `linear-gradient(180deg, rgba(99,102,241,0.14) 0%, ${palette.card} 100%)`
                : `linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(255,255,255,0.88) 100%)`,
              overflow: "hidden"
            };
            const chartCardStyle = {
              borderRadius: 12,
              padding: 12,
              border: `1px solid ${palette.border}`,
              boxShadow: palette.shadow,
              background: palette.card,
              minHeight: 280
            };

            const sparkOptions = {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false }, tooltip: { enabled: false }, datalabels: { display: false } },
              scales: { x: { display: false }, y: { display: false } },
              elements: { point: { radius: 0 }, line: { tension: 0.35 } },
              layout: { padding: 0 }
            };

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
                { label: "Concluídos", data: dataDone, backgroundColor: palette.blueLight, borderRadius: 6, maxBarThickness: 22 },
                { label: "Criados", data: dataCreated, backgroundColor: palette.blueDark, borderRadius: 6, maxBarThickness: 22 }
              ]
            };

            const donutOptions = {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: "right", labels: { color: palette.text } },
                datalabels: {
                  color: "#fff",
                  textStrokeColor: "rgba(0,0,0,0.25)",
                  textStrokeWidth: 2,
                  formatter: (v) => (v > 0 ? v : ""),
                  font: { weight: "700", size: 10 }
                }
              },
              cutout: "55%"
            };
            // Compat: variáveis neutras para possíveis referências residuais em builds em cache
            const compLabels = [];
            const compValues = [];
            const compColors = [];
            const donutStages = {
              labels: stageLabels,
              datasets: [{ data: stageCounts, backgroundColor: stageColors, borderWidth: 0 }]
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
                label: "Projetos",
                data: dayValues,
                fill: true,
                borderColor: palette.blueDark,
                backgroundColor: isDark ? "rgba(59,130,246,0.22)" : "rgba(37,99,235,0.10)",
                tension: 0.35
              }]
            };

            return (
              <div style={{ padding: 4, overflowX: "hidden", overflowY: "visible", width: "100%", height: "auto", backgroundColor: palette.bg }}>
                <div data-dashboard-cards style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, margin: 0 }}>
                  {kpis.map((c) => (
                    <Paper
                      key={c.label}
                      elevation={0}
                      style={{
                        borderRadius: 10,
                        padding: '14px 16px',
                        border: `1px solid ${palette.border}`,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        minHeight: 80,
                        background: isDark ? palette.card : "#FFFFFF",
                        transition: "box-shadow 150ms ease",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ fontSize: 11.5, color: palette.sub, fontWeight: 500, lineHeight: 1.3, marginBottom: 2 }}>
                          {c.label}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 28, color: palette.text, fontFeatureSettings: '"tnum"', lineHeight: 1.1 }}>
                          {c.value != null ? c.value : "\u2014"}
                        </div>
                      </div>
                      <div style={{ color: c.color, opacity: 0.7, flexShrink: 0, marginLeft: 12 }}>
                        {c.icon}
                      </div>
                    </Paper>
                  ))}
                </div>

                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Paper style={chartCardStyle}>
                    <div style={{ fontSize: 13, fontWeight: 400, color: palette.text, marginBottom: 8 }}>Criados vs Concluídos</div>
                    <div style={{ height: 220 }}>
                      <Bar options={barOptions} data={barCreatedDone} />
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: palette.sub, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: palette.blueLight, display: "inline-block" }} />
                        Concluídos
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: palette.sub, fontSize: 12 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: palette.blueDark, display: "inline-block" }} />
                        Criados
                      </span>
                    </div>
                  </Paper>
                  <Paper style={chartCardStyle}>
                    <div style={{ fontSize: 13, fontWeight: 400, color: palette.text, marginBottom: 8 }}>Projetos por Status</div>
                    <div style={{ height: 240 }}>
                      <Doughnut data={donutStages} options={donutOptions} />
                    </div>
                  </Paper>
                </div>

                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <Paper style={chartCardStyle}>
                    <div style={{ fontSize: 13, fontWeight: 400, color: palette.text, marginBottom: 8 }}>Ranking por Responsável (média de progresso)</div>
                    <div style={{ height: 240 }}>
                      <Bar data={barRankData} options={barRankOptions} />
                    </div>
                  </Paper>
                  <Paper style={chartCardStyle}>
                    <div style={{ fontSize: 13, fontWeight: 400, color: palette.text, marginBottom: 8 }}>Projetos por Dia</div>
                    <div style={{ height: 220 }}>
                      <Line data={linePerDay} options={lineOptions} />
                    </div>
                  </Paper>
                </div>
              </div>
            );
          })()}
          {viewMode === "list" && <ProjectsList projects={filteredProjects} />}
          {viewMode === "calendar" && <ProjectsCalendar projects={filteredProjects} onCreate={handleCreateProject} />}
          {viewMode === "board" && (
            <div ref={kanbanRef} style={{ height: '100%', width: '100%' }}>
          <ProjectKanbanBoard
                columns={displayColumns}
                projects={filteredProjects}
                users={usersList}
                onProjectClick={(project) => {
                  setSelectedProject(project);
                  setDetailsOpen(true);
                }}
                onMove={async (projectId, sourceCol, destCol) => {
                  if (sourceCol === destCol) return;
                  const id = Number(projectId);
                  // Mapeamento reverso se necessário, mas aqui colunas == status
                  const newStatus = destCol;
                  
                  setProjectsState(prev => {
                    const next = prev.map(p => p.id === id ? { ...p, status: newStatus } : p);
                    return next;
                  });
                  try {
                    await projectsService.update(id, { status: newStatus });
                  } catch (err) {
                    toastError(err);
                  }
                }}
                onDelete={async (project) => {
                  const id = Number(project.id);
                  try {
                    await projectsService.delete(id);
                    setProjectsState(prev => prev.filter(p => p.id !== id));
                    toast.success(t("modules.projects.deleted"));
                  } catch (err) {
                    toastError(err);
                  }
                }}
                onAdd={() => handleCreateProject()}
              />
            </div>
          )}
        </>
      )}
    </ActivitiesStyleLayout>

    <ProjectDetailsModal
      open={detailsOpen}
      onClose={() => setDetailsOpen(false)}
      project={selectedProject}
      users={usersList}
      stages={displayColumns}
      onUpdated={(updated) => {
        setSelectedProject(updated);
        setProjectsState((prev) =>
          prev.map((p) =>
            Number(p.id) === Number(updated.id) ? { ...p, ...updated } : p
          )
        );
      }}
      onDelete={async (project) => {
        const id = Number(project.id);
        try {
          await projectsService.delete(id);
          setProjectsState(prev => prev.filter(p => p.id !== id));
          setDetailsOpen(false);
          toast.success(t("modules.projects.deleted"));
        } catch (err) {
          toastError(err);
        }
      }}
    />

    <CreateProjectModal
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      project={projectToEdit}
      onSave={(savedProject) => {
         setProjectsState((prev) => {
             const savedId = Number(savedProject.id);
             const exists = prev.some(p => Number(p.id) === savedId);
             if (exists) {
                 return prev.map(p => Number(p.id) === savedId ? savedProject : p);
             } else {
                 return [savedProject, ...prev];
             }
         });
         setProjectToEdit(null);
      }}
    />

    <ConfigureKanbanModal
      open={stagesDrawerOpen}
      onClose={() => setStagesDrawerOpen(false)}
      title={t("modules.projects.configureKanban")}
      sectionTitle={t("modules.projects.configureStages")}
      stages={localStages}
      onStagesChange={setLocalStages}
      nameField="title"
      idField="id"
      onSave={() => {
        setProjectStagesState(localStages);
        localStorage.setItem("project-stages", JSON.stringify(localStages));
        setStagesDrawerOpen(false);
      }}
    />
    </>
  );
};

export default Projects;
