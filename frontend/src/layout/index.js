/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useContext, useEffect, useMemo, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  makeStyles,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  Button,
  MenuItem,
  IconButton,
  Menu,
  useTheme,
  useMediaQuery,
  Avatar,
  Badge,
  withStyles,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItem,
  ListItemAvatar,
  ListItemText,
  FormControlLabel,
  Checkbox,
  InputBase,
  Tabs,
  Tab,
  Paper,
  Tooltip,
} from "@material-ui/core";
import { Link as RouterLink, useHistory, useLocation } from "react-router-dom";
import PageHelpButton from "../components/PageHelpButton";
import { getHelpTopicForPath, usesLayoutNavbarHelp } from "../utils/pageHelpMap";
import { PageTitleContext } from "../context/PageTitleContext";
import { DrawerContext } from "../context/DrawerContext";
import MenuIcon from "@material-ui/icons/Menu";
import SearchRounded from "@mui/icons-material/SearchRounded";
import EventRounded from "@mui/icons-material/EventRounded";
import LanguageRounded from "@mui/icons-material/LanguageRounded";
import logoBrainAi from "../assets/logo_brain_ai.png";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import NotificationsIcon from "@material-ui/icons/Notifications";
import api from "../services/api";
import MainListItems from "./MainListItems";
import NotificationsPopOver from "../components/NotificationsPopOver";
import UserModal from "../components/UserModal";
import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { i18n, applyAppLanguage } from "../translate/i18n";
import toastError from "../errors/toastError";
import AnnouncementsPopover from "../components/AnnouncementsPopover";
import BirthdayModal from "../components/BirthdayModal";
import defaultLogoLight from "../assets/olachat-logo-light.png";
import defaultLogoDark from "../assets/olachat-logo-dark.png";
import defaultLogoIcon from "../assets/olachat-icon.png";
import { useDate } from "../hooks/useDate";
import ColorModeContext from "../layout/themeContext";
import { getBackendUrl, resolvePublicUploadUrl } from "../config";
import useSettings from "../hooks/useSettings";
import VersionControl from "../components/VersionControl";
import useSocketListener from "../hooks/useSocketListener";
import { logInfo, logError } from "../utils/logger";
import SubscriptionAlertBanner from "../components/SubscriptionAlertBanner";
import FreemiumTrialBar from "../components/FreemiumTrialBar";
import { topbarSvgIconStyle } from "../constants/topbarIcons";

const backendUrl = getBackendUrl();
const drawerWidth = 210;
const appBarHeight = 32;

