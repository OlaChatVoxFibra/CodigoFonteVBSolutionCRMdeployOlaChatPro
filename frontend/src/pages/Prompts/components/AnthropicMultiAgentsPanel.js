/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo, useState } from "react";
import {
  Box,
  Dialog,
  Fab,
  IconButton,
  Typography
} from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { DeleteOutline, Edit as EditIcon } from "@material-ui/icons";
import { toast } from "react-toastify";
import useAnthropicIntegration from "../../../hooks/useAnthropicIntegration";
import AnthropicAgentEditor from "./AnthropicAgentEditor";

const useStyles = makeStyles((theme) => ({
  agentsGrid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing(2),
    width: "100%",
    paddingBottom: theme.spacing(8)
  },
  agentCard: {
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(0,0,0,0.06)",
    borderRadius: 8,
    padding: theme.spacing(2),
    background:
      theme.palette.type === "dark" ? "rgba(28,28,30,0.92)" : "rgba(255,255,255,0.95)",
    cursor: "pointer",
    flex: "1 1 280px",
    maxWidth: 400,
    minWidth: 260,
    minHeight: 120,
    position: "relative",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    boxShadow:
      theme.palette.type === "dark"
        ? "0 2px 8px rgba(0,0,0,0.3)"
        : "0 2px 8px rgba(15,23,42,0.06)",
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
    "&:hover": {
      transform: "translateY(-2px)"
    }
  },
  agentRobotIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  agentInfoCol: { flex: 1, minWidth: 0 },
  agentCardActions: { display: "flex", gap: 2, flexShrink: 0 },
  floatingCreateBtn: {
    position: "absolute",
    right: 16,
    bottom: 16,
    zIndex: 2
  },
  editorDialogPaper: {
    margin: 0,
    maxWidth: "100%",
    width: "100%",
    height: "100%",
    maxHeight: "100%",
    borderRadius: 0
  }
}));

const CLAUDE_COLOR = "#d97706";

function ClaudeRobotIcon({ color }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="8" width="16" height="12" rx="3" stroke={color} strokeWidth="1.8" fill="none" />
      <circle cx="9" cy="14" r="1.5" fill={color} />
      <circle cx="15" cy="14" r="1.5" fill={color} />
      <path
        d="M9.5 17.5C10 18.2 11 18.5 12 18.5C13 18.5 14 18.2 14.5 17.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <line x1="12" y1="4" x2="12" y2="8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="3.5" r="1.5" stroke={color} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

export default function AnthropicMultiAgentsPanel({ onAgentsChange }) {
  const classes = useStyles();
  const theme = useTheme();
  const anthropic = useAnthropicIntegration();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await anthropic.listMultiAgents();
      const list = Array.isArray(rows) ? rows : [];
      setAgents(list);
      onAgentsChange?.(list);
    } catch {
      toast.error("Não foi possível carregar agentes Claude.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setEditorOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
  };

  const remove = async (id, e) => {
    e?.stopPropagation?.();
    if (!window.confirm("Remover este agente Claude?")) return;
    try {
      await anthropic.removeMultiAgent(id);
      toast.success("Agente removido.");
      await load();
    } catch {
      toast.error("Falha ao remover agente.");
    }
  };

  const iconColor = useMemo(
    () => (theme.palette.type === "dark" ? "#fbbf24" : CLAUDE_COLOR),
    [theme.palette.type]
  );

  return (
    <Box position="relative" minHeight={280}>
      <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 16, maxWidth: 720 }}>
        Mesmo padrão do editor de agentes OpenAI: Regras Gerais, Roteiro, Ações, FAQ e Base de Conhecimento. Vincule na
        conexão em Integrações.
      </Typography>

      <Box className={classes.agentsGrid}>
        {loading ? (
          <Typography variant="body2" color="textSecondary">
            Carregando…
          </Typography>
        ) : agents.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            Nenhum agente Claude. Use o botão + para criar.
          </Typography>
        ) : (
          agents.map((agent) => (
            <Box key={agent.id} className={classes.agentCard} onClick={() => openEdit(agent)}>
              <Box className={classes.agentRobotIcon}>
                <ClaudeRobotIcon color={iconColor} />
              </Box>
              <Box className={classes.agentInfoCol}>
                <Typography style={{ fontWeight: 500, fontSize: 14 }}>{agent.name}</Typography>
                <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 2 }}>
                  Claude · {agent.model || "—"}
                </Typography>
              </Box>
              <Box className={classes.agentCardActions}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(agent);
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={(e) => remove(agent.id, e)}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))
        )}
      </Box>

      <Fab color="primary" className={classes.floatingCreateBtn} onClick={openCreate} aria-label="Novo agente Claude">
        +
      </Fab>

      <Dialog
        open={editorOpen}
        onClose={closeEditor}
        fullScreen
        classes={{ paper: classes.editorDialogPaper }}
      >
        {editorOpen ? (
          <AnthropicAgentEditor
            agentId={editingId}
            onClose={closeEditor}
            onSaved={() => {
              load();
            }}
          />
        ) : null}
      </Dialog>
    </Box>
  );
}
