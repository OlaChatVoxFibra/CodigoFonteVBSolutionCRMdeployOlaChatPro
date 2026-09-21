/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState, useMemo, useContext } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  Avatar,
  CircularProgress,
  IconButton,
  Tooltip,
  makeStyles,
  useTheme,
} from "@material-ui/core";
import { Add } from "@material-ui/icons";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const ACTIVE_STATUSES = ["open", "pending", "chatbot", "group", "lgpd"];

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(0.5, 0.75, 1),
    minHeight: 0,
  },
  empty: {
    textAlign: "center",
    padding: theme.spacing(4, 1.5),
    color: theme.palette.text.secondary,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 500,
    marginBottom: 4,
    color: theme.palette.text.primary,
  },
  emptyText: {
    fontSize: 12,
    opacity: 0.85,
    lineHeight: 1.4,
  },
  item: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    margin: theme.spacing(0.5, 0),
    padding: theme.spacing(0.75, 1),
    transition: "background 0.15s ease",
  },
  itemClickable: {
    cursor: "pointer",
    "&:hover": {
      background:
        theme.palette.type === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
    },
  },
  avatar: {
    width: 36,
    height: 36,
    flexShrink: 0,
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "#e8edf3",
    color: theme.palette.type === "dark" ? "rgba(255,255,255,0.5)" : "#64748b",
  },
  textWrap: {
    minWidth: 0,
    flex: 1,
  },
  name: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: "-0.01em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  lastMessage: {
    display: "block",
    fontSize: 11,
    color: theme.palette.text.secondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginTop: 2,
  },
  number: {
    display: "block",
    fontSize: 11,
    color: theme.palette.text.secondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  statusBadge: {
    display: "inline-block",
    fontSize: 10,
    fontWeight: 500,
    padding: "2px 6px",
    borderRadius: 6,
    marginTop: 2,
    textTransform: "capitalize",
  },
  loadingWrap: {
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(4),
  },
  addIcon: {
    padding: 4,
    borderRadius: 10,
    flexShrink: 0,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.045)",
    color: theme.palette.type === "dark" ? "#8bc99a" : "#1d7a3c",
    transition: "background-color 0.15s ease, transform 0.12s ease",
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
    },
    "&:active": {
      transform: "scale(0.96)",
    },
  },
}));

const statusLabel = (status) => {
  const map = {
    open: "Aberto",
    pending: "Pendente",
    closed: "Finalizado",
    chatbot: "Chatbot",
    group: "Grupo",
    lgpd: "LGPD",
  };
  return map[status] || status;
};

const statusColor = (status, isDark) => {
  if (status === "open") return isDark ? "rgba(139,201,154,0.2)" : "rgba(29,122,60,0.12)";
  if (status === "pending") return isDark ? "rgba(255,193,7,0.15)" : "rgba(255,152,0,0.12)";
  if (status === "closed") return isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  return isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
};

const pickBestTicket = (tickets) => {
  if (!Array.isArray(tickets) || tickets.length === 0) return null;
  const sorted = [...tickets].sort((a, b) => {
    const aActive = ACTIVE_STATUSES.includes(a.status) ? 1 : 0;
    const bActive = ACTIVE_STATUSES.includes(b.status) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  return sorted[0];
};

const TicketsContactSearch = ({
  searchTerm,
  queueIds,
  onCreateTicket,
  onOpenTicket,
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const { user } = useContext(AuthContext);
  const [contacts, setContacts] = useState([]);
  const [ticketMap, setTicketMap] = useState({});
  const [loading, setLoading] = useState(false);

  const userQueueIds = useMemo(
    () => (Array.isArray(queueIds) && queueIds.length ? queueIds : user?.queues?.map((q) => q.id) || []),
    [queueIds, user?.queues]
  );

  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setContacts([]);
      setTicketMap({});
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/contacts", {
          params: { searchParam: searchTerm, pageNumber: 1 },
        });
        const list = Array.isArray(data.contacts) ? data.contacts : [];
        if (cancelled) return;
        setContacts(list);

        if (list.length === 0) {
          setTicketMap({});
          return;
        }

        const contactIds = list.map((c) => c.id);
        const { data: ticketsData } = await api.get("/tickets", {
          params: {
            contacts: JSON.stringify(contactIds),
            pageNumber: 1,
            showAll: "true",
            status: "search",
            queueIds: JSON.stringify(userQueueIds),
          },
        });

        if (cancelled) return;

        const tickets = Array.isArray(ticketsData?.tickets) ? ticketsData.tickets : [];
        const map = {};
        contactIds.forEach((id) => {
          const forContact = tickets.filter((t) => String(t.contactId) === String(id));
          const best = pickBestTicket(forContact);
          if (best) map[id] = best;
        });
        setTicketMap(map);
      } catch (err) {
        if (!cancelled) {
          toastError(err);
          setContacts([]);
          setTicketMap({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, userQueueIds]);

  const handleRowClick = (contact, ticket) => {
    if (ticket?.uuid) {
      onOpenTicket(ticket);
    }
  };

  if (loading) {
    return (
      <Box className={classes.loadingWrap}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (!contacts.length) {
    return (
      <Box className={classes.empty}>
        <Typography className={classes.emptyTitle}>Nenhum contato</Typography>
        <Typography className={classes.emptyText}>
          Tente outro nome ou número
        </Typography>
      </Box>
    );
  }

  return (
    <List className={classes.root} disablePadding>
      {contacts.map((contact) => {
        const ticket = ticketMap[contact.id] || null;
        const hasActiveTicket = ticket && ACTIVE_STATUSES.includes(ticket.status);
        const showAddButton = !hasActiveTicket;

        return (
          <ListItem
            key={contact.id}
            className={`${classes.item}${ticket?.uuid ? ` ${classes.itemClickable}` : ""}`}
            disableGutters
            button={Boolean(ticket?.uuid)}
            onClick={() => handleRowClick(contact, ticket)}
          >
            <Avatar
              src={contact.urlPicture || contact.profilePicUrl || ticket?.contact?.urlPicture}
              className={classes.avatar}
            >
              <PersonOutlineRounded style={{ fontSize: 18 }} />
            </Avatar>
            <Box className={classes.textWrap}>
              <span className={classes.name}>{contact.name || contact.number}</span>
              {ticket?.lastMessage ? (
                <span className={classes.lastMessage}>{ticket.lastMessage}</span>
              ) : (
                <span className={classes.number}>{contact.number}</span>
              )}
              {ticket?.status && (
                <span
                  className={classes.statusBadge}
                  style={{
                    background: statusColor(ticket.status, isDark),
                    color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.55)",
                  }}
                >
                  {statusLabel(ticket.status)}
                </span>
              )}
            </Box>
            {showAddButton && (
              <Tooltip title="Criar Novo Ticket">
                <IconButton
                  size="small"
                  className={classes.addIcon}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateTicket(contact);
                  }}
                >
                  <Add style={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </ListItem>
        );
      })}
    </List>
  );
};

export default TicketsContactSearch;
