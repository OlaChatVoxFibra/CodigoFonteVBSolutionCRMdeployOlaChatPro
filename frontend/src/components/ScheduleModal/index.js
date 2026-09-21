/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/components/ScheduleModal/index.js

import React, { useState, useEffect, useContext, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field, FieldArray } from "formik";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import { getBackendUrl } from "../../config";
import toastError from "../../errors/toastError";
import {
  Chip,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Typography,
} from "@material-ui/core";
import Autocomplete, {
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import moment from "moment";
import { AuthContext } from "../../context/Auth/AuthContext";
import { isArray, capitalize } from "lodash";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import AttachFile from "@material-ui/icons/AttachFile";
import { head } from "lodash";
import ConfirmationModal from "../ConfirmationModal";
import MessageVariablesPicker from "../MessageVariablesPicker";
import useQueues from "../../hooks/useQueues";
import UserStatusIcon from "../UserModal/statusIcon";
import { Facebook, Instagram, WhatsApp, FlashOn } from "@material-ui/icons";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
}));

const ScheduleSchema = Yup.object().shape({
  body: Yup.string().min(5, "Mensagem muito curta").required("Obrigatório"),
  contactId: Yup.number().required("Obrigatório"),
  sendAt: Yup.string().required("Obrigatório"),
  reminderDate: Yup.string().nullable()
});

