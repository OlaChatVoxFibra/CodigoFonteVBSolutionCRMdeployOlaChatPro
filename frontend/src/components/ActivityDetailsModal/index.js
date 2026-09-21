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
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import { useTheme } from "@material-ui/core/styles";
import {
  Close as CloseIcon,
  PersonOutline as PersonIcon,
  DescriptionOutlined as DescIcon,
  DeleteOutline as DeleteIcon,
  FlagOutlined as FlagIcon,
  LabelOutlined as LabelIcon,
} from "@material-ui/icons";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import activitiesService from "../../services/activitiesService";
import useProjects from "../../hooks/useProjects";
import useUsers from "../../hooks/useUsers";
import convertedLeadsService from "../../services/convertedLeadsService";
import api from "../../services/api";
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
  { value: "pending", label: "PENDENTE", color: "#6b7280", bg: "#f3f4f6", darkBg: "rgba(107,114,128,0.15)" },
  { value: "in_progress", label: "EM PROGRESSO", color: "#f59e0b", bg: "#fef3c7", darkBg: "rgba(245,158,11,0.15)" },
  { value: "done", label: "CONCLUÍDA", color: "#10b981", bg: "#d1fae5", darkBg: "rgba(16,185,129,0.15)" },
];

const priorityOptions = [
  { value: "none", label: "Sem prioridade", color: "#9ca3af" },
  { value: "low", label: "Baixa", color: "#3b82f6" },
  { value: "medium", label: "Média", color: "#f59e0b" },
  { value: "high", label: "Alta", color: "#ef4444" },
  { value: "urgent", label: "Urgente", color: "#dc2626" },
];

const typeLabels = { task: "Tarefa", call: "Ligação", email: "E-mail", meeting: "Reunião" };

const activityToForm = (activity) => ({
  title: activity?.title || "",
  description: activity?.description || "",
  type: activity?.type || "task",
  dateStart: toDateInputValue(activity?.date),
  dateEnd: toDateInputValue(activity?.dateEnd || activity?.date),
  status: activity?.status || "pending",
  priority: activity?.priority || "none",
  responsible: activity?.userId || "",
  projectId: activity?.projectId || "",
  contactId: activity?.contactId || "",
  tags: Array.isArray(activity?.tags) ? activity.tags : [],
});

