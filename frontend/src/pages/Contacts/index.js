/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/pages/Contacts/index.js (versão corrigida)
import React, {
  useState,
  useEffect,
  useReducer,
  useContext,
  useRef,
} from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Avatar from "@material-ui/core/Avatar";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import { Facebook, Instagram, WhatsApp, Close } from "@material-ui/icons";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import BlockIcon from "@material-ui/icons/Block";
import AddIcon from "@material-ui/icons/Add";
import Checkbox from "@material-ui/core/Checkbox";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Tooltip from "@material-ui/core/Tooltip";
import { alpha } from "@material-ui/core/styles";

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import ContactModal from "../../components/ContactModal";
import ConfirmationModal from "../../components/ConfirmationModal/";
import ContactDeleteConfirmModal from "../../components/ContactDeleteConfirmModal";

import { i18n } from "../../translate/i18n";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import MainContainer from "../../components/MainContainer";
import toastError from "../../errors/toastError";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import NewTicketModal from "../../components/NewTicketModal";
import { TagsFilter } from "../../components/TagsFilter";
import PopupState, { bindTrigger, bindMenu } from "material-ui-popup-state";
import formatSerializedId from "../../utils/formatSerializedId";
import { v4 as uuidv4 } from "uuid";

import { ArrowDropDown, Backup, ContactPhone, DeleteSweep } from "@material-ui/icons";
import { Menu, MenuItem } from "@material-ui/core";

import ContactImportWpModal from "../../components/ContactImportWpModal";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import { getBackendUrl } from "../../config";

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

  if (action.type === "BULK_DELETE_CONTACTS") {
    const contactIds = action.payload;
    return state.filter(contact => !contactIds.includes(contact.id));
  }

  if (action.type === "DELETE_ALL_CONTACTS") {
    const { excludeIds = [] } = action.payload;
    return state.filter(contact => excludeIds.includes(contact.id));
  }

  if (action.type === "RESET") {
    return [];
  }

  if (action.type === "SET_TOTAL_COUNT") {
    // Não altera o estado, mas permite rastrear o total
    return state;
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: 0,
    overflowY: 'auto',
    ...theme.scrollbarStyles,
    backgroundColor: 'transparent',
    margin: '0 16px',
    borderRadius: 12,
    border: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E5EAF1',
    boxShadow: theme.palette.type === 'dark'
      ? '0 4px 16px rgba(0,0,0,0.35)'
      : '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(2,6,23,0.06)',
    '& .MuiTable-root': {
      borderCollapse: 'separate',
    },
    '& .MuiTableRow-root': {
      transition: 'background-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
    },
    '& .MuiTableRow-root:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
      boxShadow: theme.palette.type === 'dark'
        ? '0 4px 16px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.3)'
        : '0 4px 16px rgba(15,23,42,0.08), 0 1px 4px rgba(15,23,42,0.04)',
      transform: 'translateY(-1px)',
      position: 'relative',
      zIndex: 1,
    },
    '& .MuiTableCell-root': {
      borderBottom: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
      padding: '8px 12px',
    },
    '& .MuiTableCell-head': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#FAFBFC',
      fontWeight: 600,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: theme.palette.text.secondary,
    },
  },
  fab: {
    position: 'fixed',
    bottom: theme.spacing(3),
    right: theme.spacing(3),
    width: 56,
    height: 56,
    borderRadius: '50%',
    backgroundColor: theme.palette.primary.main,
    color: '#fff',
    boxShadow: `0 8px 24px ${theme.palette.primary.main}4D`
  },
  avatarCell: {
    width: '60px',
    padding: theme.spacing(1),
  },
  idCell: {
    width: '80px',
  },
  checkboxCell: {
    width: '48px',
    padding: theme.spacing(0, 1),
  },
  clickableAvatar: {
    cursor: 'pointer',
    transition: 'transform 0.2s ease-in-out',
    '&:hover': {
      transform: 'scale(1.1)',
    },
  },
  imageDialog: {
    '& .MuiDialog-paper': {
      maxWidth: '500px',
      maxHeight: '500px',
    },
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing(1),
  },
  profileImage: {
    width: '100%',
    height: 'auto',
    maxWidth: '400px',
    maxHeight: '400px',
    objectFit: 'contain',
  },
  toolbar: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(1),
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    minHeight: 48,
  },
  toolbarHighlight: {
    backgroundColor: alpha(theme.palette.primary.main, 0.25),
  },
  toolbarTitle: {
    flex: '1 1 100%',
    fontWeight: 600,
  },
  bulkActions: {
    display: 'flex',
    gap: theme.spacing(1),
  },
}));