const ScheduleModal = ({
  open,
  onClose,
  scheduleId,
  contactId,
  cleanContact,
  reload,
  message, // ✅ Nova prop para pre-popular mensagem
  fromMessageInput = false, // ✅ Nova prop para identificar origem
  user
}) => {
  const classes = useStyles();
  const history = useHistory();
  const isMounted = useRef(true);
  const { companyId } = user;
  const isAdmin = user.profile === 'admin';

  const initialState = {
    body: message || "", // ✅ Pre-popular com mensagem se fornecida
    contactId: contactId || "", // ✅ Pre-popular com contactId se fornecido
    sendAt: moment().add(1, "hour").format("YYYY-MM-DDTHH:mm"),
    sentAt: "",
    openTicket: "enabled",
    ticketUserId: user.id,
    queueId: "",
    statusTicket: "open", // ✅ Status baseado na origem
    intervalo: 1,
    valorIntervalo: 0,
    enviarQuantasVezes: 1,
    tipoDias: 4,
    assinar: false,
    // ✅ Novos campos para lembrete
    reminderDate: "",
  };

  const initialContact = {
    id: "",
    name: "",
    channel: "",
  };

  const [schedule, setSchedule] = useState(initialState);
  const [currentContact, setCurrentContact] = useState(initialContact);
  const [contacts, setContacts] = useState([initialContact]);
  const [intervalo, setIntervalo] = useState(1);
  const [tipoDias, setTipoDias] = useState(4);
  const [attachment, setAttachment] = useState(null);
  const attachmentFile = useRef(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const messageInputRef = useRef();
  const [channelFilter, setChannelFilter] = useState("whatsapp");
  const [whatsapps, setWhatsapps] = useState([]);
  const [selectedWhatsapps, setSelectedWhatsapps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [queues, setQueues] = useState([]);
  const [allQueues, setAllQueues] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const { findAll: findAllQueues } = useQueues();
  const [options, setOptions] = useState([]);
  const [searchParam, setSearchParam] = useState("");

  // Estados para quickMessages
  const [quickMessages, setQuickMessages] = useState([]);
  const [filteredQuickMessages, setFilteredQuickMessages] = useState([]);
  const [loadingQuickMessages, setLoadingQuickMessages] = useState(false);
  const [selectedQuickMessage, setSelectedQuickMessage] = useState("");
  const [quickMessageSearch, setQuickMessageSearch] = useState("");
  const [showAllQuickMessages, setShowAllQuickMessages] = useState(false);
  const [quickMessageMedia, setQuickMessageMedia] = useState(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      const loadQueues = async () => {
        const list = await findAllQueues();
        setAllQueues(list);
        setQueues(list);
      };
      loadQueues();
    }
  }, []);

  // Buscar quickMessages quando o modal abrir
  useEffect(() => {
    if (open && user?.companyId) {
      fetchQuickMessages();
    }
  }, [open, user?.companyId, user?.id]);

  // Filtrar respostas rápidas baseado na busca
  useEffect(() => {
    if (quickMessageSearch.trim() === "" && !showAllQuickMessages) {
      setFilteredQuickMessages([]);
    } else if (quickMessageSearch.trim() === "" && showAllQuickMessages) {
      setFilteredQuickMessages(quickMessages);
    } else {
      const filtered = quickMessages.filter(qm => 
        qm.message.toLowerCase().includes(quickMessageSearch.toLowerCase()) ||
        qm.shortcode.toLowerCase().includes(quickMessageSearch.toLowerCase())
      );
      setFilteredQuickMessages(filtered);
    }
  }, [quickMessageSearch, quickMessages, showAllQuickMessages]);

  const fetchQuickMessages = async () => {
    setLoadingQuickMessages(true);
    try {
      console.log("🔍 Buscando quickMessages com params:", {
        companyId: user?.companyId,
        userId: user?.id,
        isOficial: "false"
      });

      const { data } = await api.get("/quick-messages/list", {
        params: {
          companyId: user?.companyId,
          userId: user?.id,
          isOficial: "false"
        }
      });

      console.log("📋 Resposta da API quickMessages:", data);
      setQuickMessages(data || []);
      setFilteredQuickMessages(data || []);
    } catch (err) {
      console.error("❌ Erro ao buscar respostas rápidas:", err);
      toastError(err);
      setQuickMessages([]);
      setFilteredQuickMessages([]);
    } finally {
      setLoadingQuickMessages(false);
    }
  };

  // Função para baixar mídia da quickMessage
  const downloadQuickMessageMedia = async (mediaPath, mediaName, mediaType) => {
    try {
      // console.log("📎 Baixando mídia da quickMessage:", { mediaPath, mediaName, mediaType });

      // Construir URL correta usando a URL base do backend
      const backendUrl = getBackendUrl();
      const downloadUrl = `${backendUrl}/public/company${user?.companyId}/quickMessage/${mediaName}`;

      // console.log("🔗 URL de download:", downloadUrl);

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao baixar mídia: ${response.status}`);
      }

      const blob = await response.blob();
      const file = new File([blob], mediaName, {
        type: blob.type || getMediaTypeFromExtension(mediaName, mediaType)
      });

      // console.log("✅ Mídia baixada com sucesso:", file);
      return file;
    } catch (err) {
      console.error("❌ Erro ao baixar mídia da quickMessage:", err);
      toastError(err);
      return null;
    }
  };

  // Função auxiliar para determinar o tipo MIME baseado na extensão
  const getMediaTypeFromExtension = (fileName, mediaType) => {
    const extension = fileName.split('.').pop().toLowerCase();

    switch (mediaType) {
      case 'image':
        return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      case 'audio':
        return `audio/${extension}`;
      case 'video':
        return `video/${extension}`;
      default:
        return 'application/octet-stream';
    }
  };

  useEffect(() => {
    if (searchParam.length < 3) {
      setLoading(false);
      setSelectedQueue("");
      return;
    }
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      const fetchUsers = async () => {
        try {
          const { data } = await api.get("/users/");
          setOptions(data.users);
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };

      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam]);

  useEffect(() => {
    api
      .get(`/whatsapp/filter`, {
        params: { session: 0, channel: channelFilter },
      })
      .then(({ data }) => {
        const mappedWhatsapps = data.map((whatsapp) => ({
          ...whatsapp,
          selected: false,
        }));

        setWhatsapps(mappedWhatsapps);
        if (mappedWhatsapps.length && mappedWhatsapps?.length === 1) {
          setSelectedWhatsapps(mappedWhatsapps[0].id);
        }
      });
  }, [currentContact, channelFilter]);

  useEffect(() => {
    if (contactId && contacts.length) {
      const contact = contacts.find((c) => c.id === contactId);
      if (contact) {
        setCurrentContact(contact);
      }
    }
  }, [contactId, contacts]);

  // ✅ MELHORIA: UseEffect otimizado com melhor lógica de inicialização
  useEffect(() => {
    const { companyId } = user;
    if (open) {
      try {
        (async () => {
          // Carregar lista de contatos
          const { data: contactList } = await api.get("/contacts/list", {
            params: { companyId: companyId },
          });

          let customList = contactList.map((c) => ({
            id: c.id,
            name: c.name,
            channel: c.channel,
          }));

          if (isArray(customList)) {
            setContacts([{ id: "", name: "", channel: "" }, ...customList]);
          }

          // ✅ MELHORIA: Lógica de inicialização aprimorada
          if (!scheduleId) {
            // Modal sendo aberto para criar novo agendamento
            const newScheduleState = {
              ...initialState,
              body: message || "", // ✅ Pre-popular mensagem
              contactId: contactId || "", // ✅ Pre-popular contato
            };

            setSchedule(newScheduleState);

            // ✅ MELHORIA: Se contactId foi fornecido, definir contato atual
            if (contactId && customList.length > 0) {
              const foundContact = customList.find((c) => c.id.toString() === contactId.toString());
              if (foundContact) {
                setCurrentContact(foundContact);
                setChannelFilter(foundContact.channel || "whatsapp");
                console.log("✅ Contato auto-selecionado:", foundContact.name);
              }
            }

            return;
          }

          // ✅ Carregamento de agendamento existente (lógica original)
          const { data } = await api.get(`/schedules/${scheduleId}`);
          setSchedule((prevState) => {
            return {
              ...prevState,
              ...data,
              sendAt: moment(data.sendAt).format("YYYY-MM-DDTHH:mm"),
              // ✅ Incluir campos de lembrete no carregamento
              reminderDate: data.reminderDate ? moment(data.reminderDate).format("YYYY-MM-DDTHH:mm") : "",
            };
          });

          console.log("📅 Agendamento carregado:", data);

          if (data.whatsapp) {
            setSelectedWhatsapps(data.whatsapp.id);
          }

          if (!isAdmin && data.ticketUser) {
            setSelectedUser(data.ticketUser);
          }

          if (data.queueId) {
            setSelectedQueue(data.queueId);
          }

          if (data.intervalo) {
            setIntervalo(data.intervalo);
          }

          if (data.tipoDias) {
            setTipoDias(data.tipoDias);
          }

          setCurrentContact(data.contact);
        })();
      } catch (err) {
        toastError(err);
      }
    }
  }, [scheduleId, contactId, open, user, message, fromMessageInput]);

  const filterOptions = createFilterOptions({
    trim: true,
  });

  const handleClose = () => {
    onClose();
    setAttachment(null);
    setSchedule(initialState);
    // ✅ MELHORIA: Reset do contato atual ao fechar
    setCurrentContact(initialContact);
    // Reset do dropdown de quickMessages
    setSelectedQuickMessage("");
    setQuickMessageSearch("");
    setShowAllQuickMessages(false);
    setFilteredQuickMessages([]);
    setQuickMessageMedia(null);
    // ✅ Reset dos campos de lembrete
    setSchedule(prevState => ({
      ...prevState,
      reminderDate: "",
    }));
  };

  const handleAttachmentFile = (e) => {
    const file = head(e.target.files);
    if (file) {
      setAttachment(file);
    }
  };

  const IconChannel = (channel) => {
    switch (channel) {
      case "facebook":
        return (
          <Facebook style={{ color: "#3b5998", verticalAlign: "middle" }} />
        );
      case "instagram":
        return (
          <Instagram style={{ color: "#e1306c", verticalAlign: "middle" }} />
        );
      case "whatsapp":
        return (
          <WhatsApp style={{ color: "#25d366", verticalAlign: "middle" }} />
        );
      default:
        return "error";
    }
  };

  const renderOption = (option) => {
    if (option.name) {
      return (
        <>
          {IconChannel(option.channel)}
          <Typography
            component="span"
            style={{
              fontSize: 14,
              marginLeft: "10px",
              display: "inline-flex",
              alignItems: "center",
              lineHeight: "2",
            }}
          >
            {option.name}
          </Typography>
        </>
      );
    } else {
      return `${i18n.t("newTicketModal.add")} ${option.name}`;
    }
  };

  const handleSaveSchedule = async (values) => {
    const scheduleData = {
      ...values,
      userId: user.id,
      whatsappId: selectedWhatsapps,
      ticketUserId: selectedUser?.id || null,
      queueId: selectedQueue || null,
      intervalo: intervalo || 1,
      tipoDias: tipoDias || 4,
      // ✅ Incluir dados do lembrete
      reminderDate: values.reminderDate || null,
    };

    try {
      if (scheduleId) {
        await api.put(`/schedules/${scheduleId}`, scheduleData);
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/schedules/${scheduleId}/media-upload`, formData);
        }
      } else {
        const { data } = await api.post("/schedules", scheduleData);
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/schedules/${data.id}/media-upload`, formData);
        }
      }

      toast.success(i18n.t("scheduleModal.success"));

      if (typeof reload == "function") {
        reload();
      }

      if (contactId) {
        if (typeof cleanContact === "function") {
          cleanContact();
          history.push("/schedules");
        }
      }
    } catch (err) {
      toastError(err);
    }

    setCurrentContact(initialContact);
    setSchedule(initialState);
    // ✅ Reset dos campos de lembrete após salvar
    setSchedule(prevState => ({
      ...prevState,
      reminderDate: "",
    }));
    handleClose();
  };

  const handleClickMsgVar = async (msgVar, setValueFunc) => {
    const el = messageInputRef.current;
    const firstHalfText = el.value.substring(0, el.selectionStart);
    const secondHalfText = el.value.substring(el.selectionEnd);
    const newCursorPos = el.selectionStart + msgVar.length;

    setValueFunc("body", `${firstHalfText}${msgVar}${secondHalfText}`);

    await new Promise((r) => setTimeout(r, 100));
    messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
  };

  // Função para lidar com seleção de resposta rápida
  const handleQuickMessageSelect = async (selectedMessage, setFieldValue) => {
    console.log("🎯 Mensagem selecionada:", selectedMessage);
    
    if (selectedMessage) {
      console.log("✅ Preenchendo campo body com:", selectedMessage.message);
      setFieldValue("body", selectedMessage.message || "");
      setQuickMessageSearch(selectedMessage.message || "");

      // Se a mensagem tem mídia, baixar e definir como attachment
      if (selectedMessage.mediaPath) {
        console.log("📎 Mensagem com mídia:", selectedMessage.mediaPath);

        try {
          const mediaFile = await downloadQuickMessageMedia(
            selectedMessage.mediaPath,
            selectedMessage.mediaName,
            selectedMessage.mediaType
          );

          if (mediaFile) {
            setAttachment(mediaFile);
            setQuickMessageMedia({
              path: selectedMessage.mediaPath,
              name: selectedMessage.mediaName,
              type: selectedMessage.mediaType
            });
            console.log("✅ Mídia da quickMessage definida como attachment:", mediaFile);
          }
        } catch (err) {
          console.error("❌ Erro ao processar mídia da quickMessage:", err);
        }
      } else {
        // Limpar mídia anterior se não há mídia na nova seleção
        setQuickMessageMedia(null);
        setAttachment(null);
        if (attachmentFile.current) {
          attachmentFile.current.value = null;
        }
      }
    }
  };

  const deleteMedia = async () => {
    if (attachment) {
      setAttachment(null);
      attachmentFile.current.value = null;
    }

    // Limpar mídia da quickMessage se existir
    if (quickMessageMedia) {
      setQuickMessageMedia(null);
    }

    if (schedule.mediaPath) {
      await api.delete(`/schedules/${schedule.id}/media-upload`);
      setSchedule((prev) => ({
        ...prev,
        mediaPath: null,
      }));
      toast.success(i18n.t("scheduleModal.toasts.deleted"));
      if (typeof reload == "function") {
        console.log(reload);
        console.log("1");
        reload();
      }
    }
  };

  return (
    <div className={classes.root}>
      <ConfirmationModal
        title={i18n.t("scheduleModal.confirmationModal.deleteTitle")}
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={deleteMedia}
      >
        {i18n.t("scheduleModal.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {schedule.status === "ERRO"
            ? "Erro de Envio"
            : `Mensagem ${capitalize(schedule.status)}`}
        </DialogTitle>
        <div style={{ display: "none" }}>
          <input
            type="file"
            accept=".png,.jpg,.jpeg"
            ref={attachmentFile}
            onChange={(e) => handleAttachmentFile(e)}
          />
        </div>
        <Formik
          initialValues={schedule}
          enableReinitialize={true}
          validationSchema={ScheduleSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveSchedule(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting, values, setFieldValue }) => (
            <Form>
              <DialogContent dividers>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={6} xl={6}>
                    <div className={classes.multFieldLine}>
                      <FormControl variant="outlined" fullWidth>
                        <Autocomplete
                          fullWidth
                          value={currentContact}
                          options={contacts}
                          onChange={(e, contact) => {
                            const contactId = contact ? contact.id : "";
                            setSchedule({ ...schedule, contactId });
                            setCurrentContact(contact ? contact : initialContact);
                            setChannelFilter(
                              contact ? contact.channel : "whatsapp"
                            );
                          }}
                          getOptionLabel={(option) => option.name}
                          renderOption={renderOption}
                          getOptionSelected={(option, value) => {
                            return value.id === option.id;
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              variant="outlined"
                              placeholder="Contato"
                            />
                          )}
                        />
                      </FormControl>
                    </div>
                  </Grid>
                  <Grid item xs={12} md={6} xl={6}>
                    <Field
                      as={TextField}
                      label={i18n.t("scheduleModal.form.sendAt")}
                      type="datetime-local"
                      name="sendAt"
                      error={touched.sendAt && Boolean(errors.sendAt)}
                      helperText={touched.sendAt && errors.sendAt}
                      variant="outlined"
                      fullWidth
                      size="small"
                      style={{ marginTop: "8px" }}
                    />
                  </Grid>
                </Grid>
                <div className={classes.multFieldLine}>
                  <Field
                    as={TextField}
                    rows={9}
                    multiline={true}
                    label={i18n.t("scheduleModal.form.body")}
                    name="body"
                    inputRef={messageInputRef}
                    error={touched.body && Boolean(errors.body)}
                    helperText={touched.body && errors.body}
                    variant="outlined"
                    margin="dense"
                    fullWidth
                  />
                </div>

                {/* Campo de Busca de Respostas Rápidas */}
                <div className={classes.multFieldLine}>
                  <TextField
                    variant="outlined"
                    fullWidth
                    margin="dense"
                    label={i18n.t("ticketInfo.quickMessages")}
                    placeholder="Digite para buscar respostas rápidas..."
                    value={quickMessageSearch}
                    onChange={(e) => {
                      setQuickMessageSearch(e.target.value);
                      if (e.target.value.trim() === "") {
                        setShowAllQuickMessages(false);
                      }
                    }}
                    onFocus={() => {
                      if (quickMessageSearch.trim() === "" && !showAllQuickMessages) {
                        setShowAllQuickMessages(true);
                      }
                    }}
                    onClick={() => {
                      if (quickMessageSearch.trim() === "" && !showAllQuickMessages) {
                        setShowAllQuickMessages(true);
                      }
                    }}
                    disabled={loadingQuickMessages}
                    InputProps={{
                      startAdornment: <FlashOn style={{ marginRight: '8px', color: '#1976d2' }} />,
                    }}
                  />
                  
                  {/* Lista de sugestões */}
                  {((quickMessageSearch && filteredQuickMessages.length > 0) || (showAllQuickMessages && filteredQuickMessages.length > 0)) && (
                    <div style={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto', 
                      border: '1px solid rgba(128,128,128,0.3)', 
                      borderRadius: '4px', 
                      marginTop: '4px',
                      backgroundColor: 'inherit',
                      zIndex: 1000,
                      position: 'relative'
                    }}>
                      {filteredQuickMessages.map((quickMessage) => (
                        <div
                          key={quickMessage.id}
                          onClick={() => handleQuickMessageSelect(quickMessage, setFieldValue)}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(128,128,128,0.1)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <FlashOn style={{ fontSize: '16px', color: '#1976d2' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                              {quickMessage.shortcode}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#666', 
                              maxWidth: '300px', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap' 
                            }}>
                              {quickMessage.message}
                            </div>
                          </div>
                          {quickMessage.mediaPath && (
                            <AttachFile style={{ fontSize: '14px', color: '#666' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Mensagem quando não há resultados */}
                  {quickMessageSearch && filteredQuickMessages.length === 0 && !loadingQuickMessages && (
                    <div style={{ 
                      padding: '12px', 
                      textAlign: 'center', 
                      fontStyle: 'italic',
                      opacity: 0.6,
                      border: '1px solid rgba(128,128,128,0.3)', 
                      borderRadius: '4px', 
                      marginTop: '4px'
                    }}>
                      Nenhuma resposta rápida encontrada
                    </div>
                  )}
                </div>

                <Grid item xs={12} md={12} xl={12}>
                  <MessageVariablesPicker
                    disabled={isSubmitting}
                    showSchedulingVars={true}
                    onClick={(value) => handleClickMsgVar(value, setFieldValue)}
                  />
                </Grid>
                <Grid container spacing={1}>
                  <Grid item xs={12} md={6} xl={3}>
                    <FormControl
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.formControl}
                    >
                      <InputLabel id="whatsapp-selection-label">
                        {i18n.t("campaigns.dialog.form.whatsapp")}
                      </InputLabel>
                      <Field
                        as={Select}
                        label={i18n.t("campaigns.dialog.form.whatsapp")}
                        placeholder={i18n.t("campaigns.dialog.form.whatsapp")}
                        labelId="whatsapp-selection-label"
                        id="whatsappIds"
                        name="whatsappIds"
                        required
                        error={touched.whatsappId && Boolean(errors.whatsappId)}
                        value={selectedWhatsapps}
                        onChange={(event) =>
                          setSelectedWhatsapps(event.target.value)
                        }
                      >
                        {whatsapps &&
                          whatsapps.map((whatsapp) => (
                            <MenuItem key={whatsapp.id} value={whatsapp.id}>
                              {whatsapp.name}
                            </MenuItem>
                          ))}
                      </Field>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={12} xl={3}>
                    <FormControl
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.formControl}
                    >
                      <InputLabel id="openTicket-selection-label">
                        {i18n.t("campaigns.dialog.form.openTicket")}
                      </InputLabel>
                      <Field
                        as={Select}
                        label={i18n.t("campaigns.dialog.form.openTicket")}
                        placeholder={i18n.t("campaigns.dialog.form.openTicket")}
                        labelId="openTicket-selection-label"
                        id="openTicket"
                        name="openTicket"
                        error={touched.openTicket && Boolean(errors.openTicket)}
                      >
                        <MenuItem value={"enabled"}>
                          {i18n.t("campaigns.dialog.form.enabledOpenTicket")}
                        </MenuItem>
                        <MenuItem value={"disabled"}>
                          {i18n.t("campaigns.dialog.form.disabledOpenTicket")}
                        </MenuItem>
                      </Field>
                    </FormControl>
                  </Grid>
                </Grid>
                <Grid spacing={1} container>
                  <Grid item xs={12} md={6} xl={4}>
                    <Autocomplete
                      style={{ marginTop: "8px" }}
                      variant="outlined"
                      margin="dense"
                      className={classes.formControl}
                      getOptionLabel={(option) => `${option.name}`}
                      value={isAdmin ? selectedUser : user}
                      size="small"
                      onChange={(e, newValue) => {
                        if (isAdmin) {
                          setSelectedUser(newValue);
                          if (newValue != null && Array.isArray(newValue.queues)) {
                            if (newValue.queues.length === 1) {
                              setSelectedQueue(newValue.queues[0].id);
                            }
                            setQueues(newValue.queues);
                          } else {
                            setQueues(allQueues);
                            setSelectedQueue("");
                          }
                        }
                      }}
                      options={isAdmin ? options : [user]}
                      filterOptions={filterOptions}
                      freeSolo={isAdmin}
                      fullWidth
                      disabled={values.openTicket === "disabled" || !isAdmin}
                      autoHighlight
                      noOptionsText={i18n.t("transferTicketModal.noOptions")}
                      loading={loading}
                      renderOption={(option) => (
                        <span>
                          {" "}
                          <UserStatusIcon user={option} /> {option.name}
                        </span>
                      )}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={i18n.t("transferTicketModal.fieldLabel")}
                          variant="outlined"
                          onChange={isAdmin ? (e) => setSearchParam(e.target.value) : undefined} // Só busca se for admin
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
                            readOnly: !isAdmin, // Modo somente leitura se não for admin
                          }}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6} xl={6}>
                    <FormControl
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.formControl}
                    >
                      <InputLabel>
                        {i18n.t("transferTicketModal.fieldQueueLabel")}
                      </InputLabel>
                      <Select
                        value={selectedQueue}
                        onChange={(e) => setSelectedQueue(e.target.value)}
                        label={i18n.t(
                          "transferTicketModal.fieldQueuePlaceholder"
                        )}
                        disabled={values.openTicket === "disabled"}
                      >
                        {queues.map((queue) => (
                          <MenuItem key={queue.id} value={queue.id}>
                            {queue.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Grid spacing={1} container style={{ marginTop: "-10px" }}>
                  <Grid item xs={12} md={6} xl={6}>
                    <FormControl
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      className={classes.formControl}
                    >
                      <InputLabel id="statusTicket-selection-label">
                        {i18n.t("campaigns.dialog.form.statusTicket")}
                      </InputLabel>
                      <Field
                        as={Select}
                        disabled={values.openTicket === "disabled"}
                        label={i18n.t("campaigns.dialog.form.statusTicket")}
                        placeholder={i18n.t(
                          "campaigns.dialog.form.statusTicket"
                        )}
                        labelId="statusTicket-selection-label"
                        id="statusTicket"
                        name="statusTicket"
                        error={
                          touched.statusTicket && Boolean(errors.statusTicket)
                        }
                      >
                        <MenuItem value={"closed"}>
                          {i18n.t("campaigns.dialog.form.closedTicketStatus")}
                        </MenuItem>
                        <MenuItem value={"open"}>
                          {i18n.t("campaigns.dialog.form.openTicketStatus")}
                        </MenuItem>
                      </Field>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={6} xl={6}>
                    <FormControlLabel
                      control={
                        <Field
                          as={Switch}
                          color="primary"
                          name="assinar"
                          checked={values.assinar}
                          disabled={values.openTicket === "disabled"}
                        />
                      }
                      label={i18n.t("scheduleModal.form.assinar")}
                    />
                  </Grid>
                </Grid>
                <br />
                <Grid container spacing={1}>
                  {/* Seção de Lembrete */}
                  <h3>Lembrete (Opcional)</h3>
                  <p>Defina uma data de lembrete. A mensagem será enviada no horário do lembrete em vez do horário original do agendamento</p>
                  <br />
                  <Grid container spacing={1}>
                    <Grid item xs={12} md={6} xl={6}>
                      <Field
                        as={TextField}
                        label="Data do Lembrete"
                        type="datetime-local"
                        name="reminderDate"
                        error={touched.reminderDate && Boolean(errors.reminderDate)}
                        helperText={touched.reminderDate && errors.reminderDate}
                        variant="outlined"
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6} xl={6}>
                      <Typography variant="body2" color="textSecondary" style={{ padding: '16px', backgroundColor: 'rgba(128,128,128,0.08)', borderRadius: '4px', marginTop: '8px' }}>
                        A mensagem do lembrete será a mesma da mensagem agendada.
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <br />

                <h3>{i18n.t("recurrenceSection.title")}</h3>
                <p>{i18n.t("recurrenceSection.description")}</p>
                <br />
                <Grid container spacing={1}>
                  <Grid item xs={12} md={4} xl={4}>
                    <FormControl size="small" fullWidth variant="outlined">
                      <InputLabel id="demo-simple-select-label">
                        {i18n.t("recurrenceSection.labelInterval")}
                      </InputLabel>
                      <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={intervalo}
                        onChange={(e) => setIntervalo(e.target.value || 1)}
                        label={i18n.t("recurrenceSection.labelInterval")}
                      >
                        <MenuItem value={1}>
                          {i18n.t("recurrenceSection.options.days")}
                        </MenuItem>
                        <MenuItem value={2}>
                          {i18n.t("recurrenceSection.options.weeks")}
                        </MenuItem>
                        <MenuItem value={3}>
                          {i18n.t("recurrenceSection.options.months")}
                        </MenuItem>
                        <MenuItem value={4}>
                          {i18n.t("recurrenceSection.options.minutes")}
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4} xl={4}>
                    <Field
                      as={TextField}
                      label={i18n.t("recurrenceSection.intervalFilterValue")}
                      name="valorIntervalo"
                      size="small"
                      error={
                        touched.valorIntervalo && Boolean(errors.valorIntervalo)
                      }
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4} xl={4}>
                    <Field
                      as={TextField}
                      label={i18n.t("recurrenceSection.sendAsManyTimes")}
                      name="enviarQuantasVezes"
                      size="small"
                      error={
                        touched.enviarQuantasVezes &&
                        Boolean(errors.enviarQuantasVezes)
                      }
                      variant="outlined"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={12} xl={12}>
                    <FormControl size="small" fullWidth variant="outlined">
                      <InputLabel id="demo-simple-select-label">
                        {i18n.t("recurrenceSection.sendAsManyTimes")}
                      </InputLabel>
                      <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={tipoDias}
                        onChange={(e) => setTipoDias(e.target.value || 4)}
                        label="Enviar quantas vezes"
                      >
                        <MenuItem value={4}>
                          {i18n.t(
                            "recurrenceSection.shipNormallyOnNonbusinessDays"
                          )}
                        </MenuItem>
                        <MenuItem value={5}>
                          {i18n.t("recurrenceSection.sendOneBusinessDayBefore")}
                        </MenuItem>
                        <MenuItem value={6}>
                          {" "}
                          {i18n.t("recurrenceSection.sendOneBusinessDayLater")}
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                {(schedule.mediaPath || attachment || quickMessageMedia) && (
                  <Grid xs={12} item>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button startIcon={<AttachFile />}>
                        {attachment ? attachment.name :
                          quickMessageMedia ? quickMessageMedia.name :
                            schedule.mediaName}
                      </Button>
                      {quickMessageMedia && (
                        <Chip
                          label="Da Resposta Rápida"
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                      <IconButton
                        onClick={() => setConfirmationOpen(true)}
                        color="secondary"
                      >
                        <DeleteOutline color="secondary" />
                      </IconButton>
                    </div>
                  </Grid>
                )}
              </DialogContent>
              <DialogActions>
                {!attachment && !schedule.mediaPath && !quickMessageMedia && (
                  <Button
                    color="primary"
                    onClick={() => attachmentFile.current.click()}
                    disabled={isSubmitting}
                    variant="outlined"
                  >
                    {i18n.t("quickMessages.buttons.attach")}
                  </Button>
                )}
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("scheduleModal.buttons.cancel")}
                </Button>
                {(schedule.sentAt === null || schedule.sentAt === "") && (
                  <Button
                    type="submit"
                    color="primary"
                    disabled={isSubmitting}
                    variant="contained"
                    className={classes.btnWrapper}
                  >
                    {scheduleId
                      ? `${i18n.t("scheduleModal.buttons.okEdit")}`
                      : `${i18n.t("scheduleModal.buttons.okAdd")}`}
                    {isSubmitting && (
                      <CircularProgress
                        size={24}
                        className={classes.buttonProgress}
                      />
                    )}
                  </Button>
                )}
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default ScheduleModal;
