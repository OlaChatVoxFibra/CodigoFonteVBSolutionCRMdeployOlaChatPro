/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputBase,
  LinearProgress,
  MenuItem,
  Paper,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import clsx from "clsx";
import {
  DescriptionOutlined,
  AccountTreeOutlined,
  FlashOnOutlined,
  QuestionAnswerOutlined,
  MenuBookOutlined,
  SaveOutlined,
  HelpOutline,
  PlayArrowOutlined
} from "@material-ui/icons";
import {
  Headphones,
  ShoppingBag,
  Filter,
  MessageCircle,
  Calendar,
  Target,
  Smile,
  Meh,
  PenLine,
  Languages,
  Sparkles,
  Trash2,
  Globe,
  Paperclip,
  Plug
} from "lucide-react";
import { toast } from "react-toastify";
import ActivitiesStyleLayout from "../../../components/ActivitiesStyleLayout";
import { AgentEditorChoicePicker } from "../AgentEditorChoicePicker";
import AgentScriptEditor from "../AgentScriptEditor";
import AgentActionsTab from "../AgentActionsTab";
import { STANDARD_VARIABLE_KEYS } from "../agentScriptConstants";
import { PLAN_PROMPT_CHAR_LIMIT } from "../openAiIntegrationConstants";
import anthropicIntegrationService from "../../../services/anthropicIntegrationService";
import AgentIntegrationSection from "./AgentIntegrationSection";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import {
  buildDefaultAnthropicAgentV2,
  multiAgentRowToV2,
  v2ToMultiAgentPayload
} from "../defaultAnthropicAgentV2";
import ClaudeAgentGuidePanel from "./ClaudeAgentGuidePanel";
import AnthropicAgentTestTab from "./AnthropicAgentTestTab";
import PromptsHelpDialog from "../../../components/PromptsHelpDialog";

const TAB_INTEGRATION = "integracao";
const TAB_RULES = "regras";
const TAB_SCRIPT = "roteiro";
const TAB_ACTIONS = "acoes";
const TAB_FAQ = "faq";
const TAB_KNOW = "conhecimento";
const TAB_TEST = "teste";

const ROLE_CHOICES = [
  { value: "Especialista em suporte ao cliente", label: "Suporte", Icon: Headphones },
  { value: "Consultor comercial", label: "Vendas", Icon: ShoppingBag },
  { value: "Triagem e qualificação de leads", label: "Triagem", Icon: Filter },
  { value: "Assistente geral multicanal", label: "Geral", Icon: MessageCircle }
];

const OBJECTIVE_CHOICES = [
  { value: "Resolver dúvidas e orientar o cliente com clareza.", label: "Suporte", Icon: Headphones },
  { value: "Qualificar interesse e conduzir à venda com consultoria.", label: "Vendas", Icon: ShoppingBag },
  { value: "Agendar reuniões ou visitas com eficiência.", label: "Agendar", Icon: Calendar },
  { value: "Coletar dados e encaminhar ao time certo.", label: "Coletar info", Icon: Target }
];

const FORMALITY_CHOICES = [
  { value: "informal", label: "Leve", Icon: Smile },
  { value: "neutro", label: "Neutro", Icon: Meh },
  { value: "profissional", label: "Formal", Icon: PenLine }
];

const LANGUAGE_CHOICES = [
  { value: "pt-BR", label: "PT", sub: "Brasil", Icon: Languages },
  { value: "en-US", label: "EN", sub: "US", Icon: Languages },
  { value: "es", label: "ES", sub: "Español", Icon: Languages }
];

const WRITING_STYLE_CHOICES = [
  { value: "claro e direto", label: "Direto", Icon: PenLine },
  { value: "consultivo e humano", label: "Consultivo", Icon: MessageCircle },
  { value: "amigável e próximo", label: "Amigável", Icon: Smile },
  { value: "técnico e preciso", label: "Técnico", Icon: Sparkles }
];

