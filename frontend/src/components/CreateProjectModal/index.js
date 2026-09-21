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
  Chip
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import {
  Close as CloseIcon,
  PersonOutline as PersonIcon,
  DescriptionOutlined as DescIcon,
  AttachFile as AttachIcon,
  AddOutlined as AddIcon,
  BusinessOutlined as CompanyIcon,
  AssignmentOutlined as ActivityIcon
} from '@material-ui/icons';
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import projectsService from "../../services/projectsService";
import useActivities from "../../hooks/useActivities";
import useUsers from "../../hooks/useUsers";
import convertedLeadsService from "../../services/convertedLeadsService";
import DeadlineRangeFields from "../DeadlineRangeFields";
import {
  toDateInputValue,
  dateInputToStartISO,
  dateInputToEndISO,
  validateDeadlineRange,
} from "../../utils/deadlineDates";
import useAppTranslation from "../../hooks/useAppTranslation";

const STATUS_META = [
  { value: 'active', key: 'active', color: '#10b981', bg: '#d1fae5', darkBg: 'rgba(16,185,129,0.15)' },
  { value: 'paused', key: 'paused', color: '#f59e0b', bg: '#fef3c7', darkBg: 'rgba(245,158,11,0.15)' },
  { value: 'completed', key: 'completed', color: '#6366f1', bg: '#e0e7ff', darkBg: 'rgba(99,102,241,0.15)' },
  { value: 'cancelled', key: 'cancelled', color: '#ef4444', bg: '#fee2e2', darkBg: 'rgba(239,68,68,0.15)' },
];