const useStyles = makeStyles((theme) => {
  const navIcon =
    theme.navbarAccent != null && theme.navbarAccent !== ""
      ? theme.navbarAccent
      : "rgba(255, 255, 255, 0.9)";
  return {
  root: {
    display: "flex",
    height: "100vh",
    minHeight: "100dvh",
    [theme.breakpoints.down("sm")]: {
      height: "calc(100vh - 56px)",
      minHeight: "calc(100dvh - 56px)",
    },
    backgroundColor: theme.palette.fancyBackground,
    "& .MuiButton-outlinedPrimary": {
      color: theme.palette.primary.main,
      border: `1px solid ${theme.palette.primary.main}40`,
      borderRadius: "6px",
      fontWeight: 500,
      textTransform: "none",
      transition: "background-color 0.15s ease, border-color 0.15s ease",
      "&:hover": {
        backgroundColor: `${theme.palette.primary.main}10`,
        borderColor: theme.palette.primary.main,
      },
    },
    "& .MuiTab-textColorPrimary.Mui-selected": {
      color: theme.palette.primary.main,
      fontWeight: 300,
    },
    "& .MuiButton-containedPrimary, & .MuiButton-outlinedPrimary, & .MuiButton-textPrimary": {
      textTransform: "none",
      fontSize: "12px",
      fontWeight: 500,
      borderRadius: 6,
      padding: "5px 16px",
      minWidth: 80,
      minHeight: 32,
      maxHeight: 34,
      letterSpacing: "0.01em",
    },
    "& .MuiButton-contained": {
      boxShadow: "none",
      "&:hover": { boxShadow: "none" },
    },
    "& .MuiDialogActions-root .MuiButton-root": {
      fontSize: "12px",
      padding: "5px 16px",
      minWidth: 80,
      minHeight: 32,
      maxHeight: 34,
      textTransform: "none",
      borderRadius: 6,
    },
  },

  chip: {
    background: "red",
    color: "white",
  },

  avatar: {
    width: "100%",
  },

  toolbarCenterCluster: {
    position: "absolute",
    left: "50%",
    transform: "translateX(calc(-50% - 20px))",
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: theme.spacing(0.25),
    zIndex: 1,
    pointerEvents: "auto",
    [theme.breakpoints.down("xs")]: {
      transform: "translateX(calc(-50% - 10px))",
      maxWidth: "88vw"
    }
  },
  toolbar: {
    position: "relative",
    paddingRight: 16,
    paddingLeft: 8,
    color: theme.palette.dark.main,
    background: theme.palette.barraSuperior,
    backdropFilter: "saturate(180%) blur(8px)",
    WebkitBackdropFilter: "saturate(180%) blur(8px)",
    boxShadow: "none",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    transition: "width 0.2s ease, margin 0.2s ease",
    minHeight: `${appBarHeight}px`,
    height: `${appBarHeight}px`,
    "& .MuiIconButton-root": {
      padding: 6,
      margin: "0 3px",
      borderRadius: 6,
      color: navIcon,
      transition: "background-color 0.15s ease",
      "&:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
      },
    },
  },
  topbarActionBtn: {
    width: 24,
    height: 24,
    minWidth: 24,
    minHeight: 24,
    padding: "0 !important",
    margin: "0 2px !important",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    "& .MuiSvgIcon-root": {
      fontSize: "14px !important",
      width: "14px !important",
      height: "14px !important",
    },
    "& svg": {
      width: "14px !important",
      height: "14px !important",
      flexShrink: 0,
    },
    "& .MuiBadge-root": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
  },
  topbarRightCluster: {
    display: "inline-flex",
    alignItems: "center",
    flexShrink: 0,
  },

  toolbarIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 8px",
    height: "64px",
    minHeight: "64px",
    backgroundColor:
      theme.palette.sidebarMenuBackground || theme.palette.background.paper,
    transition: "all 0.3s ease",
    marginTop: 0,
    marginBottom: 0,
    position: "relative",
  },
  chevronButton: {
    position: "absolute",
    top: 4,
    right: 8,
    padding: 2,
    color: theme.palette.sidebarMenuIcon || theme.palette.text.primary,
    "& svg": {
      fontSize: "0.9rem",
    },
    [theme.breakpoints.down("sm")]: {
      display: "none", // Esconde em mobile
    },
  },

  search: {
    position: "relative",
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.18)",
    },
    "&:focus-within": {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    marginRight: theme.spacing(1.5),
    marginLeft: 0,
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      marginLeft: theme.spacing(0.5),
      width: "auto",
    },
    flexGrow: 1,
    maxWidth: "260px",
    height: "26px",
    alignItems: "center",
    display: "flex",
  },
  /** Pesquisa dentro do cluster central (sem flexGrow, largura fixa). */
  searchCentered: {
    flexGrow: 0,
    marginLeft: 0,
    marginRight: 0,
    width: "min(280px, 42vw)",
    maxWidth: 280,
    [theme.breakpoints.down("xs")]: {
      width: "min(220px, 52vw)",
      maxWidth: 260
    }
  },
  searchIcon: {
    padding: theme.spacing(0, 1),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: navIcon,
    "& .MuiSvgIcon-root": {
      fontSize: 16,
      width: 16,
      height: 16,
    },
  },
  inputRoot: {
    color: 'inherit',
    width: "100%",
    fontSize: "0.8125rem",
  },
  inputInput: {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(2)}px)`, // Ajustado padding
    transition: theme.transitions.create('width'),
    width: '100%',
    color: navIcon,
    "&::placeholder": {
        color: navIcon,
        opacity: 0.75,
        fontSize: "0.8rem", // Placeholder menor
    }
  },

  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    height: `${appBarHeight}px`,
    backgroundColor: theme.palette.barraSuperior,
    color: "inherit",
  },

  appBarShift: {
    // marginLeft: drawerWidth, // REMOVIDO PARA OCUPAR LARGURA TOTAL
    // width: `calc(100% - ${drawerWidth}px)`, // REMOVIDO
    width: "100%",
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },

  secondaryNavbar: {
    position: "fixed",
    top: appBarHeight,
    right: 0,
    left: theme.spacing(7),
    backgroundColor: theme.palette.background.paper,
    // borderBottom: "1px solid rgba(0, 0, 0, 0.12)", // Removed
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin", "left"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    [theme.breakpoints.up("sm")]: {
      left: theme.spacing(9),
    },
    [theme.breakpoints.down("sm")]: {
      left: 0,
    },
  },
  secondaryNavbarShift: {
    left: drawerWidth,
    transition: theme.transitions.create(["width", "margin", "left"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },

  menuButtonHidden: {
    display: "none",
  },

  title: {
    fontSize: 12,
    color: "white",
    fontWeight: 300,
    letterSpacing: "0.025em",
    marginLeft: theme.spacing(7),
    transition: theme.transitions.create(["margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    [theme.breakpoints.up("sm")]: {
      marginLeft: theme.spacing(9),
    },
  },

  titleShift: {
    marginLeft: drawerWidth,
    transition: theme.transitions.create(["margin"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },

  drawerPaper: {
    whiteSpace: "nowrap",
    width: drawerWidth,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: "hidden",
    overflowY: "hidden",
    display: "flex",
    flexDirection: "column",
    backgroundColor:
      theme.palette.sidebarMenuBackground || theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    boxShadow: "none",
    top: `${appBarHeight}px`,
    height: `calc(100% - ${appBarHeight}px)`,
    marginTop: 0,
    paddingTop: 0,
    ...(theme.palette.sidebarMenuBackground
      ? {
          borderRadius: "0 10px 10px 0",
          borderRight: `1px solid ${theme.palette.divider}`,
        }
      : {}),
    "& .MuiList-root": {
      paddingTop: 4,
      paddingBottom: 4,
    },
    "& .MuiDivider-root": {
      margin: "6px 8px",
    },
  },

  drawerPaperClose: {
    overflowX: "hidden",
    overflowY: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing(6),
    [theme.breakpoints.up("sm")]: {
      width: theme.spacing(6),
    },
    "& .MuiListItem-root": {
      justifyContent: "center",
      paddingLeft: "0 !important",
      paddingRight: "0 !important",
      marginLeft: "auto",
      marginRight: "auto",
    },
    "& .MuiListItemIcon-root": {
      minWidth: "100% !important",
      width: "100%",
      marginRight: "0 !important",
      marginLeft: "0 !important",
      justifyContent: "center",
      alignItems: "center",
    },
    "& .MuiListItemIcon-root > span": {
      marginLeft: "auto",
      marginRight: "auto",
    },
  },

  appBarSpacer: {
    minHeight: `${appBarHeight}px`,
  },

  content: {
    flex: 1,
    minHeight: 0,
    overflow: "auto",
    padding: 0,
    margin: 0,
    paddingLeft: 0,
    ...theme.scrollbarStyles,
  },

  container: {
    padding: 0,
    margin: 0,
    maxWidth: "none",
    width: "100%",
  },

  containerWithScroll: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    ...theme.scrollbarStylesSoft,
    borderRadius: "8px",
    border: "2px solid transparent",
  },

  sidebarBottomList: {
    paddingTop: "2px !important",
    paddingBottom: "2px !important",
  },

  logo: {
    width: "auto",
    height: "auto",
    maxHeight: "72px",
    maxWidth: "min(100%, 188px)",
    objectFit: "contain",
    objectPosition: "center",
    transition: "opacity 0.15s ease",
    cursor: "pointer",
    "&:hover": {
      opacity: 0.9,
    },
  },

  logoCollapsed: {
    width: "34px",
    height: "34px",
    maxWidth: "34px",
    maxHeight: "34px",
    margin: "0 auto",
    objectFit: "contain",
  },

  hideLogo: {
    width: "28px",
    maxWidth: "28px",
    margin: "0 auto",
  },

  avatar2: {
    width: 24,
    height: 24,
    cursor: "pointer",
    borderRadius: "50%",
    border: "1.5px solid rgba(255,255,255,0.35)",
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "scale(1.05)",
      borderColor: theme.palette.primary.main, // Usa cor do tema
    },
  },

  updateDiv: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  // Botões da toolbar melhorados
  toolbarButton: {
    color: navIcon,
    borderRadius: "6px",
    padding: "5px",
    margin: "0 1px",
    transition: "background-color 0.15s ease",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  },

  menuButton: {
    color: navIcon,
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
  },

  // Seletor de idioma melhorado
  languageSelector: {
    position: "relative",
    display: "inline-block",
    "& > button": {
      background: "rgba(255, 255, 255, 0.1)",
      border: "none",
      borderRadius: "8px",
      color: navIcon,
      fontSize: "18px",
      padding: "8px 12px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      "&:hover": {
        background: "rgba(255, 255, 255, 0.2)",
        transform: "translateY(-1px)",
      },
    },
    "& > div": {
      position: "absolute",
      top: "45px",
      left: "0",
      background: theme.palette.background.paper,
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      borderRadius: "8px",
      padding: "8px",
      zIndex: 1000,
      minWidth: "120px",
      border: `1px solid ${theme.palette.divider}`,
      "& button": {
        background: "none",
        border: "none",
        color: theme.palette.text.primary,
        display: "block",
        width: "100%",
        padding: "8px 12px",
        textAlign: "left",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: 500,
        transition: "all 0.2s ease",
        "&:hover": {
          background: `${theme.palette.primary.main}10`, // Usa cor do tema
          color: theme.palette.primary.main, // Usa cor do tema
          transform: "none",
        },
      },
    },
  },

  animatedBadge: {
    "& .MuiBadge-badge": {
      fontSize: "0.625rem",
      minWidth: 16,
      height: 16,
    },
  },
};
});

const StyledBadge = withStyles((theme) => ({
  badge: {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "$ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0,
    },
  },
}))(Badge);

const SmallAvatar = withStyles((theme) => ({
  root: {
    width: 22,
    height: 22,
    border: `2px solid ${theme.palette.background.paper}`,
  },
}))(Avatar);

const LoggedInLayout = ({ children, themeToggle, hideMenu = false }) => {
  const classes = useStyles();
  const { pageTitle } = useContext(PageTitleContext);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { handleLogout, loading, user, socket } = useContext(AuthContext);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVariant, setDrawerVariant] = useState("permanent");

  const [showOptions, setShowOptions] = useState(false);
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [ackChecked, setAckChecked] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);

  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const greaterThenSm = useMediaQuery(theme.breakpoints.up("sm"));
  const topbarIconColor =
    theme.navbarAccent != null && theme.navbarAccent !== ""
      ? theme.navbarAccent
      : "rgba(255, 255, 255, 0.92)";
  const topbarIconSx = topbarSvgIconStyle(topbarIconColor);

  const history = useHistory();
  const location = useLocation();
  const appBarHelpTopic =
    !usesLayoutNavbarHelp(location.pathname) &&
    getHelpTopicForPath(location.pathname);
  const [searchParam, setSearchParam] = useState("");

  const handleSearch = (e) => {
    setSearchParam(e.target.value);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && searchParam.trim()) {
      const term = searchParam.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const routes = [
        { name: "inicio", path: "/" },
        { name: "gerencia", path: "/reports" },
        { name: "dashboard", path: "/reports" },
        { name: "relatorios", path: "/reports" },
        { name: "chats em tempo real", path: "/moments" },
        { name: "historico de chamadas", path: "/call-historicals" },
        { name: "contatos", path: "/contacts" },
        { name: "calendario", path: "/schedules" },
        { name: "chat", path: "/chats" },
        { name: "api", path: "/api" },
        { name: "atendimento", path: "/tickets" },
        { name: "atendimentos", path: "/tickets" },
        { name: "whatsaap", path: "/tickets" },
        { name: "whatsapp", path: "/tickets" },
        { name: "tickets", path: "/tickets" },
        { name: "filas e chatbot", path: "/queues" },
        { name: "filas", path: "/queues" },
        { name: "chatbot", path: "/queues" },
        { name: "config. aniversario", path: "/birthday-settings" },
        { name: "aniversario", path: "/birthday-settings" },
        { name: "respostas rapidas", path: "/quick-messages" },
        { name: "gerenciar conexoes", path: "/connections" },
        { name: "conexoes", path: "/connections" },
        { name: "informativos", path: "/announcements" },
        { name: "kanban", path: "/kanban" },
        { name: "campanhas", path: "/campaigns" },
        { name: "templates meta", path: "/campaign-meta-templates" },
        { name: "agente ia", path: "/prompts" },
        { name: "automacoes", path: "/flowbuilders" },
        { name: "configuracoes", path: "/settings" },
        { name: "identidade visual", path: "/settings" },
        { name: "empresas", path: "/companies" },
        { name: "usuarios", path: "/users" },
        { name: "integracoes", path: "/integrations" },
        { name: "financeiro", path: "/financeiro" },
        { name: "api mcp", path: "/platform-api" },
        { name: "api crm", path: "/platform-api" },
        { name: "platform api", path: "/platform-api" },
        { name: "tags", path: "/tags" },
        { name: "ajuda", path: "/helps" },
      ];

      const found = routes.find(r => r.name.includes(term) || term.includes(r.name));
      
      if (found) {
        history.push(found.path);
        setSearchParam("");
      }
    }
  };

  const { dateToClient } = useDate();
  const [profileUrl, setProfileUrl] = useState(null);
  const [updateInProgress, setUpdateInProgress] = useState(false);


  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mainListItems = useMemo(
    () => <MainListItems drawerOpen={drawerOpen} collapsed={!drawerOpen} />,
    [user?.id, user?.profile, drawerOpen]
  );

  const settings = useSettings();
  const getPublicSettingRef = useRef(settings.getPublicSetting);
  getPublicSettingRef.current = settings.getPublicSetting;

  /** Logos públicas são por empresa; GET /public-settings sem companyId usa empresa 1 no backend — recarrega com a empresa do usuário logado. */
  useEffect(() => {
    const companyId = user?.companyId;
    if (!companyId) return;
    let cancelled = false;
    const toLogoSrc = (file, fallback) => {
      if (file == null || typeof file === "object") return fallback;
      const s = String(file).trim();
      if (!s || s === "[object Object]") return fallback;
      const u = resolvePublicUploadUrl(s);
      return u || fallback;
    };
    (async () => {
      try {
        const gp = getPublicSettingRef.current;
        const [lightFile, darkFile] = await Promise.all([
          gp("appLogoLight", companyId),
          gp("appLogoDark", companyId),
        ]);
        if (cancelled) return;
        colorMode.setAppLogoLight(toLogoSrc(lightFile, defaultLogoLight));
        colorMode.setAppLogoDark(toLogoSrc(darkFile, defaultLogoDark));
      } catch {
        /* mantém estado do App */
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- colorMode/setters estáveis; evitar loop com value novo do Provider
  }, [user?.companyId]);

  const fetchAnnouncements = useCallback(async () => {
      try {
        const { data } = await api.get("/announcements/for-company", {
          params: {
            status: true,
            pageNumber: "1"
          }
        });

        // Filtra apenas os informativos ativos e não expirados
        const activeAnnouncementsRaw = (data?.records || []).filter(announcement => {
          const isActive = announcement.status === true || announcement.status === "true";
          const isNotExpired = !announcement.expiresAt || new Date(announcement.expiresAt) > new Date();
          return isActive && isNotExpired;
        });

        // Backend já filtra por empresa excluindo os reconhecidos
        const activeAnnouncements = activeAnnouncementsRaw;
        setAnnouncements(activeAnnouncements);
        setShowAnnouncementsModal(activeAnnouncements.length > 0);
      } catch (err) {
        toastError(err);
      }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchAnnouncements();
    }
  }, [user?.id, fetchAnnouncements]);

  // Atualiza checkbox ao trocar de aviso
  useEffect(() => {
    if (!selectedAnnouncement) {
      setAckChecked(false);
      return;
    }
    // Não precisamos mais ler localStorage; tratamos via backend
    setAckChecked(false);
  }, [selectedAnnouncement, user?.companyId]);

  const handleToggleAcknowledge = async (announcementId, checked) => {
    try {
      if (checked) {
        await api.post(`/announcements/${announcementId}/ack`);
        // Remove este aviso da lista
        setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
        setSelectedAnnouncement(null);
      } else {
        await api.delete(`/announcements/${announcementId}/ack`);
        // Opcional: recarregar lista para reexibir (se desejar permitir desfazer)
        await fetchAnnouncements();
      }
      // Fecha modal se não restarem avisos
      setShowAnnouncementsModal((prev) => {
        return announcements.length - 1 > 0;
      });
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    if (document.body.offsetWidth > 600) {
      if (user.defaultMenu === "closed") {
        setDrawerOpen(false);
      } else {
        setDrawerOpen(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.defaultMenu]);

  useEffect(() => {
    if (document.body.offsetWidth < 600) {
      setDrawerVariant("temporary");
    } else {
      setDrawerVariant("permanent");
    }
  }, [drawerOpen]);

  useEffect(() => {
    const companyId = user?.companyId;

    if (companyId) {
      const buildProfileUrl = () => {
        const savedProfileImage = localStorage.getItem("profileImage");
        const currentProfileImage = savedProfileImage || user.profileImage;

        if (currentProfileImage) {
          return `${backendUrl}/public/company${companyId}/user/${currentProfileImage}`;
        }
        return `${backendUrl}/public/app/noimage.png`;
      };

      setProfileUrl(buildProfileUrl());
    }
  }, [user?.companyId, user?.profileImage, backendUrl]);

  // Callbacks dos eventos
  const handleAuthEvent = useCallback((data) => {
    // Ignora eco do próprio login nesta aba (evita logout ao abrir perfil/abas)
    try {
      const myToken = localStorage.getItem("token");
      const emitted = data?.user?.token;
      if (myToken && emitted) {
        const parsed = (() => {
          try {
            return JSON.parse(myToken);
          } catch {
            return myToken;
          }
        })();
        if (String(parsed) === String(emitted) || String(myToken) === String(emitted)) {
          return;
        }
      }
    } catch {
      /* segue */
    }
    if (data.user.id === +user?.id) {
      toastError("Sua conta foi acessada em outro computador.");
      setTimeout(() => {
        localStorage.clear();
        window.location.reload();
      }, 1000);
    }
  }, [user?.id]);

  const handleUserUpdate = useCallback((data) => {
    if (data.action === "update" && data.user.id === +user?.id) {
      if (data.user.profileImage) {
        const newProfileUrl = `${backendUrl}/public/company${user?.companyId}/user/${data.user.profileImage}`;
        setProfileUrl(newProfileUrl);
        localStorage.setItem("profileImage", data.user.profileImage);
      }
    }
  }, [user?.companyId, user?.id, backendUrl]);

  // Callbacks para eventos de aniversário
  const handleUserBirthday = useCallback((data) => {
    logInfo("Evento de aniversário de usuário recebido", { data });
    if (data.userId === +user?.id) {
      setShowBirthdayModal(true);
    }
  }, [user?.id]);

  const handleContactBirthday = useCallback((data) => {
    logInfo("Evento de aniversário de contato recebido", { data });
  }, []);

  // Verificar aniversários no login
  const checkBirthdaysOnLogin = useCallback(async () => {
    if (user?.id && user?.companyId) {
      try {
        const { data } = await api.get("/birthdays/today");
        const birthdayData = data.data;

        // Verificar se o usuário atual faz aniversário hoje
        const userBirthday = birthdayData.users.find(u => u.id === +user.id);
        if (userBirthday) {
          logInfo("Usuário faz aniversário hoje; exibindo modal");
          setShowBirthdayModal(true);
        }

        // Se há aniversariantes, mostrar notificação
        if (birthdayData.users.length > 0 || birthdayData.contacts.length > 0) {
          logInfo("Há aniversariantes hoje", { birthdayData });
        }
      } catch (error) {
        logError("Erro ao verificar aniversários", error);
      }
    }
  }, [user?.id, user?.companyId]);

  // Registrar listeners
  useSocketListener(socket, user, 'auth', handleAuthEvent);
  useSocketListener(socket, user, 'user', handleUserUpdate);
  useSocketListener(socket, user, 'user-birthday', handleUserBirthday);
  useSocketListener(socket, user, 'contact-birthday', handleContactBirthday);

  // Verificar aniversários quando o usuário faz login
  useEffect(() => {
    if (user?.id && user?.companyId) {
      // Pequeno delay para garantir que o socket esteja conectado
      const timer = setTimeout(() => {
        checkBirthdaysOnLogin();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user?.id, user?.companyId, checkBirthdaysOnLogin]);

  // Status do usuário
  useEffect(() => {
    if (socket?.emit && user?.companyId) {
      socket.emit("userStatus");

      const interval = setInterval(() => {
        socket?.emit && socket.emit("userStatus");
      }, 1000 * 60 * 5);

      return () => clearInterval(interval);
    }
  }, [socket, user?.companyId]);

  const handleUpdateStart = () => {
    setUpdateInProgress(true);
  };

  const handleUpdateComplete = () => {
    setUpdateInProgress(false);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuOpen(false);
  };

  const handleOpenUserModal = () => {
    setUserModalOpen(true);
    handleCloseMenu();
  };

  const handleClickLogout = () => {
    handleCloseMenu();
    handleLogout();
  };

  const drawerClose = () => {
    if (document.body.offsetWidth < 600 || user.defaultMenu === "closed") {
      setDrawerOpen(false);
    }
  };

  const handleRefreshPage = () => {
    window.location.reload(false);
  };

  const handleMenuItemClick = () => {
    const { innerWidth: width } = window;
    if (width <= 600) {
      setDrawerOpen(false);
    }
  };

  const handleLanguageChange = async (lng) => {
    try {
      await applyAppLanguage(lng);
      if (user?.id) {
        await api.put(`/users/${user.id}`, { language: lng });
      }
      setShowOptions(false);
    } catch (err) {
      toastError(err);
    }
  };

  const LANGUAGE_OPTIONS = [
    { code: "pt-BR", label: "Português" },
    { code: "en", label: "English" },
    { code: "es", label: "Spanish" },
    { code: "ar", label: "عربي" },
  ];

  const [enabledLanguages, setEnabledLanguages] = useState(["pt-BR", "en"]);
  const { getAll } = useSettings();
  const getAllRef = useRef(getAll);
  getAllRef.current = getAll;
  useEffect(() => {
    let cancelled = false;
    async function fetchSettings() {
      try {
        const settings = await getAllRef.current();
        if (cancelled) return;
        const enabledLanguagesSetting = settings.find(
          (s) => s.key === "enabledLanguages"
        )?.value;
        let langs = ["pt-BR", "en"];
        try {
          if (enabledLanguagesSetting) {
            langs = JSON.parse(enabledLanguagesSetting);
          }
        } catch { }
        setEnabledLanguages((prev) => {
          const next = Array.isArray(langs) ? langs : ["pt-BR", "en"];
          if (prev.length === next.length && prev.every((v, i) => v === next[i])) return prev;
          return next;
        });
      } catch (error) {
        console.log("Layout - erro ao carregar enabledLanguages:", error);
      }
    }
    fetchSettings();
    return () => { cancelled = true; };
  }, [user?.companyId]);

  const filteredLanguageOptions = LANGUAGE_OPTIONS.filter((lang) =>
    enabledLanguages.includes(lang.code)
  );

  const drawerContextValue = useMemo(
    () => ({ drawerOpen, setDrawerOpen }),
    [drawerOpen]
  );

  if (loading || updateInProgress) {
    return <BackdropLoading />;
  }

  return (
    <DrawerContext.Provider value={drawerContextValue}>
      <div className={clsx(classes.root, "logged-in-layout")}>
      {!hideMenu && (
        <Drawer
          variant={drawerVariant}
          className={drawerOpen ? classes.drawerPaper : classes.drawerPaperClose}
          classes={{
            paper: clsx(
              classes.drawerPaper,
              !drawerOpen && classes.drawerPaperClose
            ),
          }}
          open={drawerOpen}
        >
          <div className={classes.toolbarIcon}>
            <img
              src={
                !drawerOpen
                  ? (typeof theme.calculatedLogoIcon === "function"
                      ? theme.calculatedLogoIcon()
                      : defaultLogoIcon)
                  : theme.palette.type === "dark"
                    ? theme.calculatedLogoDark()
                    : theme.calculatedLogoLight()
              }
              alt="OlaChat Pro"
              className={clsx(
                classes.logo,
                !drawerOpen && classes.logoCollapsed
              )}
              onClick={() => setDrawerOpen(!drawerOpen)}
              key={`sidebar-logo-${drawerOpen}-${theme.palette.type}-${String(colorMode.appLogoLight)}-${String(colorMode.appLogoDark)}-${String(colorMode.appLogoFavicon)}`}
            />
            {drawerOpen && (
              <IconButton onClick={() => setDrawerOpen(!drawerOpen)} className={classes.chevronButton}>
                <MenuIcon />
              </IconButton>
            )}
          </div>
          <List className={classes.containerWithScroll}>
            <MainListItems collapsed={!drawerOpen} section="main" />
          </List>
          <Divider />
          <List className={classes.sidebarBottomList} style={{ marginTop: "auto", flexShrink: 0 }}>
             <MainListItems collapsed={!drawerOpen} section="bottom" />
          </List>
        </Drawer>
      )}

      <AppBar
        position="absolute"
        className={clsx(classes.appBar, !hideMenu && drawerOpen && classes.appBarShift)}
        color="transparent"
        elevation={0}
      >
        <Toolbar variant="dense" className={classes.toolbar}>
          {!hideMenu && (
            <IconButton
              edge="start"
              variant="contained"
              aria-label="open drawer"
              onClick={() => setDrawerOpen(!drawerOpen)}
              className={clsx(
                (drawerOpen || drawerVariant === "permanent") && classes.menuButtonHidden
              )}
            >
              <MenuIcon />
            </IconButton>
          )}
          <FreemiumTrialBar variant="appBar" />
          <Typography
            variant="body2"
            color="inherit"
            noWrap
            className={clsx(classes.title, drawerOpen && classes.titleShift)}
          >
            {/* Boas vindas removido da topbar */}
          </Typography>

          <div style={{ flexGrow: 1 }} />

          <div className={classes.toolbarCenterCluster}>
            <Tooltip title="Calendário">
              <IconButton
                component={Link}
                to="/schedules"
                className={classes.topbarActionBtn}
              >
                <EventRounded style={topbarIconSx} />
              </IconButton>
            </Tooltip>
            <div className={clsx(classes.search, classes.searchCentered)}>
              <div className={classes.searchIcon}>
                <SearchRounded style={topbarIconSx} />
              </div>
              <InputBase
                placeholder={i18n.t("modules.common.search")}
                classes={{
                  root: classes.inputRoot,
                  input: classes.inputInput,
                }}
                inputProps={{ "aria-label": "search" }}
                value={searchParam}
                onChange={handleSearch}
                onKeyDown={handleSearchKeyDown}
              />
            </div>
            <Tooltip title="Brain.AI">
              <IconButton
                component={Link}
                to="/brain-ai"
                style={{
                  width: 24,
                  height: 24,
                  minWidth: 24,
                  minHeight: 24,
                  padding: 0,
                  margin: "0 2px",
                  background: "transparent",
                  border: "none",
                  boxShadow: "none",
                  borderRadius: "50%",
                  overflow: "hidden",
                }}
              >
                <img src={logoBrainAi} alt="Brain.AI" style={{ width: 24, height: 24, objectFit: 'cover', display: 'block' }} />
              </IconButton>
            </Tooltip>
          </div>

          <div style={{ flexGrow: 1 }} />

          {!hideMenu && (
            <div className={classes.topbarRightCluster}>
              <VersionControl
                onUpdateStart={handleUpdateStart}
                onUpdateComplete={handleUpdateComplete}
              />

              <div
                style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
                className="language-dropdown"
              >
                <IconButton
                  className={classes.topbarActionBtn}
                  onClick={() => setShowOptions(!showOptions)}
                >
                  <LanguageRounded style={topbarIconSx} />
                </IconButton>

                {showOptions && (
                  <div
                    style={{
                      position: "absolute",
                      top: "28px",
                      left: "0",
                      background: theme.palette.background.paper,
                      color: theme.palette.text.primary,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      borderRadius: "8px",
                      padding: "8px",
                      zIndex: 1000,
                      minWidth: "120px",
                      maxWidth: "200px",
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    {filteredLanguageOptions.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleLanguageChange(lang.code)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "block",
                          width: "100%",
                          padding: "4px",
                          color: "inherit",
                        }}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {appBarHelpTopic ? (
                <PageHelpButton
                  topic={appBarHelpTopic}
                  variant="topbar"
                  buttonClassName={classes.topbarActionBtn}
                  style={{
                    borderColor: "rgba(255,255,255,0.25)",
                    color: topbarIconColor,
                  }}
                />
              ) : null}

              <IconButton
                edge="start"
                className={classes.topbarActionBtn}
                onClick={colorMode.toggleColorMode}
              >
                {theme.mode === "dark" ? (
                  <LightModeOutlined style={topbarIconSx} />
                ) : (
                  <DarkModeOutlined style={topbarIconSx} />
                )}
              </IconButton>

              {/* <DarkMode themeToggle={themeToggle} /> */}

              {user.id && (
                <NotificationsPopOver buttonClassName={classes.topbarActionBtn} />
              )}

              <AnnouncementsPopover buttonClassName={classes.topbarActionBtn} />

              <div
                className={clsx("user-menu-wrapper", classes.topbarActionBtn)}
                style={{ marginLeft: 2, overflow: "visible" }}
              >
                <StyledBadge
                  overlap="circular"
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  variant="dot"
                  onClick={handleMenu}
                >
                  <Avatar
                    alt="VBSolution"
                    className={classes.avatar2}
                    src={profileUrl}
                  />
                </StyledBadge>

                <UserModal
                  open={userModalOpen}
                  onClose={() => setUserModalOpen(false)}
                  onImageUpdate={(newProfileUrl) => setProfileUrl(newProfileUrl)}
                  userId={user?.id}
                />

                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  getContentAnchorEl={null}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  open={menuOpen}
                  onClose={handleCloseMenu}
                  PaperProps={{
                    style: {
                      minWidth: "150px",
                      maxWidth: "200px",
                      width: "auto",
                    },
                  }}
                >
                  <MenuItem onClick={handleOpenUserModal}>
                    {i18n.t("mainDrawer.appBar.user.profile")}
                  </MenuItem>
                  <MenuItem onClick={handleClickLogout}>
                    {i18n.t("mainDrawer.appBar.user.logout")}
                  </MenuItem>
                </Menu>
              </div>
            </div>
          )}
        </Toolbar>
      </AppBar>

      <main className={classes.content}>
        <div className={classes.appBarSpacer} />
        <SubscriptionAlertBanner />
        {children ? children : null}
      </main>

      {/* Modal de Informativos */}
      <Dialog
        open={showAnnouncementsModal}
        onClose={() => setShowAnnouncementsModal(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Informativos</DialogTitle>
        <DialogContent dividers>
          {selectedAnnouncement ? (
            <div>
              <Typography variant="h6" gutterBottom>
                {selectedAnnouncement.title}
              </Typography>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {selectedAnnouncement.text}
              </Typography>
              <FormControlLabel
                style={{ marginTop: 12 }}
                control={
                  <Checkbox
                    color="primary"
                    checked={ackChecked}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAckChecked(checked);
                      handleToggleAcknowledge(selectedAnnouncement.id, checked);
                    }}
                  />
                }
                label="Estou ciente e não mostrar novamente"
              />
              {selectedAnnouncement.mediaPath && (
                <div style={{ marginTop: 16 }}>
                  <img
                    src={`${backendUrl}/public/company${user.companyId}${selectedAnnouncement.mediaPath}`}
                    alt="Anexo"
                    style={{ maxWidth: '100%' }}
                  />
                </div>
              )}
              <Button
                onClick={() => setSelectedAnnouncement(null)}
                style={{ marginTop: 16 }}
                variant="outlined"
              >
                Voltar para lista
              </Button>
            </div>
          ) : (
            <List>
              {announcements.map((announcement) => (
                <ListItem
                  button
                  key={announcement.id}
                  onClick={() => setSelectedAnnouncement(announcement)}
                >
                  <ListItemAvatar>
                    <Avatar>
                      <NotificationsIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={announcement.title}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="textPrimary"
                        >
                          Prioridade: {announcement.priority === 1 ? 'Alta' : announcement.priority === 2 ? 'Média' : 'Baixa'}
                        </Typography>
                        {` — ${new Date(announcement.createdAt).toLocaleDateString()}`}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowAnnouncementsModal(false)}
            color="primary"
          >
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Aniversário */}
      <BirthdayModal
        open={showBirthdayModal}
        onClose={() => setShowBirthdayModal(false)}
        user={user}
      />


    </div>
    </DrawerContext.Provider>
  );
};

export default LoggedInLayout;
