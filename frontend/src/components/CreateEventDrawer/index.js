/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  CircularProgress
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import {
  Close as CloseIcon,
  PersonOutline as PersonIcon,
  EventOutlined as EventIcon,
  DescriptionOutlined as DescIcon,
  RoomOutlined as LocationIcon,
  PhoneOutlined as PhoneIcon,
  LinkOutlined as LinkIcon,
  AddOutlined as AddIcon
} from '@material-ui/icons';
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import activitiesService from "../../services/activitiesService";
import api from "../../services/api";
import DeadlineRangeFields from "../DeadlineRangeFields";
import {
  toDateInputValue,
  toTimeInputValue,
  dateInputToStartISO,
  dateInputToEndISO,
  validateDeadlineRange,
  DEFAULT_START_TIME,
  DEFAULT_END_TIME,
} from "../../utils/deadlineDates";

const useStyles = makeStyles((theme) => ({
  drawerPaper: {
    width: 480,
    maxWidth: '100%',
    padding: 0,
    borderRadius: 12,
    height: 'calc(100% - 32px)',
    marginTop: 16,
    marginBottom: 16,
    marginRight: 16,
    overflow: 'hidden',
    backgroundColor: theme.palette.type === 'dark' ? '#1c1c1e' : '#ffffff',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    display: 'flex',
    flexDirection: 'column',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(3px)',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderBottom: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '24px 24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    '&::-webkit-scrollbar': {
      width: '5px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.08)',
      borderRadius: '3px',
    },
  },
  titleInput: {
    '& .MuiInputBase-root': {
      fontSize: 20,
      fontWeight: 500,
      padding: 0,
      letterSpacing: '-0.01em',
    },
    '& .MuiInput-underline:before': { border: 'none' },
    '& .MuiInput-underline:after': { border: 'none' },
    '& .MuiInput-underline:hover:before': { border: 'none' },
    '& .MuiInputBase-input::placeholder': {
      color: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
      opacity: 1,
    },
    marginBottom: 16,
  },
  descriptionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    padding: '8px 0',
  },
  descIcon: {
    color: theme.palette.text.secondary,
    fontSize: 18,
    opacity: 0.6,
  },
  descriptionInput: {
    '& .MuiInputBase-root': {
      fontSize: 13,
      padding: 0,
    },
    '& .MuiInput-underline:before': { border: 'none' },
    '& .MuiInput-underline:after': { border: 'none' },
    '& .MuiInput-underline:hover:before': { border: 'none' },
    '& .MuiInputBase-input::placeholder': {
      color: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)',
      opacity: 1,
    },
  },
  quickActions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  deadlineSection: {
    width: '100%',
    minWidth: 0,
    marginBottom: 24,
  },
  fieldsSection: {
    borderTop: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
    paddingTop: 16,
    marginTop: 8,
  },
  fieldsSectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    letterSpacing: '0.02em',
    marginBottom: 12,
  },
  fieldRow: {
    marginBottom: 8,
  },
  fieldInput: {
    '& .MuiOutlinedInput-root': {
      borderRadius: 6,
      fontSize: 12,
      minHeight: 0,
      height: 'auto',
      padding: '3px 8px !important',
    },
    '& .MuiOutlinedInput-input': {
      padding: '4px 4px !important',
      fontSize: 12,
    },
    '& .MuiInputLabel-outlined': {
      fontSize: 12,
      transform: 'translate(10px, 7px) scale(1)',
    },
    '& .MuiInputLabel-outlined.MuiInputLabel-shrunk': {
      transform: 'translate(14px, -6px) scale(0.75)',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
    },
  },
  colorSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: '2px solid transparent',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
    transition: 'all 0.15s',
  },
  colorDotSelected: {
    boxShadow: '0 0 0 2px rgba(0,0,0,0.08)',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
    backgroundColor: theme.palette.type === 'dark' ? '#1c1c1e' : '#ffffff',
  },
  submitBtn: {
    height: 34,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    textTransform: 'none',
    padding: '0 18px',
    backgroundColor: theme.palette.type === 'dark' ? '#1e3a5f' : '#1e40af',
    color: '#fff',
    boxShadow: 'none',
    '&:hover': {
      backgroundColor: '#6d28d9',
      boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
    },
    '&:disabled': {
      backgroundColor: '#a78bfa',
      color: 'rgba(255,255,255,0.7)',
    }
  },
  moreBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    border: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
    color: theme.palette.text.secondary,
    fontSize: 16,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#f9fafb',
    }
  },
}));

