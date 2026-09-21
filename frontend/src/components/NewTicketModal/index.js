/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import Autocomplete, { createFilterOptions } from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ContactModal from "../ContactModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Grid, ListItemText, MenuItem, Select } from "@material-ui/core";
import { toast } from "react-toastify";
import { Facebook, Instagram, WhatsApp } from "@material-ui/icons";
import ShowTicketOpen from "../ShowTicketOpenModal";
import useQueues from "../../hooks/useQueues";

const useStyles = makeStyles((theme) => ({
  online: {
    fontSize: 11,
    color: "#25d366"
  },
  offline: {
    fontSize: 11,
    color: "#e1306c"
  }
}));

const filter = createFilterOptions({
  trim: true,
});

const NewTicketModal = ({ modalOpen, onClose, initialContact }) => {
  const classes = useStyles();
  const [options, setOptions] = useState([]);
  const [channelFilter, setChannelFilter] = useState(null);

  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [selectedWhatsapp, setSelectedWhatsapp] = useState("");
  const [newContact, setNewContact] = useState({});
  const [whatsapps, setWhatsapps] = useState([]);
  const [queues, setQueues] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const { companyId, whatsappId } = user;
  const { findAll: findAllQueues } = useQueues();

  const availableQueues = useMemo(() => {
    const fromApi = Array.isArray(queues) ? queues : [];
    const fromUser = Array.isArray(user?.queues) ? user.queues : [];
    if (fromApi.length === 0) return fromUser;
    if (user?.profile === "admin") return fromApi;
    const userQueueIds = new Set(fromUser.map((q) => Number(q.id)));
    if (userQueueIds.size === 0) return fromApi;
    return fromApi.filter((q) => userQueueIds.has(Number(q.id)));
  }, [queues, user]);

  const [openAlert, setOpenAlert] = useState(false);
  const [userTicketOpen, setUserTicketOpen] = useState("");
  const [queueTicketOpen, setQueueTicketOpen] = useState("");

  useEffect(() => {
    if (initialContact?.id !== undefined) {
      setOptions([initialContact]);
      setSelectedContact(initialContact);
    }
  }, [initialContact]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchData = async () => {
        try {
          const [queueList, whatsappRes] = await Promise.all([
            findAllQueues(),
            api.get(`/whatsapp`, { params: { companyId, session: 0 } }),
          ]);
          setQueues(Array.isArray(queueList) ? queueList : []);
          setWhatsapps(Array.isArray(whatsappRes.data) ? whatsappRes.data : []);
        } catch (err) {
          toastError(err);
        } finally {
          setLoading(false);
        }
      };

      fetchData();

      if (whatsappId !== null && whatsappId !== undefined) {
        setSelectedWhatsapp(String(whatsappId));
      }
    }, 200);
    return () => clearTimeout(delayDebounceFn);
  }, [modalOpen, companyId, whatsappId, findAllQueues]);

  useEffect(() => {
    if (!modalOpen) return;
    if (availableQueues.length === 1) {
      setSelectedQueue(String(availableQueues[0].id));
    }
  }, [modalOpen, availableQueues]);

  useEffect(() => {
    if (!modalOpen || searchParam.length < 3) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("contacts", {
            params: { searchParam },
          });
          setOptions(data.contacts);
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, modalOpen]);

  const IconChannel = (channel) => {
    switch (channel) {
      case "facebook":
        return <Facebook style={{ color: "#3b5998", verticalAlign: "middle" }} />;
      case "instagram":
        return <Instagram style={{ color: "#e1306c", verticalAlign: "middle" }} />;
      case "whatsapp":
        return <WhatsApp style={{ color: "#25d366", verticalAlign: "middle" }} />
      case "whatsapp_oficial":
        return <WhatsApp style={{ color: "#25d366", verticalAlign: "middle" }} />
      case "sms":
        return <span style={{ color: "#1976d2", fontWeight: 600, fontSize: 12 }}>SMS</span>
      case "telegram":
        return <span style={{ color: "#0088cc", fontWeight: 600, fontSize: 12 }}>TG</span>
      default:
        return "error";
    }
  };

  const handleClose = () => {
    onClose();
    setSearchParam("");
    setOpenAlert(false);
    setUserTicketOpen("");
    setQueueTicketOpen("");
    setSelectedContact(null);
    setSelectedQueue("");
    setSelectedWhatsapp("");
  };

  const handleCloseAlert = () => {
    setOpenAlert(false);
    setLoading(false);
    setOpenAlert(false);
    setUserTicketOpen("");
    setQueueTicketOpen("");
  };

  const handleSaveTicket = async contactId => {
    if (!contactId) return;
    // if (selectedQueue === "" && user.profile !== 'admin') {
    if (selectedQueue === "") {
      toast.error("Selecione uma fila");
      return;
    }

    setLoading(true);
    try {
      const queueId = selectedQueue !== "" ? Number(selectedQueue) : null;
      const whatsappId = selectedWhatsapp !== "" ? Number(selectedWhatsapp) : null;
      const { data: ticket } = await api.post("/tickets", {
        contactId: contactId,
        queueId,
        whatsappId,
        userId: user.id,
        status: "open",
      });

      onClose(ticket);
    } catch (err) {
      setLoading(false);
      
      // Se for erro 403 (Forbidden), o backend já retornou que outro usuário atende
      if (err.response?.status === 403) {
        const errorData = err.response.data;
        setOpenAlert(true);
        setUserTicketOpen(errorData.ticket?.user?.name || "Outro usuário");
        setQueueTicketOpen(errorData.ticket?.queue?.name || "Sem fila");
        return;
      }

      // Para erro 409, tentar parsear o ticket existente
      if (err.response?.status === 409) {
        const ticket = JSON.parse(err.response.data.error);

        if (ticket.userId !== user?.id) {
          setOpenAlert(true);
          setUserTicketOpen(ticket?.user?.name);
          setQueueTicketOpen(ticket?.queue?.name);
        } else {
          setOpenAlert(false);
          setUserTicketOpen("");
          setQueueTicketOpen("");
          setLoading(false);
          onClose(ticket);
        }
      } else {
        // Outros erros
        toastError(err);
      }
    }
    setLoading(false);
  };

  const handleSelectOption = (e, newValue) => {
    if (newValue?.number) {
      setSelectedContact(newValue);
    } else if (newValue?.name) {
      setNewContact({ name: newValue.name });
      setContactModalOpen(true);
    }
  };

  const handleCloseContactModal = () => {
    setContactModalOpen(false);
  };

  const handleAddNewContactTicket = contact => {
    setSelectedContact(contact);
  };

  const createAddContactOption = (filterOptions, params) => {
    const filtered = filter(filterOptions, params);
    if (params.inputValue !== "" && !loading && searchParam.length >= 3) {
      filtered.push({
        name: `${params.inputValue}`,
      });
    }
    return filtered;
  };

  const renderOption = option => {
    if (option.number) {
      return <>
        {IconChannel(option.channel)}
        <Typography component="span" style={{ fontSize: 14, marginLeft: "10px", display: "inline-flex", alignItems: "center", lineHeight: "2" }}>
          {option.name} - {option.number}
        </Typography>
      </>
    } else {
      return `${i18n.t("newTicketModal.add")} ${option.name}`;
    }
  };

  const renderOptionLabel = option => {
    if (option.number) {
      return `${option.name} - ${option.number}`;
    } else {
      return `${option.name}`;
    }
  };

  const renderContactAutocomplete = () => {
    if (!initialContact?.id) {
      return (
        <Grid xs={12} item>
          <Autocomplete
            fullWidth
            options={options}
            loading={loading}
            clearOnBlur
            autoHighlight
            freeSolo
            clearOnEscape
            getOptionLabel={renderOptionLabel}
            renderOption={renderOption}
            filterOptions={createAddContactOption}
            onChange={(e, newValue) => {
              setChannelFilter(newValue ? newValue.channel : "whatsapp");
              handleSelectOption(e, newValue)
            }}
            renderInput={params => (
              <TextField
                {...params}
                label={i18n.t("newTicketModal.fieldLabel")}
                variant="outlined"
                autoFocus
                onChange={e => setSearchParam(e.target.value)}
                onKeyPress={e => {
                  if (loading || !selectedContact) return;
                  else if (e.key === "Enter") {
                    handleSaveTicket(selectedContact.id);
                  }
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
          />
        </Grid>
      )
    }
    return null;
  }

  return (
    <>

      <Dialog open={modalOpen} onClose={handleClose}>
        <DialogTitle id="form-dialog-title">
          {i18n.t("newTicketModal.title")}
        </DialogTitle>
        <DialogContent dividers>
          <Grid style={{ width: 300 }} container spacing={2}>
            {/* CONTATO */}
            {renderContactAutocomplete()}
            {/* FILA */}
            <Grid xs={12} item>
              <Select
                required
                fullWidth
                displayEmpty
                variant="outlined"
                value={selectedQueue}
                onChange={(e) => {
                  setSelectedQueue(e.target.value)
                }}
                MenuProps={{
                  anchorOrigin: {
                    vertical: "bottom",
                    horizontal: "left",
                  },
                  transformOrigin: {
                    vertical: "top",
                    horizontal: "left",
                  },
                  getContentAnchorEl: null,
                }}
                renderValue={() => {
                  if (selectedQueue === "") {
                    return "Selecione uma fila"
                  }
                  const queue = availableQueues.find(
                    (q) => String(q.id) === String(selectedQueue)
                  );
                  return queue?.name || "Selecione uma fila";
                }}
              >
                {availableQueues.length > 0 ? (
                  availableQueues.map((queue) => (
                    <MenuItem dense key={queue.id} value={String(queue.id)}>
                      <ListItemText primary={queue.name} />
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem dense disabled value="">
                    <ListItemText primary="Nenhuma fila disponível" />
                  </MenuItem>
                )}
              </Select>
            </Grid>
            {/* CONEXAO */}
            <Grid xs={12} item>
              <Select
                required
                fullWidth
                displayEmpty
                variant="outlined"
                value={selectedWhatsapp}
                onChange={(e) => {
                  setSelectedWhatsapp(e.target.value)
                }}
                MenuProps={{
                  anchorOrigin: {
                    vertical: "bottom",
                    horizontal: "left",
                  },
                  transformOrigin: {
                    vertical: "top",
                    horizontal: "left",
                  },
                  getContentAnchorEl: null,
                }}
                renderValue={() => {
                  if (selectedWhatsapp === "") {
                    return "Selecione uma Conexão"
                  }
                  const whatsapp = whatsapps.find(
                    (w) => String(w.id) === String(selectedWhatsapp)
                  );
                  return whatsapp?.name || "Selecione uma Conexão";
                }}
              >
                {whatsapps?.length > 0 &&
                  whatsapps.map((whatsapp) => (
                    <MenuItem dense key={whatsapp.id} value={String(whatsapp.id)}>
                      <ListItemText
                        primary={
                          <>
                            {IconChannel(whatsapp.channel)}
                            <Typography component="span" style={{ fontSize: 14, marginLeft: "10px", display: "inline-flex", alignItems: "center", lineHeight: "2" }}>
                              {whatsapp.name} &nbsp; <p className={(whatsapp.status) === 'CONNECTED' ? classes.online : classes.offline} >({whatsapp.status})</p>
                            </Typography>
                          </>
                        }
                      />
                    </MenuItem>
                  ))}
              </Select>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            color="secondary"
            disabled={loading}
            variant="outlined"
          >
            {i18n.t("newTicketModal.buttons.cancel")}
          </Button>
          <ButtonWithSpinner
            variant="contained"
            type="button"
            disabled={!selectedContact}
            onClick={() => handleSaveTicket(selectedContact.id)}
            color="primary"
            loading={loading}
          >
            {i18n.t("newTicketModal.buttons.ok")}
          </ButtonWithSpinner>
        </DialogActions>
        {contactModalOpen && (
          <ContactModal
            open={contactModalOpen}
            initialValues={newContact}
            onClose={handleCloseContactModal}
            onSave={handleAddNewContactTicket}
          ></ContactModal>
        )}
        {openAlert && (
          <ShowTicketOpen
            isOpen={openAlert}
            handleClose={handleCloseAlert}
            user={userTicketOpen}
            queue={queueTicketOpen}
          />
        )}
      </Dialog >
    </>
  );
};
export default NewTicketModal;