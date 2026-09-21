/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Chip,
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { useTheme } from "@material-ui/core/styles";
import {
  Close as CloseIcon,
  PersonOutline as PersonIcon,
  DescriptionOutlined as DescIcon,
  DeleteOutline as DeleteIcon,
  AssignmentOutlined as ActivityIcon,
} from "@material-ui/icons";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import projectsService from "../../services/projectsService";
import useActivities from "../../hooks/useActivities";
import useUsers from "../../hooks/useUsers";
import DeadlineRangeFields from "../DeadlineRangeFields";
import {
  toDateInputValue,
  dateInputToStartISO,
  dateInputToEndISO,
  validateDeadlineRange,
  formatDeadlineRangeLabel,
} from "../../utils/deadlineDates";
import { useEntityDrawerStyles } from "../EntityDrawer/entityDrawerStyles";
import {
  DrawerInlineEdit,
  DrawerActionChip,
  DrawerPencil,
  DrawerEditActions,
} from "../EntityDrawer/DrawerInlineEdit";

const statusOptions = [
  { value: "active", label: "ATIVO", color: "#10b981", bg: "#d1fae5", darkBg: "rgba(16,185,129,0.15)" },
  { value: "paused", label: "PAUSADO", color: "#f59e0b", bg: "#fef3c7", darkBg: "rgba(245,158,11,0.15)" },
  { value: "completed", label: "CONCLUÍDO", color: "#6366f1", bg: "#e0e7ff", darkBg: "rgba(99,102,241,0.15)" },
  { value: "cancelled", label: "CANCELADO", color: "#ef4444", bg: "#fee2e2", darkBg: "rgba(239,68,68,0.15)" },
];

const projectToForm = (project) => ({
  name: project?.name || "",
  description: project?.description || "",
  status: project?.status || "active",
  responsible: (project?.userId || project?.user?.id) || "",
  activityIds: project?.activities ? project.activities.map((a) => a.id) : [],
  dateStart: toDateInputValue(project?.date),
  dateEnd: toDateInputValue(project?.dateEnd || project?.date),
});

