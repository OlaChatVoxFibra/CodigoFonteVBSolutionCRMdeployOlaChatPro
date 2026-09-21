/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  IconButton,
  List,
  ListItem,
  Typography
} from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { DeleteOutline, Edit as EditIcon } from "@material-ui/icons";
import { toast } from "react-toastify";

import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import ForbiddenPage from "../../components/ForbiddenPage";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";

import AnthropicAgentEditor from "./components/AnthropicAgentEditor";
import ClaudeAgentIcon from "./components/ClaudeAgentIcon";
import useAnthropicIntegration from "../../hooks/useAnthropicIntegration";
import { mergeImportedAgentJson } from "./defaultAgentV2";
import { Bot, UserPlus, Braces } from "lucide-react";
import useAppTranslation from "../../hooks/useAppTranslation";

const HUB_TAB_AGENTES = "agentes";

const useStyles = makeStyles((theme) => ({
  page: {
    padding: theme.spacing(2),
    display: "grid",
    gap: theme.spacing(2),
    width: "100%",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    transition: "filter 0.18s ease",
    ...(theme.palette.type !== "dark"
      ? {
          "& .MuiTypography-root": {
            color: "#111827 !important"
          },
          "& .MuiTypography-colorTextSecondary": {
            color: "rgba(17,24,39,0.72) !important"
          }
        }
      : {})
  },
  agentsGrid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "stretch",
    gap: theme.spacing(2),
    width: "100%",
    maxWidth: 1120,
    margin: "0 auto",
    boxSizing: "border-box",
    /* Espaço para o FAB fixo não cobrir o último cartão (cliques iam para o +). */
    paddingBottom: theme.spacing(10)
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
    boxShadow: theme.palette.type === "dark"
      ? "0 2px 8px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)"
      : "0 2px 8px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)",
    transition: "box-shadow 0.2s ease, transform 0.2s ease",
    "&:hover": {
      boxShadow: theme.palette.type === "dark"
        ? "0 12px 36px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)"
        : "0 12px 36px rgba(15,23,42,0.12), 0 4px 12px rgba(15,23,42,0.06)",
      transform: "translateY(-3px)"
    }
  },
  agentRobotIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  agentInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  agentCardActions: {
    display: "flex",
    gap: 2,
    flexShrink: 0,
    alignItems: "center",
  },
  floatingCreateBtn: {
    position: "fixed",
    right: 32,
    bottom: 28,
    zIndex: 1200,
    width: 54,
    height: 54,
    minHeight: 54,
    borderRadius: "50%",
    background: "#111827",
    color: "#fff",
    fontSize: 28,
    fontWeight: 300,
    boxShadow: "0 10px 26px rgba(17,24,39,0.35)",
    "&:hover": { background: "#000" }
  },
  modalPaper: {
    borderRadius: 16,
    overflow: "hidden"
  },
  modalActionTitle: {
    fontWeight: 600,
    fontSize: "1.05rem",
    letterSpacing: "-0.02em"
  },
  modalOption: {
    borderRadius: 12,
    marginBottom: theme.spacing(0.75),
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15,23,42,0.07)",
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.65)",
    transition: "background-color 0.15s ease, border-color 0.15s ease",
    padding: 0,
    display: "block",
    "&:hover": {
      background:
        theme.palette.type === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.03)",
      borderColor:
        theme.palette.type === "dark" ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.1)"
    }
  },
  modalActionRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    padding: "14px 16px",
    boxSizing: "border-box",
    gap: 14
  },
  modalActionIconCell: {
    width: 40,
    height: 40,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  modalActionTextCell: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center"
  },
  editorDialogPaper: {
    margin: 0,
    maxWidth: "100%",
    width: "100%",
    height: "100%",
    maxHeight: "100%",
    borderRadius: 0
  },
  dialogBackdrop: {
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(0, 0, 0, 0.32) !important"
        : "rgba(15, 23, 42, 0.28) !important",
    backdropFilter: "blur(12px) saturate(120%)",
    WebkitBackdropFilter: "blur(12px) saturate(120%)"
  },
  importDrop: {
    borderRadius: 12,
    padding: theme.spacing(2.5),
    textAlign: "center",
    cursor: "pointer",
    border:
      theme.palette.type === "dark"
        ? "1px dashed rgba(255,255,255,0.14)"
        : "1px dashed rgba(15,23,42,0.12)",
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)",
    transition: "border-color 0.15s ease, background 0.15s ease",
    "&:hover": {
      borderColor: "rgba(99,102,241,0.35)",
      background:
        theme.palette.type === "dark" ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)"
    }
  }
}));

