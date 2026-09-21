/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useHistory } from "react-router-dom";
import clsx from "clsx";

import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import Select from "@material-ui/core/Select";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import InputAdornment from "@material-ui/core/InputAdornment";
import {
  Grid,
  makeStyles,
  Collapse,
  Paper,
  Checkbox,
  Box,
  Typography,
} from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";

import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import useQueues from "../../hooks/useQueues";
import {
  HELVETICA_NEUE,
  getTopbarMain,
  getTopbarContrast,
  getTopbarHover,
  appleSelectMenuProps,
  appleMenuItemProps,
} from "../../utils/appleModalTheme";

const useStyles = makeStyles((theme) => {
  const topbar = getTopbarMain(theme);
  const topbarHover = getTopbarHover(theme);
  const topbarContrast = getTopbarContrast(theme);
  const isDark = theme.palette.type === "dark";

  return {
  dialogPaper: {
    borderRadius: 20,
    maxWidth: 400,
    overflow: "hidden",
    fontFamily: HELVETICA_NEUE,
    fontWeight: 400,
    backgroundColor: isDark
      ? "rgba(44,44,46,0.92)"
      : "rgba(255,255,255,0.94)",
    backdropFilter: "saturate(200%) blur(28px)",
    WebkitBackdropFilter: "saturate(200%) blur(28px)",
    boxShadow: isDark
      ? "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)"
      : "0 24px 64px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.95)",
    border: isDark
      ? "0.5px solid rgba(255,255,255,0.12)"
      : "0.5px solid rgba(255,255,255,0.8)",
  },
  dialogTitle: {
    padding: theme.spacing(2, 2.5, 0.25),
    fontFamily: HELVETICA_NEUE,
    "& h2": {
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: "-0.03em",
    },
  },
  dialogContent: {
    padding: theme.spacing(0.75, 2, 1.25),
    fontFamily: HELVETICA_NEUE,
    fontWeight: 400,
    "& .MuiFormLabel-root": {
      fontFamily: HELVETICA_NEUE,
      fontSize: 10,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      transform: "translate(12px, 10px) scale(1)",
      "&.MuiInputLabel-shrink": {
        transform: "translate(12px, -4px) scale(0.85)",
      },
    },
    "& .MuiInputBase-root": {
      fontFamily: HELVETICA_NEUE,
      fontSize: 12,
      fontWeight: 400,
      borderRadius: 11,
    },
    "& .MuiInputBase-input": {
      fontSize: 12,
      fontWeight: 400,
      padding: "9px 11px",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(60,60,67,0.18)",
    },
    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(60,60,67,0.28)",
    },
    "& .MuiButton-root": {
      fontFamily: HELVETICA_NEUE,
      fontSize: 11,
      fontWeight: 400,
      textTransform: "none",
      letterSpacing: "-0.01em",
      borderRadius: 9,
      padding: "3px 8px",
      minHeight: 28,
    },
    "& .MuiTypography-root": {
      fontFamily: HELVETICA_NEUE,
      fontWeight: 400,
    },
    "& .MuiListItemText-primary": {
      fontSize: 12,
      fontWeight: 400,
    },
    "& .MuiListItemText-secondary": {
      fontSize: 10,
      fontWeight: 400,
    },
    "& .MuiMenuItem-root": {
      fontSize: 12,
      fontWeight: 400,
    },
  },
  dialogActions: {
    padding: theme.spacing(1.25, 2, 2),
    gap: theme.spacing(0.75),
    borderTop: isDark
      ? "0.5px solid rgba(255,255,255,0.08)"
      : "0.5px solid rgba(60,60,67,0.1)",
    "& > button": {
      flex: 1,
      margin: 0,
      minWidth: 0,
      textTransform: "none",
      borderRadius: 12,
      fontFamily: HELVETICA_NEUE,
      fontSize: 13,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      minHeight: 36,
      padding: "7px 12px",
      boxShadow: "none",
    },
    "& > button:first-of-type": {
      color: theme.palette.text.primary,
      backgroundColor: isDark
        ? "rgba(120,120,128,0.28)"
        : "rgba(120,120,128,0.16)",
      border: "none",
    },
    "& .MuiButton-containedPrimary": {
      backgroundColor: topbar,
      color: topbarContrast,
      "&:hover": {
        backgroundColor: topbarHover,
      },
    },
  },
  fieldDense: {
    "& .MuiInputLabel-root": {
      fontSize: 10,
    },
    "& .MuiInputBase-input": {
      fontSize: 12,
      padding: "8px 10px",
    },
  },
  maxWidth: {
    width: "100%",
  },
  userPickerRoot: {
    width: "100%",
    position: "relative",
    boxSizing: "border-box",
  },
  userPickerPanel: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: 4,
    borderRadius: 11,
    overflow: "hidden",
    border: `0.5px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(60,60,67,0.16)"}`,
    backgroundColor: isDark
      ? "rgba(255,255,255,0.05)"
      : "rgba(120,120,128,0.06)",
    fontFamily: HELVETICA_NEUE,
    fontWeight: 400,
  },
  userPickerPanelHead: {
    padding: theme.spacing(0.75, 0.75, 0.5),
    borderBottom: `0.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(60,60,67,0.1)"}`,
    "& .MuiOutlinedInput-root": {
      fontSize: 12,
      borderRadius: 9,
      minHeight: 32,
    },
    "& .MuiInputBase-input": {
      fontSize: 12,
      padding: "6px 9px",
    },
    "& .MuiButton-root": {
      fontSize: 10,
      fontWeight: 400,
      minHeight: 24,
      padding: "2px 7px",
      borderRadius: 7,
      lineHeight: 1.2,
      textTransform: "none",
      color: theme.palette.text.primary,
      borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(60,60,67,0.2)",
    },
  },
  userPickerActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  userPickerList: {
    maxHeight: 132,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "2px 0",
    scrollbarWidth: "thin",
    "&::-webkit-scrollbar": { width: 5 },
    "&::-webkit-scrollbar-thumb": {
      borderRadius: 4,
      backgroundColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)",
    },
  },
  userPickerRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    width: "100%",
    boxSizing: "border-box",
    padding: "4px 8px",
    minHeight: 28,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 400,
    letterSpacing: "-0.01em",
    color: theme.palette.text.primary,
    "&:hover": {
      backgroundColor: isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(120,120,128,0.1)",
    },
  },
  userPickerRowSelected: {
    backgroundColor: isDark
      ? "rgba(255,255,255,0.1)"
      : "rgba(120,120,128,0.12)",
  },
  userPickerCheckbox: {
    padding: 0,
    margin: 0,
    "& .MuiSvgIcon-root": {
      width: 16,
      height: 16,
    },
  },
  userPickerName: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 12,
    fontWeight: 400,
    lineHeight: 1.25,
  },
  userPickerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    flexShrink: 0,
  },
  userPickerEmpty: {
    padding: "10px 8px",
    fontSize: 11,
    fontWeight: 400,
    color: theme.palette.text.secondary,
    textAlign: "center",
  },
  userPickerError: {
    padding: "4px 8px 6px",
    fontSize: 10,
    fontWeight: 400,
    color: theme.palette.error.main,
  },
  transferModeRow: {
    display: "flex",
    gap: 6,
    marginBottom: theme.spacing(0.75),
    width: "100%",
  },
  transferModeBtn: {
    flex: 1,
    minHeight: 30,
    fontSize: 11,
    fontWeight: 400,
    textTransform: "none",
    letterSpacing: "-0.01em",
    borderRadius: 9,
    border: `0.5px solid ${isDark ? "rgba(255,255,255,0.14)" : "rgba(60,60,67,0.18)"}`,
    color: theme.palette.text.secondary,
    backgroundColor: "transparent",
    "&.active": {
      color: topbarContrast,
      backgroundColor: topbar,
      borderColor: topbar,
    },
  },
  connectionHint: {
    fontSize: 10,
    fontWeight: 400,
    color: theme.palette.text.secondary,
    marginTop: 2,
    marginBottom: 4,
    lineHeight: 1.35,
  },
  };
});

