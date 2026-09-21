/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  List as ListIcon,
  CalendarToday as CalendarIcon,
  ViewWeek as KanbanIcon
} from "@material-ui/icons";
import DashboardIcon from "@material-ui/icons/Dashboard";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  TextField,
  Popover,
  Button,
  Typography,
  Avatar,
  IconButton
} from "@material-ui/core";
import MoreHorizIcon from "@material-ui/icons/MoreHoriz";
import BusinessCenterIcon from "@material-ui/icons/BusinessCenter";
import AddIcon from "@material-ui/icons/Add";
import PhoneIcon from "@material-ui/icons/Phone";
import PersonOutlineIcon from "@material-ui/icons/PersonOutline";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import CloseIcon from "@material-ui/icons/Close";
import QueryBuilderIcon from "@material-ui/icons/QueryBuilder";
import ZoomOutMapIcon from "@material-ui/icons/ZoomOutMap";
import FullscreenExitIcon from "@material-ui/icons/FullscreenExit";
import SettingsIcon from "@material-ui/icons/Settings";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import BrainPreviewMini from "../../components/BrainPreviewMini";
import PipelineDrawer from "../../components/PipelineDrawer";
import leadPipelinesService from "../../services/leadPipelinesService";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../Schedules/Schedules.css";
import "moment/locale/pt-br";
import useLeadsSales from "../../hooks/useLeadsSales";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import CreateLeadSaleModal from "../../components/CreateLeadSaleModal";
import LeadSaleCongratsModal from "../../components/LeadSaleCongratsModal";
import LeadSaleDeleteModal from "../../components/LeadSaleDeleteModal";
import LeadCompanyModal from "../../components/LeadCompanyModal";
import convertedLeadsService from "../../services/convertedLeadsService";
import {
  resolveWonStageKey,
  getWonStageLabel,
  leadToConvertedCompanyInitialValues,
  isLeadSaleWon,
} from "../../utils/leadSaleFlowHelpers";
import { AuthContext } from "../../context/Auth/AuthContext";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import leadsSalesService from "../../services/leadsSalesService";
import { toast } from "react-toastify";
import LocalOfferOutlinedIcon from "@material-ui/icons/LocalOfferOutlined";
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
import { useTheme } from "@material-ui/core/styles";

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

const ContactAvatar = ({ contact, lead, classes }) => {
  const [src, setSrc] = useState(contact?.urlPicture || contact?.profilePicUrl || "");
  const name = lead?.name || contact?.name || "Lead";
  const number = lead?.phone || contact?.number;

  useEffect(() => {
    setSrc(contact?.urlPicture || contact?.profilePicUrl || "");
  }, [contact?.urlPicture, contact?.profilePicUrl]);

  useEffect(() => {
    let cancelled = false;
    async function fetchProfile() {
      if (src || !number) return;
      try {
        const { data } = await api.get(`/contacts/profile/${encodeURIComponent(number)}`);
        const fetched =
          data?.profilePicUrl || data?.urlPicture || (typeof data === "string" ? data : "");
        if (!cancelled && fetched) setSrc(fetched);
      } catch (e) {
        // ignore
      }
    }
    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [src, number]);

  return (
    <Avatar
      className={classes.cardAvatarTopLeft}
      src={src || undefined}
      imgProps={{ onError: () => setSrc("") }}
    >
      {initials(name)}
    </Avatar>
  );
};

const useStyles = makeStyles((theme) => ({
  thinScroll: {
    '&::-webkit-scrollbar': {
      width: 4,
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
      borderRadius: 4,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
    },
    scrollbarWidth: 'thin',
    scrollbarColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.15) transparent' : 'rgba(0,0,0,0.12) transparent',
  },
  root: {
    flexGrow: 1,
    height: "100%",
    overflow: "hidden",
  },
  fixedContent: {
    width: "100%",
    maxWidth: "100%",
    margin: 0,
    padding: 0,
    boxSizing: "border-box",
  },
  board: {
    display: "grid",
    gridAutoRows: "1fr",
    width: "100%",
    overflowX: "auto",
    gridAutoFlow: "column",
    gridAutoColumns: "minmax(0, 1fr)",
    padding: 12,
    gap: 16,
    ...theme.scrollbarStyles,
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": {
      display: "none"
    }
  },
  column: {
    minWidth: 0,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    maxHeight: "100%",
  },
  columnHeader: {
    background:
      theme.palette.type === "dark"
        ? theme.palette.dashboardCard || "#353538"
        : "#fff",
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.1)"
        : "1px solid #E5E7EB",
    borderRadius: 12,
    padding: 12,
    minHeight: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow:
      theme.palette.type === "dark"
        ? "0 2px 10px rgba(0,0,0,0.35)"
        : "0 1px 3px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1), border-color 0.25s ease",
    "&:hover": {
      transform: "translateY(-3px)",
      boxShadow:
        theme.palette.type === "dark"
          ? "0 8px 24px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(0, 0, 0, 0.3)"
          : "0 8px 24px rgba(15, 23, 42, 0.12), 0 4px 10px rgba(15, 23, 42, 0.06)",
    },
    [theme.breakpoints.down("sm")]: {
      padding: 10,
      minHeight: 50,
    },
  },
  columnLabel: {
    fontWeight: 600,
    color: theme.palette.type === "dark" ? "#f4f4f5" : "#111827",
    fontSize: 14,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  columnMeta: {
    display: "flex",
    gap: 16,
    alignItems: "baseline",
    color: theme.palette.type === "dark" ? "#d1d5db" : "#6B7280",
    fontSize: 12,
  },
  columnRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
    whiteSpace: "nowrap",
  },
  columnCount: {
    fontSize: 12,
    color: theme.palette.type === "dark" ? "#d1d5db" : "#6B7280",
    lineHeight: 1.2,
    padding: 0,
  },
  columnMenuBtn: {
    width: 28,
    height: 28,
    padding: 0,
    color: theme.palette.type === "dark" ? "#e5e7eb" : "#9CA3AF",
  },
  columnStripe: {
    width: 5,
    alignSelf: "stretch",
    borderRadius: 12,
    marginRight: 12,
  },
  cardsWrapper: {
    marginTop: 10,
    padding: "4px 0 8px",
    width: "100%",
    flex: 1,
    alignSelf: "flex-start",
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.inputBackground
        : "#F3F4F6",
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid #E5E7EB",
    borderRadius: 10,
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("sm")]: {
      marginTop: 8,
    },
  },
  card: {
    background:
      theme.palette.type === "dark"
        ? theme.palette.dashboardCard || "#353538"
        : "#FFFFFF",
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.1)"
        : "1px solid #E5E7EB",
    borderRadius: 10,
    padding: "8px 10px 10px 40px",
    marginBottom: 10,
    width: "100%",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    cursor: "pointer",
    transition: "box-shadow 0.25s cubic-bezier(0.4,0,0.2,1), transform 0.25s cubic-bezier(0.4,0,0.2,1), border-color 0.25s ease",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    aspectRatio: "auto",
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
    [theme.breakpoints.down("sm")]: {
      marginBottom: 8,
      padding: "8px 8px 10px 38px",
      aspectRatio: "auto",
    },
  },
  cardTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardDeleteBtn: {
    position: "absolute",
    bottom: 2,
    right: 6,
    width: 20,
    height: 20,
    minWidth: 20,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "#EF4444",
    transition: "all 120ms ease",
    "&:hover": {
      color: "#B91C1C",
    }
  },
  cardApproveBtn: {
    position: "absolute",
    bottom: 2,
    left: 6,
    width: 20,
    height: 20,
    minWidth: 20,
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    color: "#10B981",
    transition: "all 120ms ease",
    "&:hover": {
      color: "#059669",
    }
  },
  cardTimeBadge: {
    position: "absolute",
    bottom: 32,
    right: 8,
    fontSize: 10,
    color: "#6B7280",
    backgroundColor: "rgba(0,0,0,0.02)",
    border: "none",
    borderRadius: 6,
    padding: "1px 4px"
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 0
  },
  avatar: {
    width: 26,
    height: 26,
    fontSize: 12,
    background: "#F3F4F6",
    color: "#374151",
  },
  cardAvatarTopRight: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    fontSize: 11,
    background: "#F3F4F6",
    color: "#374151",
    border: "1px solid #E5E7EB",
  },
  cardCrmBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    pointerEvents: "auto",
  },
  cardAvatarTopLeft: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 26,
    height: 26,
    fontSize: 12,
    background: "#F3F4F6",
    color: "#374151",
    border: "1px solid #E5E7EB",
  },
  avatarStatusDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 9999,
    backgroundColor: "#10B981",
    top: 28,
    left: 28,
    zIndex: 2,
    border: "2px solid #FFFFFF"
  },
  cardTitle: {
    fontWeight: 600,
    fontSize: "clamp(9px, 1.1vw, 12px)",
    color: theme.palette.type === "dark" ? "#f4f4f5" : "#111827",
    lineHeight: 1.25,
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  cardSub: {
    fontSize: "clamp(8px, 1vw, 11px)",
    fontWeight: 400,
    color: theme.palette.type === "dark" ? "#e5e7eb" : "#9CA3AF",
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tagChip: {
    fontSize: 8.5,
    color: "#6B7280",
    backgroundColor: "rgba(0,0,0,0.03)",
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    padding: "0 4px",
    lineHeight: "14px"
  },
  cardValue: {
    marginTop: 4,
    fontWeight: 700,
    color: theme.palette.type === "dark" ? "#34d399" : "#059669",
    fontSize: "clamp(7.5px, 0.95vw, 10px)",
    textAlign: "left",
    alignSelf: "flex-start",
  },
  cardRow: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    marginTop: 3,
    color: theme.palette.type === "dark" ? "#d1d5db" : "#6B7280",
    fontSize: "clamp(7.5px, 0.85vw, 9.5px)",
    alignSelf: "flex-start",
    width: "100%",
    justifyContent: "flex-start",
  },
  cardEdgeLeft: {
    marginLeft: -36
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  cardBodyLeft: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    width: "100%",
    minWidth: 0,
  },
  cardTagRow: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
    alignSelf: "flex-start",
    justifyContent: "flex-start",
  },
  cardResponsible: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    marginTop: 1,
    color: "#4B5563",
    fontSize: 8,
    alignSelf: "flex-start",
    justifyContent: "flex-start",
  },
  addLeadBtn: {
    marginTop: 8,
    borderRadius: 12,
    textTransform: "none",
    borderStyle: "dashed",
    minHeight: 40,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0,
    ...(theme.palette.type === "dark"
      ? {
          color: "rgba(244, 244, 245, 0.92)",
          borderColor: "rgba(255, 255, 255, 0.22)",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          "& .MuiSvgIcon-root": {
            fontSize: 16,
            color: "rgba(244, 244, 245, 0.85)",
          },
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderColor: "rgba(255, 255, 255, 0.35)",
            color: "#ffffff",
            "& .MuiSvgIcon-root": {
              color: "#ffffff",
            },
          },
        }
      : {
          color: "rgba(107, 114, 128, 0.85)",
          borderColor: "rgba(209, 213, 219, 0.7)",
          backgroundColor: "rgba(249, 250, 251, 0.45)",
          "& .MuiSvgIcon-root": {
            fontSize: 16,
            color: "rgba(107, 114, 128, 0.8)",
          },
          "&:hover": {
            backgroundColor: "rgba(243, 244, 246, 0.6)",
            borderColor: "rgba(209, 213, 219, 1)",
          },
        }),
  },
  popoverContent: {
    padding: theme.spacing(2),
    maxWidth: 360,
    color: theme.palette.text.primary,
    "& .MuiButton-outlined": {
      color: theme.palette.text.primary,
      borderColor:
        theme.palette.type === "dark"
          ? "rgba(255,255,255,0.35)"
          : "rgba(0,0,0,0.23)"
    },
    "& .MuiButton-contained": {
      color: theme.palette.getContrastText(theme.palette.primary.main)
    }
  },
  popoverGrid: {
    width: 320
  },
  /** Filtro Pipeline — popover enquadrado, espaçamento simétrico (só UI) */
  pipelinePopoverPaper: {
    borderRadius: 12,
    overflow: "hidden",
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid rgba(15, 23, 42, 0.08)",
    boxShadow:
      theme.palette.type === "dark"
        ? "0 12px 40px rgba(0,0,0,0.5)"
        : "0 10px 28px rgba(15, 23, 42, 0.1)",
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.background.paper
        : theme.palette.background.paper,
    marginTop: theme.spacing(0.5),
  },
  pipelinePopoverInner: {
    minWidth: 288,
    maxWidth: "min(320px, calc(100vw - 32px))",
    boxSizing: "border-box",
    color: theme.palette.type === "dark" ? "#f1f5f9" : theme.palette.text.primary,
  },
  pipelinePopoverTitle: {
    display: "block",
    padding: theme.spacing(1.5, 2, 1.25),
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.82)"
        : "rgba(71, 85, 105, 0.95)",
    borderBottom: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(148, 163, 184, 0.35)"
    }`,
  },
  pipelinePopoverList: {
    padding: theme.spacing(1.75, 2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    maxHeight: 280,
    overflowY: "auto",
    ...theme.scrollbarStylesSoft,
    ...(theme.palette.type === "dark"
      ? {
          "& .MuiButton-outlinedPrimary": {
            color: "#f8fafc",
            borderColor: "rgba(248, 250, 252, 0.5)",
            "&:hover": {
              color: "#ffffff",
              borderColor: "rgba(255,255,255,0.85)",
              backgroundColor: "rgba(255,255,255,0.08)",
            },
          },
          "& .MuiButton-containedPrimary": {
            color: theme.palette.getContrastText(theme.palette.primary.main),
          },
        }
      : {}),
  },
  pipelineOptionButton: {
    textTransform: "none",
    justifyContent: "flex-start",
    padding: theme.spacing(1.25, 1.5),
    borderRadius: 8,
    minHeight: 44,
    fontWeight: 500,
    fontSize: 14,
    lineHeight: 1.25,
    width: "100%",
    "& .MuiButton-label": {
      width: "100%",
      justifyContent: "flex-start",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      textAlign: "left",
    },
  },
  pipelinePopoverFooter: {
    padding: theme.spacing(1.25, 2, 1.5),
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing(1.5),
    borderTop: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(148, 163, 184, 0.3)"
    }`,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(0,0,0,0.2)" : "rgba(248, 250, 252, 0.95)",
    ...(theme.palette.type === "dark"
      ? {
          "& .MuiButton-root": {
            color: "#f8fafc",
          },
          "& .MuiButton-root:hover": {
            backgroundColor: "rgba(255,255,255,0.08)",
          },
        }
      : {}),
  },
  pipelineFooterBtn: {
    textTransform: "none",
    fontWeight: 500,
    minWidth: 88,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
  },
  pipelineFooterBtnMuted: {
    textTransform: "none",
    fontWeight: 500,
    minWidth: 72,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
    color:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.88)"
        : "rgba(71, 85, 105, 0.9)",
    ...(theme.palette.type === "dark"
      ? {
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.06)",
          },
        }
      : {}),
  },
  leadsDashKpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: 10,
    margin: 0,
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    },
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8,
    },
  },
  leadsDashChartGrid: {
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
}));

