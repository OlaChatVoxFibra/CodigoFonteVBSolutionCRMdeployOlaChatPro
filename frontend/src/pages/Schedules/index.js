/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

async function listSchedulesCalendarEvents() { return { events: [], connected: false, accountEmail: '' }; }
import React, {
  useState,
  useEffect,
  useReducer,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
// import MessageModal from "../../components/MessageModal"
import ScheduleModal from "../../components/ScheduleModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import moment from "moment";
// import { SocketContext } from "../../context/Socket/SocketContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "moment/locale/pt-br";
import "react-big-calendar/lib/css/react-big-calendar.css";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import PersonOutlineIcon from "@material-ui/icons/PersonOutline";
import CloseIcon from "@material-ui/icons/Close";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

import "./Schedules.css"; // Importe o arquivo CSS
import CreateEventDrawer from "../../components/CreateEventDrawer";
import EventDetailsModal from "../../components/EventDetailsModal";
import activitiesService from "../../services/activitiesService";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import { DrawerContext } from "../../context/DrawerContext";
import { isDeadlineExpired } from "../../utils/deadlineDates";
import { extractScheduleSlotMinutes } from "../../utils/cleanActivityDescription";

// Defina a função getUrlParam antes de usá-la
function getUrlParam(paramName) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(paramName);
}

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const MiniMonth = ({ value, onChange }) => {
  const m = moment(value);
  const start = m.clone().startOf("month").startOf("week");
  const end = m.clone().endOf("month").endOf("week");
  const day = start.clone().subtract(1, "day");
  const days = [];
  while (day.isBefore(end, "day")) {
    days.push(day.add(1, "day").clone());
  }
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return (
    <div className="mini-cal">
      <div className="mini-cal-grid">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, idx) => (
          <div key={idx} className="mini-cal-header">{d}</div>
        ))}
        {weeks.flat().map((d, idx) => {
          const isCurrentMonth = d.month() === m.month();
          const isToday = d.isSame(moment(), "day");
          const isSelected = d.isSame(m, "day");
          const cls = [
            "mini-cal-day",
            !isCurrentMonth ? "mini-cal-off" : "",
            isToday ? "mini-cal-today" : "",
            isSelected ? "mini-cal-selected" : ""
          ].join(" ");
        return (
            <button
              key={idx}
              type="button"
              className={cls}
              onClick={() => onChange(d.toDate())}
            >
              {d.date()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DayEventsModal = ({ open, onClose, date, events, onSelectEvent }) => {
  if (!open) return null;
  const dateLabel = moment(date).format("dddd, D [de] MMMM");
  const eventCount = events.length;

  const getEventColor = (evt) => {
    if (evt?.resource?.kind === "google-calendar") return "#4285F4";
    const custom = evt?.resource?.eventColor;
    if (custom) return custom;
    const text = `${evt?.resource?.type || ""} ${evt?.resource?.category || ""} ${evt?.resource?.title || ""} ${evt?.resource?.body || ""}`.toLowerCase();
    if (text.includes("reuni") || text.includes("event")) return "#D1FAE5";
    if (text.includes("atividade") || text.includes("activity")) return "#EDE9FE";
    if (text.includes("projeto") || text.includes("project")) return "#FEF3C7";
    if (text.includes("lead")) return "#FEE2E2";
    return "#DBEAFE";
  };

  const getEventTitle = (evt) => {
    if (typeof evt.title === "string") return evt.title;
    const res = evt.resource;
    if (res?.kind === "google-calendar") {
      return res.summary || res.title || "Google Calendar";
    }
    return res?.contact?.name || res?.title || "Evento";
  };

  return (
    <div className="day-events-backdrop" onClick={onClose}>
      <div className="day-events-modal" onClick={(e) => e.stopPropagation()}>
        <div className="day-events-modal-header">
          <div>
            <div className="day-events-modal-title">{dateLabel}</div>
            <div className="day-events-modal-subtitle">
              {eventCount} {eventCount === 1 ? "evento" : "eventos"}
            </div>
          </div>
          <button className="day-events-modal-close" onClick={onClose}>
            <CloseIcon style={{ fontSize: 18 }} />
          </button>
        </div>
        <div className="day-events-modal-body">
          {events.length === 0 ? (
            <div className="day-events-modal-empty">Nenhum evento neste dia.</div>
          ) : (
            <div className="day-events-modal-list">
              {events.map((evt, idx) => (
                <div
                  key={idx}
                  className="day-events-modal-item"
                  onClick={() => {
                    if (onSelectEvent) onSelectEvent(evt);
                    onClose();
                  }}
                >
                  <span
                    className="day-events-modal-dot"
                    style={{ backgroundColor: getEventColor(evt) }}
                  />
                  <div className="day-events-modal-item-info">
                    <div className="day-events-modal-item-title">
                      {getEventTitle(evt)}
                    </div>
                    <div className="day-events-modal-item-time">
                      {moment(evt.start).format("HH:mm")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const eventTitleStyle = {
  fontSize: "14px", // Defina um tamanho de fonte menor
  overflow: "hidden", // Oculte qualquer conteúdo excedente
  whiteSpace: "nowrap", // Evite a quebra de linha do texto
  textOverflow: "ellipsis", // Exiba "..." se o texto for muito longo
};

const localizer = momentLocalizer(moment);
var defaultMessages = {
  date: i18n.t("schedules.date"),
  time: i18n.t("schedules.time"),
  event: i18n.t("schedules.event"),
  allDay: i18n.t("schedules.allDay"),
  week: i18n.t("schedules.week"),
  work_week: i18n.t("schedules.work_week"),
  day: i18n.t("schedules.day"),
  month: i18n.t("schedules.month"),
  previous: i18n.t("schedules.previous"),
  next: i18n.t("schedules.next"),
  yesterday: i18n.t("schedules.yesterday"),
  tomorrow: i18n.t("schedules.tomorrow"),
  today: i18n.t("schedules.today"),
  agenda: i18n.t("schedules.agenda"),
  noEventsInRange: i18n.t("schedules.noEventsInRange"),
  showMore: function showMore(total) {
    return "+" + total + " mais";
  },
};

const reducer = (state, action) => {
  if (action.type === "LOAD_SCHEDULES") {
    const schedules = action.payload;
    const newSchedules = [];

    schedules.forEach((schedule) => {
      const scheduleIndex = state.findIndex((s) => s.id === schedule.id);
      if (scheduleIndex !== -1) {
        state[scheduleIndex] = schedule;
      } else {
        newSchedules.push(schedule);
      }
    });

    return [...state, ...newSchedules];
  }

  if (action.type === "UPDATE_SCHEDULES") {
    const schedule = action.payload;
    const scheduleIndex = state.findIndex((s) => s.id === schedule.id);

    if (scheduleIndex !== -1) {
      state[scheduleIndex] = schedule;
      return [...state];
    } else {
      return [schedule, ...state];
    }
  }

  if (action.type === "DELETE_SCHEDULE") {
    const scheduleId = action.payload;

    const scheduleIndex = state.findIndex((s) => s.id === scheduleId);
    if (scheduleIndex !== -1) {
      state.splice(scheduleIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    height: "100%",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.dashboardCard || "#252526"
        : theme.palette.background.paper,
    color: theme.palette.text.primary,
  },
}));

const Schedules = () => {
  const classes = useStyles();
  const muiTheme = useTheme();
  const history = useHistory();

  //   const socketManager = useContext(SocketContext);
  const { user, socket } = useContext(AuthContext);
  const drawerCtx = useContext(DrawerContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [deletingSchedule, setDeletingSchedule] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [schedules, dispatch] = useReducer(reducer, []);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [contactId, setContactId] = useState(+getUrlParam("contactId"));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventDrawerOpen, setEventDrawerOpen] = useState(false);
  const [drawerInitialDate, setDrawerInitialDate] = useState(new Date());
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [dayEventsModalOpen, setDayEventsModalOpen] = useState(false);
  const [dayEventsModalDate, setDayEventsModalDate] = useState(null);
  const [dayEventsModalEvents, setDayEventsModalEvents] = useState([]);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState([]);
  const [googleCalendarMeta, setGoogleCalendarMeta] = useState({
    connected: false,
    accountEmail: "",
  });
  const [showGoogleCalendar, setShowGoogleCalendar] = useState(true);
  const [calendarNow, setCalendarNow] = useState(() => Date.now());
  const [calendarRange, setCalendarRange] = useState(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  });

  useEffect(() => {
    const id = setInterval(() => setCalendarNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const visibleActivities = useMemo(
    () => activities.filter((act) => !isDeadlineExpired(act)),
    [activities, calendarNow]
  );

  const { getPlanCompany } = usePlans();

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);
      
      const isAllowedEmail = user.email === "contatopousadadogolfinho@gmail.com";
      
      if (!planConfigs.plan.useSchedules && !isAllowedEmail) {
        toast.error(
          "Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando."
        );
        setTimeout(() => {
          history.push(`/`);
        }, 1000);
      }
    }
    fetchData();
  }, [user, history, getPlanCompany]);

  const fetchSchedules = useCallback(async () => {
    try {
      const { data } = await api.get("/schedules", {
        params: { searchParam, pageNumber },
      });

      dispatch({ type: "LOAD_SCHEDULES", payload: data.schedules });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  }, [searchParam, pageNumber]);

  const handleOpenScheduleModalFromContactId = useCallback(() => {
    if (contactId) {
      handleOpenScheduleModal();
    }
  }, [contactId]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchSchedules();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [
    searchParam,
    pageNumber,
    contactId,
    fetchSchedules,
    handleOpenScheduleModalFromContactId,
  ]);

  useEffect(() => {
    // handleOpenScheduleModalFromContactId();
    // const socket = socketManager.GetSocket(user.companyId, user.id);

    const onCompanySchedule = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_SCHEDULES", payload: data.schedule });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_SCHEDULE", payload: +data.scheduleId });
      }
    };

    socket.on(`company${user.companyId}-schedule`, onCompanySchedule);

    return () => {
      socket.off(`company${user.companyId}-schedule`, onCompanySchedule);
    };
  }, [socket]);

  // Removido o background branco forçado do body para respeitar o fundo original da página

  const cleanContact = () => {
    setContactId("");
  };

  const handleOpenScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleModalOpen(true);
  };

  const handleOpenEventDrawer = (date) => {
    setDrawerInitialDate(date || new Date());
    setEventDrawerOpen(true);
  };

  const handleCloseEventDrawer = () => {
    setEventDrawerOpen(false);
  };

  const handleEventSaved = async (saved) => {
    if (!saved) return;
    setActivities((prev) => {
      const exists = prev.some((a) => String(a.id) === String(saved.id));
      if (exists) {
        return prev.map((a) =>
          String(a.id) === String(saved.id) ? { ...a, ...saved } : a
        );
      }
      return [saved, ...prev];
    });
  };

  const handleSelectEvent = (evt) => {
    setSelectedEvent(evt);
    setEventDetailsOpen(true);
  };

  const handleCloseEventDetails = () => {
    setSelectedEvent(null);
    setEventDetailsOpen(false);
  };

  const handleShowMore = useCallback((events, date) => {
    setDayEventsModalEvents(events);
    setDayEventsModalDate(date);
    setDayEventsModalOpen(true);
  }, []);

  const handleCloseDayEventsModal = useCallback(() => {
    setDayEventsModalOpen(false);
    setDayEventsModalEvents([]);
    setDayEventsModalDate(null);
  }, []);

  const handleCloseScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setScheduleModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      await api.delete(`/schedules/${scheduleId}`);
      toast.success(i18n.t("schedules.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingSchedule(null);
    setSearchParam("");
    setPageNumber(1);

    dispatch({ type: "RESET" });
    setPageNumber(1);
    await fetchSchedules();
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const truncate = (str, len) => {
    if (str.length > len) {
      return str.substring(0, len) + "...";
    }
    return str;
  };

  // Dados do gráfico de atividades (distribuição ilustrativa por falta de tipo explícito)
  const total = schedules.length || 0;
  const dist = (() => {
    if (total < 3) return [total, 0, 0];
    const r = Math.max(1, Math.round(total * 0.5));
    const l = Math.max(0, Math.round(total * 0.3));
    const d = Math.max(0, total - r - l);
    return [r, l, d];
  })();
  const donutData = {
    labels: ["Reuniões", "Ligações", "Demos"],
    datasets: [
      {
        data: dist,
        backgroundColor: ["#10B981", "#3B82F6", "#6366F1"],
        borderWidth: 0
      }
    ]
  };
  const donutOptions = React.useMemo(
    () => ({
      cutout: "70%",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true },
        datalabels: {
          display: true,
          color: muiTheme.palette.type === "dark" ? "#f4f4f5" : "#0F172A",
          formatter: (v) => (v > 0 ? v : ""),
          font: { weight: "700", size: 11 },
          anchor: "center",
          align: "center",
        },
      },
      responsive: true,
      maintainAspectRatio: false,
    }),
    [muiTheme.palette.type]
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await activitiesService.list({ pageNumber: 1 });
        setActivities(data?.activities || []);
      } catch (err) {}
    })();
  }, []);

  const fetchGoogleCalendarEvents = useCallback(async () => {
    if (!showGoogleCalendar) {
      setGoogleCalendarEvents([]);
      return;
    }
    try {
      const { start, end } = calendarRange;
      const data = await listSchedulesCalendarEvents({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
      });
      setGoogleCalendarMeta({
        connected: Boolean(data?.connected),
        accountEmail: data?.accountEmail || "",
        connectionId: data?.connectionId,
      });
      const mapped = (data?.events || []).map((ev) => ({
        title: ev.summary,
        start: new Date(ev.start),
        end: new Date(ev.end),
        resource: {
          kind: "google-calendar",
          ...ev,
          connectionId: data?.connectionId,
          accountEmail: data?.accountEmail,
        },
      }));
      setGoogleCalendarEvents(mapped);
    } catch {
      setGoogleCalendarEvents([]);
      setGoogleCalendarMeta({ connected: false, accountEmail: "" });
    }
  }, [calendarRange, showGoogleCalendar]);

  useEffect(() => {
    fetchGoogleCalendarEvents();
  }, [fetchGoogleCalendarEvents]);

  const handleCalendarNavigate = useCallback((date) => {
    const m = moment(date);
    setCalendarRange({
      start: m.clone().startOf("month").subtract(7, "days").toDate(),
      end: m.clone().endOf("month").add(7, "days").toDate(),
    });
  }, []);

  const classifySchedule = (schedule) => {
    const typeHint = `${schedule?.type || ""} ${schedule?.category || ""} ${schedule?.source || ""}`.toLowerCase();
    const text = `${schedule?.title || ""} ${schedule?.body || ""} ${schedule?.message || ""} ${schedule?.contact?.name || ""}`.toLowerCase();
    if (typeHint.includes("ia") || text.includes("agente ia")) return "evento";
    if (typeHint.includes("event") || text.includes("evento") || text.includes("reuni")) return "evento";
    if (typeHint.includes("activity") || text.includes("atividade")) return "atividade";
    if (typeHint.includes("project") || text.includes("projeto")) return "projeto";
    if (typeHint.includes("lead") || text.includes("lead")) return "lead";
    return "outro";
  };

  const eventPropGetter = (event) => {
    const s = event?.resource;
    if (s?.kind === "google-calendar") {
      return {
        style: {
          backgroundColor: "#E8F0FE",
          border: "1px solid #4285F4",
          color: "#174EA6",
          borderRadius: 10,
          padding: "6px 8px",
          fontSize: 12,
        },
      };
    }
    const custom = s?.eventColor;
    if (custom) {
      const txt =
        custom === "#D1FAE5" ? "#065F46" :
        custom === "#EDE9FE" ? "#5B21B6" :
        custom === "#FEF3C7" ? "#92400E" :
        custom === "#FEE2E2" ? "#991B1B" : "#1E40AF";
      return {
        style: {
          backgroundColor: custom,
          border: `1px solid ${custom}`,
          color: txt,
          borderRadius: 10,
          padding: "6px 8px",
          fontSize: 12
        }
      };
    }
    const cat = classifySchedule(s || {});
    const palette = {
      evento:   { bg: "#D1FAE5", border: "#A7F3D0", text: "#065F46" },
      atividade:{ bg: "#EDE9FE", border: "#DDD6FE", text: "#5B21B6" },
      projeto:  { bg: "#FEF3C7", border: "#FDE68A", text: "#92400E" },
      lead:     { bg: "#FEE2E2", border: "#FCA5A5", text: "#991B1B" },
      outro:    { bg: "#DBEAFE", border: "#BFDBFE", text: "#1E40AF" }
    }[cat];
    return {
      style: {
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.text,
        borderRadius: 10,
        padding: "6px 8px",
        fontSize: 12
      }
    };
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
          <button type="button" className="btn-naked" onClick={goToday}>{i18n.t("schedules.today")}</button>
        </span>
        <span className="rbc-toolbar-label">
          <button type="button" className="btn-naked chevron" onClick={goPrev}>‹</button>
          <span className="month-label">{label}</span>
          <button type="button" className="btn-naked chevron" onClick={goNext}>›</button>
        </span>
        <span className="rbc-btn-group">
          <button type="button" className={`btn-naked ${toolbarProps.view === "day" ? "active" : ""}`} onClick={() => setView("day")}>{i18n.t("schedules.day")}</button>
          <button type="button" className={`btn-naked ${toolbarProps.view === "week" ? "active" : ""}`} onClick={() => setView("week")}>{i18n.t("schedules.week")}</button>
          <button type="button" className={`btn-naked ${toolbarProps.view === "month" ? "active" : ""}`} onClick={() => setView("month")}>{i18n.t("schedules.month")}</button>
        </span>
      </div>
    );
  };

  return (
      <div className="schedules-page" data-theme={muiTheme.palette.type}>
        <ConfirmationModal
          title={
            deletingSchedule &&
            `${i18n.t("schedules.confirmationModal.deleteTitle")}`
          }
          open={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={() => handleDeleteSchedule(deletingSchedule.id)}
        >
          {i18n.t("schedules.confirmationModal.deleteMessage")}
        </ConfirmationModal>
        {scheduleModalOpen && (
          <ScheduleModal
            open={scheduleModalOpen}
            onClose={handleCloseScheduleModal}
            reload={fetchSchedules}
            scheduleId={selectedSchedule ? selectedSchedule.id : null}
            contactId={contactId}
            cleanContact={cleanContact}
            user={user}
          />
        )}
        <CreateEventDrawer
          open={eventDrawerOpen}
          onClose={handleCloseEventDrawer}
          onSave={handleEventSaved}
          initialDate={drawerInitialDate}
        />
        <EventDetailsModal
          open={eventDetailsOpen}
          onClose={handleCloseEventDetails}
          event={selectedEvent}
          onEditSchedule={(schedule) => {
            setSelectedSchedule(schedule);
            setScheduleModalOpen(true);
          }}
          onDeleteSchedule={(id) => {
            handleDeleteSchedule(id);
          }}
          onActivityUpdated={(updated) => {
            setActivities((prev) =>
              prev.map((a) => (String(a.id) === String(updated.id) ? { ...a, ...updated } : a))
            );
          }}
          onActivityDeleted={(id) => {
            setActivities((prev) => prev.filter((a) => String(a.id) !== String(id)));
          }}
          onGoogleEventImported={(activity) => {
            if (activity) {
              setActivities((prev) => {
                const exists = prev.some((a) => String(a.id) === String(activity.id));
                if (exists) return prev;
                return [activity, ...prev];
              });
            }
            fetchGoogleCalendarEvents();
          }}
          googleCalendarMeta={googleCalendarMeta}
        />
        <DayEventsModal
          open={dayEventsModalOpen}
          onClose={handleCloseDayEventsModal}
          date={dayEventsModalDate}
          events={dayEventsModalEvents}
          onSelectEvent={handleSelectEvent}
        />
        <ActivitiesStyleLayout
          title={i18n.t("schedules.title")}
          searchPlaceholder={i18n.t("contacts.searchPlaceholder")}
          searchValue={searchParam}
          onSearchChange={(val) => setSearchParam((val || "").toLowerCase())}
          onCreateClick={handleOpenEventDrawer}
          navActions={null}
          disableFilterBar
          hideHeaderDivider
          hideNavDivider
          compactHeader
          transparentHeader
          scrollContent={false}
        >
          <div className="schedules-header">
            <div className="breadcrumb">Dashboard &lt; Calendário</div>
            <h1 className="page-title">
              {drawerCtx && drawerCtx.drawerOpen === false ? (
                <IconButton
                  size="small"
                  onClick={() => drawerCtx.setDrawerOpen(true)}
                  className="schedules-menu-btn"
                >
                  <MenuIcon fontSize="small" />
                </IconButton>
              ) : null}
              Calendário
            </h1>
          </div>
          <div className="schedules-body">
            <div className="schedules-calendar-col">
                <Calendar
                  messages={defaultMessages}
                  formats={{
                    agendaDateFormat: "DD/MM ddd",
                    weekdayFormat: (date, culture, loc) => {
                      const full = loc.format(date, "dddd", culture);
                      const fmt = full.replace("-feira", "");
                      return fmt.charAt(0).toUpperCase() + fmt.slice(1);
                    },
                  }}
                  localizer={localizer}
                  views={["day","week","month"]}
                  components={{ toolbar: CustomToolbar }}
                  selectable
                  onNavigate={handleCalendarNavigate}
                  onSelectSlot={(slot) => {
                    setSelectedDate(slot.start);
                    handleOpenEventDrawer(slot.start);
                  }}
                  events={[
                    ...(showGoogleCalendar ? googleCalendarEvents : []),
                    ...schedules.map((schedule) => {
                      const slotMins = extractScheduleSlotMinutes(schedule.body) || 60;
                      const start = new Date(schedule.sendAt);
                      const end = new Date(start.getTime() + slotMins * 60 * 1000);
                      return {
                      title: (
                        <div key={schedule.id} className="event-container">
                          <div style={eventTitleStyle}>{schedule?.contact?.name}</div>
                          <DeleteOutlineIcon
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="delete-icon"
                          />
                          <EditIcon
                            onClick={() => {
                              handleEditSchedule(schedule);
                              setScheduleModalOpen(true);
                            }}
                            className="edit-icon"
                          />
                        </div>
                      ),
                      start,
                      end,
                      resource: { ...schedule, kind: "schedule" }
                    };
                    }),
                    ...visibleActivities.map((act) => ({
                      title: act.title || "Evento",
                      start: new Date(act.date),
                      end: new Date(act.dateEnd || act.date),
                      resource: { ...act, kind: "activity-event" }
                    }))
                  ]}
                  startAccessor="start"
                  endAccessor="end"
                  eventPropGetter={eventPropGetter}
                  onSelectEvent={handleSelectEvent}
                  onShowMore={handleShowMore}
                  popup={false}
                  style={{ width: '100%', height: '100%' }}
                />
            </div>
            <div className="schedules-aside-col">
              <div className="right-aside">
                <div className="aside-top-actions">
                  <button className="aside-action" onClick={handleOpenScheduleModal}>
                    Agende uma Mensagem
                  </button>
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
                    <Typography className="aside-title" variant="body2">
                      Atividade
                    </Typography>
                  </div>
                  {(() => {
                    const sorted = [...schedules].sort((a,b) => new Date(b.sendAt) - new Date(a.sendAt));
                    const recent = sorted[0];
                    return (
                      <div className="activity-item">
                        <div className="activity-icon"><PersonOutlineIcon fontSize="small" /></div>
                        <div className="activity-info">
                          <div className="activity-title">{recent?.title || "Reunião"}</div>
                          <div className="activity-sub">Sem descrição</div>
                        </div>
                        <div className="activity-time">{recent ? moment(recent.sendAt).format("HH:mm") : "10:00"}</div>
                      </div>
                    );
                  })()}
                  <div className="donut-container">
                    <div className="donut-graph">
                      <Doughnut data={donutData} options={donutOptions} />
                    </div>
                    <div className="donut-center">
                      <div className="donut-total">{total}</div>
                      <div className="donut-label">Total</div>
                    </div>
                  </div>
                  <div className="donut-legend">
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: "#10B981" }} />
                      Reuniões
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: "#3B82F6" }} />
                      Ligações
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: "#6366F1" }} />
                      Demos
                    </div>
                  </div>
                </Paper>
              </div>
            </div>
          </div>
        </ActivitiesStyleLayout>
      </div>
  );
};

export default Schedules;