const EMOJI_TOGGLE_OPTIONS = [
  { value: true, label: "Sim", Icon: Smile },
  { value: false, label: "Não", Icon: Meh }
];

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  return {
    pageRoot: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(2),
      padding: theme.spacing(1, 0, 2),
      boxSizing: "border-box",
      minHeight: 0,
      overflow: "visible"
    },
    editorGrid: {
      display: "grid",
      gridTemplateColumns: "1fr minmax(260px, 300px)",
      gap: theme.spacing(2),
      alignItems: "start",
      overflow: "visible",
      [theme.breakpoints.down("sm")]: { gridTemplateColumns: "1fr" }
    },
    editorGridIntegration: {
      gridTemplateColumns: "1fr",
      maxWidth: 1120,
      margin: "0 auto",
      width: "100%"
    },
    docWrap: {
      borderRadius: 14,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "#fafafa",
      padding: theme.spacing(2.5, 3),
      minHeight: 360,
      boxShadow: isDark ? "none" : "0 8px 30px rgba(15,23,42,0.06)"
    },
    docTextarea: {
      width: "100%",
      minHeight: 360,
      border: "none",
      outline: "none",
      resize: "vertical",
      background: "transparent",
      fontSize: "0.875rem",
      lineHeight: 1.65,
      fontFamily:
        '"Helvetica Neue", HelveticaNeue, "SF Pro Text", "Segoe UI", system-ui, -apple-system, sans-serif',
      color: theme.palette.text.primary
    },
    settingsCard: {
      borderRadius: 16,
      padding: theme.spacing(1.5, 1.75),
      marginBottom: theme.spacing(1.25),
      background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
      border: `1px solid ${border}`
    },
    cardTitle: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(1)
    },
    notionField: {
      "& .MuiOutlinedInput-root": { borderRadius: 10 }
    },
    faqPairCard: {
      borderRadius: 12,
      padding: theme.spacing(1.5),
      marginBottom: theme.spacing(1.5),
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.02)" : "#fff"
    },
    urlRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      borderRadius: 10,
      border: `1px solid ${border}`,
      padding: "4px 8px",
      marginBottom: theme.spacing(1)
    },
    urlInput: { flex: 1, fontSize: "0.875rem" },
    sourceChip: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      borderRadius: 10,
      border: `1px solid ${border}`,
      marginBottom: 8
    },
    attachBtn: {
      textTransform: "none",
      borderRadius: 10,
      fontWeight: 500,
      marginBottom: theme.spacing(1.5)
    },
    miniLabel: {
      display: "block",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      marginBottom: 6
    },
    scriptWrap: { position: "relative" },
    scriptPaperExpand: { minHeight: "min-content", overflow: "visible" }
  };
});