const DEFAULT_STAGES = [
  { key: "novo", label: "Novo Lead", color: "#6366F1" },
  { key: "qualificacao", label: "Contato Inicial", color: "#8B5CF6" },
  { key: "proposta", label: "Proposta", color: "#F59E0B" },
  { key: "negociacao", label: "Reunião", color: "#F97316" },
  { key: "fechado", label: "Fechamento", color: "#10B981" },
];

function initials(name = "") {
  const parts = String(name).trim().split(" ");
  const i1 = parts[0]?.[0] || "";
  const i2 = parts.length > 1 ? parts[1][0] : "";
  return (i1 + i2).toUpperCase();
}

const AutoShrinkText = ({ text, max = 13, min = 8, className }) => {
  const containerRef = React.useRef(null);
  const textRef = React.useRef(null);
  const [size, setSize] = React.useState(max);
  const measure = React.useCallback(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el) return;
    let current = max;
    el.style.fontSize = `${current}px`;
    let guard = 0;
    const limit = Math.max(0, container.clientWidth - 6);
    while (guard < 80 && current > min && el.scrollWidth > limit) {
      current -= 0.5;
      el.style.fontSize = `${current}px`;
      guard++;
    }
    setSize(current);
  }, [max, min, text]);
  React.useLayoutEffect(() => {
    const id = requestAnimationFrame(() => measure());
    return () => cancelAnimationFrame(id);
  }, [measure, text]);
  React.useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);
  return (
    <div ref={containerRef} style={{ overflow: "hidden", whiteSpace: "nowrap", minWidth: 0, paddingRight: 12, maxWidth: "100%" }}>
      <span ref={textRef} className={className} style={{ fontSize: size, display: "inline-block", maxWidth: "100%" }}>{text}</span>
    </div>
  );
};

const currencyBRL = (v) => {
  const n = Number(v || 0);
  try {
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    // fallback simples
    const fixed = n.toFixed(2).replace(".", ",");
    return `R$ ${fixed}`; 
  }
};