export default function PromptsHub() {
  const { t } = useAppTranslation();
  const classes = useStyles();
  const history = useHistory();
  const promptsHubViewModes = useMemo(() => ([
    {
      value: HUB_TAB_AGENTES,
      label: t("modules.prompts.tab"),
      icon: <Bot size={16} strokeWidth={1.75} />
    }
  ]), [t]);
  const location = useLocation();
  const { user, socket } = useContext(AuthContext);
  const promptsTheme = useTheme();
  const isDarkMode = promptsTheme.palette.type === 'dark';
  const [prompts, setPrompts] = useState([]);
  const [claudeAgents, setClaudeAgents] = useState([]);
  const [claudeEditorOpen, setClaudeEditorOpen] = useState(false);
  const [claudeEditingId, setClaudeEditingId] = useState(null);
  const anthropicHook = useAnthropicIntegration();
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [importJsonOpen, setImportJsonOpen] = useState(false);
  const [hubTab, setHubTab] = useState(HUB_TAB_AGENTES);
  const importJsonInputRef = useRef(null);
  const companyId = user?.companyId;
  const isAdmin = user?.profile !== "user";
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchAllPrompts = async () => {
    try {
      let page = 1;
      let all = [];
      let hasMore = true;
      while (hasMore) {
        const { data } = await api.get("/prompt", { params: { pageNumber: String(page) } });
        const chunk = Array.isArray(data?.prompts) ? data.prompts : [];
        all = all.concat(chunk);
        hasMore = !!data?.hasMore;
        page += 1;
        if (page > 200) break;
      }
      if (mountedRef.current) setPrompts(all);
    } catch (err) {
      if (mountedRef.current) toastError(err);
    }
  };

  const fetchClaudeAgents = async () => {
    try {
      const rows = await anthropicHook.listMultiAgents();
      if (mountedRef.current) setClaudeAgents(Array.isArray(rows) ? rows : []);
    } catch {
      if (mountedRef.current) setClaudeAgents([]);
    }
  };

  const refreshAgents = async () => {
    await Promise.all([fetchAllPrompts(), fetchClaudeAgents()]);
  };

  useEffect(() => {
    refreshAgents();
  }, []);

  const unifiedAgents = useMemo(() => {
    const openaiRows = prompts.map((p) => ({
      kind: "openai",
      id: p?.id ?? p?.promptId,
      name: p.name || "Sem nome",
      model: p.model,
      queueName: p.queue?.name,
      raw: p
    }));
    const claudeRows = claudeAgents.map((a) => ({
      kind: "anthropic",
      id: a.id,
      name: a.name || "Sem nome",
      model: a.model,
      queueName: null,
      raw: a
    }));
    return [...openaiRows, ...claudeRows].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), "pt-BR", { sensitivity: "base" })
    );
  }, [prompts, claudeAgents]);

  const openEditClaudeAgent = (id) => {
    setClaudeEditingId(id);
    setClaudeEditorOpen(true);
  };

  const closeClaudeEditor = () => {
    setClaudeEditorOpen(false);
    setClaudeEditingId(null);
  };

  useEffect(() => {
    const st = location.state;
    if (st?.tab === HUB_TAB_AGENTES) {
      setHubTab(HUB_TAB_AGENTES);
    }
  }, [location.state?.tab]);

  useEffect(() => {
    const st = location.state;
    if (st?.justCreatedAgentId == null) return;
    if (!mountedRef.current) return;
    refreshAgents();
    history.replace({ pathname: "/prompts", state: {} });
  }, [location.state, history]);

  useEffect(() => {
    if (!socket || !companyId) return;
    const ch = `company-${companyId}-prompt`;
    const onP = () => refreshAgents();
    socket.on(ch, onP);
    return () => socket.off(ch, onP);
  }, [socket, companyId]);

  const handleImportJsonFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      let apiKey = "";
      let model = "gpt-5.5";
      try {
        const { data } = await api.get("/settings/agent_integration");
        if (data?.value) {
          const v = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          apiKey = v.apiKey || "";
          model = v.model || model;
        }
      } catch {
        /* ignore */
      }
      const merged = mergeImportedAgentJson(parsed, { apiKey, model });
      setImportJsonOpen(false);
      history.push({ pathname: "/prompts/create", state: { importedAgent: merged } });
    } catch (err) {
      const msg = err?.message || "Não foi possível ler o JSON.";
      toast.error(msg);
    }
  };

  const deleteAgent = async (agent, e) => {
    if (e) e.stopPropagation();
    if (agent?.kind === "anthropic") {
      if (!window.confirm("Remover este agente Claude?")) return;
      try {
        await anthropicHook.removeMultiAgent(agent.id);
        toast.success("Agente Claude removido.");
        await refreshAgents();
      } catch (err) {
        toastError(err);
      }
      return;
    }
    const id = agent?.id;
    if (id == null || id === "") {
      toast.error("Não foi possível identificar o agente para excluir.");
      return;
    }
    try {
      await api.delete(`/prompt/${id}`);
      toast.success("Agente removido.");
      await refreshAgents();
    } catch (err) {
      toastError(err);
    }
  };

  if (!isAdmin) return <ForbiddenPage />;

  return (
    <ActivitiesStyleLayout
      title={null}
      description={null}
      viewModes={promptsHubViewModes}
      currentViewMode={hubTab}
      onViewModeChange={setHubTab}
      disableFilterBar
      hideDefaultRightFilters
      hideSearch
      hideNavDivider
      hideHeaderDivider
      helpTopic="prompts"
      compactHeader
      scrollContent={false}
    >
      <Box className={classes.page}>
          <Box style={{ border: "none", background: "transparent", padding: 0 }}>
            <Typography
              variant="caption"
              color="textSecondary"
              style={{ marginBottom: 16, display: "block", maxWidth: 720 }}
            >
              {t("modules.prompts.intro")}
            </Typography>
            <Box className={classes.agentsGrid}>
              {unifiedAgents.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  {t("modules.prompts.empty")}
                </Typography>
              ) : (
                unifiedAgents.map((agent, agentIdx) => {
                  const rowId = agent.id;
                  const isClaude = agent.kind === "anthropic";
                  const AGENT_PALETTE = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#ec4899","#8b5cf6","#14b8a6","#f97316","#06b6d4"];
                  const agentColor = !isClaude
                    ? agent.raw?.agentColor || agent.raw?.cargo?.roleColor || AGENT_PALETTE[agentIdx % AGENT_PALETTE.length]
                    : "#D97757";
                  const iconColor = (() => {
                    if (isClaude) return isDarkMode ? "#fbbf24" : "#D97757";
                    if (!isDarkMode) return agentColor;
                    const hex = agentColor.replace('#', '');
                    if (hex.length < 6) return AGENT_PALETTE[agentIdx % AGENT_PALETTE.length];
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    if (brightness >= 120) return agentColor;
                    const lighten = (c) => Math.min(255, c + Math.round((255 - c) * 0.55));
                    const lr = lighten(r), lg = lighten(g), lb = lighten(b);
                    return `#${lr.toString(16).padStart(2,'0')}${lg.toString(16).padStart(2,'0')}${lb.toString(16).padStart(2,'0')}`;
                  })();
                  const openAgent = () => {
                    if (isClaude) {
                      if (rowId == null) return;
                      openEditClaudeAgent(rowId);
                      return;
                    }
                    if (rowId == null || rowId === "") return;
                    history.push(`/prompts/create/${rowId}`);
                  };
                  return (
                  <Box
                    key={isClaude ? `claude-${rowId}` : `openai-${rowId}`}
                    className={classes.agentCard}
                    onClick={openAgent}
                  >
                    {isClaude ? (
                      <ClaudeAgentIcon />
                    ) : (
                    <Box
                      className={classes.agentRobotIcon}
                      style={{ backgroundColor: 'transparent' }}
                    >
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="8" width="16" height="12" rx="3" stroke={iconColor} strokeWidth="1.8" fill="none" />
                        <circle cx="9" cy="14" r="1.5" fill={iconColor} />
                        <circle cx="15" cy="14" r="1.5" fill={iconColor} />
                        <path d="M9.5 17.5C10 18.2 11 18.5 12 18.5C13 18.5 14 18.2 14.5 17.5" stroke={iconColor} strokeWidth="1.4" strokeLinecap="round" />
                        <line x1="12" y1="4" x2="12" y2="8" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" />
                        <circle cx="12" cy="3.5" r="1.5" stroke={iconColor} strokeWidth="1.4" fill="none" />
                        <line x1="2" y1="13" x2="4" y2="13" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="20" y1="13" x2="22" y2="13" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </Box>
                    )}
                    <Box className={classes.agentInfoCol}>
                      <Typography style={{ fontWeight: 500, fontSize: 14 }}>{agent.name}</Typography>
                      <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 2 }}>
                        {isClaude ? "Claude · " : ""}
                        Modelo: {agent.model || "—"}
                        {!isClaude && agent.queueName ? ` · Fila: ${agent.queueName}` : ""}
                      </Typography>
                    </Box>
                    <Box className={classes.agentCardActions}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAgent();
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={(e) => deleteAgent(agent, e)}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  );
                })
              )}
            </Box>
            <Fab
              className={classes.floatingCreateBtn}
              onClick={() => setCreateChoiceOpen(true)}
              aria-label="Novo agente"
            >
              +
            </Fab>
          </Box>
      </Box>

      <input
        ref={importJsonInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={handleImportJsonFile}
      />

      <Dialog
        open={createChoiceOpen}
        onClose={() => setCreateChoiceOpen(false)}
        classes={{ paper: classes.modalPaper }}
        BackdropProps={{ classes: { root: classes.dialogBackdrop } }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className={classes.modalActionTitle}>{t("modules.prompts.newAgent")}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45, display: "block", marginBottom: 12 }}>
            {t("modules.prompts.chooseHow")}
          </Typography>
          <List disablePadding>
            <ListItem
              button
              className={classes.modalOption}
              onClick={() => {
                setCreateChoiceOpen(false);
                history.push("/prompts/create");
              }}
            >
              <Box className={classes.modalActionRow}>
                <Box className={classes.modalActionIconCell}>
                  <UserPlus size={20} strokeWidth={1.55} color="#6366f1" style={{ opacity: 0.92 }} />
                </Box>
                <Box className={classes.modalActionTextCell}>
                  <Typography style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.015em", lineHeight: 1.35 }}>
                    {t("modules.prompts.createAgent")}
                  </Typography>
                  <Typography variant="caption" style={{ fontSize: 12, opacity: 0.7, marginTop: 3, lineHeight: 1.45 }}>
                    {t("modules.prompts.createAgentHint")}
                  </Typography>
                </Box>
              </Box>
            </ListItem>
            <ListItem
              button
              className={classes.modalOption}
              onClick={() => {
                setCreateChoiceOpen(false);
                setImportJsonOpen(true);
              }}
            >
              <Box className={classes.modalActionRow}>
                <Box className={classes.modalActionIconCell}>
                  <Braces size={20} strokeWidth={1.55} color="#0ea5e9" style={{ opacity: 0.92 }} />
                </Box>
                <Box className={classes.modalActionTextCell}>
                  <Typography style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.015em", lineHeight: 1.35 }}>
                    {t("modules.prompts.importAgentJson")}
                  </Typography>
                  <Typography variant="caption" style={{ fontSize: 12, opacity: 0.7, marginTop: 3, lineHeight: 1.45 }}>
                    {t("modules.prompts.importAgentHint")}
                  </Typography>
                </Box>
              </Box>
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateChoiceOpen(false)} style={{ textTransform: "none" }}>
            {t("modules.common.close")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={claudeEditorOpen}
        onClose={closeClaudeEditor}
        fullScreen
        hideBackdrop
        classes={{ paper: classes.editorDialogPaper }}
      >
        {claudeEditorOpen ? (
          <AnthropicAgentEditor
            agentId={claudeEditingId}
            onClose={closeClaudeEditor}
            onSaved={async () => {
              await refreshAgents();
            }}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={importJsonOpen}
        onClose={() => setImportJsonOpen(false)}
        classes={{ paper: classes.modalPaper }}
        BackdropProps={{ classes: { root: classes.dialogBackdrop } }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle className={classes.modalActionTitle}>Importar JSON</DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" style={{ fontSize: 12, opacity: 0.72, lineHeight: 1.45, display: "block", marginBottom: 14 }}>
            Selecione o arquivo. A página de criação abrirá com os campos preenchidos; revise e salve.
          </Typography>
          <Box
            className={classes.importDrop}
            onClick={() => importJsonInputRef.current && importJsonInputRef.current.click()}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                importJsonInputRef.current && importJsonInputRef.current.click();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <Braces size={28} strokeWidth={1.45} color="#6366f1" style={{ opacity: 0.85, marginBottom: 8 }} />
            <Typography style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Escolher arquivo .json</Typography>
            <Typography variant="caption" style={{ fontSize: 12, opacity: 0.65 }}>
              Exportação: &quot;Exportar JSON&quot; no editor de agente
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportJsonOpen(false)} style={{ textTransform: "none" }}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

    </ActivitiesStyleLayout>
  );
}