const Contacts = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user, socket } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam, setSearchParam] = useState("");
  const [contacts, dispatch] = useReducer(reducer, []);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [totalContactsCount, setTotalContactsCount] = useState(0);

  // Estados para seleção múltipla
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [selectAllMode, setSelectAllMode] = useState(false); // true = todos da empresa, false = apenas da página

  const [importContactModalOpen, setImportContactModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(null);
  const [ImportContacts, setImportContacts] = useState(null);
  const [blockingContact, setBlockingContact] = useState(null);
  const [unBlockingContact, setUnBlockingContact] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [exportContact, setExportContact] = useState(false);
  const [confirmChatsOpen, setConfirmChatsOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [contactTicket, setContactTicket] = useState({});
  
  // Estados para exclusão múltipla com confirmação tipada
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState(''); // 'selected' ou 'all'
  
  const fileUploadRef = useRef(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [refreshContactsKey, setRefreshContactsKey] = useState(0);
  const { setCurrentTicket } = useContext(TicketsContext);

  // Estados para o modal de imagem
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedContactName, setSelectedContactName] = useState('');

  const { getAll: getAllSettings } = useCompanySettings();
  const [hideNum, setHideNum] = useState(false);
  const [enableLGPD, setEnableLGPD] = useState(false);

  const backendUrl = (api?.defaults?.baseURL) || (getBackendUrl && getBackendUrl());
  const resolveImageUrl = (url) => {
    if (!url || typeof url !== "string") return "";
    const u = url.trim();
    if (/^(data:|blob:|https?:\/\/)/i.test(u)) return u;
    if (u.startsWith("/")) return `${backendUrl}${u}`;
    return `${backendUrl}/public/${u}`;
  };

  useEffect(() => {
    (async () => {
      const toFetch = contacts.filter(c => (!c?.urlPicture || c.urlPicture === "") && !!c?.number);
      if (toFetch.length === 0) return;
      for (const c of toFetch) {
        try {
          const num = String(c.number).replace(/\D/g, "");
          // 1ª tentativa: com channel informado (ou 'whatsapp' por padrão)
          let resp = await api.get(`/contacts/profile/${num}`, { params: { channel: c.channel || "whatsapp" } });
          let pic = resp?.data?.urlPicture || resp?.data?.profilePicUrl || resp?.data?.profilePicture;
          // 2ª tentativa: sem channel (backend pode assumir padrão)
          if (!pic) {
            resp = await api.get(`/contacts/profile/${num}`);
            pic = resp?.data?.urlPicture || resp?.data?.profilePicUrl || resp?.data?.profilePicture;
          }
          if (pic) {
            dispatch({
              type: "UPDATE_CONTACTS",
              payload: { ...c, urlPicture: resolveImageUrl(pic) }
            });
          }
        } catch (e) {
          // ignore individual failures
        }
      }
    })();
  }, [contacts]);
  
  useEffect(() => {
    async function fetchData() {
      const settingList = (await getAllSettings(user.companyId)) || {};

      for (const [key, value] of Object.entries(settingList)) {
        if (key === "enableLGPD") setEnableLGPD(value === "enabled");
        if (key === "lgpdHideNumber") setHideNum(value === "enabled");
      }
    }
    fetchData();
  }, []);

  // Funções para seleção múltipla CORRIGIDAS
  const handleSelectContact = (contactId) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
    setSelectAllMode(false); // Desativa modo "todos da empresa" quando seleciona individualmente
  };

  const handleSelectAllContacts = () => {
    if (selectAllMode) {
      setSelectedContacts(new Set());
      setSelectAllMode(false);
    } else {
      setSelectAllMode(true);
      setSelectedContacts(new Set());
    }
  };

  // Limpar seleção quando contatos mudam
  useEffect(() => {
    setSelectedContacts(new Set());
    setSelectAllMode(false);
  }, [searchParam, selectedTags]);

  // Função para obter contagem correta
  const getSelectedCount = () => {
    if (selectAllMode) {
      return totalContactsCount;
    }
    return selectedContacts.size;
  };

  // Função para obter texto do botão
  const getSelectionButtonText = () => {
    if (selectAllMode) {
      return `Excluir Todos (${totalContactsCount})`;
    }
    if (selectedContacts.size > 0) {
      return `Excluir Selecionados (${selectedContacts.size})`;
    }
    return "Excluir";
  };

  // Funções para exclusão múltipla CORRIGIDAS
  const handleBulkDeleteClick = () => {
    if (selectAllMode) {
      setDeleteType('all');
    } else if (selectedContacts.size > 0) {
      setDeleteType('selected');
    } else {
      toast.warning("Selecione pelo menos um contato para excluir");
      return;
    }
    setDeleteConfirmModalOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      if (deleteType === 'all') {
        await api.delete("/contacts/all", {
          data: {
            confirmation: "DELETE_ALL_CONTACTS",
            excludeIds: []
          }
        });

        // Zera imediatamente o estado local
        dispatch({ type: "RESET" });
        setTotalContactsCount(0);
        setSelectedContacts(new Set());
        setSelectAllMode(false);

        toast.success("Todos os contatos foram excluídos");

        // Garante que a tela reflita o estado real do backend
        // (sem necessidade de o usuário apertar F5 manualmente)
        history.go(0);
      } else {
        const contactIds = Array.from(selectedContacts);
        const CHUNK = 100;
        for (let i = 0; i < contactIds.length; i += CHUNK) {
          const chunk = contactIds.slice(i, i + CHUNK);
          await api.post("/contacts/bulk-delete", { contactIds: chunk });
        }
        dispatch({ type: "RESET" });
        setTotalContactsCount((prev) => Math.max(0, prev - contactIds.length));
        setRefreshContactsKey((k) => k + 1);
        toast.success(`${contactIds.length} contato(s) excluído(s) com sucesso`);
      }
      
      setSelectedContacts(new Set());
      setSelectAllMode(false);
      setSearchParam("");
      setPageNumber(1);
    } catch (err) {
      toastError(err);
    } finally {
      setDeleteConfirmModalOpen(false);
      setDeleteType('');
    }
  };

  const handleDeleteAllClick = () => {
    setDeleteType('all');
    setDeleteConfirmModalOpen(true);
  };

  // Função para abrir modal da imagem
  const handleOpenImageModal = (imageUrl, contactName) => {
    setSelectedImage(imageUrl);
    setSelectedContactName(contactName);
    setImageModalOpen(true);
  };

  // Função para fechar modal da imagem
  const handleCloseImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage('');
    setSelectedContactName('');
  };

  const handleImportExcel = async () => {
    try {
      const formData = new FormData();
      formData.append("file", fileUploadRef.current.files[0]);
      await api.request({
        url: `/contacts/upload`,
        method: "POST",
        data: formData,
      });
      history.go(0);
    } catch (err) {
      toastError(err);
    }
  };

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, selectedTags]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("/contacts/", {
            params: {
              searchParam,
              pageNumber,
              contactTag: JSON.stringify(selectedTags),
            },
          });
          dispatch({ type: "LOAD_CONTACTS", payload: data.contacts || [] });
          setHasMore(!!data.hasMore);
          setTotalContactsCount(data?.count || 0);
        } catch (err) {
          toastError(err);
          dispatch({ type: "RESET" });
          setHasMore(false);
          setTotalContactsCount(0);
        } finally {
          setLoading(false);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, selectedTags, refreshContactsKey]);

  useEffect(() => {
    if (!socket || !user?.companyId) return;
    const companyId = user.companyId;

    const onContactEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CONTACTS", payload: data.contact });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CONTACT", payload: +data.contactId });
        setTotalContactsCount(prev => Math.max(0, prev - 1));
      }

      if (data.action === "bulk-delete") {
        dispatch({ type: "BULK_DELETE_CONTACTS", payload: data.contactIds });
        setTotalContactsCount(prev => Math.max(0, prev - data.contactIds.length));
      }

      if (data.action === "delete-all") {
        dispatch({ type: "DELETE_ALL_CONTACTS", payload: { excludeIds: data.excludeIds } });
        setTotalContactsCount(data.excludeIds.length);
      }
    };
    
    socket.on(`company-${companyId}-contact`, onContactEvent);

    return () => {
      socket.off(`company-${companyId}-contact`, onContactEvent);
    };
  }, [socket, user?.companyId]);

  const handleSelectTicket = (ticket) => {
    const code = uuidv4();
    const { id, uuid } = ticket;
    setCurrentTicket({ id, uuid, code });
  };

  const handleCloseOrOpenTicket = (ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      handleSelectTicket(ticket);
      history.push(`/tickets/${ticket.uuid}`);
    }
  };

  const handleSelectedTags = (selecteds) => {
    const tags = selecteds.map((t) => t.id);
    setSelectedTags(tags);
  };

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

  const hadleEditContact = (contactId) => {
    setSelectedContactId(contactId);
    setContactModalOpen(true);
  };

  const handleDeleteContact = async (contactId) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      dispatch({ type: "DELETE_CONTACT", payload: contactId });
      setTotalContactsCount((prev) => Math.max(0, prev - 1));
      toast.success(i18n.t("contacts.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleBlockContact = async (contactId) => {
    try {
      await api.put(`/contacts/block/${contactId}`, { active: false });
      toast.success("Contato bloqueado");
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
    setBlockingContact(null);
  };

  const handleUnBlockContact = async (contactId) => {
    try {
      await api.put(`/contacts/block/${contactId}`, { active: true });
      toast.success("Contato desbloqueado");
    } catch (err) {
      toastError(err);
    }
    setDeletingContact(null);
    setSearchParam("");
    setPageNumber(1);
    setUnBlockingContact(null);
  };

  const handleimportContact = async () => {
    try {
      await api.post("/contacts/import");
      history.go(0);
      setImportContacts(false);
    } catch (err) {
      toastError(err);
      setImportContacts(false);
    }
  };

  const handleimportChats = async () => {
    try {
      await api.post("/contacts/import/chats");
      history.go(0);
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

  // Determinar qual ação de confirmação executar para modais simples
  const getConfirmAction = () => {
    if (deletingContact) return () => handleDeleteContact(deletingContact.id);
    if (blockingContact) return () => handleBlockContact(blockingContact.id);
    if (unBlockingContact) return () => handleUnBlockContact(unBlockingContact.id);
    if (ImportContacts) return handleimportContact;
    return handleImportExcel;
  };

  // Determinar título do modal de confirmação simples
  const getConfirmTitle = () => {
    if (deletingContact) return `${i18n.t("contacts.confirmationModal.deleteTitle")} ${deletingContact.name}?`;
    if (blockingContact) return `Bloquear Contato ${blockingContact.name}?`;
    if (unBlockingContact) return `Desbloquear Contato ${unBlockingContact.name}?`;
    if (ImportContacts) return i18n.t("contacts.confirmationModal.importTitlte");
    return i18n.t("contactListItems.confirmationModal.importTitlte");
  };

  // Determinar mensagem do modal de confirmação simples
  const getConfirmMessage = () => {
    if (exportContact) return i18n.t("contacts.confirmationModal.exportContact");
    if (deletingContact) return i18n.t("contacts.confirmationModal.deleteMessage");
    if (blockingContact) return i18n.t("contacts.confirmationModal.blockContact");
    if (unBlockingContact) return i18n.t("contacts.confirmationModal.unblockContact");
    if (ImportContacts) return i18n.t("contacts.confirmationModal.importMessage");
    return i18n.t("contactListItems.confirmationModal.importMessage");
  };

  const selectedCount = getSelectedCount();
  const isAnyContactSelected = selectAllMode || selectedContacts.size > 0;

  const selectAllCheckboxStatus = () => {
    if (selectAllMode) return { checked: true, indeterminate: false };
    const currentPageIds = contacts.map(contact => contact.id);
    const selectedInCurrentPage = currentPageIds.filter(id => selectedContacts.has(id)).length;
    if (selectedInCurrentPage === 0) return { checked: false, indeterminate: false };
    if (selectedInCurrentPage === currentPageIds.length) return { checked: true, indeterminate: false };
    return { checked: false, indeterminate: true };
  };

  const checkboxStatus = selectAllCheckboxStatus();

  return (
    <ActivitiesStyleLayout
      viewModes={[{ value: "list", label: `${i18n.t("contacts.title")} (${totalContactsCount})` }]}
      currentViewMode="list"
      searchPlaceholder={i18n.t("contacts.searchPlaceholder")}
      searchValue={searchParam}
      onSearchChange={(v) => handleSearch({ target: { value: v } })}
      rightFilters={null}
      navActions={
        <>
          {isAnyContactSelected && (
            <div className={classes.bulkActions}>
              <Tooltip title="Enviar Email para selecionados">
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    const ids = Array.from(selectedContacts);
                    const query = selectAllMode ? "all=1" : `contacts=${ids.join(",")}`;
                    history.push(`/email?tab=agendamento&${query}`);
                  }}
                >
                  Enviar Email
                </Button>
              </Tooltip>
              <Tooltip title={selectAllMode ? "Excluir todos os contatos" : "Excluir contatos selecionados"}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={handleBulkDeleteClick}
                >
                  {getSelectionButtonText()}
                </Button>
              </Tooltip>
            </div>
          )}
          <PopupState variant="popover" popupId="contacts-import-export">
            {(popupState) => (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  {...bindTrigger(popupState)}
                >
                  {i18n.t("contacts.menu.importexport")}
                  <ArrowDropDown />
                </Button>
                <Menu {...bindMenu(popupState)}>
                  <MenuItem
                    onClick={() => {
                      setConfirmOpen(true);
                      setImportContacts(true);
                      popupState.close();
                    }}
                  >
                    <ContactPhone
                      fontSize="small"
                      color="primary"
                      style={{ marginRight: 10 }}
                    />
                    {i18n.t("contacts.menu.importYourPhone")}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setImportContactModalOpen(true);
                    }}
                  >
                    <Backup
                      fontSize="small"
                      color="primary"
                      style={{ marginRight: 10 }}
                    />
                    {i18n.t("contacts.menu.importToExcel")}
                  </MenuItem>
                  <Can
                    role={user.profile}
                    perform="contacts-page:deleteAllContacts"
                    yes={() => (
                      <MenuItem
                        onClick={() => {
                          handleDeleteAllClick();
                          popupState.close();
                        }}
                        style={{ color: '#f44336' }}
                      >
                        <DeleteSweep
                          fontSize="small"
                          style={{ marginRight: 10, color: '#f44336' }}
                        />
                        Excluir Todos os Contatos
                      </MenuItem>
                    )}
                  />
                </Menu>
              </>
            )}
          </PopupState>
        </>
      }
      onCreateClick={handleOpenContactModal}
    >
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        initialContact={contactTicket}
        onClose={(ticket) => {
          handleCloseOrOpenTicket(ticket);
        }}
      />
      <ContactModal
        open={contactModalOpen}
        onClose={handleCloseContactModal}
        aria-labelledby="form-dialog-title"
        contactId={selectedContactId}
        onSave={(contact) => {
          dispatch({ type: "UPDATE_CONTACTS", payload: contact });
          setTotalContactsCount((prev) => (contact.id && !contacts.some((c) => c.id === contact.id) ? prev + 1 : prev));
        }}
      />
      <ContactDeleteConfirmModal
        open={deleteConfirmModalOpen}
        onClose={() => setDeleteConfirmModalOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        deleteType={deleteType}
        selectedCount={selectedContacts.size}
        totalCount={totalContactsCount}
      />
      <Dialog
        open={imageModalOpen}
        onClose={handleCloseImageModal}
        className={classes.imageDialog}
        maxWidth="md"
      >
        <DialogTitle className={classes.dialogTitle}>
          <span>Foto de Perfil - {selectedContactName}</span>
          <IconButton onClick={handleCloseImageModal} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedImage ? (
            <img
              src={selectedImage}
              alt={`Foto de perfil de ${selectedContactName}`}
              className={classes.profileImage}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '200px',
              color: '#666'
            }}>
              Imagem não disponível
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmationModal
        title={getConfirmTitle()}
        open={confirmOpen}
        onClose={setConfirmOpen}
        onConfirm={getConfirmAction()}
      >
        {getConfirmMessage()}
      </ConfirmationModal>
      <ConfirmationModal
        title={i18n.t("contacts.confirmationModal.importChat")}
        open={confirmChatsOpen}
        onClose={setConfirmChatsOpen}
        onConfirm={(e) => handleimportChats()}
      >
        {i18n.t("contacts.confirmationModal.wantImport")}
      </ConfirmationModal>

      {importContactModalOpen && (
        <ContactImportWpModal
          isOpen={importContactModalOpen}
          handleClose={() => setImportContactModalOpen(false)}
          selectedTags={selectedTags}
          hideNum={hideNum}
          userProfile={user.profile}
        />
      )}

      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <input
          style={{ display: "none" }}
          id="upload"
          name="file"
          type="file"
          accept=".xls,.xlsx"
          onChange={() => {
            setConfirmOpen(true);
          }}
          ref={fileUploadRef}
        />

        {/* Toolbar para ações em lote */}
        {isAnyContactSelected && (
          <Toolbar className={`${classes.toolbar} ${classes.toolbarHighlight}`}>
            <Typography className={classes.toolbarTitle} color="inherit" variant="subtitle1">
              {selectedCount} contato(s) selecionado(s) {selectAllMode && '(TODOS OS CONTATOS)'}
            </Typography>
            <div className={classes.bulkActions}>
              <Tooltip title="Enviar Email para selecionados">
                <Button
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    const ids = Array.from(selectedContacts);
                    const query = selectAllMode ? "all=1" : `contacts=${ids.join(",")}`;
                    history.push(`/email?tab=agendamento&${query}`);
                  }}
                >
                  Enviar Email
                </Button>
              </Tooltip>
              <Tooltip title="Cancelar seleção">
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedContacts(new Set());
                    setSelectAllMode(false);
                  }}
                >
                  Cancelar
                </Button>
              </Tooltip>
              <Tooltip title={selectAllMode ? "Excluir todos os contatos" : "Excluir selecionados"}>
                <IconButton
                  color="inherit"
                  onClick={handleBulkDeleteClick}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Tooltip>
            </div>
          </Toolbar>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell className={classes.checkboxCell}>
                <Checkbox
                  indeterminate={checkboxStatus.indeterminate}
                  checked={checkboxStatus.checked}
                  onChange={handleSelectAllContacts}
                  disabled={contacts.length === 0}
                  inputProps={{ 'aria-label': 'Selecionar todos os contatos' }}
                />
              </TableCell>
              <TableCell className={classes.idCell}>ID</TableCell>
              <TableCell className={classes.avatarCell} align="center">Foto</TableCell>
              <TableCell>{i18n.t("contacts.table.name")}</TableCell>
              <TableCell align="center">Origem</TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.whatsapp")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.email")}
              </TableCell>
              <TableCell align="center">{"Status"}</TableCell>
              <TableCell align="center">{i18n.t("contacts.table.wallet")}</TableCell>
              <TableCell align="center">
                {i18n.t("contacts.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {contacts.map((contact) => {
                const isSelected = selectAllMode || selectedContacts.has(contact.id);
                
                return (
                  <TableRow 
                    key={contact.id}
                    selected={isSelected}
                    onClick={() => hadleEditContact(contact.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell className={classes.checkboxCell}>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSelectContact(contact.id)}
                        disabled={selectAllMode}
                        inputProps={{ 'aria-label': `Selecionar contato ${contact.name}` }}
                      />
                    </TableCell>
                    <TableCell className={classes.idCell}>{contact.id}</TableCell>
                    <TableCell className={classes.avatarCell} align="center">
                      <Avatar 
                        src={resolveImageUrl(contact?.urlPicture || contact?.profilePicUrl)}
                        className={classes.clickableAvatar}
                        onClick={() => handleOpenImageModal(contact?.urlPicture || contact?.profilePicUrl, contact.name)}
                        onError={async (e) => {
                          e.target.onerror = null;
                          try {
                            if (contact?.number) {
                              const num = String(contact.number).replace(/\D/g, "");
                              const { data } = await api.get(`/contacts/profile/${num}`, { params: { channel: contact.channel } });
                              if (data?.urlPicture || data?.profilePicUrl) {
                                const candidate = data?.urlPicture || data?.profilePicUrl;
                                const finalUrl = resolveImageUrl(candidate);
                                dispatch({
                                  type: "UPDATE_CONTACTS",
                                  payload: { ...contact, urlPicture: finalUrl, profilePicUrl: candidate }
                                });
                                e.target.src = finalUrl;
                                return;
                              }
                            }
                          } catch (_) {}
                          e.target.src = `${backendUrl}/public/app/noimage.png`;
                        }}
                      />
                    </TableCell>
                    <TableCell>{contact.name}</TableCell>
                    <TableCell align="center">
                      
                    </TableCell>
                    <TableCell align="center">
                      {enableLGPD && hideNum && user.profile === "user"
                        ? contact.isGroup
                          ? contact.number
                          : formatSerializedId(contact?.number) === null
                          ? contact.number.slice(0, -6) +
                            "**-**" +
                            contact?.number.slice(-2)
                          : formatSerializedId(contact?.number)?.slice(0, -6) +
                            "**-**" +
                            contact?.number?.slice(-2)
                        : contact.isGroup
                        ? contact.number
                        : formatSerializedId(contact?.number)}
                    </TableCell>
                    <TableCell align="center">{contact.email}</TableCell>
                    <TableCell align="center">
                      {contact.active ? (
                        <CheckCircleIcon
                          style={{ color: "green" }}
                          fontSize="small"
                        />
                      ) : (
                        <CancelIcon style={{ color: "red" }} fontSize="small" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {contact.contactWallets && contact.contactWallets.length > 0 
                        ? contact.contactWallets[0].wallet?.name || "Usuário não encontrado"
                        : "Não atribuído"}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        disabled={!contact.active}
                        onClick={() => {
                          setContactTicket(contact);
                          setNewTicketModalOpen(true);
                        }}
                      >
                        {contact.channel === "whatsapp" && (
                          <WhatsApp style={{ color: "green" }} />
                        )}
                        {contact.channel === "instagram" && (
                          <Instagram style={{ color: "purple" }} />
                        )}
                        {contact.channel === "facebook" && (
                          <Facebook style={{ color: "blue" }} />
                        )}
                      </IconButton>

                      <Can
                        role={user.profile}
                        perform="contacts-page:deleteContact"
                        yes={() => (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setConfirmOpen(true);
                              setDeletingContact(contact);
                            }}
                          >
                            <DeleteOutlineIcon color="secondary" />
                          </IconButton>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {loading && <TableRowSkeleton avatar columns={9} />}
            </>
          </TableBody>
        </Table>
      </Paper>
    </ActivitiesStyleLayout>
  );
};

export default Contacts;