const CHANNEL_LABELS = {
  whatsapp: "WhatsApp Web",
  whatsapp_oficial: "WhatsApp API Oficial",
  telegram: "Telegram Bot",
  telegram_oficial: "Telegram Oficial",
  sms: "SMS",
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

const TransferTicketModalCustom = ({ modalOpen, onClose, ticketid, ticket }) => {
  const history = useHistory();
  const theme = useTheme();
  const [options, setOptions] = useState([]);
  const [queues, setQueues] = useState([]);
  const [allQueues, setAllQueues] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingListAll, setLoadingListAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [userPickerOpen, setUserPickerOpen] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [transferMode, setTransferMode] = useState("user");
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState("");
  const classes = useStyles();
  const { findAll: findAllQueues } = useQueues();
  const isMounted = useRef(true);
  const prevModalOpen = useRef(false);
  const userPickerRootRef = useRef(null);
  const [msgTransfer, setMsgTransfer] = useState("");

  const fetchUserPage = useCallback(async (term, page) => {
    const { data } = await api.get("/users/", {
      params: { searchParam: term || "", pageNumber: page },
    });
    return {
      users: data.users || [],
      hasMore: Boolean(data.hasMore),
    };
  }, []);

  const ticketChannel = ticket?.channel || ticket?.whatsapp?.channel || "whatsapp";
  const currentWhatsappId = ticket?.whatsappId || ticket?.whatsapp?.id;
  const channelLabel = CHANNEL_LABELS[ticketChannel] || ticketChannel;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const loadConnections = async () => {
      setLoadingConnections(true);
      try {
        const { data } = await api.get("/whatsapp/filter", {
          params: { session: 0, channel: ticketChannel },
        });
        if (!isMounted.current) return;
        const list = (Array.isArray(data) ? data : []).filter(
          (conn) => Number(conn.id) !== Number(currentWhatsappId)
        );
        setConnections(list);
        if (list.length === 1) {
          setSelectedConnection(String(list[0].id));
        }
      } catch (err) {
        if (isMounted.current) {
          setConnections([]);
        }
        toastError(err);
      } finally {
        if (isMounted.current) setLoadingConnections(false);
      }
    };
    loadConnections();
  }, [modalOpen, ticketChannel, currentWhatsappId]);

  useEffect(() => {
    if (!isMounted.current) return;
    const loadQueues = async () => {
      try {
        const list = await findAllQueues();
        if (isMounted.current) {
          setAllQueues(Array.isArray(list) ? list : []);
          setQueues(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (isMounted.current) {
          setAllQueues([]);
          setQueues([]);
        }
      }
    };
    loadQueues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (modalOpen && !prevModalOpen.current) {
      setListSearch("");
      setUserPickerOpen(false);
      setSelectedRecipients([]);
      setMsgTransfer("");
      setTransferMode("user");
      setSelectedConnection("");
      if (ticket?.queueId) {
        setSelectedQueue(String(ticket.queueId));
      } else {
        setSelectedQueue("");
      }
    }
    prevModalOpen.current = modalOpen;
  }, [modalOpen, ticket?.queueId]);

  useEffect(() => {
    if (!modalOpen) return;
    const delay = listSearch.trim() ? 400 : 0;
    const delayDebounceFn = setTimeout(async () => {
      if (!isMounted.current) return;
      setLoadingUsers(true);
      try {
        const { users } = await fetchUserPage(listSearch.trim(), 1);
        if (!isMounted.current) return;
        setOptions(users);
      } catch (err) {
        toastError(err);
      } finally {
        if (isMounted.current) setLoadingUsers(false);
      }
    }, delay);
    return () => clearTimeout(delayDebounceFn);
  }, [listSearch, modalOpen, fetchUserPage]);

  useEffect(() => {
    if (selectedRecipients.length === 1) {
      const u = selectedRecipients[0];
      if (u != null && Array.isArray(u.queues)) {
        if (u.queues.length === 1) {
          setSelectedQueue(String(u.queues[0].id));
        }
        setQueues(u.queues);
      } else {
        setQueues(allQueues);
        setSelectedQueue("");
      }
      return;
    }
    setQueues(allQueues);
    if (selectedRecipients.length !== 1) {
      setSelectedQueue("");
    }
  }, [selectedRecipients, allQueues]);

  const recipientIds = new Set(selectedRecipients.map((u) => u.id));

  const toggleRecipient = (user) => {
    setSelectedRecipients((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) return [];
      setUserPickerOpen(false);
      return [user];
    });
  };

  const clearRecipients = () => setSelectedRecipients([]);

  const handleLoadAllUsers = async () => {
    if (!isMounted.current) return;
    setLoadingListAll(true);
    try {
      const acc = [];
      let page = 1;
      let hasMore = true;
      const term = listSearch.trim();
      while (hasMore && page <= 100) {
        const { users, hasMore: more } = await fetchUserPage(term, page);
        if (!isMounted.current) return;
        acc.push(...users);
        hasMore = more && users.length > 0;
        page += 1;
      }
      const byId = new Map(acc.map((u) => [u.id, u]));
      if (isMounted.current) setOptions(Array.from(byId.values()));
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) setLoadingListAll(false);
    }
  };

  const handleMsgTransferChange = (event) => {
    setMsgTransfer(event.target.value);
  };

  const handleClose = () => {
    onClose();
    setListSearch("");
    setUserPickerOpen(false);
    setSelectedRecipients([]);
    setTransferMode("user");
    setSelectedConnection("");
  };

  const handleSaveTicket = async () => {
    if (!ticketid) return;
    if (!selectedQueue || selectedQueue === "") return;
    if (transferMode === "connection" && !selectedConnection) return;
    if (selectedRecipients.length > 1) {
      toastError(i18n.t("transferTicketModal.onlyOneRecipient"));
      return;
    }
    const selectedUser = selectedRecipients.length === 1 ? selectedRecipients[0] : null;
    setSubmitting(true);
    try {
      const data = {};
      if (selectedUser) {
        data.userId = selectedUser.id;
        data.status = ticket?.isGroup ? "group" : "open";
      } else if (transferMode === "connection" && ticket?.userId) {
        data.userId = ticket.userId;
        data.status = ticket?.isGroup
          ? "group"
          : ["open", "group"].includes(ticket?.status)
            ? ticket.status
            : "open";
      } else {
        data.userId = null;
        data.status = "pending";
      }
      data.queueId = selectedQueue;
      data.msgTransfer = msgTransfer ? msgTransfer : null;
      data.isTransfered = true;
      if (transferMode === "connection" && selectedConnection) {
        data.whatsappId = Number(selectedConnection);
      }

      await api.put(`/tickets/${ticketid}`, data);
      history.push(`/tickets/`);
      handleClose();
    } catch (err) {
      toastError(err);
    } finally {
      if (isMounted.current) setSubmitting(false);
    }
  };

  const handleTransferModeChange = (mode) => {
    setTransferMode(mode);
    if (mode === "user") {
      setSelectedConnection("");
    } else {
      setSelectedRecipients([]);
      setUserPickerOpen(false);
    }
  };

  const toggleUserPicker = () => {
    setUserPickerOpen((prev) => !prev);
  };

  const closeUserPicker = useCallback(() => {
    setUserPickerOpen(false);
  }, []);

  useEffect(() => {
    if (!modalOpen || !userPickerOpen) return undefined;
    const onPointerDown = (e) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (userPickerRootRef.current?.contains(t)) return;
      closeUserPicker();
    };
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("touchstart", onPointerDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("touchstart", onPointerDown, true);
    };
  }, [modalOpen, userPickerOpen, closeUserPicker]);

  const triggerDisplay =
    selectedRecipients.length === 0
      ? ""
      : selectedRecipients.length === 1
        ? selectedRecipients[0].name
        : i18n.t("transferTicketModal.multipleSelected", {
            count: selectedRecipients.length,
          });

  return (
    <Dialog
      open={modalOpen}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      PaperProps={{ className: classes.dialogPaper }}
    >
      <DialogTitle id="form-dialog-title" className={classes.dialogTitle}>
        {i18n.t("transferTicketModal.title")}
      </DialogTitle>
      <DialogContent dividers className={classes.dialogContent}>
        <Box className={classes.transferModeRow}>
          <Button
            size="small"
            className={clsx(
              classes.transferModeBtn,
              transferMode === "user" && "active"
            )}
            onClick={() => handleTransferModeChange("user")}
            disableElevation
          >
            {i18n.t("transferTicketModal.transferTypeUser")}
          </Button>
          <Button
            size="small"
            className={clsx(
              classes.transferModeBtn,
              transferMode === "connection" && "active"
            )}
            onClick={() => handleTransferModeChange("connection")}
            disableElevation
          >
            {i18n.t("transferTicketModal.transferTypeConnection")}
          </Button>
        </Box>
        <Grid container spacing={1}>
          {transferMode === "user" ? (
          <Grid item xs={12} sm={6} xl={6}>
            <Box ref={userPickerRootRef} className={classes.userPickerRoot}>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                className={classes.fieldDense}
                variant="outlined"
                label={i18n.t("transferTicketModal.fieldLabel")}
                value={triggerDisplay}
                placeholder={i18n.t("transferTicketModal.selectPlaceholder")}
                onClick={toggleUserPicker}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box display="flex" alignItems="center" style={{ gap: 2 }}>
                        {loadingUsers ? (
                          <CircularProgress color="inherit" size={14} />
                        ) : null}
                        <KeyboardArrowDownIcon
                          style={{
                            fontSize: 18,
                            color: theme.palette.text.secondary,
                            pointerEvents: "none",
                            transform: userPickerOpen ? "rotate(180deg)" : "none",
                            transition: "transform 0.2s ease",
                          }}
                          aria-hidden
                        />
                      </Box>
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  "aria-haspopup": "listbox",
                  "aria-expanded": userPickerOpen,
                  style: { cursor: "pointer", fontSize: 12 },
                }}
              />
              <Collapse in={userPickerOpen} timeout={180} unmountOnExit>
                <Paper
                  elevation={0}
                  className={classes.userPickerPanel}
                  data-transfer-user-picker
                >
                  <Box className={classes.userPickerPanelHead}>
                    <TextField
                      size="small"
                      fullWidth
                      variant="outlined"
                      placeholder={i18n.t("transferTicketModal.searchPlaceholder")}
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      InputLabelProps={{ shrink: false }}
                    />
                    <Box className={classes.userPickerActions}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRecipients();
                        }}
                        disabled={!selectedRecipients.length}
                      >
                        {i18n.t("transferTicketModal.clearSelection")}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadAllUsers();
                        }}
                        disabled={loadingListAll || loadingUsers}
                      >
                        {loadingListAll ? (
                          <CircularProgress size={12} color="inherit" />
                        ) : (
                          i18n.t("transferTicketModal.loadAllUsers")
                        )}
                      </Button>
                    </Box>
                  </Box>
                  {selectedRecipients.length > 1 ? (
                    <Typography className={classes.userPickerError}>
                      {i18n.t("transferTicketModal.onlyOneRecipient")}
                    </Typography>
                  ) : null}
                  <Box className={classes.userPickerList} role="listbox">
                    {loadingUsers && !options.length ? (
                      <Box display="flex" justifyContent="center" py={1.5}>
                        <CircularProgress size={20} />
                      </Box>
                    ) : null}
                    {!loadingUsers && !options.length ? (
                      <Typography className={classes.userPickerEmpty}>
                        {i18n.t("transferTicketModal.noOptions")}
                      </Typography>
                    ) : null}
                    {options.map((option) => {
                      const selected = recipientIds.has(option.id);
                      const online = option?.online === true;
                      return (
                        <Box
                          key={option.id}
                          role="option"
                          aria-selected={selected}
                          className={clsx(
                            classes.userPickerRow,
                            selected && classes.userPickerRowSelected
                          )}
                          onClick={() => toggleRecipient(option)}
                        >
                          <Checkbox
                            className={classes.userPickerCheckbox}
                            size="small"
                            checked={selected}
                            tabIndex={-1}
                            disableRipple
                            color="primary"
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleRecipient(option)}
                          />
                          <span className={classes.userPickerName}>
                            {option.name}
                          </span>
                          <span
                            className={classes.userPickerStatusDot}
                            style={{
                              backgroundColor: online ? "#34c759" : "#8e8e93",
                            }}
                            title={online ? "Online" : "Offline"}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>
              </Collapse>
            </Box>
          </Grid>
          ) : (
          <Grid item xs={12} sm={6} xl={6}>
            <FormControl variant="outlined" fullWidth size="small" margin="dense" className={classes.fieldDense}>
              <InputLabel>
                {i18n.t("transferTicketModal.fieldConnectionLabel")}
              </InputLabel>
              <Select
                value={selectedConnection}
                onChange={(e) => setSelectedConnection(e.target.value)}
                label={i18n.t("transferTicketModal.fieldConnectionPlaceholder")}
                MenuProps={appleSelectMenuProps(theme)}
                disabled={loadingConnections}
              >
                {loadingConnections ? (
                  <MenuItem value="" disabled {...appleMenuItemProps}>
                    <CircularProgress size={14} />
                  </MenuItem>
                ) : null}
                {!loadingConnections && connections.length === 0 ? (
                  <MenuItem value="" disabled {...appleMenuItemProps}>
                    {i18n.t("transferTicketModal.noConnectionsAvailable")}
                  </MenuItem>
                ) : null}
                {connections.map((conn) => (
                  <MenuItem
                    key={conn.id}
                    value={String(conn.id)}
                    {...appleMenuItemProps}
                  >
                    {conn.name}
                    {conn.number ? ` (${conn.number})` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography className={classes.connectionHint}>
              {i18n.t("transferTicketModal.connectionTypeHint", {
                channel: channelLabel,
              })}
            </Typography>
          </Grid>
          )}
          <Grid xs={12} sm={6} xl={6} item >
            <FormControl variant="outlined" fullWidth size="small" margin="dense" className={classes.fieldDense}>
              <InputLabel>
                {i18n.t("transferTicketModal.fieldQueueLabel")}
              </InputLabel>
              <Select
                value={selectedQueue}
                onChange={(e) => setSelectedQueue(e.target.value)}
                label={i18n.t("transferTicketModal.fieldQueuePlaceholder")}
                MenuProps={appleSelectMenuProps(theme)}
              >
                {queues.map((queue) => (
                  <MenuItem
                    key={queue.id}
                    value={String(queue.id)}
                    {...appleMenuItemProps}
                  >
                    {queue.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={12} xl={12} >
            <TextField
              label={i18n.t("transferTicketModal.msgTransfer")}
              value={msgTransfer}
              onChange={handleMsgTransferChange}
              variant="outlined"
              multiline
              maxRows={2}
              minRows={2}
              fullWidth
              size="small"
              margin="dense"
              className={classes.fieldDense}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions className={classes.dialogActions}>
        <Button
          size="small"
          onClick={handleClose}
          disabled={submitting}
        >
          {i18n.t("transferTicketModal.buttons.cancel")}
        </Button>
        <ButtonWithSpinner
          size="small"
          variant="contained"
          type="submit"
          color="primary"
          disableElevation
          loading={submitting}
          disabled={
            selectedQueue === "" ||
            submitting ||
            selectedRecipients.length > 1 ||
            (transferMode === "connection" && !selectedConnection)
          }
          onClick={handleSaveTicket}
        >
          {i18n.t("transferTicketModal.buttons.ok")}
        </ButtonWithSpinner>
      </DialogActions>
    </Dialog>
  );
};

export default TransferTicketModalCustom;
