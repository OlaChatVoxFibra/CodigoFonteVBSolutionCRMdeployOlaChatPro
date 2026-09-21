/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
import { useHistory } from "react-router-dom";
import clsx from "clsx";
import {
  makeStyles,
  useTheme,
  Paper,
  Box,
  InputBase,
  IconButton,
  Tooltip,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@material-ui/core";
import SearchRounded from "@mui/icons-material/SearchRounded";
import FilterAltOutlined from "@mui/icons-material/FilterAltOutlined";
import FilterAltOffOutlined from "@mui/icons-material/FilterAltOffOutlined";
import LabelOutlined from "@mui/icons-material/LabelOutlined";
import SmartphoneOutlined from "@mui/icons-material/SmartphoneOutlined";
import FlagOutlined from "@mui/icons-material/FlagOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import TuneOutlined from "@mui/icons-material/TuneOutlined";
import ChevronRight from "@mui/icons-material/ChevronRight";
import PlaylistAddCheckOutlined from "@mui/icons-material/PlaylistAddCheckOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import ManageSearchOutlined from "@mui/icons-material/ManageSearchOutlined";
import MarkEmailUnreadOutlined from "@mui/icons-material/MarkEmailUnreadOutlined";
import DateRangeOutlined from "@mui/icons-material/DateRangeOutlined";

import TicketsList from "../TicketsListCustom";
import TabPanel from "../TabPanel";
import { TagsFilter } from "../TagsFilter";
import { UsersFilter } from "../UsersFilter";
import { StatusFilter } from "../StatusFilter";
import { WhatsappsFilter } from "../WhatsappsFilter";
import { QueueFilter } from "../QueueFilter";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { QueueSelectedContext } from "../../context/QueuesSelected/QueuesSelectedContext";

import { TicketsContext } from "../../context/Tickets/TicketsContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import BulkActionModal from "../BulkActionModal";
import TicketsContactSearch from "../TicketsContactSearch";
import NewTicketModal from "../NewTicketModal";
import ShowTicketOpen from "../ShowTicketOpenModal";
import useQueues from "../../hooks/useQueues";
import { canUserToggleShowAll, canUserBulkClose } from "../../utils/ticketVisibilityLabel";
import { v4 as uuidv4 } from "uuid";

const ACTIVE_TICKET_STATUSES = ["open", "pending", "chatbot", "group", "lgpd"];

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.background.default
        : "#f8fafc",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },

  serachInputWrapper: {
    flex: 1,
    minHeight: 40,
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.95)",
    display: "flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "6px 12px",
    border: "1px solid",
    borderColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    marginTop: theme.spacing(0.75),
    marginBottom: theme.spacing(1.25),
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    boxShadow:
      theme.palette.type === "dark"
        ? "0 1px 0 rgba(255,255,255,0.04) inset"
        : "0 1px 2px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.02)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    "&:focus-within": {
      borderColor: theme.palette.type === "dark" ? "rgba(255,255,255,0.22)" : "rgba(99,102,241,0.35)",
      boxShadow:
        theme.palette.type === "dark"
          ? "0 0 0 2px rgba(255,255,255,0.06)"
          : "0 1px 4px rgba(99,102,241,0.12), 0 0 0 3px rgba(99,102,241,0.12)"
    }
  },

  filterModalPaper: {
    borderRadius: 14,
    maxWidth: 380,
    width: "100%",
    margin: "16px auto",
    overflow: "hidden",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeight: 400,
    background:
      theme.palette.type === "dark" ? theme.palette.background.paper : "rgba(255,255,255,0.98)",
    boxShadow:
      theme.palette.type === "dark"
        ? "0 24px 48px rgba(0,0,0,0.45)"
        : "0 18px 50px rgba(0,0,0,0.16), 0 0 1px rgba(0,0,0,0.06)",
    "& .MuiTypography-root": {
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontWeight: 400,
    },
    "& .MuiButton-root": {
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontWeight: 400,
    },
  },
  filterModalTitle: {
    padding: theme.spacing(2, 2.5, 1),
    fontSize: 17,
    fontWeight: 400,
    letterSpacing: "-0.01em",
  },
  filterModalContent: {
    padding: theme.spacing(0, 2.5, 2),
    maxHeight: "min(70vh, 420px)",
    overflowY: "auto",
  },
  filterSection: {
    marginBottom: theme.spacing(1.75),
    "&:last-child": {
      marginBottom: 0,
    },
  },
  filterSectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    color: theme.palette.text.secondary,
    "& svg": {
      opacity: theme.palette.type === "dark" ? 0.85 : 0.65,
    },
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: 400,
    color: theme.palette.text.secondary,
    letterSpacing: "-0.01em",
  },
  filterSectionHint: {
    fontSize: 12,
    lineHeight: 1.45,
    color: theme.palette.text.secondary,
    marginBottom: 8,
    opacity: theme.palette.type === "dark" ? 0.9 : 0.92,
  },
  filterToggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 4,
  },
  filterToggleLabel: {
    fontSize: 13,
    fontWeight: 400,
    color: theme.palette.text.primary,
    letterSpacing: "-0.01em",
    lineHeight: 1.35,
  },
  filterModalActions: {
    padding: theme.spacing(1.25, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  filterModalBulkActions: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    marginRight: "auto",
  },
  contactSearchPanel: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },

  searchIcon: {
    color: theme.palette.type === "dark" ? "rgba(255,255,255,0.45)" : "#94a3b8",
    marginRight: 4,
    fontSize: 22,
    alignSelf: "center",
  },

  searchInput: {
    flex: 1,
    border: "none",
    borderRadius: 30,
    fontSize: 14,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeight: 400,
    letterSpacing: "-0.01em",
    "&::placeholder": {
      color: theme.palette.type === "dark" ? "rgba(255,255,255,0.35)" : "#94a3b8",
      opacity: 1
    }
  },

  /** Abas de status — centralizadas, texto menor, contagem em bolinha */
  tabsBar: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    flexWrap: "nowrap",
    overflowX: "auto",
    msOverflowStyle: "none",
    scrollbarWidth: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
    padding: "0 4px",
    background: "transparent",
    borderBottom:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.06)"
        : "1px solid rgba(0,0,0,0.06)",
  },
  tabButton: {
    flex: "1 1 0",
    minWidth: 0,
    position: "relative",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "8px 6px 7px",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: 11,
    fontWeight: 400,
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
    color: theme.palette.type === "dark" ? "rgba(255,255,255,0.5)" : "#888888",
    whiteSpace: "nowrap",
    transition: "color 0.15s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabButtonActive: {
    color: theme.palette.type === "dark" ? "#f1f5f9" : "#333333",
    fontWeight: 400,
    "&::after": {
      content: '""',
      position: "absolute",
      left: "18%",
      right: "18%",
      bottom: 0,
      height: 2,
      borderRadius: 2,
      backgroundColor: theme.palette.type === "dark" ? "#7aa8e8" : "#7fb2f0",
    },
  },
  tabTitle: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontWeight: 400,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    padding: "0 5px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 400,
    lineHeight: "18px",
    textAlign: "center",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    flexShrink: 0,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  tabBadgeActive: {
    background: theme.palette.type === "dark" ? "#5b8fd9" : "#7fb2f0",
    color: "#ffffff",
  },
  tabBadgeInactive: {
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.12)" : "#d1d5db",
    color: theme.palette.type === "dark" ? "rgba(255,255,255,0.65)" : "#6b7280",
  },
  tabChevron: {
    display: "inline-flex",
    alignItems: "center",
    marginLeft: -2,
    fontSize: 14,
    color: theme.palette.type === "dark" ? "rgba(255,255,255,0.35)" : "#aaaaaa",
    flexShrink: 0,
  },
  filterIcon: {
    marginRight: 6,
    alignSelf: "center",
    color: theme.palette.type === "dark" ? theme.palette.text.secondary : "#6b7280",
    cursor: "pointer",
  },
  icon: {
    color: "#aaa",
    "&:hover": {
      color: "#555",
    },
  },
  bulkActionIconBtn: {
    padding: 4,
    color: theme.palette.type === "dark" ? "rgba(255,255,255,0.35)" : "#9ca3af",
    "&:hover": {
      backgroundColor: "transparent",
      color: theme.palette.type === "dark" ? "rgba(255,255,255,0.55)" : "#6b7280",
    },
    "&.Mui-disabled": {
      color: theme.palette.type === "dark" ? "rgba(255,255,255,0.15)" : "#d1d5db",
    },
  },
  toolbarIconBtn: {
    padding: 4,
    color: theme.palette.type === "dark" ? "rgba(255,255,255,0.35)" : "#9ca3af",
    "&:hover": {
      backgroundColor: "transparent",
      color: theme.palette.type === "dark" ? "rgba(255,255,255,0.55)" : "#6b7280",
    },
  },
  toolbarIconBtnActive: {
    color: theme.palette.primary.main,
  },
  dateRangeRow: {
    display: "flex",
    gap: 8,
    marginTop: 4,
    "& input": {
      flex: 1,
      minWidth: 0,
      fontSize: 13,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      padding: "8px 10px",
      borderRadius: 8,
      border: `1px solid ${theme.palette.divider}`,
      background: theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
      color: theme.palette.text.primary,
    },
  },
}));