export default function AnthropicAgentEditor({ agentId, onClose, onSaved }) {
  const classes = useStyles();
  const [tab, setTab] = useState(agentId ? TAB_RULES : TAB_INTEGRATION);
  const [v2, setV2] = useState(() => buildDefaultAnthropicAgentV2());
  const [loading, setLoading] = useState(Boolean(agentId));
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(agentId || null);
  const [knowUrl, setKnowUrl] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const knowledgeFileRef = useRef(null);

  const updateV2 = useCallback((patch) => {
    setV2((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateAgent = useCallback((patch) => {
    setV2((prev) => ({ ...prev, agent: { ...prev.agent, ...patch } }));
  }, []);

  const updateAttendanceSettings = useCallback((patch) => {
    setV2((prev) => ({
      ...prev,
      attendance: {
        ...prev.attendance,
        settings: { ...prev.attendance.settings, ...patch }
      }
    }));
  }, []);

  const updateKnowledge = useCallback((patch) => {
    setV2((prev) => ({
      ...prev,
      knowledge: { ...prev.knowledge, ...patch }
    }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const integration = await anthropicIntegrationService.getIntegration();
      if (!agentId) {
        setV2(buildDefaultAnthropicAgentV2(integration));
        setSavedId(null);
        return;
      }
      const row = await anthropicIntegrationService.getMultiAgent(agentId);
      setV2(multiAgentRowToV2(row, integration));
      setSavedId(row.id);
    } catch (e) {
      toastError(e);
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [agentId, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  const charCount = useMemo(() => {
    const parts = [
      v2.generalRules,
      v2.attendance?.script,
      ...(v2.faq || []).map((f) => `${f.question}${f.answer}`),
      v2.knowledge?.manualText
    ];
    return parts.reduce((n, s) => n + String(s || "").length, 0);
  }, [v2]);

  const tokenApprox = Math.ceil(charCount / 4);

  const persist = async () => {
    const payload = v2ToMultiAgentPayload(v2);
    if (!payload.name.trim()) {
      toast.error("Informe o nome do agente.");
      return;
    }
    setSaving(true);
    try {
      let row;
      if (savedId) {
        row = await anthropicIntegrationService.updateMultiAgent(savedId, payload);
        toast.success("Agente Claude salvo.");
      } else {
        row = await anthropicIntegrationService.createMultiAgent(payload);
        setSavedId(row.id);
        toast.success("Agente Claude criado.");
      }
      onSaved?.(row);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Falha ao salvar agente Claude.");
    } finally {
      setSaving(false);
    }
  };

  const extractKnowledgeAttachment = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/prompt/extract-document", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000
      });
      const content = String(data?.text || data?.content || "").trim();
      if (!content) {
        toast.error("Não foi possível extrair texto do arquivo.");
        return;
      }
      updateKnowledge({
        sources: [
          ...(v2.knowledge?.sources || []),
          { title: file.name, sourceType: "upload", content }
        ]
      });
      toast.success("Documento adicionado à base.");
    } catch (e) {
      toastError(e);
    }
  };

  const viewModes = [
    { value: TAB_INTEGRATION, label: "Integração", icon: <Plug size={16} strokeWidth={1.75} /> },
    { value: TAB_RULES, label: "Regras Gerais", icon: <DescriptionOutlined /> },
    { value: TAB_SCRIPT, label: "Roteiro", icon: <AccountTreeOutlined /> },
    { value: TAB_ACTIONS, label: "Ações", icon: <FlashOnOutlined /> },
    { value: TAB_FAQ, label: "FAQ", icon: <QuestionAnswerOutlined /> },
    { value: TAB_KNOW, label: "Conhecimento", icon: <MenuBookOutlined /> },
    { value: TAB_TEST, label: "Teste", icon: <PlayArrowOutlined /> }
  ];

  const navActions = (
    <>
      <IconButton
        size="small"
        onClick={() => setHelpOpen(true)}
        aria-label="Ajuda agente Claude"
        style={{ marginRight: 4 }}
      >
        <HelpOutline fontSize="small" />
      </IconButton>
      <Button
        size="small"
        variant="contained"
        color="primary"
        startIcon={<SaveOutlined />}
        disabled={saving}
        onClick={persist}
        style={{ textTransform: "none", borderRadius: 10, boxShadow: "none" }}
      >
        Salvar
      </Button>
      {onClose ? (
        <Button size="small" onClick={onClose} style={{ textTransform: "none", borderRadius: 10, marginLeft: 8 }}>
          Voltar
        </Button>
      ) : null}
    </>
  );

  if (loading) {
    return (
      <Box p={2}>
        <LinearProgress />
        <Typography style={{ marginTop: 12 }}>Carregando agente Claude…</Typography>
      </Box>
    );
  }

  return (
    <>
    <PromptsHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} variant="anthropic" />
    <ActivitiesStyleLayout
      title={null}
      description={savedId ? `Editor — ${v2.agent.name || "Agente Claude"}` : "Novo agente Claude"}
      disableFilterBar
      hideSearch
      compactHeader
      viewModes={viewModes}
      currentViewMode={tab}
      onViewModeChange={setTab}
      navActions={navActions}
      scrollContent={false}
      contentEdgeToEdge
    >
      <input
        ref={knowledgeFileRef}
        type="file"
        style={{ display: "none" }}
        accept=".pdf,.doc,.docx,.txt,.json,.csv,text/plain,application/pdf"
        onChange={(e) => {
          extractKnowledgeAttachment(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {tab !== TAB_INTEGRATION ? <ClaudeAgentGuidePanel compact={Boolean(savedId)} /> : null}
      <Box className={classes.pageRoot}>
        <Box
          className={clsx(
            classes.editorGrid,
            tab === TAB_INTEGRATION && classes.editorGridIntegration
          )}
        >
        <Box minWidth={0}>
          {tab === TAB_INTEGRATION && (
            <AgentIntegrationSection
              model={v2.integration.model}
              responderGrupo={Boolean(v2.integration.responderGrupo)}
              onModelChange={(m) =>
                setV2((prev) => ({
                  ...prev,
                  integration: { ...prev.integration, model: m }
                }))
              }
              onResponderGrupoChange={(checked) =>
                setV2((prev) => ({
                  ...prev,
                  integration: { ...prev.integration, responderGrupo: checked }
                }))
              }
              provider="anthropic"
              showModelParams
              temperature={v2.integration.temperature}
              topP={v2.integration.topP}
              onTemperatureChange={(n) =>
                setV2((prev) => ({
                  ...prev,
                  integration: { ...prev.integration, temperature: n }
                }))
              }
              onTopPChange={(n) =>
                setV2((prev) => ({
                  ...prev,
                  integration: { ...prev.integration, topP: n }
                }))
              }
            />
          )}

          {tab === TAB_RULES && (
            <Paper className={classes.docWrap} elevation={0}>
              <InputBase
                multiline
                className={classes.docTextarea}
                placeholder="Escreva as regras como um documento claro para o agente…"
                value={v2.generalRules}
                onChange={(e) => updateV2({ generalRules: e.target.value })}
                inputProps={{ className: classes.docTextarea }}
              />
            </Paper>
          )}

          {tab === TAB_SCRIPT && (
            <Paper
              className={clsx(classes.docWrap, classes.scriptWrap, classes.scriptPaperExpand)}
              elevation={0}
            >
              <AgentScriptEditor
                value={v2.attendance.script}
                onChange={(script) =>
                  setV2((prev) => ({
                    ...prev,
                    attendance: { ...prev.attendance, script }
                  }))
                }
                placeholder="Roteiro da conversa (etapas com --- ou # ETAPA). Use / para mídias e * para variáveis."
                smartActions={v2.smartActions}
                mediaLibrary={v2.mediaLibrary}
                presetDefs={[]}
                standardVarKeys={STANDARD_VARIABLE_KEYS}
              />
            </Paper>
          )}

          {tab === TAB_ACTIONS && (
            <Box minHeight={320}>
              {savedId ? (
                <AgentActionsTab anthropicMultiAgentId={savedId} />
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Salve o agente primeiro para configurar ações inteligentes.
                </Typography>
              )}
            </Box>
          )}

          {tab === TAB_FAQ && (
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography style={{ fontWeight: 600, fontSize: 15 }}>FAQ</Typography>
                <Button
                  size="small"
                  style={{ textTransform: "none", borderRadius: 10 }}
                  startIcon={<Sparkles size={16} />}
                  onClick={() => updateV2({ faq: [...(v2.faq || []), { question: "", answer: "" }] })}
                >
                  Nova pergunta
                </Button>
              </Box>
              {(v2.faq || []).map((row, idx) => (
                <Paper key={idx} className={classes.faqPairCard} elevation={0}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Pergunta"
                    value={row.question}
                    onChange={(e) => {
                      const faq = [...v2.faq];
                      faq[idx] = { ...faq[idx], question: e.target.value };
                      updateV2({ faq });
                    }}
                    margin="dense"
                    variant="outlined"
                    className={classes.notionField}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Resposta"
                    value={row.answer}
                    onChange={(e) => {
                      const faq = [...v2.faq];
                      faq[idx] = { ...faq[idx], answer: e.target.value };
                      updateV2({ faq });
                    }}
                    margin="dense"
                    variant="outlined"
                    multiline
                    minRows={3}
                    className={classes.notionField}
                  />
                  <Box display="flex" justifyContent="flex-end">
                    <Button
                      size="small"
                      startIcon={<Trash2 size={14} />}
                      onClick={() => updateV2({ faq: v2.faq.filter((_, i) => i !== idx) })}
                      style={{ textTransform: "none", color: "#94a3b8" }}
                    >
                      Remover
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}

          {tab === TAB_KNOW && (
            <Box>
              <Typography style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
                Base de conhecimento
              </Typography>
              <Button
                className={classes.attachBtn}
                size="small"
                startIcon={<Paperclip size={16} />}
                onClick={() => knowledgeFileRef.current?.click()}
              >
                Anexar documento
              </Button>
              <Paper className={classes.docWrap} elevation={0} style={{ minHeight: 180 }}>
                <InputBase
                  multiline
                  placeholder="Texto livre para contexto do agente…"
                  value={v2.knowledge.manualText}
                  onChange={(e) => updateKnowledge({ manualText: e.target.value })}
                  inputProps={{ className: classes.docTextarea, style: { minHeight: 160 } }}
                />
              </Paper>
              <Typography className={classes.miniLabel} style={{ marginTop: 16 }}>
                Site (URL)
              </Typography>
              <Box className={classes.urlRow}>
                <Globe size={18} style={{ opacity: 0.7 }} />
                <InputBase
                  className={classes.urlInput}
                  placeholder="https://exemplo.com/docs"
                  value={knowUrl}
                  onChange={(e) => setKnowUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const u = knowUrl.trim();
                      if (!u) return;
                      updateKnowledge({ websites: [...(v2.knowledge.websites || []), { url: u }] });
                      setKnowUrl("");
                    }
                  }}
                />
                <Button
                  color="primary"
                  size="small"
                  variant="contained"
                  style={{ textTransform: "none", borderRadius: 10, boxShadow: "none" }}
                  onClick={() => {
                    const u = knowUrl.trim();
                    if (!u) return;
                    updateKnowledge({ websites: [...(v2.knowledge.websites || []), { url: u }] });
                    setKnowUrl("");
                  }}
                >
                  Adicionar
                </Button>
              </Box>
              {(v2.knowledge.websites || []).map((w, i) => (
                <Box key={i} className={classes.sourceChip}>
                  <Typography variant="body2" style={{ flex: 1, wordBreak: "break-all" }}>
                    {w.url}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() =>
                      updateKnowledge({
                        websites: v2.knowledge.websites.filter((_, j) => j !== i)
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          {tab === TAB_TEST && <AnthropicAgentTestTab v2={v2} savedId={savedId} />}
        </Box>

        {tab !== TAB_INTEGRATION ? (
        <Box>
          <Paper className={classes.settingsCard} elevation={0}>
            <Typography className={classes.cardTitle}>Consumo</Typography>
            <Typography variant="caption" display="block" gutterBottom>
              {charCount.toLocaleString()} / {PLAN_PROMPT_CHAR_LIMIT.toLocaleString()} caracteres · ~{tokenApprox}{" "}
              tokens
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, (charCount / PLAN_PROMPT_CHAR_LIMIT) * 100)}
              style={{ height: 5, borderRadius: 4 }}
            />
          </Paper>

          <Paper className={classes.settingsCard} elevation={0}>
            <Typography className={classes.cardTitle}>Agente</Typography>
            <TextField
              fullWidth
              label="Nome"
              value={v2.agent.name}
              onChange={(e) => updateAgent({ name: e.target.value })}
              margin="dense"
              variant="outlined"
              size="small"
              className={classes.notionField}
            />
            <AgentEditorChoicePicker
              label="Função"
              options={ROLE_CHOICES}
              value={v2.agent.role}
              onChange={(v) => updateAgent({ role: v })}
              emptyLabel="Escolher função…"
            />
            <AgentEditorChoicePicker
              label="Objetivo principal"
              options={OBJECTIVE_CHOICES}
              value={v2.agent.objective}
              onChange={(v) => updateAgent({ objective: v })}
              emptyLabel="Escolher objetivo…"
            />
            <AgentEditorChoicePicker
              label="Tom"
              options={FORMALITY_CHOICES}
              value={v2.agent.formality}
              onChange={(v) => updateAgent({ formality: v })}
              emptyLabel="Escolher tom…"
            />
            <AgentEditorChoicePicker
              label="Idioma"
              options={LANGUAGE_CHOICES}
              value={v2.agent.language}
              onChange={(v) => updateAgent({ language: v })}
              emptyLabel="Escolher idioma…"
            />
            <AgentEditorChoicePicker
              label="Estilo de escrita"
              options={WRITING_STYLE_CHOICES}
              value={v2.agent.writingStyle}
              onChange={(v) => updateAgent({ writingStyle: v })}
              emptyLabel="Escolher estilo…"
            />
            <AgentEditorChoicePicker
              label="Emojis nas respostas"
              options={EMOJI_TOGGLE_OPTIONS}
              value={v2.agent.emojisEnabled}
              onChange={(v) => updateAgent({ emojisEnabled: v })}
              emptyLabel="Escolher…"
            />
          </Paper>

          {tab === TAB_SCRIPT && (
            <Paper className={classes.settingsCard} elevation={0}>
              <Typography className={classes.cardTitle}>Fluxo</Typography>
              <TextField
                fullWidth
                label="Objetivo do roteiro"
                value={v2.attendance.settings.objective}
                onChange={(e) => updateAttendanceSettings({ objective: e.target.value })}
                margin="dense"
                variant="outlined"
                size="small"
                className={classes.notionField}
              />
              <TextField
                fullWidth
                label="Tipo de atendimento"
                value={v2.attendance.settings.serviceType}
                onChange={(e) => updateAttendanceSettings({ serviceType: e.target.value })}
                margin="dense"
                variant="outlined"
                size="small"
                className={classes.notionField}
              />
            </Paper>
          )}
        </Box>
        ) : null}
        </Box>
      </Box>
    </ActivitiesStyleLayout>
    </>
  );
}