const eventColors = ["#D1FAE5", "#EDE9FE", "#FEF3C7", "#FEE2E2", "#DBEAFE", "#F3F4F6"];

const CreateEventDrawer = ({ open, onClose, onSave, initialDate, initialContactId, initialPhone }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === 'dark';
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [showFields, setShowFields] = useState(false);
  const [formValues, setFormValues] = useState({
    title: "",
    description: "",
    dateStart: "",
    dateEnd: "",
    timeStart: DEFAULT_START_TIME,
    timeEnd: DEFAULT_END_TIME,
    color: "#D1FAE5",
    responsible: "",
    responsibleId: null,
    location: "",
    address: "",
    phone: "",
    link: "",
    contactId: null
  });

  useEffect(() => {
    if (open) {
      (async () => {
        try {
          const { data } = await api.get("/users", { params: { searchParam: "" } });
          setUsers(data?.users || []);
        } catch (err) {
          // ignore
        }
      })();
      const base = initialDate || new Date();
      let timeStart = toTimeInputValue(base, "start");
      let timeEnd = DEFAULT_END_TIME;
      if (base.getHours() !== 0 || base.getMinutes() !== 0) {
        timeStart = `${String(base.getHours()).padStart(2, "0")}:${String(base.getMinutes()).padStart(2, "0")}`;
        const endSlot = new Date(base);
        endSlot.setHours(endSlot.getHours() + 1);
        timeEnd = `${String(endSlot.getHours()).padStart(2, "0")}:${String(endSlot.getMinutes()).padStart(2, "0")}`;
      }
      setFormValues((prev) => ({
        ...prev,
        title: "",
        description: "",
        dateStart: toDateInputValue(base),
        dateEnd: toDateInputValue(base),
        timeStart,
        timeEnd,
        color: "#D1FAE5",
        responsible: "",
        responsibleId: null,
        location: "",
        address: "",
        phone: initialPhone || "",
        link: "",
        contactId: initialContactId || null
      }));
      setShowFields(false);
    }
  }, [open, initialDate, initialContactId, initialPhone]);

  const handleChange = (field) => (event) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSelectColor = (color) => {
    setFormValues((prev) => ({
      ...prev,
      color
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const deadlineErr = validateDeadlineRange(
      formValues.dateStart,
      formValues.dateEnd,
      formValues.timeStart,
      formValues.timeEnd
    );
    if (!formValues.title || deadlineErr) {
      toast.error(deadlineErr || "Preencha o título do evento.");
      return;
    }
    try {
      setLoading(true);
      const payload = {
        title: formValues.title.trim(),
        description: formValues.description,
        type: "event",
        date: dateInputToStartISO(formValues.dateStart, formValues.timeStart),
        dateEnd: dateInputToEndISO(formValues.dateEnd, formValues.timeEnd),
        status: "pending",
        owner: formValues.responsible,
        userId: formValues.responsibleId || undefined,
        location: formValues.location,
        address: formValues.address,
        phone: formValues.phone,
        link: formValues.link,
        eventColor: formValues.color,
        contactId: formValues.contactId || undefined
      };
      const saved = await activitiesService.create(payload);
      toast.success("Evento criado com sucesso.");
      if (onSave) onSave(saved);
      onClose();
    } catch (err) {
      if (!err?.response?.status || err.response.status >= 500) {
        toast.error(
          "Não foi possível salvar o evento. Verifique se o servidor está atualizado e as migrações do banco foram executadas."
        );
      } else {
        toastError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ className: classes.drawerPaper }}
      BackdropProps={{ className: classes.backdrop }}
      ModalProps={{ keepMounted: true }}
    >
      {/* Top Bar */}
      <Box className={classes.topBar}>
        <Typography style={{ fontSize: 15, fontWeight: 600 }}>Novo Evento</Typography>
        <IconButton onClick={onClose} size="small" style={{ width: 28, height: 28 }}>
          <CloseIcon style={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Main Content */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <Box className={classes.mainContent}>
          {/* Title */}
          <TextField
            className={classes.titleInput}
            placeholder="Nome do Evento"
            value={formValues.title}
            onChange={handleChange("title")}
            fullWidth
            InputProps={{ disableUnderline: true }}
          />

          {/* Description */}
          <Box className={classes.descriptionRow}>
            <DescIcon className={classes.descIcon} />
            <TextField
              className={classes.descriptionInput}
              placeholder="Adicionar descrição"
              value={formValues.description}
              onChange={handleChange("description")}
              fullWidth
              multiline
              InputProps={{ disableUnderline: true }}
            />
          </Box>

          {/* Quick Action Buttons */}
          <Box className={classes.quickActions}>
            <Autocomplete
              options={users}
              getOptionLabel={(opt) => opt?.name || ""}
              value={users.find((u) => String(u.id) === String(formValues.responsibleId)) || null}
              onChange={(_, v) => {
                setFormValues((prev) => ({
                  ...prev,
                  responsibleId: v ? v.id : null,
                  responsible: v ? v.name : ""
                }));
              }}
              noOptionsText="Nenhum usuário"
              style={{ minWidth: 140, flex: 1 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Responsável"
                  InputProps={{
                    ...params.InputProps,
                    disableUnderline: true,
                    startAdornment: (
                      <>
                        <PersonIcon style={{ fontSize: 15, marginRight: 4, opacity: 0.5 }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                    style: { fontSize: 12, height: 30, padding: '0 8px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 6 }
                  }}
                />
              )}
            />
            <Box className={classes.moreBtn} onClick={() => setShowFields(!showFields)}>
              ···
            </Box>
          </Box>

          <Box className={classes.deadlineSection}>
            <DeadlineRangeFields
              compact
              showTime
              isDark={isDark}
              dateStart={formValues.dateStart}
              dateEnd={formValues.dateEnd}
              timeStart={formValues.timeStart}
              timeEnd={formValues.timeEnd}
              onChangeStart={(v) => setFormValues((prev) => ({ ...prev, dateStart: v }))}
              onChangeEnd={(v) => setFormValues((prev) => ({ ...prev, dateEnd: v }))}
              onChangeTimeStart={(v) => setFormValues((prev) => ({ ...prev, timeStart: v }))}
              onChangeTimeEnd={(v) => setFormValues((prev) => ({ ...prev, timeEnd: v }))}
            />
          </Box>

          {/* Color Section */}
          <Box className={classes.colorSection}>
            <Typography style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#9ca3af' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4 }}>
              Cor
            </Typography>
            {eventColors.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                onClick={() => handleSelectColor(c)}
                className={classes.colorDot + (formValues.color === c ? ` ${classes.colorDotSelected}` : "")}
                style={{
                  backgroundColor: c,
                  borderColor: formValues.color === c ? "#111" : "transparent"
                }}
              />
            ))}
          </Box>

          {/* Fields Section */}
          <Box className={classes.fieldsSection}>
            <Typography className={classes.fieldsSectionTitle}>
              Campos
            </Typography>

            <Box className={classes.fieldRow}>
              <TextField
                className={classes.fieldInput}
                label="Local"
                value={formValues.location}
                onChange={handleChange("location")}
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Ex.: Sala de Reuniões A"
              />
            </Box>

            {showFields && (
              <>
                <Box className={classes.fieldRow}>
                  <TextField
                    className={classes.fieldInput}
                    label="Endereço"
                    value={formValues.address}
                    onChange={handleChange("address")}
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Rua, número, cidade"
                  />
                </Box>
                <Box className={classes.fieldRow}>
                  <TextField
                    className={classes.fieldInput}
                    label="Telefone"
                    value={formValues.phone}
                    onChange={handleChange("phone")}
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="(xx) xxxxx-xxxx"
                  />
                </Box>
                <Box className={classes.fieldRow}>
                  <TextField
                    className={classes.fieldInput}
                    label="Link"
                    value={formValues.link}
                    onChange={handleChange("link")}
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Link da reunião (se houver)"
                  />
                </Box>
              </>
            )}

            <Button
              size="small"
              startIcon={<AddIcon style={{ fontSize: 16 }} />}
              onClick={() => setShowFields(!showFields)}
              style={{
                textTransform: 'none',
                fontSize: 12,
                color: theme.palette.text.secondary,
                fontWeight: 500,
                padding: '4px 8px',
                borderRadius: 6,
                marginTop: 4,
              }}
            >
              {showFields ? 'Menos campos' : 'Mais campos'}
            </Button>
          </Box>
        </Box>

        {/* Footer */}
        <Box className={classes.footer}>
          <Button onClick={onClose} disabled={loading} style={{ textTransform: 'none', fontSize: 13 }}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className={classes.submitBtn}
            disabled={loading}
            variant="contained"
          >
            {loading ? <CircularProgress size={18} style={{ color: '#fff' }} /> : "Salvar evento"}
          </Button>
        </Box>
      </form>
    </Drawer>
  );
};

export default CreateEventDrawer;