const useStyles = makeStyles((theme) => ({
  drawerPaper: {
    width: 480,
    maxWidth: '100%',
    padding: 0,
    borderRadius: '12px 0 0 12px',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: theme.palette.type === 'dark' ? '#1c1c1e' : '#ffffff',
    boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
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
    justifyContent: 'flex-end',
    padding: '12px 20px',
    borderTop: theme.palette.type === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
    backgroundColor: 'transparent',
    gap: 8,
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
}));

const CreateProjectModal = ({ open, onClose, onSave, project }) => {
  const { t } = useAppTranslation();
  const classes = useStyles();
  const theme = useTheme();
  const statusOptions = STATUS_META.map((item) => ({
    ...item,
    label: t(`modules.projects.status.${item.key}`),
  }));
  const isDark = theme.palette.type === 'dark';
  const [loading, setLoading] = useState(false);
  const { activities } = useActivities({ searchParam: "", pageNumber: 1 });
  const { users } = useUsers();
  const [companiesConverted, setCompaniesConverted] = useState([]);
  const [showFields, setShowFields] = useState(false);

  const activeUsers = Array.isArray(users) ? users.filter(u => {
    if (typeof u.isActive === "boolean") return u.isActive;
    if (typeof u.active === "boolean") return u.active;
    if (typeof u.disabled === "boolean") return !u.disabled;
    if (typeof u.status === "string") return ["active", "enabled"].includes(u.status.toLowerCase());
    return true;
  }) : [];
  
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    status: "active",
    companyId: "",
    responsible: "",
    activityIds: [],
    dateStart: "",
    dateEnd: "",
  });

  useEffect(() => {
    if (open) {
      if (project) {
        setFormValues({
          name: project.name || "",
          description: project.description || "",
          status: project.status || "active",
          companyId: project.companyId || "",
          responsible: (project.userId || (project.user && project.user.id)) || "",
          activityIds: project.activities ? project.activities.map(a => a.id) : [],
          dateStart: toDateInputValue(project.date),
          dateEnd: toDateInputValue(project.dateEnd || project.date),
        });
      } else {
        setFormValues({
          name: "",
          description: "",
          status: "active",
          companyId: "",
          responsible: "",
          activityIds: [],
          dateStart: "",
          dateEnd: "",
        });
      }
      setShowFields(false);
    }
  }, [open, project]);

  useEffect(() => {
    let mounted = true;
    const loadConverted = async () => {
      try {
        const data = await convertedLeadsService.list({ pageNumber: 1 });
        if (!mounted) return;
        setCompaniesConverted(Array.isArray(data?.leads) ? data.leads : []);
      } catch (err) {
        // silent fail
      }
    };
    loadConverted();
    return () => { mounted = false; };
  }, []);

  const handleChange = (field) => (event) => {
    setFormValues((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formValues.name) {
      toast.error(t("modules.projects.nameRequired"));
      return;
    }

    const deadlineErr = validateDeadlineRange(formValues.dateStart, formValues.dateEnd);
    if (deadlineErr) {
      toast.error(deadlineErr);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: formValues.name,
        description: formValues.description || undefined,
        status: formValues.status || "active",
        userId: formValues.responsible || null,
        activityIds: Array.isArray(formValues.activityIds) ? formValues.activityIds : [],
        date: dateInputToStartISO(formValues.dateStart),
        dateEnd: dateInputToEndISO(formValues.dateEnd),
      };

      let savedProject;
      if (project && project.id) {
        savedProject = await projectsService.update(project.id, payload);
        toast.success(t("modules.projects.updated"));
      } else {
        savedProject = await projectsService.create(payload);
        toast.success(t("modules.projects.created"));
      }
      
      if (onSave) onSave(savedProject);
      onClose();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const currentStatus = statusOptions.find(s => s.value === formValues.status) || statusOptions[0];

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
      ModalProps={{ keepMounted: true }}
    >
      {/* Top Bar */}
      <Box className={classes.topBar}>
        <Box className={classes.topBarLeft}>
          <Typography style={{ fontSize: 13, fontWeight: 500, opacity: 0.7 }}>
            {project ? t("modules.projects.editProject") : t("modules.projects.newProject")}
          </Typography>
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
            placeholder={t("modules.projects.projectName")}
            value={formValues.name}
            onChange={handleChange("name")}
            fullWidth
            InputProps={{ disableUnderline: true }}
          />

          {/* Description */}
          <Box className={classes.descriptionRow}>
            <DescIcon className={classes.descIcon} />
            <TextField
              className={classes.descriptionInput}
              placeholder={t("modules.projects.addDescription")}
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
              noOptionsText={t("modules.projects.noUser")}
              style={{ minWidth: 140 }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={t("modules.common.owner")}
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
            <Button
              className={classes.actionBtn}
              startIcon={<CompanyIcon style={{ fontSize: 15 }} />}
              size="small"
              onClick={() => setShowFields(!showFields)}
            >
              {t("modules.common.company")}
            </Button>
            <Button
              className={classes.actionBtn}
              startIcon={<ActivityIcon style={{ fontSize: 15 }} />}
              size="small"
              onClick={() => setShowFields(!showFields)}
            >
              {t("modules.common.activities")}
            </Button>
          </Box>

          {/* Fields Section */}
          <Box className={classes.fieldsSection}>
            <Typography className={classes.fieldsSectionTitle}>
              {t("modules.common.fields")}
            </Typography>

            <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              <Autocomplete
                options={companiesConverted}
                getOptionLabel={(option) => option?.name || String(option?.id)}
                value={companiesConverted.find(c => String(c.id) === String(formValues.companyId)) || null}
                onChange={(_, value) => setFormValues(prev => ({ ...prev, companyId: value ? value.id : "" }))}
                noOptionsText={t("modules.projects.noCompany")}
                style={{ minWidth: 140, maxWidth: 200 }}
                size="small"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={t("modules.common.company")}
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      style: { fontSize: 12, height: 30, padding: '0 8px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 6 }
                    }}
                  />
                )}
              />
              <FormControl size="small" style={{ minWidth: 160, maxWidth: 220 }}>
                <Select
                  multiple
                  value={formValues.activityIds}
                  onChange={handleChange("activityIds")}
                  displayEmpty
                  disableUnderline
                  renderValue={(selected) => {
                    if (!selected || selected.length === 0) {
                      return <span style={{ opacity: 0.5, fontSize: 12 }}>{t("modules.projects.linkedActivities")}</span>;
                    }
                    return (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        {selected.map((value) => {
                          const activity = activities.find(a => a.id === value);
                          return (
                            <Chip key={value} label={activity ? activity.title : value} size="small" style={{ height: 18, fontSize: 10 }} />
                          );
                        })}
                      </div>
                    );
                  }}
                  style={{ fontSize: 12, height: 30, padding: '0 8px', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', borderRadius: 6 }}
                >
                  {activities.map((activity) => (
                    <MenuItem key={activity.id} value={activity.id} style={{ fontSize: 12 }}>
                      {activity.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

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
              {showFields ? t("modules.common.lessFields") : t("modules.common.moreFields")}
            </Button>
          </Box>
        </Box>

        {project?.id ? (
          <Box px={2} pb={1}>
            
          </Box>
        ) : null}

        {/* Footer */}
        <Box className={classes.footer}>
          <Button onClick={onClose} disabled={loading} style={{ textTransform: 'none', fontSize: 13 }}>
            {t("modules.common.cancel")}
          </Button>
          <Button
            type="submit"
            className={classes.submitBtn}
            disabled={loading}
            variant="contained"
          >
            {loading ? <CircularProgress size={18} style={{ color: '#fff' }} /> : (project ? t("modules.common.save") : t("modules.projects.createProject"))}
          </Button>
        </Box>
      </form>
    </Drawer>
  );
};

export default CreateProjectModal;