const ActivityDetailsModal = ({
  open,
  onClose,
  activity,
  onDelete,
  onUpdated,
  users: usersProp = [],
}) => {
  const classes = useEntityDrawerStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const { projects } = useProjects({ searchParam: "", pageNumber: 1 });
  const { users: usersHook } = useUsers();
  const users = usersProp.length ? usersProp : usersHook || [];

  const [form, setForm] = useState(activityToForm(null));
  const [draft, setDraft] = useState(activityToForm(null));
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState([]);

  const activeUsers = Array.isArray(users)
    ? users.filter((u) => {
        if (typeof u.isActive === "boolean") return u.isActive;
        if (typeof u.active === "boolean") return u.active;
        return true;
      })
    : [];

  useEffect(() => {
    if (open && activity) {
      const next = activityToForm(activity);
      setForm(next);
      setDraft(next);
      setEditing(null);
    }
  }, [open, activity?.id, activity?.updatedAt]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/contacts/list");
        if (mounted) setContacts(data || []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open]);

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
      if (!activity?.id) return;
      setSaving(true);
      try {
        const updated = await activitiesService.update(activity.id, patch);
        const merged = { ...activity, ...updated, ...nextForm };
        setForm(activityToForm(merged));
        setDraft(activityToForm(merged));
        setEditing(null);
        onUpdated && onUpdated(merged);
        toast.success("Salvo.");
      } catch (err) {
        toastError(err);
      } finally {
        setSaving(false);
      }
    },
    [activity, onUpdated]
  );

  const buildPayloadFromDraft = useCallback(() => {
    const selectedUser = activeUsers.find((u) => String(u.id) === String(draft.responsible));
    return {
      title: String(draft.title || "").trim(),
      description: draft.description || undefined,
      type: draft.type,
      status: draft.status,
      priority: draft.priority !== "none" ? draft.priority : undefined,
      date: dateInputToStartISO(draft.dateStart),
      dateEnd: dateInputToEndISO(draft.dateEnd),
      userId: selectedUser ? selectedUser.id : undefined,
      projectId: draft.projectId === "" ? null : Number(draft.projectId) || null,
      contactId: draft.contactId === "" ? null : Number(draft.contactId) || null,
      tags: draft.tags?.length ? draft.tags : undefined,
    };
  }, [draft, activeUsers]);

  const confirmEdit = useCallback(
    async (editKey) => {
      if (editKey === "title" && String(draft.title || "").trim().length < 3) {
        toast.error("O título deve ter pelo menos 3 caracteres.");
        return;
      }
      if (editKey === "deadline") {
        const err = validateDeadlineRange(draft.dateStart, draft.dateEnd);
        if (err) {
          toast.error(err);
          return;
        }
      }
      const payload = buildPayloadFromDraft();
      const patchMap = {
        title: { title: payload.title },
        description: { description: payload.description },
        status: { status: payload.status },
        type: { type: payload.type },
        project: { projectId: payload.projectId },
        responsible: { userId: payload.userId },
        deadline: { date: payload.date, dateEnd: payload.dateEnd },
        priority: { priority: payload.priority },
        contact: { contactId: payload.contactId },
      };
      await patchSave(patchMap[editKey] || payload, draft);
    },
    [draft, buildPayloadFromDraft, patchSave]
  );

  if (!activity) return null;

  const currentStatus = statusOptions.find((s) => s.value === form.status) || statusOptions[0];
  const currentPriority =
    priorityOptions.find((p) => p.value === form.priority) || priorityOptions[0];
  const projectLabel = (() => {
    const p = (projects || []).find((pr) => String(pr.id) === String(form.projectId));
    return p ? p.name || p.title : form.projectId ? `Projeto #${form.projectId}` : "Projeto";
  })();
  const responsibleUser = activeUsers.find((u) => String(u.id) === String(form.responsible));
  const responsibleLabel =
    responsibleUser?.name || responsibleUser?.fullName || responsibleUser?.email || "Responsável";
  const contactLabel = (() => {
    const c =
      activity?.contact ||
      contacts.find((x) => String(x.id) === String(form.contactId));
    return c?.name || (form.contactId ? `Contato #${form.contactId}` : "Contato");
  })();

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
        <Box className={classes.topBarLeft}>
          {editing === "project" ? (
            <Box display="flex" alignItems="center" style={{ gap: 6 }}>
              <FormControl size="small" variant="standard" style={{ minWidth: 100 }}>
                <Select
                  value={draft.projectId || ""}
                  onChange={(e) => setDraft((p) => ({ ...p, projectId: e.target.value }))}
                  disableUnderline
                  displayEmpty
                  style={{ fontSize: 12, fontWeight: 500 }}
                >
                  <MenuItem value="">
                    <em>Nenhum</em>
                  </MenuItem>
                  {(projects || []).map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name || p.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <DrawerEditActions
                onConfirm={() => confirmEdit("project")}
                onCancel={cancelEdit}
                saving={saving}
              />
            </Box>
          ) : (
            <Box className={classes.topBarMeta} style={{ paddingRight: 4 }}>
              <span style={{ opacity: form.projectId ? 1 : 0.55 }}>{projectLabel}</span>
              <DrawerPencil classes={classes} onClick={() => startEdit("project")} />
            </Box>
          )}
          <Typography style={{ opacity: 0.25, fontSize: 14 }}>
            ·
          </Typography>
          {editing === "type" ? (
            <Box display="flex" alignItems="center" style={{ gap: 6 }}>
              <FormControl size="small" variant="standard" style={{ minWidth: 80 }}>
                <Select
                  value={draft.type}
                  onChange={(e) => setDraft((p) => ({ ...p, type: e.target.value }))}
                  disableUnderline
                  style={{ fontSize: 12, fontWeight: 500 }}
                >
                  <MenuItem value="task">Tarefa</MenuItem>
                  <MenuItem value="call">Ligação</MenuItem>
                  <MenuItem value="email">E-mail</MenuItem>
                  <MenuItem value="meeting">Reunião</MenuItem>
                </Select>
              </FormControl>
              <DrawerEditActions
                onConfirm={() => confirmEdit("type")}
                onCancel={cancelEdit}
                saving={saving}
              />
            </Box>
          ) : (
            <Box className={classes.topBarMeta}>
              <span>{typeLabels[form.type] || form.type}</span>
              <DrawerPencil classes={classes} onClick={() => startEdit("type")} />
            </Box>
          )}
        </Box>
        <IconButton onClick={onClose} size="small" style={{ width: 28, height: 28 }}>
          <CloseIcon style={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box className={classes.mainContent}>
        <DrawerInlineEdit
          {...inlineProps}
          editKey="title"
          readContent={
            <Typography className={classes.titleRead}>
              {form.title || "Sem título"}
            </Typography>
          }
          editContent={
            <TextField
              className={classes.titleInput}
              value={draft.title}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
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

          <DrawerActionChip
            {...inlineProps}
            editKey="priority"
            readContent={
              <>
                <FlagIcon style={{ fontSize: 15, color: currentPriority.color }} />
                {currentPriority.label}
              </>
            }
            editContent={
              <Select
                value={draft.priority}
                onChange={(e) => setDraft((p) => ({ ...p, priority: e.target.value }))}
                style={{ fontSize: 12, minWidth: 120 }}
              >
                {priorityOptions.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            }
          />

          {form.tags?.length > 0 && (
            <Box className={classes.actionChip} style={{ paddingRight: 10 }}>
              <LabelIcon style={{ fontSize: 15, opacity: 0.5 }} />
              {form.tags.length} etiqueta{form.tags.length > 1 ? "s" : ""}
            </Box>
          )}
        </Box>

        <Box className={classes.fieldsSection}>
          <Typography className={classes.fieldsSectionTitle}>Campos</Typography>
          <DrawerActionChip
            {...inlineProps}
            editKey="contact"
            readContent={<span>{contactLabel}</span>}
            editContent={
              <Autocomplete
                options={contacts}
                getOptionLabel={(o) => o?.name || String(o?.id)}
                value={
                  contacts.find((c) => String(c.id) === String(draft.contactId)) || null
                }
                onChange={(_, v) =>
                  setDraft((p) => ({ ...p, contactId: v ? v.id : "" }))
                }
                style={{ minWidth: 180 }}
                size="small"
                renderInput={(params) => (
                  <TextField {...params} placeholder="Contato" variant="standard" />
                )}
              />
            }
          />
        </Box>

        {activity?.attachments?.length > 0 && (
          <Box mt={2}>
            <Typography className={classes.fieldsSectionTitle}>Anexos</Typography>
            <Box display="flex" flexWrap="wrap" mt={1}>
              {activity.attachments.map((att, idx) => (
                <Box
                  key={idx}
                  className={classes.attachmentChip}
                  onClick={() => att.data && window.open(att.data, "_blank")}
                >
                  <Typography variant="caption" style={{ fontWeight: 500 }}>
                    {att.name || "Arquivo"}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Box mt={3}>
          <Typography className={classes.metaMuted}>
            Criado em{" "}
            {activity.createdAt
              ? new Date(activity.createdAt).toLocaleString("pt-BR")
              : "—"}
          </Typography>
        </Box>
      </Box>

      <Box className={classes.footer}>
        <Button
          size="small"
          color="secondary"
          startIcon={<DeleteIcon />}
          onClick={() => onDelete && onDelete(activity)}
          style={{ textTransform: "none" }}
        >
          Excluir
        </Button>
        {saving && <CircularProgress size={20} />}
      </Box>
    </Drawer>
  );
};

export default ActivityDetailsModal;