const LeadsKanbanBoard = ({ columns, leads, onEdit, onAdd, onMove, onDelete, onComplete, contacts, onOpenTagCreator, onOpenPipelineConfig }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const cols = Array.isArray(columns) && columns.length ? columns : DEFAULT_STAGES;

  const leadsByStatus = useMemo(() => {
    const map = {};
    const valid = new Set((cols || []).map(c => String(c.key || "").toLowerCase()));
    const fallback = (cols && cols[0] ? String(cols[0].key || "novo").toLowerCase() : "novo");
    (leads || []).forEach((l) => {
      const st = String(l.status || "").toLowerCase();
      const isValid = valid.has(st);
      // Remove explicit 'perdido' do quadro; outros inválidos caem na primeira coluna
      if (/(perdido|lost|cancelado|rejeitado)/i.test(st)) return;
      const key = st ? (isValid ? st : fallback) : fallback;
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push({ ...l, status: key });
    });
    return map;
  }, [leads, cols]);

  const getTotalValue = (arr = []) =>
    arr.reduce((sum, l) => sum + (Number(l.value) || 0), 0);

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result || {};
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (onMove) onMove(draggableId, source.droppableId, destination.droppableId, destination.index);
  };

  const boardRef = useRef(null);
  const isPanningRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [colPx, setColPx] = useState(0);

  useEffect(() => {
    const calc = () => {
      const el = boardRef.current;
      if (!el) return;
      // largura interna do board menos paddings/gaps
      const style = window.getComputedStyle(el);
      const paddingLeft = parseFloat(style.paddingLeft || "12") || 12;
      const paddingRight = parseFloat(style.paddingRight || "12") || 12;
      const gap = parseFloat(style.columnGap || style.gap || "16") || 16;
      const totalGap = gap * 4; // 5 colunas => 4 gaps
      const inner = el.clientWidth - paddingLeft - paddingRight - totalGap;
      const widthPerCol = inner > 0 ? Math.floor(inner / 5) : 260;
      setColPx(widthPerCol);
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (boardRef.current) ro.observe(boardRef.current);
    window.addEventListener("resize", calc);
    return () => {
      window.removeEventListener("resize", calc);
      ro.disconnect();
    };
  }, []);

  const onMouseDown = (e) => {
    if (cols.length <= 5) return;
    isPanningRef.current = true;
    startXRef.current = e.pageX - (boardRef.current?.offsetLeft || 0);
    scrollLeftRef.current = boardRef.current?.scrollLeft || 0;
  };
  const onMouseLeave = () => { isPanningRef.current = false; };
  const onMouseUp = () => { isPanningRef.current = false; };
  const onMouseMove = (e) => {
    if (!isPanningRef.current || !boardRef.current) return;
    const x = e.pageX - boardRef.current.offsetLeft;
    const walk = (x - startXRef.current) * -1;
    boardRef.current.scrollLeft = scrollLeftRef.current + walk;
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div
        className={classes.board}
        ref={boardRef}
        onMouseDown={onMouseDown}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseUp}
        onMouseMove={onMouseMove}
        style={{
          gridTemplateColumns: colPx ? `repeat(5, ${colPx}px)` : undefined,
          gridAutoColumns: colPx ? `${colPx}px` : undefined,
          cursor: cols.length > 5 ? (isPanningRef.current ? "grabbing" : "grab") : "default",
          userSelect: isPanningRef.current ? "none" : "auto"
        }}
      >
        {cols.map((col) => {
          const list = leadsByStatus[col.key] || [];
          const total = getTotalValue(list);
          const since = (date) => {
            if (!date) return "0s";
            const diff = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
            if (diff < 60) return `${diff}s`;
            const m = Math.floor(diff / 60);
            if (m < 60) return `${m}m`;
            const h = Math.floor(m / 60);
            if (h < 24) return `${h}h`;
            const d = Math.floor(h / 24);
            return `${d}d`;
          };
          return (
            <div key={col.key} className={classes.column}>
              <div className={classes.columnHeader}>
                <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div className={classes.columnStripe} style={{ background: col.color }} />
                  <div style={{ minWidth: 0 }}>
                    <div className={classes.columnLabel}>{col.label}</div>
                    <div className={classes.columnMeta}>
                      <span>{currencyBRL(total)}</span>
                    </div>
                  </div>
                </div>
                <div className={classes.columnRight}>
                  <span className={classes.columnCount}>{list.length}</span>
                  <IconButton
                    size="small"
                    className={classes.columnMenuBtn}
                    onClick={() => {
                      if (typeof onOpenPipelineConfig === "function") onOpenPipelineConfig();
                    }}
                    title="Configurar pipeline"
                  >
                    <MoreHorizIcon fontSize="small" />
                  </IconButton>
                </div>
              </div>

              <Droppable droppableId={col.key}>
                {(providedDroppable) => (
                  <div className={classes.cardsWrapper} ref={providedDroppable.innerRef} {...providedDroppable.droppableProps}>
                    {list.map((l, index) => (
                      <Draggable draggableId={String(l.id)} index={index} key={l.id}>
                        {(providedDraggable) => (
                          <div
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            {...providedDraggable.dragHandleProps}
                            className={classes.card}
                            onClick={() => onEdit(l)}
                          >
                            <div className={classes.cardTimeBadge} style={{ display: "flex", alignItems: "center", gap: 4, color: isDark ? "#d1d5db" : "#6B7280" }}>
                              <QueryBuilderIcon style={{ fontSize: 14, color: isDark ? "#e5e7eb" : "#9CA3AF" }} />
                              <span>{since(l.date)}</span>
                            </div>
                            <IconButton
                              className={classes.cardDeleteBtn}
                              size="small"
                              onClick={(e) => { e.stopPropagation(); onDelete && onDelete(l); }}
                              title="Excluir lead"
                              onMouseDown={(e) => e.stopPropagation()}
                              onMouseUp={(e) => e.stopPropagation()}
                            >
                              <CloseIcon style={{ fontSize: 12 }} />
                            </IconButton>
                            <IconButton
                              className={classes.cardApproveBtn}
                              size="small"
                              title="Concluir"
                              onMouseDown={(e) => e.stopPropagation()}
                              onMouseUp={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof onComplete === "function") {
                                  onComplete(l, col.key);
                                } else if (typeof onMove === "function") {
                                  try {
                                    onMove(l.id, col.key, "fechado");
                                  } catch (_) {}
                                }
                              }}
                            >
                              <CheckCircleOutlineIcon style={{ fontSize: 12 }} />
                            </IconButton>
                            <div className={classes.cardTopBar} style={{ background: col.color }} />
                            {(() => {
                              const contact = l.contact || (Array.isArray(contacts) ? contacts.find((c) => String(c.id) === String(l.contactId)) : null);
                              return (
                                <>
                                  <ContactAvatar contact={contact} lead={l} classes={classes} />
                                  <span className={classes.avatarStatusDot} />
                                  {l.crmSource?.provider && (
                                    <div className={classes.cardCrmBadge}>
                                      
                                    </div>
                                  )}
                                  <div className={classes.cardHeader}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div className={classes.cardTitle}>
                                        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                                          {l.name || "Sem nome"}
                                        </span>
                                      </div>
                                      {(l.companyName || contact?.name || l.contactId) && (
                                        <div className={classes.cardSub}>
                                          {l.companyName || contact?.name || l.contactId}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className={classes.cardBodyLeft}>
                                    {(l.phone || contact?.number) && (
                                <div className={classes.cardRow}>
                                  <PhoneIcon style={{ fontSize: 10, color: isDark ? "#e5e7eb" : "#9CA3AF" }} />
                                  <span>{l.phone || contact?.number}</span>
                                </div>
                              )}
                              {Number(l.value || 0) > 0 && (
                                <div className={classes.cardValue}>
                                  {currencyBRL(Number(l.value || 0))}
                                </div>
                              )}
                              <div
                                className={classes.cardTagRow}
                                style={{ cursor: "pointer" }}
                                onClick={(e) => onOpenTagCreator && onOpenTagCreator(e, l)}
                              >
                                <LocalOfferOutlinedIcon style={{ fontSize: 12, color: isDark ? "#60a5fa" : "#3B82F6", opacity: 0.85 }} />
                                {Array.isArray(l.tags) && l.tags.length > 0 && (
                                  <span className={classes.tagChip}>{l.tags[0]}</span>
                                )}
                                <AddIcon style={{ fontSize: 12, color: isDark ? "#60a5fa" : "#3B82F6", opacity: 0.9 }} />
                              </div>
                              {l.responsible?.name && (
                                <div className={classes.cardResponsible}>
                                  <PersonOutlineIcon style={{ fontSize: 9, color: isDark ? "#d1d5db" : "#4B5563" }} />
                                  <span style={{ fontSize: 8, color: isDark ? "#d1d5db" : "#4B5563" }}>{l.responsible?.name}</span>
                                </div>
                              )}
                                  </div>
                                </>
                              );
                            })()}
                            <div className={classes.cardFooter} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {providedDroppable.placeholder}
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<AddIcon />}
                      className={classes.addLeadBtn}
                      onClick={() => onAdd(col.key)}
                    >
                      Adicionar Lead
                    </Button>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

const LeadsList = ({ leads }) => {
  const getStatusMeta = (key) => {
    const cols = window.__LEADS_COLUMNS__ || [];
    const k = String(key || "").toLowerCase();
    const meta = cols.find((c) => c.key === k);
    if (meta) return meta;
    // Fallback: primeira coluna (ex.: 'novo') quando vazio/desconhecido
    if (!k && cols[0]) return cols[0];
    return { label: (k || "NOVO").toUpperCase(), color: "#E5E7EB" };
  };
  return (
    <TableContainer component={Paper} style={{ height: '100%', overflow: 'auto' }}>
      <Table stickyHeader aria-label="leads table">
        <TableHead>
          <TableRow>
            <TableCell>Lead</TableCell>
            <TableCell>CRM</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Valor</TableCell>
            <TableCell>Contato</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.isArray(leads) && leads.length > 0 ? (
            leads.map((item) => (
              <TableRow key={item.id}>
                <TableCell component="th" scope="row">
                  {item.name}
                </TableCell>
                <TableCell>
                  
                </TableCell>
                <TableCell>
                  {(() => {
                    const meta = getStatusMeta(item.status);
                    return (
                      <Chip
                        label={meta.label}
                        size="small"
                        style={{ background: `${meta.color}20`, color: meta.color, fontWeight: 600 }}
                      />
                    );
                  })()}
                </TableCell>
                <TableCell>{currencyBRL(item.value)}</TableCell>
                <TableCell>{item.contact?.name || item.contactId || "—"}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">
                Nenhum lead encontrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const LeadsSales = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isDark =
    theme.palette.type === "dark" || (theme && theme.mode === "dark");
  const labelColor = isDark ? "#FFFFFF" : "#0F172A";
  const [viewMode, setViewMode] = useState("board");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartCols, setChartCols] = useState(2);
  const [searchParam, setSearchParam] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [status, setStatus] = useState("");
  const [responsible, setResponsible] = useState(null);
  const [contact, setContact] = useState(null);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [leadsState, setLeadsState] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contactsList, setContactsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const { user, socket } = useContext(AuthContext);
  const kanbanRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dash, setDash] = useState(null);
  const [hoveredKpi, setHoveredKpi] = useState(null);

  const visibleLeads = useMemo(() => {
    let arr = Array.isArray(leadsState) ? leadsState : [];
    if (contact && contact.__company) {
      const target = String(contact.name || "").trim().toLowerCase();
      arr = arr.filter(l => String(l.companyName || "").trim().toLowerCase() === target);
    }
    if (searchParam) {
      const term = String(searchParam || "").trim().toLowerCase();
      if (term) {
        arr = arr.filter((l) => {
          const n = String(l.name || "").trim().toLowerCase();
          const c = String(l.companyName || "").trim().toLowerCase();
          return n.includes(term) || c.includes(term);
        });
      }
    }
    return arr;
  }, [leadsState, contact, searchParam]);

  const companiesFromLeads = useMemo(() => {
    const names = new Set();
    const items = [];
    (leadsState || []).forEach((l) => {
      const nm = String(l.companyName || "").trim();
      if (nm && !names.has(nm)) {
        names.add(nm);
        items.push({ id: `company:${nm}`, name: nm, __company: true });
      }
    });
    return items;
  }, [leadsState]);

  const [anchorResp, setAnchorResp] = useState(null);
  const [anchorContact, setAnchorContact] = useState(null);
  const [anchorPeriodo, setAnchorPeriodo] = useState(null);
  const [anchorTodos, setAnchorTodos] = useState(null);
  // Tag creator popover
  const [tagAnchor, setTagAnchor] = useState(null);
  const [tagLead, setTagLead] = useState(null);
  const [tagText, setTagText] = useState("");
  const [congratsModal, setCongratsModal] = useState(null);
  const [deleteModalLead, setDeleteModalLead] = useState(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyInitial, setCompanyInitial] = useState(null);
  const [congratsAdvancing, setCongratsAdvancing] = useState(false);
  const [deleteDeleting, setDeleteDeleting] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth || document.documentElement.clientWidth || 0;
      setChartCols(w >= 1024 ? 2 : 1);
      document.body.style.overflowX = "hidden";
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    async function fetchFilters() {
      try {
        const { data: contactsData } = await api.get("/contacts/list");
        const list = contactsData || [];
        setContactsList(list);
        const { data: usersResp } = await api.get("/users", { params: { searchParam: "" } });
        setUsersList(usersResp?.users || []);
      } catch (err) {
      }
    }
    fetchFilters();
  }, []);

  

  useEffect(() => {
    if (!socket || !user || !user.companyId) return;
    const onLeadEvent = (data) => {
      if (data?.action === "create" || data?.action === "update") {
        setLeadsState((prev) => {
          const idx = prev.findIndex((x) => String(x.id) === String(data.lead.id));
          if (idx >= 0) {
            const clone = [...prev];
            clone[idx] = data.lead;
            return clone;
          }
          return [data.lead, ...prev.filter(x => String(x.id) !== String(data.lead.id))];
        });
      }
      if (data?.action === "delete") {
        setLeadsState((prev) => prev.filter(x => String(x.id) !== String(data.id)));
      }
    };
    socket.on(`company-${user.companyId}-leads-sales`, onLeadEvent);
    return () => {
      socket.off(`company-${user.companyId}-leads-sales`, onLeadEvent);
    };
  }, [socket, user?.id, user?.companyId]);

  useEffect(() => {
    if (!socket || !user?.companyId) return;
    const onContact = (data) => {
      if (!data?.contact) return;
      setContactsList((prev) => {
        const idx = prev.findIndex((c) => String(c.id) === String(data.contact.id));
        return idx >= 0 ? prev.map((c) => (String(c.id) === String(data.contact.id) ? data.contact : c)) : [data.contact, ...prev];
      });
    };
    socket.on(`company-${user.companyId}-contact`, onContact);
    return () => {
      socket.off(`company-${user.companyId}-contact`, onContact);
    };
  }, [socket, user?.companyId]);

  const openTagCreator = (e, lead) => {
    e.stopPropagation();
    setTagAnchor(e.currentTarget);
    setTagLead(lead);
    setTagText("");
  };
  const closeTagCreator = () => {
    setTagAnchor(null);
    setTagLead(null);
    setTagText("");
  };
  const handleAddTag = async () => {
    try {
      const text = String(tagText || "").trim();
      if (!text || !tagLead) return;
      const newTags = Array.isArray(tagLead.tags) ? [...tagLead.tags, text] : [text];
      const record = await leadsSalesService.update(tagLead.id, { tags: newTags });
      setLeadsState((prev) => prev.map((x) => String(x.id) === String(record.id) ? record : x));
      closeTagCreator();
      toast.success("Tag adicionada");
    } catch (err) {
      toastError(err);
    }
  };

  const viewModes = [
    { value: "board", label: "Quadro", icon: <KanbanIcon /> },
    { value: "list", label: "Lista", icon: <ListIcon /> },
    { value: "calendar", label: "Calendário", icon: <CalendarIcon /> },
    { value: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  ];

  const handleSearch = (value) => setSearchParam(value);

  // Pipelines (configuração)
  const defaultPipelines = useMemo(() => ([
    { id: "default", name: "Padrão", stages: DEFAULT_STAGES }
  ]), []);
  const [pipelines, setPipelines] = useState(defaultPipelines);
  const [selectedPipelineId, setSelectedPipelineId] = useState(() => {
    return localStorage.getItem("leads_selected_pipeline") || "default";
  });
  const [pipelineDrawerOpen, setPipelineDrawerOpen] = useState(false);
  const [anchorPipeline, setAnchorPipeline] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadPipelines = async () => {
      try {
        const list = await leadPipelinesService.list();
        if (mounted && Array.isArray(list) && list.length) {
          setPipelines(list);
          if (!list.find(p => String(p.id) === String(selectedPipelineId))) {
            setSelectedPipelineId(list[0].id);
          }
        }
      } catch (_) {
        // silencioso
      }
    };
    loadPipelines();
    return () => { mounted = false; };
  }, []);

  const currentColumns = useMemo(() => {
    const current = pipelines.find(p => p.id === selectedPipelineId) || pipelines[0];
    return (current?.stages || DEFAULT_STAGES);
  }, [pipelines, selectedPipelineId]);

  const wonStageKey = useMemo(
    () => resolveWonStageKey(currentColumns),
    [currentColumns]
  );
  const wonStageLabel = useMemo(
    () => getWonStageLabel(currentColumns, wonStageKey),
    [currentColumns, wonStageKey]
  );

  const handleAdvanceFromCongrats = async () => {
    if (!congratsModal?.lead) return;
    const lead = congratsModal.lead;
    const id = Number(lead.id);
    const sourceCol = congratsModal.sourceCol || lead.status;
    setCongratsAdvancing(true);
    setLeadsState((prev) =>
      prev.map((l) => (Number(l.id) === id ? { ...l, status: wonStageKey } : l))
    );
    try {
      await leadsSalesService.update(id, { status: wonStageKey });
      toast.success(`Lead movido para «${wonStageLabel}».`);
      setCongratsModal(null);
      refreshDashboard();
    } catch (err) {
      toastError(err);
      setLeadsState((prev) =>
        prev.map((l) => (Number(l.id) === id ? { ...l, status: sourceCol } : l))
      );
    } finally {
      setCongratsAdvancing(false);
    }
  };

  const handleCreateCompanyFromCongrats = () => {
    if (!congratsModal?.lead) return;
    const lead = congratsModal.lead;
    const contact =
      lead.contact ||
      (Array.isArray(contactsList)
        ? contactsList.find((c) => String(c.id) === String(lead.contactId))
        : null);
    setCompanyInitial(leadToConvertedCompanyInitialValues(lead, contact));
    setCongratsModal(null);
    setCompanyModalOpen(true);
  };

  const handleConfirmDeleteLead = async ({ deleteContact }) => {
    if (!deleteModalLead) return;
    const id = Number(deleteModalLead.id);
    const contactId = deleteModalLead.contactId;
    setDeleteDeleting(true);
    try {
      await leadsSalesService.delete(id);
      if (deleteContact && contactId) {
        try {
          await api.delete(`/contacts/${contactId}`);
          setContactsList((prev) =>
            prev.filter((c) => Number(c.id) !== Number(contactId))
          );
        } catch (contactErr) {
          toast.error("Lead excluído, mas não foi possível excluir o contato.");
          toastError(contactErr);
        }
      }
      setLeadsState((prev) => prev.filter((l) => Number(l.id) !== id));
      toast.success(
        deleteContact && contactId
          ? "Lead e contato excluídos."
          : "Lead excluído."
      );
      setDeleteModalLead(null);
    } catch (err) {
      toastError(err);
    } finally {
      setDeleteDeleting(false);
    }
  };

  const refreshDashboard = async () => {
    try {
      const selectedContactId = contact && !contact.__company ? contact.id : undefined;
      const data = await leadsSalesService.dashboard({
        status,
        pipelineId: selectedPipelineId,
        responsibleId: responsible?.id,
        contactId: selectedContactId,
        dateStart,
        dateEnd
      });
      setDash(data);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    if (!0) return;
    refreshDashboard();
  }, [0]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const selectedContactId = contact && !contact.__company ? contact.id : undefined;
        const data = await leadsSalesService.dashboard({
          status,
          pipelineId: selectedPipelineId,
          responsibleId: responsible?.id,
          contactId: selectedContactId,
          dateStart,
          dateEnd
        });
        if (active) setDash(data);
      } catch (err) {
        // ignore
      }
    })();
    return () => { active = false; };
  }, [status, selectedPipelineId, responsible?.id, contact?.id, dateStart, dateEnd]);

  const { leadsSales, loading, count, hasMore } = useLeadsSales({
    pageNumber,
    searchParam,
    status,
    pipelineId: selectedPipelineId,
    responsibleId: responsible?.id,
    contactId: (contact && !contact.__company) ? contact.id : undefined,
    dateStart,
    dateEnd,
    refreshSignal: 0
  });

  useEffect(() => {
    setLeadsState(leadsSales || []);
  }, [leadsSales]);
  // Leads renderizam diretamente do estado já filtrado pelo backend

  useEffect(() => {
    if (selectedPipelineId) {
      localStorage.setItem("leads_selected_pipeline", selectedPipelineId);
    }
  }, [selectedPipelineId]);

  /** Após bulkSave, ids numéricos novos substituem ids temporários do drawer — alinha seleção por id ou nome. */
  const resolveSelectedPipelineId = (list, sentPipes, selId) => {
    if (!Array.isArray(list) || !list.length) return;
    if (selId != null && list.some((p) => String(p.id) === String(selId))) {
      const hit = list.find((p) => String(p.id) === String(selId));
      setSelectedPipelineId(hit.id);
      return;
    }
    const sent = Array.isArray(sentPipes)
      ? sentPipes.find((p) => String(p.id) === String(selId))
      : null;
    if (sent && sent.name) {
      const byName = list.find((p) => p.name === sent.name);
      if (byName) {
        setSelectedPipelineId(byName.id);
        return;
      }
    }
    setSelectedPipelineId(list[0].id);
  };

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

  const requestFs = (el) => {
    if (el?.requestFullscreen) return el.requestFullscreen();
    if (el?.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el?.mozRequestFullScreen) return el.mozRequestFullScreen();
    if (el?.msRequestFullscreen) return el.msRequestFullscreen();
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

  const navActions = (
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
        onClick={() => setPipelineDrawerOpen(true)}
      >
        <SettingsIcon style={{ fontSize: 18 }} />
      </IconButton>
    </>
  );

  const rightFilters = ({ classes: layout }) => (
    <>
      <div className={layout.filterItem} onClick={(e) => setAnchorPipeline(e.currentTarget)}>
        <Typography className={layout.filterLabel}>Pipeline</Typography>
        <ExpandMoreIcon className={layout.chevronIcon} style={{ fontSize: 11 }} />
      </div>
      <Popover
        open={Boolean(anchorPipeline)}
        anchorEl={anchorPipeline}
        onClose={() => setAnchorPipeline(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          className: classes.pipelinePopoverPaper,
          elevation: 12,
        }}
      >
        <div className={classes.pipelinePopoverInner}>
          <Typography component="div" variant="subtitle2" className={classes.pipelinePopoverTitle}>
            Selecionar pipeline
          </Typography>
          <div className={classes.pipelinePopoverList}>
            {pipelines.map((p) => (
              <Button
                key={p.id}
                fullWidth
                size="medium"
                variant={selectedPipelineId === p.id ? "contained" : "outlined"}
                color="primary"
                className={classes.pipelineOptionButton}
                onClick={() => {
                  setSelectedPipelineId(p.id);
                  setAnchorPipeline(null);
                }}
              >
                {p.name}
              </Button>
            ))}
          </div>
          <div className={classes.pipelinePopoverFooter}>
            <Button
              size="small"
              color="primary"
              className={classes.pipelineFooterBtn}
              onClick={() => {
                setAnchorPipeline(null);
                setPipelineDrawerOpen(true);
              }}
            >
              Gerenciar
            </Button>
            <Button
              size="small"
              className={classes.pipelineFooterBtnMuted}
              onClick={() => setAnchorPipeline(null)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </Popover>
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
        <div className={classes.popoverContent} style={{ padding: 8, width: 220 }}>
          <Autocomplete
            fullWidth
            value={responsible}
            options={usersList}
            onChange={(e, val) => setResponsible(val)}
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
            <Button onClick={() => setResponsible(null)}>Limpar</Button>
          </div>
        </div>
      </Popover>

      <div className={layout.filterItem} onClick={(e) => setAnchorContact(e.currentTarget)}>
        <Typography className={layout.filterLabel}>Contato/Empresa</Typography>
        <ExpandMoreIcon className={layout.chevronIcon} style={{ fontSize: 11 }} />
      </div>
      <Popover
        open={Boolean(anchorContact)}
        anchorEl={anchorContact}
        onClose={() => setAnchorContact(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div className={classes.popoverContent} style={{ padding: 8, width: 220 }}>
          <Autocomplete
            fullWidth
            value={contact}
            options={[...contactsList, ...companiesFromLeads]}
            onChange={(e, val) => setContact(val)}
            getOptionLabel={(option) => option.name || option.number || String(option.id)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Contato/Empresa"
                variant="outlined"
                size="small"
                placeholder="Pesquisar..."
                InputProps={{ ...params.InputProps, style: { fontSize: 13 } }}
                InputLabelProps={{ style: { fontSize: 12 } }}
              />
            )}
          />
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setContact(null)}>Limpar</Button>
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
            <div onClick={() => { setDateStart(""); setDateEnd(""); setAnchorPeriodo(null); }}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 4, color: isDark ? '#9ca3af' : '#6b7280' }}
            >Limpar</div>
            <div onClick={() => setAnchorPeriodo(null)}
              style={{ padding: '4px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', borderRadius: 4, backgroundColor: '#3b82f6', color: '#fff' }}
            >Aplicar</div>
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
        description="Leads e Vendas"
        onCreateClick={() => { setEditing(null); setDrawerOpen(true); }}
        searchPlaceholder="Filtrar por nome do lead, empresa..."
        searchValue={searchParam}
        onSearchChange={handleSearch}
        stats={[]}
        navActions={navActions}
        viewModes={viewModes}
        currentViewMode={viewMode}
        onViewModeChange={setViewMode}
        rightFilters={rightFilters}
        scrollContent={viewMode !== "calendar" && viewMode !== "dashboard"}
        contentEdgeToEdge={viewMode === "dashboard"}
      >
        {loading ? (
          <div style={{ padding: 20, textAlign: "center" }}>Carregando...</div>
        ) : (
          <>
            {viewMode === "dashboard" && (() => {
              const palette = isDark
                ? {
                    bg: theme.palette.dashboardCanvas || "#000000",
                    card: theme.palette.dashboardCard || "#252526",
                    text: "#f4f4f5",
                    sub: "#a1a1aa",
                    border: "rgba(255,255,255,0.12)",
                    shadow: "0 4px 16px rgba(0,0,0,0.35)",
                    blue: "#60a5fa",
                    blueLight: "#93c5fd",
                    blueDark: "#3b82f6",
                    green: "#34d399",
                    red: "#f87171",
                    amber: "#fbbf24",
                    indigo: "#3b82f6",
                  }
                : {
                    bg: "#F8FAFC",
                    card: "#FFFFFF",
                    text: "#0F172A",
                    sub: "#64748B",
                    border: "#E2E8F0",
                    shadow: "0 2px 8px rgba(2,6,23,0.06)",
                    blue: "#3B82F6",
                    blueLight: "#60A5FA",
                    blueDark: "#2563EB",
                    green: "#10B981",
                    red: "#EF4444",
                    amber: "#F59E0B",
                    indigo: "#2563EB",
                  };
              const fallbackSummary = (() => {
                const totalLeads = (leadsState || []).length;
                let leadsWon = 0;
                let leadsLost = 0;
                let totalSales = 0;
                (leadsState || []).forEach((l) => {
                  const st = String(l.status || "").toLowerCase();
                  const val = Number(l.value || 0) || 0;
                  const won = isLeadSaleWon(st, currentColumns);
                  const isLost = /(lost|perdido)/i.test(st);
                  if (won) {
                    totalSales += val;
                  }
                  if (won) {
                    leadsWon += 1;
                  } else if (isLost) {
                    leadsLost += 1;
                  }
                });
                const efficiency = (leadsWon + leadsLost) ? Math.round((leadsWon / (leadsWon + leadsLost)) * 100) : 0;
                return { totalLeads, leadsWon, leadsLost, totalSales, efficiency };
              })();
              const summary = dash?.summary || fallbackSummary;
              const kpi = [
                { label: "Total de Leads", value: summary.totalLeads, color: palette.blueDark, icon: <PersonOutlineIcon style={{ color: palette.blueDark }} /> },
                { label: "Total de Vendas", value: (summary.totalSales || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}), color: palette.green, icon: <BusinessCenterIcon style={{ color: palette.green }} /> },
                { label: "Eficiência", value: `${summary.efficiency?.toFixed ? summary.efficiency.toFixed(0) : summary.efficiency}%`, sub: "Conversão relativa entre leads e vendas", color: palette.amber, icon: <CheckCircleOutlineIcon style={{ color: palette.amber }} /> },
                { label: "Leads Ganhos", value: summary.leadsWon || 0, color: palette.green, icon: <CheckCircleOutlineIcon style={{ color: palette.green }} /> },
                { label: "Leads Perdidos", value: summary.leadsLost || 0, color: palette.red, icon: <CloseIcon style={{ color: palette.red }} /> }
              ];
              // Dados para mini-sparklines
              const seriesLeads = (dash?.clientsValueByDay || []).map(d => d.leads);
              const seriesRevenue = (dash?.revenuePerDay || []).map(d => d.revenue);
              const sparkOptions = {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false } },
                elements: { point: { radius: 0 } }
              };
              const computeDelta = (arr) => {
                if (!Array.isArray(arr) || arr.length < 2) return null;
                const last = Number(arr[arr.length - 1] || 0);
                const prev = Number(arr[arr.length - 2] || 0);
                const diff = last - prev;
                const pct = prev === 0 ? 0 : (diff / prev) * 100;
                return { pct, up: diff >= 0 };
              };
              const lastOf = (arr) => (Array.isArray(arr) && arr.length ? Number(arr[arr.length - 1] || 0) : 0);
              const avgLast = (arr, n = 7) => {
                if (!Array.isArray(arr) || arr.length === 0) return 0;
                const slice = arr.slice(-n);
                const vals = slice.map(v => Number(v || 0)).filter(v => !isNaN(v));
                if (!vals.length) return 0;
                return vals.reduce((a, b) => a + b, 0) / vals.length;
              };
              let labelsRevenue = (dash?.revenuePerDay || []).map(d => d.date);
              let dataRevenue = (dash?.revenuePerDay || []).map(d => d.revenue);
              let labelsClients = (dash?.clientsValueByDay || []).map(d => d.date);
              let dataClients = (dash?.clientsValueByDay || []).map(d => d.leads);
              let dataValues = (dash?.clientsValueByDay || []).map(d => d.value);

              const fromLeadsSeries = (() => {
                const toKey = (v) => {
                  try {
                    const dt = new Date(v);
                    if (isNaN(dt.getTime())) return null;
                    return dt.toISOString().slice(0,10);
                  } catch { return null; }
                };
                const counts = {};
                const totals = {};
                const revenue = {};
                (leadsState || []).forEach((l) => {
                  const raw = l.updatedAt || l.createdAt || l.date || Date.now();
                  const k = toKey(raw);
                  if (!k) return;
                  const val = Number(l.value || 0) || 0;
                  counts[k] = (counts[k] || 0) + 1;
                  totals[k] = (totals[k] || 0) + val;
                  const st = String(l.status || "").toLowerCase();
                  const won = isLeadSaleWon(st, currentColumns);
                  revenue[k] = (revenue[k] || 0) + (won ? val : 0);
                });
                const keys = Object.keys(counts).sort();
                return {
                  labels: keys,
                  leads: keys.map(k => counts[k] || 0),
                  values: keys.map(k => totals[k] || 0),
                  revenue: keys.map(k => revenue[k] || 0)
                };
              })();

              // Fallback: manter \"Receita por Dia\" restrita a ganhos
              const sumArr = (arr) => (Array.isArray(arr) ? arr.reduce((a,b) => a + (Number(b)||0), 0) : 0);
              if ((!labelsRevenue.length || sumArr(dataRevenue) === 0) && fromLeadsSeries.labels.length) {
                labelsRevenue = fromLeadsSeries.labels;
                dataRevenue = fromLeadsSeries.revenue; // apenas ganhos
              }
              if (!labelsClients.length && fromLeadsSeries.labels.length) {
                labelsClients = fromLeadsSeries.labels;
                dataClients = fromLeadsSeries.leads;
                dataValues = fromLeadsSeries.values;
              }

              // Fallback robusto para Ranking de Responsáveis
              const fallbackRankingMap = (() => {
                const map = {};
                (leadsState || []).forEach((l) => {
                  const name = (l?.responsible?.name || "Outros");
                  const val = Number(l?.value || 0);
                  map[name] = (map[name] || 0) + (isNaN(val) ? 0 : val);
                });
                return map;
              })();
              const rankingDataArr = Array.isArray(dash?.rankingResponsibles) && dash.rankingResponsibles.length
                ? dash.rankingResponsibles
                : Object.entries(fallbackRankingMap).map(([name, value]) => ({ name, value }));
              const rankingLabels = rankingDataArr.map(r => r.name);
              const rankingValues = rankingDataArr.map(r => r.value);

              // Funil de Vendas (contagem por status) com normalização robusta
              const statusOrder = (currentColumns || []).map(c => String(c.key || "").toLowerCase());
              const LABEL_BY_KEY = (currentColumns || []).reduce((acc, c) => { acc[c.key] = c.label; return acc; }, {});
              const validKeys = new Set((currentColumns || []).map(c => String(c.key || "").toLowerCase()));
              const normalizeStatus = (s) => {
                const raw = String(s || "").toLowerCase();
                if (validKeys.has(raw)) return raw;
                const byLabel = (currentColumns || []).find(c => {
                  const lbl = String(c.label || "").toLowerCase();
                  return lbl === raw || raw.includes(lbl) || lbl.includes(raw);
                });
                if (byLabel && byLabel.key) return String(byLabel.key).toLowerCase();
                if (raw.includes("qualific") || raw.includes("contato inicial")) return "qualificacao";
                if (raw.includes("propost")) return "proposta";
                if (raw.includes("negoc") || raw.includes("reuni")) return "negociacao";
                if (isLeadSaleWon(raw, currentColumns)) return wonStageKey;
                if (raw.includes("novo")) return "novo";
                return "novo";
              };
              const funnelCounts = statusOrder.map((k) =>
                (leadsState || []).filter(l => normalizeStatus(l.status) === k).length
              );
              const funnelLabels = statusOrder.map(k => LABEL_BY_KEY[k] || k.toUpperCase());

              const chartHeight = 180;
              // Garante pelo menos 2 pontos na série para exibir uma "linha"
              const toISO = (s) => {
                try {
                  const d = new Date(s);
                  if (isNaN(d.getTime())) return null;
                  return d.toISOString().slice(0,10);
                } catch { return null; }
              };
              if (labelsRevenue.length === 1) {
                const onlyDateISO = toISO(labelsRevenue[0]) || labelsRevenue[0];
                const base = new Date(onlyDateISO);
                const prev = new Date(base.getTime() - 24 * 60 * 60 * 1000);
                const prevISO = prev.toISOString().slice(0,10);
                labelsRevenue = [prevISO, onlyDateISO];
                dataRevenue = [0, Number(dataRevenue[0] || 0)];
              }
              const maxRevenueVal = Math.max(0, ...dataRevenue.map(v => Number(v || 0)));
              const fmtBR = (s) => {
                try {
                  const d = new Date(s);
                  if (isNaN(d.getTime())) return s;
                  const dd = String(d.getDate()).padStart(2, "0");
                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                  const yyyy = d.getFullYear();
                  return `${dd}/${mm}/${yyyy}`;
                } catch { return s; }
              };
              const lineOptions = {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 24, right: 8, left: 4, bottom: 8 } },
                plugins: { 
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      title: (items) => (items && items[0] ? fmtBR(items[0].label) : "")
                    }
                  },
                  datalabels: {
                    display: true,
                    color: labelColor,
                    backgroundColor: (ctx) =>
                      isDark ? "rgba(37,37,38,0.92)" : "rgba(255,255,255,0.85)",
                    borderRadius: 4,
                    padding: { left: 4, right: 4, top: 2, bottom: 2 },
                    anchor: "end",
                    align: "top",
                    offset: 6,
                    clamp: true,
                    clip: false,
                    formatter: (v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v),
                    font: { weight: "700", size: 10 }
                  }
                },
                scales: {
                  x: { 
                    ticks: { 
                      maxRotation: 0, 
                      color: palette.sub, 
                      callback: (value, index) => fmtBR(labelsRevenue[index] ?? value) 
                    }, 
                    grid: { display: false } 
                  },
                  y: {
                    ticks: { color: palette.sub },
                    grid: {
                      color: isDark ? "rgba(255,255,255,0.08)" : "#E6F0FF",
                    },
                    beginAtZero: true,
                    grace: "15%",
                    suggestedMax: maxRevenueVal * 1.12,
                  },
                }
              };
              const lineData = {
                labels: labelsRevenue,
                datasets: [{
                  label: "Receita",
                  data: dataRevenue,
                  fill: false,
                  borderColor: palette.blueDark,
                  backgroundColor: isDark
                    ? "rgba(59,130,246,0.2)"
                    : "rgba(37,99,235,0.10)",
                  tension: 0.35,
                  borderWidth: 2,
                  pointRadius: 3,
                  pointHoverRadius: 4
                }]
              };
              const barOptions = {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 18, right: 12, left: 4, bottom: 8 } },
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: { color: palette.text },
                  },
                  datalabels: {
                    display: true,
                    color: labelColor,
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
                  x: { stacked: false, ticks: { color: palette.sub }, grid: { display: false }, beginAtZero: true },
                  y: {
                    stacked: false,
                    position: "left",
                    beginAtZero: true,
                    ticks: { color: palette.sub, padding: 6 },
                    grid: {
                      color: isDark ? "rgba(255,255,255,0.08)" : "#E6F0FF",
                    },
                  },
                  y1: { position: "right", beginAtZero: true, ticks: { color: palette.sub, padding: 6, callback: (v) => (typeof v === "number" ? v.toLocaleString("pt-BR") : v) }, grid: { drawOnChartArea: false } }
                }
              };
              const compactChartNumber = (v) => {
                const n = Number(v);
                if (!Number.isFinite(n)) return "";
                if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
                if (n >= 10_000) return `${Math.round(n / 1000)}k`;
                if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")}k`;
                return n.toLocaleString("pt-BR");
              };
              const clientsValuePointCount = labelsClients?.length || 0;
              const clientsValueLabelStep =
                clientsValuePointCount > 16
                  ? Math.ceil(clientsValuePointCount / 7)
                  : clientsValuePointCount > 10
                    ? 2
                    : 1;
              const clientsValueBarOptions = {
                ...barOptions,
                layout: { padding: { top: 28, right: 12, left: 4, bottom: 8 } },
                plugins: {
                  ...barOptions.plugins,
                  tooltip: {
                    mode: "index",
                    intersect: false,
                    callbacks: {
                      label: (ctx) => {
                        const raw = ctx.parsed?.y ?? ctx.raw;
                        const n = Number(raw);
                        if (!Number.isFinite(n)) return `${ctx.dataset.label}: ${raw}`;
                        if (ctx.dataset.label === "Valor") {
                          return `Valor: ${n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
                        }
                        return `Leads: ${n.toLocaleString("pt-BR")}`;
                      },
                    },
                  },
                  datalabels: {
                    display: (ctx) => {
                      if (ctx.datasetIndex !== 0) return false;
                      if (clientsValuePointCount > 10) {
                        return ctx.dataIndex % clientsValueLabelStep === 0;
                      }
                      return true;
                    },
                    color: labelColor,
                    anchor: "end",
                    align: "top",
                    offset: 6,
                    clamp: true,
                    clip: true,
                    formatter: (v) => compactChartNumber(v),
                    font: { weight: "600", size: 9 },
                  },
                },
                scales: {
                  ...barOptions.scales,
                  x: {
                    stacked: false,
                    ticks: {
                      color: palette.sub,
                      maxRotation: 45,
                      minRotation: 0,
                      autoSkip: true,
                      maxTicksLimit: 10,
                    },
                    grid: { display: false },
                    beginAtZero: true,
                  },
                  y: {
                    ...barOptions.scales.y,
                    grace: "18%",
                  },
                  y1: {
                    ...barOptions.scales.y1,
                    grace: "18%",
                  },
                },
              };
              const barData = {
                labels: labelsClients,
                datasets: [
                  {
                    type: "bar",
                    label: "Leads",
                    data: dataClients,
                    backgroundColor: palette.blueLight,
                    borderRadius: 6,
                    maxBarThickness: 16,
                    categoryPercentage: 0.72,
                    barPercentage: 0.85,
                    datalabels: { display: true },
                  },
                  {
                    type: "bar",
                    label: "Valor",
                    data: dataValues,
                    backgroundColor: palette.blueDark,
                    borderRadius: 6,
                    maxBarThickness: 16,
                    yAxisID: "y1",
                    categoryPercentage: 0.72,
                    barPercentage: 0.85,
                    datalabels: { display: false },
                  },
                ],
              };
              const barRanking = {
                labels: rankingLabels,
                datasets: [{ label: "Valor", data: rankingValues, backgroundColor: palette.blueDark, borderRadius: 6, maxBarThickness: 20 }]
              };
              const funnelBar = {
                labels: funnelLabels,
                datasets: [{ label: "Quantidade", data: funnelCounts, backgroundColor: palette.blue, borderRadius: 6, maxBarThickness: 20 }]
              };

              return (
                <div
                  style={{
                    padding: 4,
                    overflowX: "hidden",
                    overflowY: "hidden",
                    width: "100%",
                    height: "auto",
                    backgroundColor: palette.bg,
                    minHeight: "100%",
                  }}
                >
                  <div data-dashboard-cards className={classes.leadsDashKpiGrid}>
                    {kpi.map((c) => (
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
                            {(() => {
                              if (c.label === "Total de Leads") return `Média 7d: ${avgLast(seriesLeads, 7).toFixed(1)}`;
                              if (c.label === "Total de Vendas") return `Média 7d: ${avgLast(seriesRevenue, 7).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
                              if (c.label === "Eficiência") return `Ganhos: ${summary.leadsWon || 0} · Perdas: ${summary.leadsLost || 0}`;
                              if (c.label === "Leads Ganhos") return `Receita: ${(summary.totalSales || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
                              if (c.label === "Leads Perdidos") return `Taxa: ${((summary.leadsWon + summary.leadsLost) ? ((summary.leadsLost / (summary.leadsWon + summary.leadsLost)) * 100).toFixed(0) : 0)}%`;
                              return null;
                            })()}
                          </div>
                        </div>
                        <div style={{ color: c.color, opacity: 0.7, flexShrink: 0, marginLeft: 8 }}>
                          {c.icon}
                        </div>
                      </Paper>
                    ))}
                  </div>

                  <div className={classes.leadsDashChartGrid}>
                    {(() => {
                      const boxH = 260; // Altura igual para todos os gráficos
                      const chartH = 200; // Área interna do canvas
                      const titleStyle = { fontSize: 14, color: palette.text, marginBottom: 6, fontWeight: 400 };
                      return (
                        <>
                          {/* Gráfico 1 */}
                          <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, height: boxH, background: palette.card }}>
                            <div style={titleStyle}>Receita por Dia</div>
                            <div style={{ height: chartH }}>
                              <Line options={lineOptions} data={lineData} />
                            </div>
                          </Paper>
                          {/* Gráfico 2 */}
                          <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, height: boxH, background: palette.card }}>
                            <div style={titleStyle}>Clientes x Valor</div>
                            <div style={{ height: chartH }}>
                              <Bar options={clientsValueBarOptions} data={barData} />
                            </div>
                          </Paper>
                          {/* Ranking Table */}
                          <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card, overflow: 'hidden' }}>
                            <div style={titleStyle}>Ranking de Responsáveis</div>
                            <div style={{ overflowX: 'auto', marginTop: 8 }}>
                              {(() => {
                                const respMap = {};
                                (leadsState || []).forEach((l) => {
                                  const name = l?.responsible?.name || "Outros";
                                  const photo = l?.responsible?.profileImage || l?.responsible?.urlPicture || "";
                                  if (!respMap[name]) respMap[name] = { name, photo, leads: 0, vendas: 0, perdidos: 0, valor: 0 };
                                  respMap[name].leads += 1;
                                  const st = String(l?.status || "").toLowerCase();
                                  if (st === "ganho" || st === "won" || st === "venda" || st === "vendido") { respMap[name].vendas += 1; respMap[name].valor += Number(l?.value || 0); }
                                  if (st === "perdido" || st === "lost" || st === "perda") respMap[name].perdidos += 1;
                                });
                                const rows = Object.values(respMap).sort((a, b) => b.vendas - a.vendas || b.leads - a.leads);
                                if (!rows.length) return <div style={{ textAlign: 'center', padding: 20, color: palette.sub, fontSize: 12 }}>Sem dados</div>;
                                const thStyle = { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: palette.sub, padding: '6px 8px', borderBottom: `1px solid ${palette.border}`, whiteSpace: 'nowrap' };
                                const tdStyle = { fontSize: 12, padding: '8px 8px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f2f5'}`, whiteSpace: 'nowrap' };
                                return (
                                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ ...thStyle, width: 32 }}>#</th>
                                        <th style={thStyle}>Nome</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>Leads</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>Vendas</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>Eficiência</th>
                                        <th style={{ ...thStyle, textAlign: 'center' }}>Perdidos</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r, i) => {
                                        const eff = r.leads > 0 ? ((r.vendas / r.leads) * 100).toFixed(0) : "0";
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
                                                  backgroundImage: r.photo ? `url(${r.photo})` : 'none',
                                                  backgroundSize: 'cover', backgroundPosition: 'center',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                  fontSize: 10, fontWeight: 600, color: isDark ? '#d1d5db' : '#6B7280', flexShrink: 0,
                                                }}>
                                                  {!r.photo && (r.name || "?")[0]?.toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 500 }}>{r.name}</span>
                                              </div>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 500 }}>{r.leads}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600, color: '#10b981' }}>{r.vendas}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                                              <span style={{
                                                padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                                backgroundColor: Number(eff) >= 50 ? (isDark ? 'rgba(16,185,129,0.12)' : '#d1fae5') : (isDark ? 'rgba(245,158,11,0.12)' : '#fef3c7'),
                                                color: Number(eff) >= 50 ? '#10b981' : '#f59e0b',
                                              }}>{eff}%</span>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center', color: '#ef4444', fontWeight: 500 }}>{r.perdidos}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </div>
                          </Paper>
                          {/* Funil Visual - Minimalista */}
                          <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card }}>
                            <div style={titleStyle}>Funil de Vendas</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '8px 0' }}>
                              {(() => {
                                const fLabels = funnelBar?.labels || [];
                                const fData = funnelBar?.datasets?.[0]?.data || [];
                                const maxVal = Math.max(...fData, 1);
                                const funnelShades = ['#1E40AF', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#CBD5E1', '#E2E8F0'];
                                return fLabels.map((label, idx) => {
                                  const val = fData[idx] || 0;
                                  const pct = Math.max((val / maxVal) * 100, 25);
                                  const color = funnelShades[idx % funnelShades.length];
                                  const convRate = idx > 0 && fData[idx - 1] > 0 ? Math.round((val / fData[idx - 1]) * 100) : null;
                                  return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                                      <div style={{ width: 80, textAlign: 'right', fontSize: 11, fontWeight: 500, color: palette.sub, flexShrink: 0 }}>
                                        {label}
                                      </div>
                                      <div style={{ flex: 1, position: 'relative', height: 28 }}>
                                        <div style={{
                                          width: `${pct}%`,
                                          height: '100%',
                                          backgroundColor: color,
                                          borderRadius: 6,
                                          display: 'flex',
                                          alignItems: 'center',
                                          paddingLeft: 10,
                                          transition: 'width 0.4s ease',
                                          minWidth: 40,
                                        }}>
                                          <span style={{ fontSize: 12, fontWeight: 700, color: idx < 3 ? '#fff' : palette.text }}>
                                            {val}
                                          </span>
                                        </div>
                                      </div>
                                      {convRate !== null && (
                                        <div style={{ fontSize: 10, color: palette.sub, width: 36, textAlign: 'right', flexShrink: 0 }}>
                                          {convRate}%
                                        </div>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </Paper>

                          {/* Heatmap - Atividade por hora/dia */}
                          <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card }}>
                            <div style={titleStyle}>Atividade de Leads por Hora</div>
                            <div style={{ fontSize: 10, color: palette.sub, marginBottom: 8 }}>Concentração de criação/atualização de leads</div>
                            {(() => {
                              const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                              const hours = Array.from({ length: 24 }, (_, i) => i);
                              const grid = dayLabels.map(() => hours.map(() => 0));
                              (leadsState || []).forEach(l => {
                                try {
                                  const dt = new Date(l.updatedAt || l.createdAt || l.date);
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
                                  {dayLabels.map((day, di) => (
                                    <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 1, marginBottom: 1 }}>
                                      <div style={{ width: 24, fontSize: 9, fontWeight: 500, color: palette.sub, textAlign: 'right', flexShrink: 0, paddingRight: 3 }}>{day}</div>
                                      {hours.map((_, hi) => (
                                        <div key={hi} title={`${day} ${String(hi).padStart(2,'0')}:00 — ${grid[di][hi]} leads`} style={{ flex: 1, minWidth: 10, aspectRatio: '1', borderRadius: 2, background: getColor(grid[di][hi]), transition: 'background 0.2s ease' }} />
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </Paper>

                          {/* Distribuição por Status - Donut */}
                          <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card }}>
                            <div style={titleStyle}>Distribuição por Status</div>
                            {(() => {
                              const statusMap = {};
                              (leadsState || []).forEach(l => {
                                const st = String(l.status || "novo").toLowerCase();
                                const label = (currentColumns || []).find(c => String(c.key).toLowerCase() === st)?.label || st;
                                statusMap[label] = (statusMap[label] || 0) + 1;
                              });
                              const labels = Object.keys(statusMap);
                              const values = Object.values(statusMap);
                              const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'];
                              const total = values.reduce((a, b) => a + b, 0) || 1;
                              return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0' }}>
                                  <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
                                    <svg viewBox="0 0 42 42" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                      {(() => {
                                        let offset = 0;
                                        return values.map((val, i) => {
                                          const pct = (val / total) * 100;
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
                                    {labels.map((label, i) => (
                                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors[i % colors.length], flexShrink: 0 }} />
                                        <span style={{ color: palette.text, fontWeight: 500, flex: 1 }}>{label}</span>
                                        <span style={{ color: palette.sub, fontWeight: 600 }}>{values[i]}</span>
                                        <span style={{ color: palette.sub, fontSize: 10 }}>{((values[i] / total) * 100).toFixed(0)}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </Paper>

                          {/* Roadmap - Timeline dos últimos leads */}
                          <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card }}>
                            <div style={titleStyle}>Roadmap de Leads</div>
                            <div style={{ fontSize: 10, color: palette.sub, marginBottom: 10 }}>Últimos leads criados/atualizados</div>
                            <div className={classes.thinScroll} style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 200, overflowY: 'auto' }}>
                              {(() => {
                                const sorted = [...(leadsState || [])].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 10);
                                if (!sorted.length) return <div style={{ textAlign: 'center', padding: 16, color: palette.sub, fontSize: 11 }}>Sem dados</div>;
                                const statusColors = { ganho: '#10B981', won: '#10B981', perdido: '#EF4444', lost: '#EF4444', novo: '#3B82F6', qualificacao: '#F59E0B', proposta: '#8B5CF6', negociacao: '#06B6D4' };
                                return sorted.map((l, idx) => {
                                  const st = String(l.status || 'novo').toLowerCase();
                                  const color = statusColors[st] || palette.blueDark;
                                  const dateStr = (() => { try { return moment(l.updatedAt || l.createdAt).format('DD/MM HH:mm'); } catch { return ''; } })();
                                  return (
                                    <div key={l.id || idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0', borderBottom: idx < sorted.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#f0f2f5'}` : 'none' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, paddingTop: 2 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
                                        {idx < sorted.length - 1 && <div style={{ width: 1, height: 24, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', marginTop: 2 }} />}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: palette.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name || l.companyName || `Lead #${l.id}`}</div>
                                        <div style={{ fontSize: 10, color: palette.sub, display: 'flex', gap: 8, marginTop: 1 }}>
                                          <span>{dateStr}</span>
                                          <span style={{ color, fontWeight: 600 }}>{(currentColumns || []).find(c => String(c.key).toLowerCase() === st)?.label || st}</span>
                                          {l.value > 0 && <span style={{ fontWeight: 500 }}>R$ {Number(l.value).toLocaleString('pt-BR')}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </Paper>

                          {/* Sugestões de IA */}
                          <Paper style={{ borderRadius: 8, padding: 16, border: `1px solid ${palette.border}`, boxShadow: palette.shadow, minHeight: boxH, background: palette.card }}>
                            <div style={titleStyle}>Sugestões Inteligentes</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
                              {(() => {
                                const suggestions = [];
                                const totalLeads = (leadsState || []).length;
                                const lostCount = (leadsState || []).filter(l => /(lost|perdido)/i.test(String(l.status || ''))).length;
                                const wonCount = (leadsState || []).filter(l => isLeadSaleWon(l.status, currentColumns)).length;
                                const noValue = (leadsState || []).filter(l => !l.value || Number(l.value) === 0).length;
                                const noResp = (leadsState || []).filter(l => !l.responsible && !l.responsibleId).length;
                                if (lostCount > wonCount && totalLeads > 3) suggestions.push({ icon: '⚠️', text: `Você tem mais leads perdidos (${lostCount}) do que ganhos (${wonCount}). Revise sua abordagem de qualificação.`, type: 'warn' });
                                if (noValue > totalLeads * 0.3 && totalLeads > 2) suggestions.push({ icon: '💡', text: `${noValue} leads sem valor atribuído. Preencher valores melhora a previsão de receita.`, type: 'info' });
                                if (noResp > 0) suggestions.push({ icon: '👤', text: `${noResp} leads sem responsável atribuído. Distribua para melhorar o acompanhamento.`, type: 'info' });
                                const effRate = (wonCount + lostCount) > 0 ? ((wonCount / (wonCount + lostCount)) * 100).toFixed(0) : null;
                                if (effRate && Number(effRate) >= 60) suggestions.push({ icon: '🎯', text: `Excelente! Sua taxa de conversão está em ${effRate}%. Mantenha o ritmo.`, type: 'success' });
                                if (effRate && Number(effRate) < 30 && totalLeads > 5) suggestions.push({ icon: '📉', text: `Conversão em ${effRate}%. Considere revisar critérios de qualificação e follow-up.`, type: 'warn' });
                                if (totalLeads === 0) suggestions.push({ icon: '🚀', text: 'Nenhum lead cadastrado. Comece adicionando seus primeiros leads para acompanhar o funil.', type: 'info' });
                                if (!suggestions.length) suggestions.push({ icon: '✅', text: 'Tudo parece em ordem! Continue acompanhando suas métricas regularmente.', type: 'success' });
                                const bgByType = { warn: isDark ? 'rgba(245,158,11,0.08)' : '#fef3c7', info: isDark ? 'rgba(59,130,246,0.08)' : '#dbeafe', success: isDark ? 'rgba(16,185,129,0.08)' : '#d1fae5' };
                                const borderByType = { warn: isDark ? 'rgba(245,158,11,0.2)' : '#fde68a', info: isDark ? 'rgba(59,130,246,0.2)' : '#bfdbfe', success: isDark ? 'rgba(16,185,129,0.2)' : '#a7f3d0' };
                                return suggestions.map((s, i) => (
                                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 8, background: bgByType[s.type], border: `1px solid ${borderByType[s.type]}`, alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
                                    <span style={{ fontSize: 11.5, color: palette.text, lineHeight: 1.4 }}>{s.text}</span>
                                  </div>
                                ));
                              })()}
                            </div>
                          </Paper>
                        </>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
            {viewMode === "list" && (() => {
              window.__LEADS_COLUMNS__ = currentColumns;
              return <LeadsList leads={visibleLeads} />;
            })()}
            {viewMode === "calendar" && (() => {
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
              const events = (visibleLeads || []).map((l) => {
                const when = l.nextFollowUpAt || l.date || l.createdAt || l.updatedAt || Date.now();
                return {
                  title: l.name || l.companyName || `Lead ${l.id}`,
                  start: new Date(when),
                  end: new Date(when),
                  allDay: true,
                  resource: l
                };
              });
              const eventPropGetter = (evt) => {
                const st = String(evt?.resource?.status || "").toLowerCase();
                let backgroundColor = "#2563eb";
                if (isLeadSaleWon(st, currentColumns)) backgroundColor = "#10B981";
                if (st.includes("lost") || st.includes("perdido")) backgroundColor = "#EF4444";
                return { style: { backgroundColor, color: "#0f172a", borderRadius: 10, border: `1px solid ${backgroundColor}`, padding: "6px 8px", fontSize: 12 } };
              };
              const total = visibleLeads.length;
              const ganho = visibleLeads.filter((l) =>
                isLeadSaleWon(l.status, currentColumns)
              ).length;
              const calPaperBg =
                theme.palette.type === "dark"
                  ? theme.palette.dashboardCard || "#353538"
                  : undefined;
              return (
                <div
                  className="schedules-page"
                  data-theme={theme.palette.type}
                  style={{
                    paddingTop: 8,
                    height: "calc(100vh - 128px)",
                    overflow: "hidden",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <Grid container spacing={2} style={{ height: "100%", margin: 0, maxWidth: "100%" }}>
                    <Grid item xs={12} md={9} lg={9} style={{ height: "100%", minWidth: 0 }}>
                      <Paper
                        style={{
                          padding: 8,
                          height: "100%",
                          display: "flex",
                          overflow: "visible",
                          backgroundColor: calPaperBg,
                        }}
                      >
                        <Calendar
                          localizer={localizer}
                          views={["day","week","month"]}
                          components={{ toolbar: CustomToolbar }}
                          events={events}
                          startAccessor="start"
                          endAccessor="end"
                          eventPropGetter={eventPropGetter}
                          selectable
                          onSelectSlot={(slot) => {
                            const d = slot.start;
                            setSelectedDate(d);
                            setEditing({ date: d.toISOString().slice(0,10) });
                            setDrawerOpen(true);
                          }}
                          style={{ height: "100%", width: '100%' }}
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3} style={{ height: '100%' }}>
                      <div className="right-aside" style={{ height: '100%', overflowY: 'visible' }}>
                        <div className="aside-top-actions">
                          <button className="aside-action" onClick={() => { setEditing(null); setDrawerOpen(true); }}>
                            Novo Lead
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
                            <Typography className="aside-title" variant="body2">Lead</Typography>
                          </div>
                          {(() => {
                            const recent = [...visibleLeads].sort((a,b) => new Date(b.updatedAt||b.createdAt||b.date||0) - new Date(a.updatedAt||a.createdAt||a.date||0))[0];
                            return (
                          <div className="activity-item">
                                <div className="activity-icon"><BusinessCenterIcon style={{ fontSize: 18 }} /></div>
                                <div className="activity-info">
                                  <div className="activity-title">{recent?.name || "—"}</div>
                                  <div className="activity-sub">{recent?.companyName || recent?.contact?.name || "Sem empresa"}</div>
                                </div>
                                <div className="activity-time">{recent ? moment(recent.updatedAt || recent.createdAt || recent.date).format("HH:mm") : "—"}</div>
                              </div>
                            );
                          })()}
                          <div className="donut-center" style={{ position: "static", transform: "none", textAlign: "left" }}>
                            <div className="donut-total" style={{ fontSize: 24 }}>{total}</div>
                            <div className="donut-label">Total</div>
                            <div className="donut-label">Convertidos: {ganho}</div>
                          </div>
                        </Paper>
                      </div>
                    </Grid>
                  </Grid>
                </div>
              );
            })()}
            {viewMode === "board" && (
              <div ref={kanbanRef} className={classes.fixedContent} style={{ height: '100%' }}>
                <LeadsKanbanBoard
                  columns={currentColumns}
                  leads={visibleLeads}
                  contacts={contactsList}
                  onEdit={(lead) => {
                    const linkedContact =
                      lead?.contact ||
                      (lead?.contactId && Array.isArray(contactsList)
                        ? contactsList.find((c) => String(c.id) === String(lead.contactId))
                        : null);
                    setEditing(linkedContact ? { ...lead, contact: linkedContact } : lead);
                    setDrawerOpen(true);
                  }}
                  onOpenTagCreator={openTagCreator}
                  onOpenPipelineConfig={() => setPipelineDrawerOpen(true)}
                  onAdd={(statusKey) => {
                    setEditing({ status: statusKey });
                    setDrawerOpen(true);
                  }}
                  onMove={async (leadId, sourceCol, destCol) => {
                    if (sourceCol === destCol) return;
                    const id = Number(leadId);
                    const newStatus = destCol;
                    setLeadsState(prev => prev.map(l => Number(l.id) === id ? { ...l, status: newStatus } : l));
                    try {
                      await leadsSalesService.update(id, { status: newStatus });
                      if (isLeadSaleWon(newStatus, currentColumns)) {
                        refreshDashboard();
                      }
                    } catch (err) {
                      toastError(err);
                      setLeadsState(prev => prev.map(l => Number(l.id) === id ? { ...l, status: sourceCol } : l));
                    }
                  }}
                  onComplete={(lead, sourceCol) =>
                    setCongratsModal({ lead, sourceCol })
                  }
                  onDelete={(lead) => setDeleteModalLead(lead)}
                />
              </div>
            )}
          </>
        )}
      </ActivitiesStyleLayout>
      {/* calendário renderizado dentro do ActivitiesStyleLayout para evitar espaçamento extra */}
      {false && (() => {
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
        const events = (leadsState || []).map((l) => {
          const when = l.nextFollowUpAt || l.date || l.createdAt || l.updatedAt || Date.now();
          return {
            title: l.name || l.companyName || `Lead ${l.id}`,
            start: new Date(when),
            end: new Date(when),
            allDay: true,
            resource: l
          };
        });
        const eventPropGetter = (evt) => {
          const st = String(evt?.resource?.status || "").toLowerCase();
          let backgroundColor = "#2563eb";
          if (isLeadSaleWon(st, currentColumns)) backgroundColor = "#10B981";
          if (st.includes("lost") || st.includes("perdido")) backgroundColor = "#EF4444";
          return { style: { backgroundColor, color: "#0f172a", borderRadius: 10, border: `1px solid ${backgroundColor}`, padding: "6px 8px", fontSize: 12 } };
        };
        const total = leadsState.length;
        const ganho = leadsState.filter((l) =>
          isLeadSaleWon(l.status, currentColumns)
        ).length;
        return null;
      })()}
      <Popover
        open={Boolean(tagAnchor)}
        anchorEl={tagAnchor}
        onClose={closeTagCreator}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div style={{ padding: 10, width: 220 }}>
          <Typography variant="caption" style={{ color: "#374151" }}>
            Criar tag
          </Typography>
          <TextField
            autoFocus
            size="small"
            fullWidth
            variant="outlined"
            placeholder="Ex.: Cliente VIP"
            value={tagText}
            onChange={(e) => setTagText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddTag(); }}
            style={{ marginTop: 6 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button size="small" onClick={closeTagCreator}>Cancelar</Button>
            <Button size="small" color="primary" variant="contained" onClick={handleAddTag}>
              Adicionar
            </Button>
          </div>
        </div>
      </Popover>

      <LeadSaleCongratsModal
        open={Boolean(congratsModal)}
        onClose={() => setCongratsModal(null)}
        leadName={
          congratsModal?.lead?.name ||
          congratsModal?.lead?.companyName ||
          ""
        }
        stageLabel={wonStageLabel}
        onAdvance={handleAdvanceFromCongrats}
        onCreateCompany={handleCreateCompanyFromCongrats}
        advancing={congratsAdvancing}
      />

      <LeadSaleDeleteModal
        open={Boolean(deleteModalLead)}
        onClose={() => setDeleteModalLead(null)}
        lead={deleteModalLead}
        onConfirm={handleConfirmDeleteLead}
        deleting={deleteDeleting}
      />

      <LeadCompanyModal
        open={companyModalOpen}
        initialValues={companyInitial}
        onClose={() => {
          setCompanyModalOpen(false);
          setCompanyInitial(null);
        }}
        onSave={async (payload) => {
          try {
            await convertedLeadsService.create(payload);
            toast.success("Empresa registrada em Leads convertidos.");
            setCompanyModalOpen(false);
            setCompanyInitial(null);
          } catch (err) {
            toastError(err);
          }
        }}
      />

      <CreateLeadSaleModal
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        lead={editing}
        pipelineId={selectedPipelineId}
        columns={currentColumns}
        onSave={(saved) => {
          setLeadsState((prev) => {
            const id = Number(saved.id);
            const exists = prev.some(p => Number(p.id) === id);
            return exists ? prev.map(p => Number(p.id) === id ? saved : p) : [saved, ...prev];
          });
          setEditing(null);
        }}
      />

      <PipelineDrawer
        open={pipelineDrawerOpen}
        onClose={() => setPipelineDrawerOpen(false)}
        title="Configurar Pipelines"
        pipelines={pipelines}
        selectedId={selectedPipelineId}
        onSave={async (pipes, selId) => {
          try {
            const saved = await leadPipelinesService.bulkSave(pipes);
            let list = Array.isArray(saved) ? saved : [];
            if (!list.length) {
              try {
                const fromApi = await leadPipelinesService.list();
                if (Array.isArray(fromApi) && fromApi.length) list = fromApi;
              } catch (_) {
                /* ignore */
              }
            }
            if (!list.length) {
              toast.error("Não foi possível confirmar as pipelines após salvar. Atualize a página.");
              return;
            }
            setPipelines(list);
            resolveSelectedPipelineId(list, pipes, selId);
            setPipelineDrawerOpen(false);
            toast.success("Pipelines salvas com sucesso.");
          } catch (err) {
            const apiMsg = err?.response?.data?.error || err?.response?.data?.message;
            const isTimeout = err?.code === "ECONNABORTED" || /timeout/i.test(String(err?.message || ""));
            toast.error(
              typeof apiMsg === "string" && apiMsg.trim()
                ? apiMsg.trim()
                : isTimeout
                  ? "Tempo esgotado ao salvar as pipelines. Tente de novo."
                  : "Não foi possível salvar as pipelines. Verifique a conexão ou atualize a página."
            );
            toastError(err);
            try {
              const list = await leadPipelinesService.list();
              if (Array.isArray(list)) setPipelines(list);
            } catch (_) {
              /* ignore */
            }
          }
        }}
      />
    </>
  );
};

export default LeadsSales;