const ProjectDetailsModal = ({
  open,
  onClose,
  project,
  onDelete,
  onUpdated,
  users: usersProp = [],
}) => {
  const classes = useEntityDrawerStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const { activities } = useActivities({ searchParam: "", pageNumber: 1 });
  const { users: usersHook } = useUsers();
  const users = usersProp.length ? usersProp : usersHook || [];

  const [form, setForm] = useState(projectToForm(null));
  const [draft, setDraft] = useState(projectToForm(null));
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const activeUsers = Array.isArray(users)
    ? users.filter((u) => {
        if (typeof u.isActive === "boolean") return u.isActive;
        if (typeof u.active === "boolean") return u.active;
        return true;
      })
    : [];

  useEffect(() => {
    if (open && project) {
      const next = projectToForm(project);
      setForm(next);
      setDraft(next);
      setEditing(null);
    }
  }, [open, project?.id, project?.updatedAt]);

  const startEdit = useCallback(
    (key) => {
      setDraft(form);
      setEditing(key);
    },
    [form]
  );

  const cancelEdit = useCallback(() => {
    setDraft(form);
    setEditing(null);
  }, [form]);

  const patchSave = useCallback(
    async (patch, nextForm) => {
      if (!project?.id) return;
      setSaving(true);
      try {
        const updated = await projectsService.update(project.id, {
          ...patch,
          activityIds: nextForm.activityIds,
        });
        const merged = {
          ...project,
          ...updated,
          name: nextForm.name,
          description: nextForm.description,
          status: nextForm.status,
          userId: nextForm.responsible || null,
          date: patch.date,
          dateEnd: patch.dateEnd,
          activities: project.activities,
        };
        setForm(projectToForm(merged));
        setDraft(projectToForm(merged));
        setEditing(null);
        onUpdated && onUpdated(merged);
        toast.success("Salvo.");
      } catch (err) {
        toastError(err);
      } finally {
        setSaving(false);
      }
    },
    [project, onUpdated]
  );

  const confirmEdit = useCallback(
    async (editKey) => {
      if (editKey === "name" && !String(draft.name || "").trim()) {
        toast.error("Nome do projeto é obrigatório.");
        return;
      }
      if (editKey === "deadline") {
        const err = validateDeadlineRange(draft.dateStart, draft.dateEnd);
        if (err) {
          toast.error(err);
          return;
        }
      }
      const payload = {
        name: draft.name,
        description: draft.description || undefined,
        status: draft.status,
        userId: draft.responsible || null,
        date: dateInputToStartISO(draft.dateStart),
        dateEnd: dateInputToEndISO(draft.dateEnd),
        activityIds: draft.activityIds,
      };
      const patchMap = {
        name: { name: payload.name },
        description: { description: payload.description },
        status: { status: payload.status },
        responsible: { userId: payload.userId },
        deadline: { date: payload.date, dateEnd: payload.dateEnd },
        activities: { activityIds: payload.activityIds },
      };
      await patchSave(patchMap[editKey] || payload, draft);
    },
    [draft, patchSave]
  );

  if (!project) return null;

  const currentStatus = statusOptions.find((s) => s.value === form.status) || statusOptions[0];
  const responsibleUser = activeUsers.find((u) => String(u.id) === String(form.responsible));
  const responsibleLabel =
    responsibleUser?.name ||
    responsibleUser?.fullName ||
    responsibleUser?.email ||
    "Responsável";

  const inlineProps = {
    classes,
    editing,
    onStartEdit: startEdit,
    onCancel: cancelEdit,
    onConfirm: () => confirmEdit(editing),
    saving,
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
      <Box className={classes.topBar}>
        <Typography style={{ fontSize: 13, fontWeight: 500, opacity: 0.7 }}>
          Detalhes do Projeto
        </Typography>
        <IconButton onClick={onClose} size="small" style={{ width: 28, height: 28 }}>
          <CloseIcon style={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box className={classes.mainContent}>
        <DrawerInlineEdit
          {...inlineProps}
          editKey="name"
          readContent={
            <Typography className={classes.titleRead}>
              {form.name || "Sem nome"}
            </Typography>
          }
          editContent={
            <TextField
              className={classes.titleInput}
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              autoFocus
              InputProps={{ disableUnderline: true }}
            />
          }
        />

        <Box className={classes.descriptionRow}>
          <DescIcon className={classes.descIcon} />
          <Box flex={1} minWidth={0}>
            <DrawerInlineEdit
              {...inlineProps}
              editKey="description"
              readContent={
                <Typography className={classes.descriptionRead}>
                  {form.description || "Sem descrição"}
                </Typography>
              }
              editContent={
                <TextField
                  className={classes.descriptionInput}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, description: e.target.value }))
                  }
                  fullWidth
                  multiline
                  autoFocus
                  InputProps={{ disableUnderline: true }}
                />
              }
            />
          </Box>
        </Box>

        {editing === "status" ? (
          <Box display="flex" alignItems="center" style={{ gap: 6, marginBottom: 16 }}>
            <FormControl size="small">
              <Select
                value={draft.status}
                onChange={(e) => setDraft((p) => ({ ...p, status: e.target.value }))}
                style={{ fontSize: 11, fontWeight: 700 }}
              >
                {statusOptions.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <DrawerEditActions
              onConfirm={() => confirmEdit("status")}
              onCancel={cancelEdit}
              saving={saving}
            />
          </Box>
        ) : (
          <Box display="flex" alignItems="center" style={{ gap: 4, marginBottom: 16 }}>
            <Box
              className={classes.statusBadge}
              style={{
                backgroundColor: isDark ? currentStatus.darkBg : currentStatus.bg,
                color: currentStatus.color,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: currentStatus.color,
                  display: "inline-block",
                }}
              />
              {currentStatus.label}
            </Box>
            <DrawerPencil classes={classes} onClick={() => startEdit("status")} />
          </Box>
        )}

        <Box className={classes.quickActions}>
          <DrawerActionChip
            {...inlineProps}
            editKey="responsible"
            readContent={
              <>
                <PersonIcon style={{ fontSize: 15, opacity: 0.5 }} />
                {responsibleLabel}
              </>
            }
            editContent={
              <Autocomplete
                options={activeUsers}
                getOptionLabel={(o) =>
                  o?.name || o?.fullName || o?.email || String(o?.id)
                }
                value={
                  activeUsers.find((u) => String(u.id) === String(draft.responsible)) ||
                  null
                }
                onChange={(_, v) =>
                  setDraft((p) => ({ ...p, responsible: v ? v.id : "" }))
                }
                style={{ minWidth: 160 }}
                size="small"
                renderInput={(params) => (
                  <TextField {...params} placeholder="Responsável" variant="standard" />
                )}
              />
            }
          />

          <DrawerActionChip
            {...inlineProps}
            editKey="deadline"
            readContent={
              <span>{formatDeadlineRangeLabel(form.dateStart, form.dateEnd)}</span>
            }
            editContent={
              <DeadlineRangeFields
                compact
                isDark={isDark}
                showLabel={false}
                dateStart={draft.dateStart}
                dateEnd={draft.dateEnd}
                onChangeStart={(v) => setDraft((p) => ({ ...p, dateStart: v }))}
                onChangeEnd={(v) => setDraft((p) => ({ ...p, dateEnd: v }))}
              />
            }
          />
        </Box>

        <Box className={classes.fieldsSection}>
          <Typography className={classes.fieldsSectionTitle}>Campos</Typography>

          {editing === "activities" ? (
            <Box display="flex" alignItems="flex-start" style={{ gap: 6 }}>
              <FormControl size="small" style={{ minWidth: 200, flex: 1 }}>
                <Select
                  multiple
                  value={draft.activityIds}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, activityIds: e.target.value }))
                  }
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected?.length) {
                      return (
                        <span className={classes.metaMuted}>Atividades vinculadas</span>
                      );
                    }
                    return (
                      <Box display="flex" flexWrap="wrap" style={{ gap: 4 }}>
                        {selected.map((id) => {
                          const act = activities.find((a) => a.id === id);
                          return (
                            <Chip
                              key={id}
                              label={act ? act.title : id}
                              size="small"
                              style={{ height: 20, fontSize: 10 }}
                            />
                          );
                        })}
                      </Box>
                    );
                  }}
                >
                  {activities.map((act) => (
                    <MenuItem key={act.id} value={act.id} style={{ fontSize: 12 }}>
                      {act.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <DrawerEditActions
                onConfirm={() => confirmEdit("activities")}
                onCancel={cancelEdit}
                saving={saving}
              />
            </Box>
          ) : (
            <Box className={classes.actionChip} style={{ minWidth: 160, marginBottom: 8 }}>
              <ActivityIcon style={{ fontSize: 15, opacity: 0.5 }} />
              <span>
                {form.activityIds?.length
                  ? `${form.activityIds.length} atividade(s)`
                  : "Nenhuma atividade"}
              </span>
              <DrawerPencil classes={classes} onClick={() => startEdit("activities")} />
            </Box>
          )}

          {project.activities?.length > 0 && editing !== "activities" && (
            <Box mt={1}>
              {project.activities.map((act) => (
                <Typography key={act.id} variant="body2" style={{ fontSize: 12, marginBottom: 4 }}>
                  · {act.title}
                  <span style={{ opacity: 0.5 }}> ({act.status})</span>
                </Typography>
              ))}
            </Box>
          )}
        </Box>

        <Box mt={3}>
          <Typography className={classes.metaMuted}>
            Criado em{" "}
            {project.createdAt
              ? new Date(project.createdAt).toLocaleString("pt-BR")
              : "—"}
          </Typography>
        </Box>
      </Box>

      <Box className={classes.footer}>
        <Button
          size="small"
          color="secondary"
          startIcon={<DeleteIcon />}
          onClick={() => onDelete && onDelete(project)}
          style={{ textTransform: "none" }}
        >
          Excluir
        </Button>
        {saving && <CircularProgress size={20} />}
      </Box>
    </Drawer>
  );
};

export default ProjectDetailsModal;
