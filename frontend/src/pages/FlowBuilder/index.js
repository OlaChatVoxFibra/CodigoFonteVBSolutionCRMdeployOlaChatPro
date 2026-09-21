/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useReducer, useContext } from "react";

import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import { useTheme } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";

import Paper from "@material-ui/core/Paper";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";

import SearchIcon from "@material-ui/icons/Search";
import {
  AddCircle,
  Build,
  ContentCopy,
  DevicesFold,
  MoreVert,
  Edit,
  Delete,
  PlayArrow,
  Pause,
} from "@mui/icons-material";

import {
  Button,
  CircularProgress,
  Stack,
  Box,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";

import { Add as AddIcon } from "@mui/icons-material";
import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import FlowBuilderModal from "../../components/FlowBuilderModal";

import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NewTicketModal from "../../components/NewTicketModal";
import { SocketContext } from "../../context/Socket/SocketContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_CONTACTS") {
    const contacts = action.payload;
    const newContacts = [];

    contacts.forEach((contact) => {
      const contactIndex = state.findIndex((c) => c.id === contact.id);
      if (contactIndex !== -1) {
        state[contactIndex] = contact;
      } else {
        newContacts.push(contact);
      }
    });

    return [...state, ...newContacts];
  }

  if (action.type === "UPDATE_CONTACTS") {
    const contact = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contact.id);

    if (contactIndex !== -1) {
      state[contactIndex] = contact;
      return [...state];
    } else {
      return [contact, ...state];
    }
  }

  if (action.type === "DELETE_CONTACT") {
    const contactId = action.payload;
    const contactIndex = state.findIndex((c) => c.id === contactId);
    if (contactIndex !== -1) {
      state.splice(contactIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  root: {
    backgroundColor: theme.palette.background.default,
    minHeight: '100vh',
  },
  mainContainer: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: theme.spacing(4),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
    },
  },
  
  mainPaper: {
    flex: 1,
    padding: theme.spacing(3),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    backgroundColor: theme.palette.type === 'dark'
      ? 'rgba(255,255,255,0.02)'
      : 'rgba(0,0,0,0.01)',
    borderRadius: 20,
    marginTop: theme.spacing(1),
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
      borderRadius: 16,
    },
  },
  
  header: {
    backgroundColor: theme.palette.listScrollArea,
    boxShadow: 'none',
    borderRadius: 20,
    padding: theme.spacing(4),
    marginBottom: theme.spacing(4),
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2.5),
      marginBottom: theme.spacing(2.5),
      borderRadius: 16,
    },
  },
  title: {
    fontSize: '1.85rem',
    fontWeight: 700,
    color: theme.palette.text.primary,
    margin: 0,
    letterSpacing: '-0.02em',
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.5rem',
    },
  },
  searchContainer: {
    backgroundColor: theme.palette.listScrollArea,
    borderRadius: 20,
    padding: theme.spacing(2.5),
    marginBottom: theme.spacing(4),
    boxShadow: 'none',
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2.5),
      borderRadius: 16,
    },
  },
  searchField: {
    '& .MuiOutlinedInput-root': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderRadius: 14,
      '& fieldset': {
        border: 'none',
      },
      '&:hover': {
        backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
      },
      '&.Mui-focused': {
        backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#fff',
        boxShadow: theme.palette.type === 'dark' 
          ? '0 0 0 3px rgba(144, 202, 249, 0.16)' 
          : '0 0 0 3px rgba(25, 118, 210, 0.10)',
      },
    },
    '& .MuiInputBase-input': {
      color: theme.palette.text.primary,
      fontSize: '0.95rem',
      padding: '14px 16px',
    },
  },
  flowCard: {
    backgroundColor: theme.palette.type === 'dark'
      ? 'rgba(255,255,255,0.03)'
      : '#ffffff',
    borderRadius: 16,
    marginBottom: 0,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    boxShadow: theme.palette.type === 'dark'
      ? 'none'
      : '0 1px 3px rgba(0,0,0,0.04)',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: theme.palette.type === 'dark'
        ? '0 8px 24px rgba(0,0,0,0.4)'
        : '0 8px 24px rgba(0,0,0,0.08)',
      borderColor: theme.palette.type === 'dark'
        ? 'rgba(144,202,249,0.3)'
        : 'rgba(25,118,210,0.25)',
    },
    [theme.breakpoints.down('sm')]: {
      borderRadius: 14,
    },
  },
  flowCardContent: {
    padding: theme.spacing(2.5, 3),
    '&:last-child': {
      paddingBottom: theme.spacing(2.5),
    },
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2, 2.5),
      '&:last-child': {
        paddingBottom: theme.spacing(2),
      },
    },
  },
  flowIcon: {
    width: 50,
    height: 50,
    background: theme.palette.type === 'dark'
      ? `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
      : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing(2.5),
    flexShrink: 0,
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 12px rgba(0,0,0,0.3)'
      : '0 4px 12px rgba(25,118,210,0.2)',
    [theme.breakpoints.down('sm')]: {
      width: 44,
      height: 44,
      marginRight: theme.spacing(2),
      borderRadius: 12,
    },
  },
  flowName: {
    fontSize: '1.05rem',
    fontWeight: 600,
    color: theme.palette.text.primary,
    lineHeight: 1.5,
    letterSpacing: '-0.01em',
    marginBottom: theme.spacing(0.25),
    [theme.breakpoints.down('sm')]: {
      fontSize: '0.95rem',
    },
  },
  flowSubtitle: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.4,
    opacity: 0.7,
  },
  flowActions: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    paddingTop: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
    [theme.breakpoints.down('sm')]: {
      marginTop: theme.spacing(1),
      paddingTop: theme.spacing(1),
    },
  },
  statusChip: {
    fontWeight: 600,
    borderRadius: 20,
    fontSize: '0.75rem',
    height: 28,
    letterSpacing: '0.02em',
    '& .MuiChip-icon': {
      fontSize: 14,
    },
    '&.active': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(76,175,80,0.12)' : 'rgba(76,175,80,0.08)',
      color: theme.palette.type === 'dark' ? '#66bb6a' : '#2e7d32',
      border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(76,175,80,0.3)' : 'rgba(76,175,80,0.25)'}`,
    },
    '&.inactive': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(244,67,54,0.10)' : 'rgba(244,67,54,0.06)',
      color: theme.palette.type === 'dark' ? '#ef9a9a' : '#c62828',
      border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(244,67,54,0.25)' : 'rgba(244,67,54,0.2)'}`,
    },
  },
  actionButton: {
    minWidth: 36,
    width: 36,
    height: 36,
    borderRadius: 10,
    color: theme.palette.text.secondary,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      color: theme.palette.primary.main,
      transform: 'scale(1.08)',
    },
    [theme.breakpoints.down('sm')]: {
      minWidth: 34,
      width: 34,
      height: 34,
    },
  },
  menuButton: {
    minWidth: 36,
    width: 36,
    height: 36,
    borderRadius: 10,
    color: theme.palette.text.secondary,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      borderColor: theme.palette.text.secondary,
      transform: 'scale(1.08)',
    },
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(8, 4),
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
    borderRadius: 20,
    border: `1px dashed ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(5, 3),
    },
  },
  emptyIcon: {
    fontSize: 72,
    color: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
    marginBottom: theme.spacing(3),
  },
  emptyTitle: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1.5),
    letterSpacing: '-0.01em',
  },
  emptyDescription: {
    color: theme.palette.text.secondary,
    fontSize: '0.95rem',
    lineHeight: 1.6,
    maxWidth: 400,
    margin: '0 auto',
  },
  addButton: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderRadius: 14,
    padding: theme.spacing(1.5, 3.5),
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.95rem',
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 14px rgba(0,0,0,0.4)'
      : '0 4px 14px rgba(25,118,210,0.25)',
    transition: 'all 0.25s ease',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: theme.palette.type === 'dark'
        ? '0 6px 20px rgba(0,0,0,0.5)'
        : '0 6px 20px rgba(25,118,210,0.35)',
      transform: 'translateY(-1px)',
    },
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1.2, 3),
    },
  },
  fab: {
    position: 'fixed !important',
    bottom: `${theme.spacing(4)}px !important`,
    right: `${theme.spacing(4)}px !important`,
    width: '56px !important',
    height: '56px !important',
    borderRadius: '16px !important',
    backgroundColor: '#131B2D !important',
    color: '#ffffff !important',
    boxShadow: '0 6px 20px rgba(0,0,0,0.25) !important',
    zIndex: 99999,
    display: 'flex !important',
    alignItems: 'center !important',
    justifyContent: 'center !important',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      backgroundColor: '#1c2e4a !important',
      transform: 'translateY(-2px) scale(1.04)',
      boxShadow: '0 8px 28px rgba(0,0,0,0.35) !important',
    },
    [theme.breakpoints.down('sm')]: {
      bottom: `${theme.spacing(10)}px !important`,
      right: `${theme.spacing(2)}px !important`,
      width: '48px !important',
      height: '48px !important',
      borderRadius: '14px !important',
    },
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 240,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
    borderRadius: 20,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
  },
  menu: {
    '& .MuiPaper-root': {
      borderRadius: 14,
      border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
      boxShadow: theme.palette.type === 'dark'
        ? '0 8px 32px rgba(0,0,0,0.5)'
        : '0 8px 32px rgba(0,0,0,0.1)',
      minWidth: 200,
      backgroundColor: theme.palette.type === 'dark'
        ? theme.palette.grey[900]
        : '#ffffff',
      backdropFilter: 'blur(20px)',
      padding: theme.spacing(0.5),
    },
    '& .MuiMenuItem-root': {
      padding: theme.spacing(1.5, 2.5),
      fontSize: '0.9rem',
      borderRadius: 10,
      margin: theme.spacing(0.25, 0),
      color: theme.palette.text.primary,
      transition: 'all 0.15s ease',
      '&:hover': {
        backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      },
    },
  },
}));


function FlowCard({ flow, onEdit, onDuplicate, onDelete, onNavigate, classes }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    handleMenuClose();
    // Usar setTimeout para garantir que o menu feche antes de executar a ação
    setTimeout(() => {
      action();
    }, 100);
  };

  const handleCardClick = (event) => {
    // Verifica se o clique foi em um botão de ação
    if (event.target.closest('button') || event.target.closest('[role="button"]')) {
      return;
    }
    onNavigate(flow.id);
  };

  const handleEditClick = (event) => {
    event.stopPropagation();
    onEdit();
  };

  const handleDuplicateClick = (event) => {
    event.stopPropagation();
    onDuplicate();
  };

  return (
    <Card className={classes.flowCard} onClick={handleCardClick} elevation={0}>
      <CardContent className={classes.flowCardContent}>
        <Stack direction="row" alignItems="center" spacing={0}>
          <div className={classes.flowIcon}>
            <DevicesFold style={{ color: '#fff', fontSize: isMobile ? 20 : 24 }} />
          </div>
          
          <Box flex={1} minWidth={0}>
            <Typography className={classes.flowName} noWrap>
              {flow.name}
            </Typography>
            <Typography className={classes.flowSubtitle}>
              Automação de fluxo
            </Typography>
            
            <div className={classes.flowActions}>
              <Chip
                size="small"
                label={flow.active ? "Ativo" : "Inativo"}
                className={`${classes.statusChip} ${flow.active ? 'active' : 'inactive'}`}
                icon={flow.active ? 
                  <PlayArrow style={{ fontSize: 14 }} /> : 
                  <Pause style={{ fontSize: 14 }} />
                }
              />
              
              <Box flex={1} />
              
              <IconButton
                className={classes.actionButton}
                onClick={handleEditClick}
                size="small"
              >
                <Edit style={{ fontSize: 18 }} />
              </IconButton>
              
              <IconButton
                className={classes.actionButton}
                onClick={handleDuplicateClick}
                size="small"
              >
                <ContentCopy style={{ fontSize: 18 }} />
              </IconButton>
              
              <IconButton
                className={classes.menuButton}
                onClick={handleMenuOpen}
                size="small"
              >
                <MoreVert style={{ fontSize: 18 }} />
              </IconButton>
            </div>
          </Box>
        </Stack>
        
        <Menu
          className={classes.menu}
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={(event) => {
            event.stopPropagation();
            handleAction(() => onNavigate(flow.id));
          }}>
            <Build style={{ fontSize: 18, marginRight: 14, color: theme.palette.text.secondary }} />
            Abrir fluxo
          </MenuItem>
          <MenuItem onClick={(event) => {
            event.stopPropagation();
            handleAction(() => onEdit());
          }}>
            <Edit style={{ fontSize: 18, marginRight: 14, color: theme.palette.text.secondary }} />
            Editar fluxo
          </MenuItem>
          <MenuItem onClick={(event) => {
            event.stopPropagation();
            handleAction(() => onDelete());
          }}>
            <Delete style={{ fontSize: 18, marginRight: 14, color: theme.palette.error.main }} />
            Excluir fluxo
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
}

const FlowBuilder = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [webhooks, setWebhooks] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedWebhookName, setSelectedWebhookName] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [contactTicket, setContactTicket] = useState({});
  const [deletingContact, setDeletingContact] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmDuplicateOpen, setConfirmDuplicateOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [reloadData, setReloadData] = useState(false);
  const { user, socket } = useContext(AuthContext);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("/flowbuilder");
          setWebhooks(data.flows);
          dispatch({ type: "LOAD_CONTACTS", payload: data.flows });
          setHasMore(data.hasMore);
          setLoading(false);
        } catch (err) {
          toastError(err);
          setLoading(false);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, reloadData]);

  useEffect(() => {
    const companyId = user.companyId;

    const onContact = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
      }
    };

    socket.on(`company-${companyId}-contact`, onContact);

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setSelectedContactId(null);
    setContactModalOpen(false);
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleEditContact = (contact) => {
    setSelectedContactId(contact.id);
    setSelectedWebhookName(contact.name);
    setContactModalOpen(true);
  };

  const handleDeleteWebhook = async (webhookId) => {
    try {
      await api.delete(`/flowbuilder/${webhookId}`);
      setDeletingContact(null);
      setConfirmOpen(false);
      setReloadData((old) => !old);
      toast.success("Fluxo excluído com sucesso");
    } catch (err) {
      toastError(err);
    }
  };

  const handleDuplicateFlow = async (flowId) => {
    try {
      await api.post(`/flowbuilder/duplicate`, { flowId: flowId });
      setDeletingContact(null);
      setConfirmDuplicateOpen(false);
      setReloadData((old) => !old);
      toast.success("Fluxo duplicado com sucesso");
    } catch (err) {
      toastError(err);
    }
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

  const filteredWebhooks = webhooks.filter(webhook =>
    webhook.name.toLowerCase().includes(searchParam.toLowerCase())
  );

  return (
    <>
      {/* Modais - mantendo todos originais */}
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        initialContact={contactTicket}
        onClose={(ticket) => {
          handleCloseOrOpenTicket(ticket);
        }}
      />
      
      <FlowBuilderModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        flowId={selectedContactId}
        nameWebhook={selectedWebhookName}
        onSave={() => setReloadData((old) => !old)}
      />
      
      <ConfirmationModal
        title={
          deletingContact
            ? `Excluir fluxo "${deletingContact.name}"?`
            : `${i18n.t("contacts.confirmationModal.importTitlte")}`
        }
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={() => {
          if (deletingContact) {
            handleDeleteWebhook(deletingContact.id);
          }
        }}
      >
        {deletingContact
          ? `Esta ação não pode ser desfeita. Todas as integrações relacionadas serão perdidas.`
          : `${i18n.t("contacts.confirmationModal.importMessage")}`}
      </ConfirmationModal>
      
      <ConfirmationModal
        title={
          deletingContact
            ? `Duplicar fluxo "${deletingContact.name}"?`
            : `${i18n.t("contacts.confirmationModal.importTitlte")}`
        }
        open={confirmDuplicateOpen}
        onClose={setConfirmDuplicateOpen}
        onConfirm={() => {
          if (deletingContact) {
            handleDuplicateFlow(deletingContact.id);
          }
        }}
      >
        {deletingContact
          ? `Uma cópia do fluxo será criada para você editar.`
          : `${i18n.t("contacts.confirmationModal.importMessage")}`}
      </ConfirmationModal>
      
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', backgroundColor: theme.palette.background.default }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: theme.spacing(2) }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography style={{ fontSize: '1.2rem', fontWeight: 600, color: theme.palette.text.primary }}>
              Automações
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <TextField
                size="small"
                variant="outlined"
                placeholder="Buscar fluxos..."
                value={searchParam}
                onChange={(e) => setSearchParam(e.target.value.toLowerCase())}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon style={{ fontSize: 18, color: theme.palette.text.secondary }} />
                    </InputAdornment>
                  ),
                  style: { borderRadius: 10, fontSize: '0.875rem' }
                }}
                style={{ minWidth: 200 }}
              />
              <Button
                className={classes.addButton}
                onClick={handleOpenContactModal}
                startIcon={<AddCircle />}
              >
                Criar Fluxo
              </Button>
            </Box>
          </Box>
          <Paper
            className={classes.mainPaper}
            variant="outlined"
            onScroll={handleScroll}
            style={{ flex: 1 }}
          >
            {loading && !webhooks.length ? (
              <div className={classes.loadingContainer}>
                <CircularProgress style={{ color: theme.palette.primary.main }} />
              </div>
            ) : filteredWebhooks.length === 0 ? (
              <div className={classes.emptyState}>
                <DevicesFold className={classes.emptyIcon} />
                <Typography className={classes.emptyTitle}>
                  {searchParam ? 'Nenhum fluxo encontrado' : 'Nenhum fluxo criado ainda'}
                </Typography>
                <Typography className={classes.emptyDescription}>
                  {searchParam 
                    ? 'Tente usar outros termos de pesquisa'
                    : 'Crie seu primeiro fluxo de conversa para automatizar atendimentos'
                  }
                </Typography>
                
                {!searchParam && (
                  <Button
                    className={classes.addButton}
                    onClick={handleOpenContactModal}
                    startIcon={<AddCircle />}
                    style={{ marginTop: 24 }}
                  >
                    Criar Primeiro Fluxo
                  </Button>
                )}
              </div>
            ) : (
              <Stack spacing={1.5}>
                {filteredWebhooks.map((flow) => (
                  <FlowCard
                    key={flow.id}
                    flow={flow}
                    classes={classes}
                    onEdit={() => handleEditContact(flow)}
                    onDuplicate={() => {
                      setDeletingContact(flow);
                      setConfirmDuplicateOpen(true);
                    }}
                    onDelete={() => {
                      setDeletingContact(flow);
                      setConfirmOpen(true);
                    }}
                    onNavigate={(id) => history.push(`/flowbuilder/${id}`)}
                  />
                ))}

                {loading && webhooks.length > 0 && (
                  <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress size={24} style={{ color: theme.palette.primary.main }} />
                  </Box>
                )}
              </Stack>
            )}
          </Paper>
        </div>
      </div>
    </>
  );
};

export default FlowBuilder;
