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
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Popover,
  ClickAwayListener
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import {
  Close as CloseIcon,
  PersonOutline as PersonIcon,
  EventOutlined as EventIcon,
  FlagOutlined as FlagIcon,
  LabelOutlined as LabelIcon,
  AttachFile as AttachIcon,
  NotificationsNoneOutlined as BellIcon,
  DescriptionOutlined as DescIcon,
  AddOutlined as AddIcon,
  Check as CheckIcon
} from '@material-ui/icons';
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import activitiesService from "../../services/activitiesService";
import useProjects from "../../hooks/useProjects";
import useUsers from "../../hooks/useUsers";
import convertedLeadsService from "../../services/convertedLeadsService";
import DeadlineRangeFields from "../DeadlineRangeFields";
import {
  toDateInputValue,
  dateInputToStartISO,
  dateInputToEndISO,
  validateDeadlineRange,
} from "../../utils/deadlineDates";
import api from "../../services/api";

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
  topBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  projectChip: {
    height: 28,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f5f7',
    color: theme.palette.text.primary,
    border: 'none',
    '& .MuiChip-label': {
      padding: '0 10px',
    }
  },
  typeChip: {
    height: 28,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#f4f5f7',
    color: theme.palette.text.secondary,
    border: 'none',
    '& .MuiChip-label': {
      padding: '0 10px',
    }
  },
  mainContent: {
    flex: 1,
    overflowY: 'auto',
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
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: 16,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    '&:hover': { opacity: 0.8 },
  },
  quickActions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  actionBtn: {
    height: 30,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'none',
    padding: '0 12px',
    border: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb',
    color: theme.palette.text.secondary,
    backgroundColor: 'transparent',
    '&:hover': {
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#f9fafb',
      borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.15)' : '#d1d5db',
    },
    '& .MuiButton-startIcon': {
      marginRight: 6,
    }
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
    '& .MuiAutocomplete-inputRoot[class*="MuiOutlinedInput-root"]': {
      padding: '3px 8px !important',
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
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
    backgroundColor: theme.palette.type === 'dark' ? '#1c1c1e' : '#ffffff',
  },
  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  footerIconBtn: {
    width: 32,
    height: 32,
    color: theme.palette.text.secondary,
    opacity: 0.6,
    '&:hover': { opacity: 1, backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.05)' : '#f3f4f6' },
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
  expandedField: {
    marginBottom: 14,
  },
  attachmentArea: {
    marginTop: 8,
  },
  attachmentChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    borderRadius: 6,
    border: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e5e7eb',
    background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.03)' : '#f9fafb',
    marginRight: 6,
    marginBottom: 6,
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
  }
}));

const statusOptions = [
  { value: 'pending', label: 'PENDENTE', color: '#6b7280', bg: '#f3f4f6', darkBg: 'rgba(107,114,128,0.15)' },
  { value: 'in_progress', label: 'EM PROGRESSO', color: '#f59e0b', bg: '#fef3c7', darkBg: 'rgba(245,158,11,0.15)' },
  { value: 'done', label: 'CONCLUÍDA', color: '#10b981', bg: '#d1fae5', darkBg: 'rgba(16,185,129,0.15)' },
];

const priorityOptions = [
  { value: 'none', label: 'Sem prioridade', color: '#9ca3af', bg: '#f3f4f6', darkBg: 'rgba(156,163,175,0.12)' },
  { value: 'low', label: 'Baixa', color: '#3b82f6', bg: '#dbeafe', darkBg: 'rgba(59,130,246,0.15)' },
  { value: 'medium', label: 'Média', color: '#f59e0b', bg: '#fef3c7', darkBg: 'rgba(245,158,11,0.15)' },
  { value: 'high', label: 'Alta', color: '#ef4444', bg: '#fee2e2', darkBg: 'rgba(239,68,68,0.15)' },
  { value: 'urgent', label: 'Urgente', color: '#dc2626', bg: '#fecaca', darkBg: 'rgba(220,38,38,0.2)' },
];

const tagColorPresets = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#6b7280','#0ea5e9','#14b8a6','#f97316'];

const typeLabels = {
  task: 'Tarefa',
  call: 'Ligação',
  email: 'E-mail',
  meeting: 'Reunião',
};

