/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Grid,
  Divider
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Close as CloseIcon, Add as AddIcon, DeleteOutline as DeleteOutlineIcon } from "@material-ui/icons";
import DragIndicatorIcon from "@material-ui/icons/DragIndicator";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const useStyles = makeStyles((theme) => ({
  drawerPaper: {
    width: 420,
    maxWidth: "100%",
    padding: theme.spacing(2),
    borderRadius: 16,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    height: "calc(100% - 32px)",
    marginRight: theme.spacing(2),
    overflow: "hidden",
    overflowX: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderBottom: "1px solid #eee",
    paddingBottom: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  closeButton: {
    position: "absolute",
    left: 0,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
    overflowY: "auto",
    height: "100%",
    paddingRight: theme.spacing(1),
    overflowX: "hidden",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: theme.spacing(2),
    gap: theme.spacing(1),
  },
  stageRow: {
    display: "grid",
    gridTemplateColumns: "28px 28px 1fr auto",
    alignItems: "center",
    columnGap: theme.spacing(1),
    rowGap: theme.spacing(1),
  },
  handleBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "grab",
    color: "#6B7280"
  },
  colorInput: {
    width: 28,
    height: 28,
    padding: 0,
    border: "1px solid #E5E7EB",
    borderRadius: "50%",
    background: "transparent",
  },
}));

const randomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const slug = (txt) =>
  (txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const samePipeId = (a, b) => String(a ?? "") === String(b ?? "");

/** Payload mínimo para o bulk (sem uid/React) + ids numéricos estáveis */
const buildApiPipelines = (pipes) =>
  (Array.isArray(pipes) ? pipes : []).map((p) => ({
    id: /^\d+$/.test(String(p.id ?? "")) ? Number(p.id) : p.id,
    name: (String(p.name || "").trim() || "Pipeline").slice(0, 255),
    stages: (p.stages || []).map((s, idx) => ({
      id: s.id != null && /^\d+$/.test(String(s.id)) ? Number(s.id) : s.id,
      key: String(s.key || `etapa_${idx + 1}`).toLowerCase().slice(0, 120),
      label: String(s.label != null ? s.label : "Etapa").slice(0, 500),
      color: String(s.color || "#3B82F6").slice(0, 32),
      order:
        s.order != null && Number.isFinite(Number(s.order))
          ? Number(s.order)
          : idx + 1
    }))
  }));

export default function PipelineDrawer({
  open,
  onClose,
  title = "Configure sua Pipeline",
  pipelines,
  selectedId,
  onSave,
}) {
  const classes = useStyles();
  const [localPipes, setLocalPipes] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const base = Array.isArray(pipelines) ? JSON.parse(JSON.stringify(pipelines)) : [];
    const withUids = base.map(p => ({
      ...p,
      stages: (p.stages || []).map(s => ({ ...s, uid: s.uid || s.id || randomId() }))
    }));
    setLocalPipes(withUids);
    setCurrentId(selectedId || (withUids && withUids[0] ? withUids[0].id : null));
  }, [pipelines, selectedId, open]);

  const current = useMemo(() => {
    const cid = currentId != null ? String(currentId) : null;
    return localPipes.find(p => String(p.id) === cid) || null;
  }, [localPipes, currentId]);

  const handleAddPipeline = () => {
    const newPipe = {
      id: randomId(),
      name: "Nova Pipeline",
      stages: [
        { uid: randomId(), key: "novo", label: "Novo Lead", color: "#6366F1" },
        { uid: randomId(), key: "qualificacao", label: "Contato Inicial", color: "#8B5CF6" },
        { uid: randomId(), key: "proposta", label: "Proposta", color: "#F59E0B" },
        { uid: randomId(), key: "negociacao", label: "Reunião", color: "#F97316" },
        { uid: randomId(), key: "fechado", label: "Fechamento", color: "#10B981" },
      ],
    };
    setLocalPipes(prev => [...prev, newPipe]);
    setCurrentId(newPipe.id);
  };

  const handleRemovePipeline = (id) => {
    if (localPipes.length <= 1) return;
    const idx = localPipes.findIndex(p => samePipeId(p.id, id));
    if (idx === -1) return;
    const next = localPipes.filter(p => !samePipeId(p.id, id));
    setLocalPipes(next);
    if (samePipeId(currentId, id)) {
      setCurrentId(next[0]?.id || null);
    }
  };

  const updateCurrent = (updates) => {
    setLocalPipes(prev => prev.map(p => samePipeId(p.id, currentId) ? { ...p, ...updates } : p));
  };

  const handleAddStage = () => {
    if (!current) return;
    const keyBase = `etapa_${current.stages.length + 1}`;
    const key = keyBase.toLowerCase().replace(/\s+/g, "_");
    const newStage = { uid: randomId(), key, label: `Etapa ${current.stages.length + 1}`, color: "#3B82F6" };
    updateCurrent({ stages: [...current.stages, newStage] });
  };

  const handleRemoveStage = (uidOrKey) => {
    if (!current) return;
    updateCurrent({
      stages: current.stages.filter(s => (s.uid || s.key) !== uidOrKey)
    });
  };

  const handleStageChange = (idx, field, value) => {
    if (!current) return;
    const next = current.stages.slice();
    if (field === "label") {
      next[idx] = { ...next[idx], label: value, key: slug(value) };
    } else {
      next[idx] = { ...next[idx], [field]: value };
    }
    updateCurrent({ stages: next });
  };

  const handleSave = async () => {
    if (typeof onSave !== "function") return;
    setSaving(true);
    try {
      await onSave(buildApiPipelines(localPipes), currentId);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination || !current) return;
    const src = result.source.index;
    const dst = result.destination.index;
    if (src === dst) return;
    const next = Array.from(current.stages);
    const [moved] = next.splice(src, 1);
    next.splice(dst, 0, moved);
    updateCurrent({ stages: next });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      classes={{ paper: classes.drawerPaper }}
    >
      <Box className={classes.header}>
        <IconButton className={classes.closeButton} onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
        <Typography variant="h6">{title}</Typography>
        <div style={{ width: 30 }} />
      </Box>
      <Box className={classes.content}>
        <Grid container spacing={1}>
          <Grid item xs={12}>
            <Typography variant="caption" style={{ color: "#374151" }}>Nova Pipeline</Typography>
          </Grid>
          <Grid item xs={8}>
            <TextField
              select
              fullWidth
              variant="outlined"
              size="small"
              SelectProps={{ native: true }}
              value={currentId != null ? String(currentId) : ""}
              onChange={(e) => {
                const v = e.target.value;
                setCurrentId(/^\d+$/.test(v) ? Number(v) : v);
              }}
              InputLabelProps={{ style: { fontSize: 13 } }}
              inputProps={{ style: { fontSize: 14 } }}
            >
              {localPipes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={4} style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button
              onClick={handleAddPipeline}
              variant="outlined"
              size="small"
              style={{ minWidth: 36, padding: 6 }}
              title="Nova Pipeline"
            >
              <AddIcon fontSize="small" />
            </Button>
            <Button
              onClick={() => handleRemovePipeline(currentId)}
              variant="outlined"
              size="small"
              style={{ minWidth: 36, padding: 6 }}
              disabled={localPipes.length <= 1}
              title="Excluir Pipeline"
            >
              <DeleteOutlineIcon fontSize="small" />
            </Button>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Nome da pipeline"
              variant="outlined"
              fullWidth
              size="small"
              value={current?.name || ""}
              onChange={(e) => updateCurrent({ name: e.target.value })}
              InputLabelProps={{ style: { fontSize: 13 } }}
              inputProps={{ style: { fontSize: 14 } }}
            />
          </Grid>
        </Grid>
        <Divider style={{ marginTop: 8, marginBottom: 8 }} />
        <Box>
          <Typography variant="caption" style={{ color: "#374151" }}>Escolha suas Etapas</Typography>
          <Box style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="pipeline-stages">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(current?.stages || []).map((st, idx) => (
                      <Draggable key={st.uid || st.id || st.key} draggableId={String(st.uid || st.id || st.key)} index={idx}>
                        {(prov) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            className={classes.stageRow}
                            style={{ ...prov.draggableProps.style }}
                          >
                            <div {...prov.dragHandleProps} className={classes.handleBox} title="Arraste para reordenar">
                              <DragIndicatorIcon fontSize="small" />
                            </div>
                            <input
                              type="color"
                              className={classes.colorInput}
                              value={st.color || "#3B82F6"}
                              onChange={(e) => handleStageChange(idx, "color", e.target.value)}
                              aria-label="Cor"
                            />
                            <TextField
                              label="Rótulo"
                              variant="outlined"
                              size="small"
                              fullWidth
                              value={st.label}
                              onChange={(e) => handleStageChange(idx, "label", e.target.value)}
                              InputLabelProps={{ style: { fontSize: 13 } }}
                              inputProps={{ style: { fontSize: 14 } }}
                            />
                            <Button size="small" onClick={() => handleRemoveStage(st.uid || st.key)}>Remover</Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <div>
              <Button size="small" color="primary" variant="outlined" onClick={handleAddStage}>Adicionar etapa</Button>
            </div>
          </Box>
        </Box>
        <Box className={classes.actions}>
          <Button onClick={onClose} variant="outlined" disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} color="primary" variant="contained" disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