const TicketsManagerTabs = () => {
  const classes = useStyles();
  const theme = useTheme();
  const history = useHistory();

  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");
  const [showAllTickets, setShowAllTickets] = useState(false);
  const [sortTickets, setSortTickets] = useState(false);

  const searchInputRef = useRef();
  const [searchOnMessages, setSearchOnMessages] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [newTicketContact, setNewTicketContact] = useState(null);
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [openTicketAlert, setOpenTicketAlert] = useState(false);
  const [openTicketAlertUser, setOpenTicketAlertUser] = useState("");
  const [openTicketAlertQueue, setOpenTicketAlertQueue] = useState("");
  const [creatingTicket, setCreatingTicket] = useState(false);

  const { user } = useContext(AuthContext);
  const { findAll: findAllQueues } = useQueues();
  const { profile } = user;
  const { setSelectedQueuesMessage } = useContext(QueueSelectedContext);
  const { tabOpen, setTabOpen, setCurrentTicket } = useContext(TicketsContext);

  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [groupingCount, setGroupingCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);

  const updateOpenCount = useCallback((val) => setOpenCount(val), []);
  const updatePendingCount = useCallback((val) => setPendingCount(val), []);
  const updateGroupingCount = useCallback((val) => setGroupingCount(val), []);
  const updateClosedCount = useCallback((val) => setClosedCount(val), []);

  const userQueueIds = Array.isArray(user.queues) ? user.queues.map((q) => q.id) : [];
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedWhatsapp, setSelectedWhatsapp] = useState([]);
  const [forceSearch, setForceSearch] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [filter, setFilter] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterFormKey, setFilterFormKey] = useState(0);
  const [draftTagIds, setDraftTagIds] = useState([]);
  const [draftUserIds, setDraftUserIds] = useState([]);
  const [draftWhatsappIds, setDraftWhatsappIds] = useState([]);
  const [draftStatusList, setDraftStatusList] = useState([]);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [draftOnlyUnread, setDraftOnlyUnread] = useState(false);
  const [draftDateStart, setDraftDateStart] = useState("");
  const [draftDateEnd, setDraftDateEnd] = useState("");

  const isAdminProfile =
    String(profile || "").toLowerCase() === "admin" || Boolean(user?.super);

  const showAllToggleVisible = canUserToggleShowAll(user);

  const [draftQueueIds, setDraftQueueIds] = useState([]);
  const [draftShowAllTickets, setDraftShowAllTickets] = useState(false);

  const hasActiveFilters = useMemo(
    () =>
      showAllTickets ||
      onlyUnread ||
      (dateStart && dateEnd) ||
      selectedTags.length > 0 ||
      selectedUsers.length > 0 ||
      selectedWhatsapp.length > 0 ||
      selectedStatus.length > 0 ||
      (selectedQueueIds.length > 0 &&
        selectedQueueIds.length !== userQueueIds.length),
    [showAllTickets, onlyUnread, dateStart, dateEnd, selectedTags, selectedUsers, selectedWhatsapp, selectedStatus, selectedQueueIds, userQueueIds]
  );

  const hasStructuralFilters = useMemo(
    () =>
      selectedTags.length > 0 ||
      selectedUsers.length > 0 ||
      selectedWhatsapp.length > 0 ||
      selectedStatus.length > 0 ||
      (selectedQueueIds.length > 0 &&
        selectedQueueIds.length !== userQueueIds.length),
    [selectedTags, selectedUsers, selectedWhatsapp, selectedStatus, selectedQueueIds, userQueueIds]
  );

  const resolvedShowAll = showAllToggleVisible ? showAllTickets : false;

  useEffect(() => {
    setSelectedQueuesMessage(selectedQueueIds);
  }, [selectedQueueIds]);

  useEffect(() => {
    if (!filterModalOpen) return;
    setDraftTagIds([...selectedTags]);
    setDraftUserIds([...selectedUsers]);
    setDraftWhatsappIds([...selectedWhatsapp]);
    setDraftStatusList([...selectedStatus]);
    setDraftQueueIds([...selectedQueueIds]);
    setDraftShowAllTickets(showAllTickets);
    setDraftOnlyUnread(onlyUnread);
    setDraftDateStart(dateStart);
    setDraftDateEnd(dateEnd);
  }, [filterModalOpen]);

  useEffect(() => {
    const profile = (user?.profile || "").toUpperCase();
    const allUserChat = (user?.allUserChat || "").toUpperCase();
    if (profile === "ADMIN" || allUserChat === "ENABLED") {
      setShowAllTickets(false);
    }
  }, [user?.profile, user?.allUserChat]);

  useEffect(() => {
    if (tab === "search") {
      searchInputRef.current.focus();
    }
    setForceSearch((prev) => !prev);
  }, [tab]);

  let searchTimeout;

  const handleSearch = (e) => {
    const searchedTerm = e.target.value;

    clearTimeout(searchTimeout);

    if (searchedTerm === "") {
      setSearchParam("");
      setContactSearchTerm("");
      setForceSearch(!forceSearch);
      setTab("open");
      return;
    }

    if (searchOnMessages) {
      const term = searchedTerm.toLowerCase();
      if (tab !== "search") {
        setTab("search");
      }
      searchTimeout = setTimeout(() => {
        setSearchParam(term);
        setContactSearchTerm("");
        setForceSearch(!forceSearch);
      }, 500);
      return;
    }

    setContactSearchTerm(searchedTerm.trim());
    setSearchParam("");
    setTab("open");
    setTabOpen("open");
  };

  const contactSearchActive =
    !searchOnMessages && contactSearchTerm.length >= 2;

  const navigateToTicket = useCallback(
    (ticket) => {
      if (!ticket?.uuid) return;
      setCurrentTicket({ id: ticket.id, uuid: ticket.uuid, code: uuidv4() });
      setContactSearchTerm("");
      setSearchParam("");
      if (searchInputRef.current) searchInputRef.current.value = "";
      setTabOpen("open");
      history.push(`/tickets/${ticket.uuid}`);
    },
    [history, setCurrentTicket, setTabOpen]
  );

  const resolveAvailableQueues = useCallback(
    (queues) => {
      const fromApi = Array.isArray(queues) ? queues : [];
      const fromUser = Array.isArray(user?.queues) ? user.queues : [];
      if (fromApi.length === 0) return fromUser;
      if (user?.profile === "admin") return fromApi;
      const userQueueIdsSet = new Set(fromUser.map((q) => Number(q.id)));
      if (userQueueIdsSet.size === 0) return fromApi;
      return fromApi.filter((q) => userQueueIdsSet.has(Number(q.id)));
    },
    [user]
  );

  const handleOpenTicketFromSearch = useCallback(
    (ticket) => {
      if (
        ticket?.userId &&
        ticket.userId !== user?.id &&
        ACTIVE_TICKET_STATUSES.includes(ticket.status)
      ) {
        setOpenTicketAlertUser(ticket.user?.name || "Outro usuário");
        setOpenTicketAlertQueue(ticket.queue?.name || "Sem fila");
        setOpenTicketAlert(true);
        return;
      }
      navigateToTicket(ticket);
    },
    [navigateToTicket, user?.id]
  );

  const handleCreateTicketFromContact = async (contact) => {
    if (!contact?.id || creatingTicket) return;

    setCreatingTicket(true);
    try {
      const [queueList, whatsappRes] = await Promise.all([
        findAllQueues(),
        api.get("/whatsapp", { params: { companyId: user.companyId, session: 0 } }),
      ]);

      const availableQueues = resolveAvailableQueues(queueList);
      const whatsapps = Array.isArray(whatsappRes.data) ? whatsappRes.data : [];
      const needsSelection = availableQueues.length > 1 || whatsapps.length > 1;

      if (needsSelection) {
        setNewTicketContact(contact);
        setNewTicketModalOpen(true);
        return;
      }

      const queueId = availableQueues[0]?.id ?? null;
      const whatsappId =
        whatsapps[0]?.id ?? (user.whatsappId != null ? Number(user.whatsappId) : null);

      if (!queueId) {
        setNewTicketContact(contact);
        setNewTicketModalOpen(true);
        return;
      }

      const { data: ticket } = await api.post("/tickets", {
        contactId: contact.id,
        queueId,
        whatsappId,
        userId: user.id,
        status: "open",
      });

      navigateToTicket(ticket);
    } catch (err) {
      if (err.response?.status === 403) {
        const errorData = err.response.data;
        setOpenTicketAlertUser(errorData.ticket?.user?.name || "Outro usuário");
        setOpenTicketAlertQueue(errorData.ticket?.queue?.name || "Sem fila");
        setOpenTicketAlert(true);
        return;
      }

      if (err.response?.status === 409) {
        try {
          const ticket = JSON.parse(err.response.data.error);
          if (ticket.userId !== user?.id && ACTIVE_TICKET_STATUSES.includes(ticket.status)) {
            setOpenTicketAlertUser(ticket?.user?.name || "Outro usuário");
            setOpenTicketAlertQueue(ticket?.queue?.name || "Sem fila");
            setOpenTicketAlert(true);
          } else {
            navigateToTicket(ticket);
          }
        } catch {
          toastError(err);
        }
        return;
      }

      toastError(err);
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleCloseNewTicketModal = (ticket) => {
    setNewTicketModalOpen(false);
    setNewTicketContact(null);
    if (ticket?.uuid) {
      navigateToTicket(ticket);
    }
  };

  const handleBack = () => {
    history.push("/tickets");
  };

  const hiddenStyle = useMemo(() => ({ width: 0, height: 0 }), []);
  const applyPanelStyle = useCallback((status) => {
    if (tabOpen !== status) {
      return hiddenStyle;
    }
    return undefined;
  }, [tabOpen, hiddenStyle]);

  const handleDraftTags = (selecteds) => {
    setDraftTagIds(selecteds.map((t) => t.id));
  };

  const handleDraftUsers = (selecteds) => {
    setDraftUserIds(selecteds.map((t) => t.id));
  };

  const handleDraftWhatsapps = (selecteds) => {
    setDraftWhatsappIds(selecteds.map((t) => t.id));
  };

  const handleDraftStatus = (selecteds) => {
    setDraftStatusList(selecteds.map((t) => t.status));
  };

  const handleDraftQueues = (selecteds) => {
    setDraftQueueIds(selecteds.map((q) => q.id));
  };

  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedUsers([]);
    setSelectedWhatsapp([]);
    setSelectedStatus([]);
    setSelectedQueueIds(userQueueIds);
    setDraftTagIds([]);
    setDraftUserIds([]);
    setDraftWhatsappIds([]);
    setDraftStatusList([]);
    setDraftQueueIds(userQueueIds);
    setDraftShowAllTickets(false);
    setShowAllTickets(false);
    setOnlyUnread(false);
    setDraftOnlyUnread(false);
    setDateStart("");
    setDateEnd("");
    setDraftDateStart("");
    setDraftDateEnd("");
    setSearchParam("");
    setContactSearchTerm("");
    setFilter(false);
    setTab("open");
    setForceSearch((f) => !f);
    setFilterFormKey((k) => k + 1);
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
  };

  const applyFiltersFromModal = () => {
    setSelectedTags([...draftTagIds]);
    setSelectedUsers([...draftUserIds]);
    setSelectedWhatsapp([...draftWhatsappIds]);
    setSelectedStatus([...draftStatusList]);
    setSelectedQueueIds(draftQueueIds.length ? [...draftQueueIds] : userQueueIds);
    setShowAllTickets(draftShowAllTickets);
    setOnlyUnread(draftOnlyUnread);
    setDateStart(draftDateStart && draftDateEnd ? draftDateStart : "");
    setDateEnd(draftDateStart && draftDateEnd ? draftDateEnd : "");

    const hasStructuralFilters =
      draftTagIds.length > 0 ||
      draftUserIds.length > 0 ||
      draftWhatsappIds.length > 0 ||
      draftStatusList.length > 0 ||
      (draftQueueIds.length > 0 &&
        draftQueueIds.length !== userQueueIds.length);

    setFilter(hasStructuralFilters);

    if (hasStructuralFilters || (searchParam && searchParam.trim() !== "")) {
      setTab("search");
    } else if (tab === "search") {
      setTab("open");
    }

    setForceSearch((f) => !f);
    setFilterModalOpen(false);
  };

  const handleStatusTabClick = (tabValue) => {
    handleBack();
    setTabOpen(tabValue);

    if (hasStructuralFilters || (searchParam && searchParam.trim() !== "")) {
      setSelectedStatus([tabValue]);
      setDraftStatusList([tabValue]);
      setTab("search");
      setForceSearch((f) => !f);
      return;
    }

    setTab("open");
  };

  const handleBulkAction = async () => {
    setBulkLoading(true);
    try {
      if (bulkAction === "accept") {
        const { data } = await api.post("/tickets/acceptAll", {});
        toast.success(
          `${data.accepted || 0} atendimento(s) aceito(s)${
            data.skipped ? `, ${data.skipped} ignorado(s)` : ""
          }`
        );
        setForceSearch((f) => !f);
        return data;
      }
      if (bulkAction === "close") {
        const { data } = await api.post("/tickets/closeAll", {
          status: "open",
          queueIds: selectedQueueIds,
          users: selectedUsers,
          tags: selectedTags,
          whatsappIds: selectedWhatsapp,
          showAll: resolvedShowAll ? "true" : "false",
          withUnreadMessages: onlyUnread ? "true" : "false",
          updatedStart: dateStart && dateEnd ? dateStart : undefined,
          updatedEnd: dateStart && dateEnd ? dateEnd : undefined,
          dateStart: dateStart && dateEnd ? dateStart : undefined,
          dateEnd: dateStart && dateEnd ? dateEnd : undefined,
        });
        toast.success(`${data.closed || 0} atendimento(s) finalizado(s)`);
        if ((data.closed || 0) === 0) {
          toast.warning("Nenhum atendimento foi finalizado. Atualize a lista ou finalize individualmente.");
        }
        setTabOpen("closed");
        setForceSearch((f) => !f);
        return data;
      }
      return {};
    } catch (err) {
      toastError(err);
      throw err;
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkModalClose = (success) => {
    setBulkConfirmOpen(false);
    setBulkAction(null);
    if (!success) setBulkLoading(false);
  };

  const openBulkConfirm = (action) => {
    setBulkAction(action);
    setBulkConfirmOpen(true);
  };

  const listFilterProps = {
    onlyUnread,
    dateStart: dateStart && dateEnd ? dateStart : "",
    dateEnd: dateStart && dateEnd ? dateEnd : "",
    forceSearch,
  };

  const statusTabs = [
    { value: "open", title: i18n.t("ticketsList.assignedHeader"), count: openCount || 0 },
    { value: "pending", title: i18n.t("ticketsList.pendingHeader"), count: pendingCount || 0 },
    { value: "closed", title: i18n.t("ticketsList.closedHeader"), count: closedCount || 0 },
  ];
  if (user.allowGroup) {
    statusTabs.push({
      value: "group",
      title: i18n.t("ticketsList.groupingHeader"),
      count: groupingCount || 0,
    });
  }

  return (
    <Paper elevation={0} variant="outlined" className={classes.ticketsWrapper}>
      <div className={classes.serachInputWrapper}>
        <SearchRounded className={classes.searchIcon} />
        <InputBase
          className={classes.searchInput}
          inputRef={searchInputRef}
          placeholder={
            searchOnMessages
              ? i18n.t("tickets.search.placeholderMessages")
              : i18n.t("tickets.search.placeholder")
          }
          type="search"
          onChange={handleSearch}
        />
        <Tooltip placement="top" title="Buscar no conteúdo das mensagens">
          <IconButton
            size="small"
            aria-label="Buscar em mensagens"
            className={clsx(
              classes.toolbarIconBtn,
              searchOnMessages && classes.toolbarIconBtnActive
            )}
            onClick={() => {
              setSearchOnMessages((v) => {
                if (!v) {
                  setContactSearchTerm("");
                  if (searchInputRef.current) searchInputRef.current.value = "";
                }
                return !v;
              });
            }}
          >
            <ManageSearchOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        {tabOpen === "pending" && (
          <Tooltip title="Aceitar todos">
            <span>
              <IconButton
                size="small"
                aria-label="Aceitar todos"
                className={classes.bulkActionIconBtn}
                disabled={bulkLoading || pendingCount === 0}
                onClick={() => openBulkConfirm("accept")}
              >
                <PlaylistAddCheckOutlined fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        {tabOpen === "open" && canUserBulkClose(user) && (
          <Tooltip title="Finalizar todos">
            <span>
              <IconButton
                size="small"
                aria-label="Finalizar todos"
                className={classes.bulkActionIconBtn}
                disabled={bulkLoading || openCount === 0}
                onClick={() => openBulkConfirm("close")}
              >
                <CloseOutlined fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title="Filtros">
          <IconButton
            style={{
              backgroundColor: "transparent",
              boxShadow: "none",
              border: "none",
              borderRadius: "50%",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
            variant="contained"
            aria-label="filter"
            className={classes.filterIcon}
            onClick={() => setFilterModalOpen(true)}
          >
            {hasActiveFilters ? (
              <FilterAltOutlined
                style={{ color: theme.palette.primary.main }}
                className={classes.icon}
                fontSize="small"
              />
            ) : (
              <FilterAltOffOutlined className={classes.icon} fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </div>

      <Box className={classes.tabsBar} role="tablist">
        {statusTabs.map((st) => {
          const active = tabOpen === st.value;
          const showChevron = st.value === "closed" && user.allowGroup;
          return (
            <button
              key={st.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={clsx(classes.tabButton, active && classes.tabButtonActive)}
              onClick={() => handleStatusTabClick(st.value)}
            >
              <span className={classes.tabTitle}>{st.title}</span>
              <span
                className={clsx(
                  classes.tabBadge,
                  active ? classes.tabBadgeActive : classes.tabBadgeInactive
                )}
              >
                {st.count}
              </span>
              {showChevron && (
                <ChevronRight className={classes.tabChevron} fontSize="inherit" />
              )}
            </button>
          );
        })}
      </Box>

      <BulkActionModal
        open={bulkConfirmOpen}
        action={bulkAction}
        totalEstimate={bulkAction === "accept" ? pendingCount : openCount}
        onClose={handleBulkModalClose}
        onConfirm={handleBulkAction}
      />

      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={handleCloseNewTicketModal}
        initialContact={newTicketContact || undefined}
      />

      <ShowTicketOpen
        isOpen={openTicketAlert}
        handleClose={() => {
          setOpenTicketAlert(false);
          setOpenTicketAlertUser("");
          setOpenTicketAlertQueue("");
        }}
        user={openTicketAlertUser}
        queue={openTicketAlertQueue}
      />

      <Dialog
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ className: classes.filterModalPaper, elevation: 24 }}
      >
        <DialogTitle className={classes.filterModalTitle} disableTypography>
          <Box display="flex" alignItems="center" style={{ gap: 10 }}>
            <TuneOutlined style={{ fontSize: 22, opacity: 0.7 }} />
            <Box>
              <Typography style={{ fontSize: 17, fontWeight: 400, letterSpacing: "-0.01em" }}>
                Filtros
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent className={classes.filterModalContent}>
          <Box key={`filter-unread-${filterFormKey}`} className={classes.filterSection}>
            <Box className={classes.filterSectionHeader}>
              <MarkEmailUnreadOutlined style={{ fontSize: 18 }} />
              <Typography className={classes.filterSectionLabel}>Não lidos</Typography>
            </Box>
            <Box className={classes.filterToggleRow}>
              <Typography className={classes.filterToggleLabel}>Somente não lidos</Typography>
              <Switch
                size="small"
                checked={draftOnlyUnread}
                onChange={(e) => setDraftOnlyUnread(e.target.checked)}
              />
            </Box>
          </Box>
          <Box key={`filter-period-${filterFormKey}`} className={classes.filterSection}>
            <Box className={classes.filterSectionHeader}>
              <DateRangeOutlined style={{ fontSize: 18 }} />
              <Typography className={classes.filterSectionLabel}>Período</Typography>
            </Box>
            <div className={classes.dateRangeRow}>
              <input
                type="date"
                aria-label="Data inicial"
                value={draftDateStart}
                onChange={(e) => setDraftDateStart(e.target.value)}
              />
              <input
                type="date"
                aria-label="Data final"
                value={draftDateEnd}
                onChange={(e) => setDraftDateEnd(e.target.value)}
              />
            </div>
          </Box>
          {showAllToggleVisible && (
            <Box key={`filter-visibility-${filterFormKey}`} className={classes.filterSection}>
              <Box className={classes.filterSectionHeader}>
                <VisibilityOutlined style={{ fontSize: 18 }} />
                <Typography className={classes.filterSectionLabel}>Visão</Typography>
              </Box>
              <Box className={classes.filterToggleRow}>
                <Typography className={classes.filterToggleLabel}>Outros usuários</Typography>
                <Switch
                  size="small"
                  checked={draftShowAllTickets}
                  onChange={(e) => setDraftShowAllTickets(e.target.checked)}
                />
              </Box>
            </Box>
          )}
          <Box key={`filter-tags-${filterFormKey}`} className={classes.filterSection}>
            <Box className={classes.filterSectionHeader}>
              <LabelOutlined style={{ fontSize: 18 }} />
              <Typography className={classes.filterSectionLabel}>Tags</Typography>
            </Box>
            <TagsFilter
              compact
              deferNotify
              selectedIds={draftTagIds}
              onFiltered={handleDraftTags}
            />
          </Box>
          <Box key={`filter-wa-${filterFormKey}`} className={classes.filterSection}>
            <Box className={classes.filterSectionHeader}>
              <SmartphoneOutlined style={{ fontSize: 18 }} />
              <Typography className={classes.filterSectionLabel}>
                Conexão
              </Typography>
            </Box>
            <WhatsappsFilter
              compact
              deferNotify
              selectedIds={draftWhatsappIds}
              onFiltered={handleDraftWhatsapps}
            />
          </Box>
          <Box key={`filter-queue-${filterFormKey}`} className={classes.filterSection}>
            <Box className={classes.filterSectionHeader}>
              <TuneOutlined style={{ fontSize: 18 }} />
              <Typography className={classes.filterSectionLabel}>Filas</Typography>
            </Box>
            <QueueFilter
              compact
              deferNotify
              selectedIds={draftQueueIds}
              onFiltered={handleDraftQueues}
            />
          </Box>
          <Box key={`filter-status-${filterFormKey}`} className={classes.filterSection}>
            <Box className={classes.filterSectionHeader}>
              <FlagOutlined style={{ fontSize: 18 }} />
              <Typography className={classes.filterSectionLabel}>Status</Typography>
            </Box>
            <StatusFilter
              compact
              deferNotify
              selectedStatuses={draftStatusList}
              onFiltered={handleDraftStatus}
            />
          </Box>
          {isAdminProfile && (
            <Box key={`filter-users-${filterFormKey}`} className={classes.filterSection}>
              <Box className={classes.filterSectionHeader}>
                <PeopleOutline style={{ fontSize: 18 }} />
                <Typography className={classes.filterSectionLabel}>Usuários</Typography>
              </Box>
              <UsersFilter
                compact
                deferNotify
                selectedIds={draftUserIds}
                onFiltered={handleDraftUsers}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions className={classes.filterModalActions}>
          <Button
            size="small"
            onClick={() => {
              clearAllFilters();
              setFilterModalOpen(false);
            }}
            style={{ textTransform: "none", borderRadius: 10, fontWeight: 400 }}
          >
            Limpar
          </Button>
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            <Button
              size="small"
              onClick={() => setFilterModalOpen(false)}
              style={{ textTransform: "none", borderRadius: 10, fontWeight: 400 }}
            >
              Cancelar
            </Button>
            <Button
              size="small"
              color="primary"
              variant="contained"
              disableElevation
              onClick={applyFiltersFromModal}
              style={{ textTransform: "none", borderRadius: 10, boxShadow: "none", fontWeight: 400 }}
            >
              Aplicar
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
        <Paper className={classes.ticketsWrapper}>
          {contactSearchActive ? (
            <Box className={classes.contactSearchPanel}>
              <TicketsContactSearch
                searchTerm={contactSearchTerm}
                queueIds={selectedQueueIds}
                onCreateTicket={handleCreateTicketFromContact}
                onOpenTicket={handleOpenTicketFromSearch}
              />
            </Box>
          ) : (
            <>
          <TicketsList
            status="open"
            showAll={resolvedShowAll}
            sortTickets={sortTickets ? "ASC" : "DESC"}
            selectedQueueIds={selectedQueueIds}
            updateCount={updateOpenCount}
            style={applyPanelStyle("open")}
            setTabOpen={setTabOpen}
            {...listFilterProps}
          />
          <TicketsList
            status="pending"
            selectedQueueIds={selectedQueueIds}
            sortTickets={sortTickets ? "ASC" : "DESC"}
            showAll={resolvedShowAll}
            updateCount={updatePendingCount}
            style={applyPanelStyle("pending")}
            setTabOpen={setTabOpen}
            {...listFilterProps}
          />
          {user.allowGroup && (
            <TicketsList
              status="group"
              showAll={resolvedShowAll}
              sortTickets={sortTickets ? "ASC" : "DESC"}
              selectedQueueIds={selectedQueueIds}
              updateCount={updateGroupingCount}
              style={applyPanelStyle("group")}
              setTabOpen={setTabOpen}
              {...listFilterProps}
            />
          )}
          <TicketsList
            status="closed"
            showAll={resolvedShowAll}
            sortTickets={sortTickets ? "ASC" : "DESC"}
            selectedQueueIds={selectedQueueIds}
            updateCount={updateClosedCount}
            style={applyPanelStyle("closed")}
            setTabOpen={setTabOpen}
            {...listFilterProps}
          />
            </>
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
        <TicketsList
          statusFilter={selectedStatus}
          searchParam={searchParam}
          showAll={resolvedShowAll}
          tags={selectedTags}
          users={isAdminProfile ? selectedUsers : []}
          selectedQueueIds={selectedQueueIds}
          whatsappIds={selectedWhatsapp}
          forceSearch={forceSearch}
          searchOnMessages={searchOnMessages}
          status="search"
          {...listFilterProps}
        />
      </TabPanel>
    </Paper >
  );
};

export default TicketsManagerTabs;