const CreateActivityModal = ({ open, onClose, onSave, activity }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === 'dark';
  const [loading, setLoading] = useState(false);
  const { projects } = useProjects({ searchParam: "", pageNumber: 1 });
  const { users } = useUsers();
  const [companiesConverted, setCompaniesConverted] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [showFields, setShowFields] = useState(false);

  const activeUsers = Array.isArray(users) ? users.filter(u => {
    if (typeof u.isActive === "boolean") return u.isActive;
    if (typeof u.active === "boolean") return u.active;
    if (typeof u.disabled === "boolean") return !u.disabled;
    if (typeof u.status === "string") return ["active", "enabled"].includes(u.status.toLowerCase());
    return true;
  }) : [];
  
  const [formValues, setFormValues] = useState({
    title: "",
    description: "",
    type: "task",
    dateStart: "",
    dateEnd: "",
    status: "pending",
    priority: "none",
    responsible: "",
    companyId: "",
    projectId: "",
    sector: "",
    contactId: "",
    tags: []
  });
  const [priorityAnchor, setPriorityAnchor] = useState(null);
  const [tagPopoverAnchor, setTagPopoverAnchor] = useState(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(tagColorPresets[0]);

  useEffect(() => {
    if (open) {
      if (activity) {
        setFormValues({
          title: activity.title || "",
          description: activity.description || "",
          type: activity.type || "task",
          dateStart: toDateInputValue(activity.date),
          dateEnd: toDateInputValue(activity.dateEnd || activity.date),
          status: activity.status || "pending",
          priority: activity.priority || "none",
          responsible: activity.userId || "",
          companyId: activity.companyId || "",
          projectId: activity.projectId || "",
          sector: activity.sector || "",
          contactId: activity.contactId || "",
          tags: Array.isArray(activity.tags) ? activity.tags : []
        });
      } else {
        setFormValues({
          title: "",
          description: "",
          type: "task",
          dateStart: new Date().toISOString().split("T")[0],
          dateEnd: new Date().toISOString().split("T")[0],
          status: "pending",
          priority: "none",
          responsible: "",
          companyId: "",
          projectId: "",
          sector: "",
          contactId: "",
          tags: []
        });
      }
      setAttachments([]);
      setShowFields(false);
    }
  }, [open, activity]);

  const handleChange = (field) => (event) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const titleTrim = String(formValues.title || "").trim();
    const deadlineErr = validateDeadlineRange(formValues.dateStart, formValues.dateEnd);
    if (!titleTrim || deadlineErr) {
      toast.error(deadlineErr || "Preencha o título da atividade.");
      return;
    }
    if (titleTrim.length < 3) {
      toast.error("O título deve ter pelo menos 3 caracteres.");
      return;
    }

    try {
      setLoading(true);
      const selectedUser = Array.isArray(activeUsers) ? activeUsers.find(u => String(u.id) === String(formValues.responsible)) : null;
      const selectedCompany = Array.isArray(companiesConverted)
        ? companiesConverted.find(c => String(c.id) === String(formValues.companyId))
        : null;
      const projectIdValue = formValues.projectId === "" || formValues.projectId == null
        ? null
        : Number(formValues.projectId);
      const contactIdValue =
        formValues.contactId != null && formValues.contactId !== ""
          ? Number(formValues.contactId)
          : (activity?.contactId != null && activity.contactId !== ""
            ? Number(activity.contactId)
            : undefined);
      const leadIdValue =
        activity?.leadId != null && activity.leadId !== ""
          ? Number(activity.leadId)
          : undefined;
      const payloadBase = {
        title: titleTrim,
        description: formValues.description || undefined,
        type: formValues.type || "task",
        status: formValues.status || "pending",
        priority: formValues.priority !== "none" ? formValues.priority : undefined,
        tags: formValues.tags?.length > 0 ? formValues.tags : undefined,
        date: dateInputToStartISO(formValues.dateStart),
        dateEnd: dateInputToEndISO(formValues.dateEnd),
        owner: selectedUser ? (selectedUser.name || selectedUser.fullName || selectedUser.email || `Usuário ${selectedUser.id}`) : (formValues.owner || undefined),
        userId: selectedUser ? selectedUser.id : undefined,
        projectId: projectIdValue,
        contactId: contactIdValue,
        leadId: leadIdValue
      };
      const payload = Object.fromEntries(
        Object.entries(payloadBase).filter(([_, v]) => v !== undefined && v !== "")
      );
      if (payloadBase.projectId !== undefined) {
        payload.projectId = payloadBase.projectId;
      }
      let savedActivity;
      if (activity && activity.id) {
        savedActivity = await activitiesService.update(activity.id, payload);
        toast.success("Atividade atualizada com sucesso.");
      } else {
        savedActivity = await activitiesService.create(payload);
        toast.success("Atividade criada com sucesso.");
      }
      
      if (selectedCompany) {
        savedActivity = {
          ...savedActivity,
          companyId: selectedCompany.id,
          company: { id: selectedCompany.id, name: selectedCompany.name }
        };
      }
      
      if (onSave) onSave(savedActivity);
      onClose();
    } catch (err) {
      const status = err?.response?.status;
      const isServerOrNetwork =
        !status || status >= 500 || err?.message === "Network Error";
      if (isServerOrNetwork) {
        toast.error("Erro ao salvar atividade. Tente novamente.");
      } else {
        toastError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadConverted = async () => {
      try {
        const data = await convertedLeadsService.list({ pageNumber: 1 });
        if (!mounted) return;
        setCompaniesConverted(Array.isArray(data?.leads) ? data.leads : []);
      } catch (err) {}
    };
    loadConverted();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/contacts/list");
        if (mounted) setContacts(data || []);
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const currentStatus = statusOptions.find(s => s.value === formValues.status) || statusOptions[0];
  const selectedProject = (projects || []).find(p => String(p.id) === String(formValues.projectId));
  const selectedUser = activeUsers.find(u => String(u.id) === String(formValues.responsible));

  const cycleStatus = () => {
    const idx = statusOptions.findIndex(s => s.value === formValues.status);
    const next = statusOptions[(idx + 1) % statusOptions.length];
    setFormValues(prev => ({ ...prev, status: next.value }));
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
        <Box className={classes.topBarLeft}>
          <FormControl size="small" variant="standard" style={{ minWidth: 100 }}>
            <Select
              value={formValues.projectId || ""}
              onChange={handleChange("projectId")}
              disableUnderline
              displayEmpty
              style={{ fontSize: 12, fontWeight: 500 }}
              renderValue={(val) => {
                if (!val) return <span style={{ opacity: 0.6 }}>Projeto</span>;
                const p = (projects || []).find(pr => String(pr.id) === String(val));
                return p ? (p.name || p.title) : 'Projeto';
              }}
            >
              <MenuItem value=""><em>Nenhum</em></MenuItem>
              {(projects || []).map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name || p.title || `Projeto ${p.id}`}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography style={{ opacity: 0.25, fontSize: 14 }}>·</Typography>
          <FormControl size="small" variant="standard" style={{ minWidth: 80 }}>
            <Select
              value={formValues.type}
              onChange={handleChange("type")}
              disableUnderline
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              <MenuItem value="task">Tarefa</MenuItem>
              <MenuItem value="call">Ligação</MenuItem>
              <MenuItem value="email">E-mail</MenuItem>
              <MenuItem value="meeting">Reunião</MenuItem>
            </Select>
          </FormControl>
        </Box>
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
            placeholder="Nome da Atividade"
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

          {/* Status Badge */}
          <Box
            className={classes.statusBadge}
            style={{
              backgroundColor: isDark ? currentStatus.darkBg : currentStatus.bg,
              color: currentStatus.color,
            }}
            onClick={cycleStatus}
          >
            <span style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              backgroundColor: currentStatus.color,
              display: 'inline-block'
            }} />
            {currentStatus.label}
          </Box>

          {/* Quick Action Buttons */}
          <Box className={classes.quickActions}>
            <Autocomplete
              options={activeUsers}
              getOptionLabel={(option) => option?.name || option?.fullName || option?.email || String(option?.id)}
              value={activeUsers.find(u => String(u.id) === String(formValues.responsible)) || null}
              onChange={(_, value) => setFormValues(prev => ({ ...prev, responsible: value ? value.id : "" }))}
              noOptionsText="Nenhum usuário"
              style={{ minWidth: 140 }}
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
            <DeadlineRangeFields
              compact
              isDark={isDark}
              dateStart={formValues.dateStart}
              dateEnd={formValues.dateEnd}
              onChangeStart={(v) => setFormValues((prev) => ({ ...prev, dateStart: v }))}
              onChangeEnd={(v) => setFormValues((prev) => ({ ...prev, dateEnd: v }))}
            />
            {/* Priority */}
            <Button
              className={classes.actionBtn}
              startIcon={<FlagIcon style={{ fontSize: 15, color: (priorityOptions.find(p => p.value === formValues.priority) || priorityOptions[0]).color }} />}
              size="small"
              onClick={(e) => setPriorityAnchor(e.currentTarget)}
              style={formValues.priority !== 'none' ? {
                borderColor: (priorityOptions.find(p => p.value === formValues.priority) || priorityOptions[0]).color + '40',
                color: (priorityOptions.find(p => p.value === formValues.priority) || priorityOptions[0]).color,
              } : {}}
            >
              {(priorityOptions.find(p => p.value === formValues.priority) || priorityOptions[0]).label}
            </Button>
            <Popover
              open={Boolean(priorityAnchor)}
              anchorEl={priorityAnchor}
              onClose={() => setPriorityAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{ style: { borderRadius: 8, padding: 4, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' } }}
            >
              {priorityOptions.map((p) => (
                <Box
                  key={p.value}
                  onClick={() => { setFormValues(prev => ({ ...prev, priority: p.value })); setPriorityAnchor(null); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 12px', borderRadius: 6, cursor: 'pointer',
                    backgroundColor: formValues.priority === p.value ? (isDark ? p.darkBg : p.bg) : 'transparent',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => { if (formValues.priority !== p.value) e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb'; }}
                  onMouseLeave={(e) => { if (formValues.priority !== p.value) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <FlagIcon style={{ fontSize: 14, color: p.color }} />
                  <Typography style={{ fontSize: 12, fontWeight: 500, color: p.color, flex: 1 }}>{p.label}</Typography>
                  {formValues.priority === p.value && <CheckIcon style={{ fontSize: 14, color: p.color }} />}
                </Box>
              ))}
            </Popover>

            {/* Tags */}
            <Button
              className={classes.actionBtn}
              startIcon={<LabelIcon style={{ fontSize: 15 }} />}
              size="small"
              onClick={(e) => setTagPopoverAnchor(e.currentTarget)}
            >
              Etiquetas{formValues.tags?.length > 0 ? ` (${formValues.tags.length})` : ''}
            </Button>
            <Popover
              open={Boolean(tagPopoverAnchor)}
              anchorEl={tagPopoverAnchor}
              onClose={() => setTagPopoverAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              PaperProps={{ style: { borderRadius: 8, padding: 12, width: 240, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' } }}
            >
              <Typography style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: isDark ? '#9ca3af' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Nova etiqueta
              </Typography>
              <TextField
                placeholder="Nome da etiqueta"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                fullWidth
                size="small"
                variant="outlined"
                InputProps={{ style: { fontSize: 12, borderRadius: 6, height: 32 } }}
                style={{ marginBottom: 8 }}
              />
              <Box style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                {tagColorPresets.map((c) => (
                  <Box
                    key={c}
                    onClick={() => setNewTagColor(c)}
                    style={{
                      width: 20, height: 20, borderRadius: 4, backgroundColor: c, cursor: 'pointer',
                      border: newTagColor === c ? '2px solid #fff' : '2px solid transparent',
                      boxShadow: newTagColor === c ? `0 0 0 1px ${c}` : 'none',
                      transition: 'all 0.1s',
                    }}
                  />
                ))}
              </Box>
              <Button
                size="small"
                variant="contained"
                fullWidth
                disabled={!newTagName.trim()}
                onClick={() => {
                  if (!newTagName.trim()) return;
                  setFormValues(prev => ({
                    ...prev,
                    tags: [...(prev.tags || []), { name: newTagName.trim(), color: newTagColor }]
                  }));
                  setNewTagName("");
                  setNewTagColor(tagColorPresets[0]);
                }}
                style={{ fontSize: 11, textTransform: 'none', borderRadius: 6, height: 30, boxShadow: 'none',
                  backgroundColor: isDark ? '#374151' : '#1f2937', color: '#fff' }}
              >
                Adicionar
              </Button>
              {formValues.tags?.length > 0 && (
                <Box style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {formValues.tags.map((tag, i) => (
                    <Box key={i} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                      backgroundColor: tag.color + '20', color: tag.color, cursor: 'pointer',
                    }}
                      onClick={() => setFormValues(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: tag.color }} />
                      {tag.name}
                      <CloseIcon style={{ fontSize: 10, opacity: 0.6 }} />
                    </Box>
                  ))}
                </Box>
              )}
            </Popover>
            <Box className={classes.moreBtn} onClick={() => setShowFields(!showFields)}>
              ···
            </Box>
          </Box>

          {/* Tags display */}
          {formValues.tags?.length > 0 && (
            <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
              {formValues.tags.map((tag, i) => (
                <Box key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                  backgroundColor: tag.color + '18', color: tag.color,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, backgroundColor: tag.color }} />
                  {tag.name}
                </Box>
              ))}
            </Box>
          )}

          {/* Fields Section */}
          <Box className={classes.fieldsSection}>
            <Typography className={classes.fieldsSectionTitle}>
              Campos
            </Typography>

            <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <Autocomplete
                options={companiesConverted}
                getOptionLabel={(option) => option?.name || String(option?.id)}
                value={companiesConverted.find(c => String(c.id) === String(formValues.companyId)) || null}
                onChange={(_, value) => setFormValues(prev => ({ ...prev, companyId: value ? value.id : "" }))}
                noOptionsText="Nenhuma empresa"
                style={{ minWidth: 140, maxWidth: 200 }}
                size="small"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Empresa"
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      style: { fontSize: 12, height: 30, padding: '0 8px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 6 }
                    }}
                  />
                )}
              />
              <Autocomplete
                options={contacts}
                getOptionLabel={(option) => option?.name || String(option?.id)}
                value={contacts.find(c => String(c.id) === String(formValues.contactId)) || null}
                onChange={(_, value) => setFormValues(prev => ({ ...prev, contactId: value ? value.id : "" }))}
                noOptionsText="Nenhum contato"
                style={{ minWidth: 140, maxWidth: 200 }}
                size="small"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Contato"
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      style: { fontSize: 12, height: 30, padding: '0 8px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 6 }
                    }}
                  />
                )}
              />
            </Box>

            {showFields && (
              <>
                <Box className={classes.fieldRow}>
                  <TextField
                    className={classes.fieldInput}
                    label="Setor"
                    value={formValues.sector}
                    onChange={handleChange("sector")}
                    fullWidth
                    variant="outlined"
                    size="small"
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

          {/* Attachments */}
          <Box className={classes.attachmentArea}>
            <input
              id="activity-file-input"
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setAttachments(prev => [...prev, {
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      data: reader.result,
                      preview: file.type.startsWith('image/') ? reader.result : null
                    }]);
                  };
                  reader.readAsDataURL(file);
                });
                e.target.value = '';
              }}
            />
            {attachments.length > 0 && (
              <Box style={{ display: 'flex', flexWrap: 'wrap', marginTop: 12 }}>
                {attachments.map((att, idx) => (
                  <Box key={idx} className={classes.attachmentChip}>
                    {att.preview ? (
                      <img src={att.preview} alt={att.name} style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'cover' }} />
                    ) : (
                      <Box style={{ width: 20, height: 20, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600 }}>
                        {att.name.split('.').pop()?.toUpperCase()?.slice(0, 3) || 'F'}
                      </Box>
                    )}
                    <Typography variant="caption" style={{ fontSize: 11, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {att.name}
                    </Typography>
                    <IconButton size="small" onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} style={{ width: 16, height: 16 }}>
                      <CloseIcon style={{ fontSize: 11 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>

        {activity?.id ? (
          <Box px={2} pb={1}>
            
          </Box>
        ) : null}

        {/* Footer */}
        <Box className={classes.footer}>
          <Box className={classes.footerLeft}>
            <IconButton
              className={classes.footerIconBtn}
              size="small"
              onClick={() => document.getElementById("activity-file-input").click()}
            >
              <AttachIcon style={{ fontSize: 18 }} />
            </IconButton>
            <IconButton className={classes.footerIconBtn} size="small">
              <BellIcon style={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          <Button
            type="submit"
            className={classes.submitBtn}
            disabled={loading}
            variant="contained"
          >
            {loading ? <CircularProgress size={18} style={{ color: '#fff' }} /> : (activity ? "Salvar" : "Criar Tarefa")}
          </Button>
        </Box>
      </form>
    </Drawer>
  );
};

export default CreateActivityModal;
