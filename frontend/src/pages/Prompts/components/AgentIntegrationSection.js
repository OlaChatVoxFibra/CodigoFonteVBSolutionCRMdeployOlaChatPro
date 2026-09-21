/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  Link,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
  makeStyles
} from "@material-ui/core";
import clsx from "clsx";
import { useHistory } from "react-router-dom";
import { Check, Trash2 } from "lucide-react";
import api from "../../../services/api";
import anthropicIntegrationService from "../../../services/anthropicIntegrationService";
import geminiIntegrationService from "../../../services/geminiIntegrationService";
import grokIntegrationService from "../../../services/grokIntegrationService";
import { isClaudeModelId } from "../../../providers/anthropic/models";
import { isGeminiModelId } from "../../../providers/gemini/models";
import { isGrokModelId } from "../../../providers/grok/models";
import GeminiIntegrationModal from "../../../providers/gemini/components/GeminiIntegrationModal";
import { buildAgentModelSelectGroups } from "../agentModelCatalog";
import {
  AgentModelOptionLabel,
  AiProviderGroupHeader,
  agentModelSelectMenuProps
} from "../../../components/AiProviderBrandLabels";
import IntegrationModelDetailPanel from "../../Connections/IntegrationModelDetailPanel";
import { AGENT_COLOR_PALETTE } from "../constants/agentColorPalette";

const QUEUE_SELECT_NONE = "__no_queue__";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const fieldBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)";
  return {
    root: {
      width: "100%",
      maxWidth: 1280,
      margin: "0 auto",
      boxSizing: "border-box",
      padding: theme.spacing(0, 0.5)
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: theme.spacing(2.5),
      alignItems: "start",
      width: "100%",
      [theme.breakpoints.up("md")]: {
        gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 400px)",
        columnGap: theme.spacing(3),
        rowGap: theme.spacing(2)
      }
    },
    leftCol: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(1.25),
      minWidth: 0,
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      paddingRight: theme.spacing(0.5)
    },
    rightCol: {
      minWidth: 300,
      width: "100%",
      maxWidth: 400,
      flexShrink: 0,
      justifySelf: "stretch",
      background: "transparent",
      boxShadow: "none",
      [theme.breakpoints.down("sm")]: {
        minWidth: 0,
        maxWidth: "none"
      }
    },
    section: {
      width: "100%",
      boxSizing: "border-box"
    },
    fieldLabel: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      marginBottom: 4,
      display: "block",
      padding: 0,
      marginLeft: 0
    },
    fieldHint: {
      fontSize: "0.6875rem",
      color: theme.palette.text.secondary,
      lineHeight: 1.4,
      marginBottom: 6,
      marginTop: -2
    },
    fieldHintSpacer: {
      height: "calc(0.6875rem * 1.4)",
      marginBottom: 6,
      marginTop: -2,
      flexShrink: 0
    },
    field: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 10,
        fontSize: "0.8125rem",
        background: fieldBg,
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        "& fieldset": {
          borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.1)"
        },
        "&:hover fieldset": {
          borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.16)"
        },
        "&.Mui-focused fieldset": {
          borderColor: isDark ? "rgba(255,255,255,0.28)" : "rgba(15,23,42,0.22)",
          borderWidth: 1
        }
      },
      "& .MuiInputLabel-root": { fontSize: "0.8125rem" },
      "& .MuiSelect-select": { paddingTop: 9, paddingBottom: 9 }
    },
    switchRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing(0.75, 0.25),
      minHeight: 40
    },
    switchLabel: {
      fontSize: "0.8125rem",
      color: theme.palette.text.primary,
      letterSpacing: "-0.01em"
    },
    warn: {
      fontSize: "0.75rem",
      lineHeight: 1.45,
      marginBottom: theme.spacing(0.5)
    },
    modelDetailWrap: {
      borderRadius: 16,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
      padding: theme.spacing(2.25, 2.5),
      boxSizing: "border-box",
      boxShadow: isDark
        ? "0 12px 40px rgba(0,0,0,0.22)"
        : "0 8px 32px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)",
      overflow: "hidden"
    },
    sectionBeforeColor: {
      marginTop: theme.spacing(2)
    },
    colorCard: {
      width: "100%",
      boxSizing: "border-box",
      borderRadius: 16,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.92)",
      padding: theme.spacing(2.5, 2.75),
      marginTop: 0,
      boxShadow: isDark ? "none" : "0 4px 20px rgba(15,23,42,0.04)"
    },
    colorPickerGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
      gap: 10,
      width: "100%",
      [theme.breakpoints.down("sm")]: {
        gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
        gap: 8
      }
    },
    colorSwatch: {
      width: "100%",
      aspectRatio: "1",
      maxWidth: 44,
      minHeight: 38,
      margin: "0 auto",
      borderRadius: 10,
      border: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.06)"}`,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
      boxSizing: "border-box",
      transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease",
      "&:hover": {
        transform: "scale(1.06)",
        opacity: 0.92
      },
      "&:active": {
        transform: "scale(0.96)"
      }
    },
    colorSwatchSelected: {
      boxShadow: isDark
        ? "0 0 0 2px rgba(255,255,255,0.85), 0 2px 8px rgba(0,0,0,0.25)"
        : "0 0 0 2px rgba(15,23,42,0.5), 0 2px 6px rgba(15,23,42,0.12)",
      borderColor: "transparent"
    },
    colorClearBtn: {
      width: 32,
      height: 32,
      padding: 5,
      opacity: 0.5,
      "&:hover": { opacity: 0.85 }
    },
    colorPreviewDot: {
      width: 28,
      height: 28,
      borderRadius: 8,
      flexShrink: 0,
      border: `1px solid ${border}`
    },
    colorPreviewRow: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginTop: 12
    },
    paramRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: theme.spacing(1),
      marginTop: theme.spacing(0.25)
    },
    providerSubheader: {
      display: "flex",
      alignItems: "center",
      lineHeight: 1.45,
      padding: theme.spacing(1.25, 2, 0.5),
      marginTop: theme.spacing(0.75),
      backgroundColor: isDark ? theme.palette.background.default : theme.palette.background.paper,
      "&:first-of-type": {
        marginTop: 0,
        paddingTop: theme.spacing(1)
      }
    },
    modelMenuItem: {
      minHeight: 44,
      padding: theme.spacing(1.25, 2)
    }
  };
});

function AgentColorPicker({ agentColor, onAgentColorChange, classes }) {
  return (
    <div className={clsx(classes.section, classes.sectionBeforeColor)}>
      <Typography className={classes.fieldLabel}>Cor do agente</Typography>
      <div className={classes.fieldHintSpacer} aria-hidden="true" />
      <Box className={classes.colorCard}>
      <Box className={classes.colorPickerGrid}>
        {AGENT_COLOR_PALETTE.map((c) => {
          const isSelected = agentColor === c.value;
          return (
            <Tooltip key={c.value} title={c.label} placement="top" arrow>
              <Box
                className={clsx(classes.colorSwatch, isSelected && classes.colorSwatchSelected)}
                style={{ backgroundColor: c.value }}
                onClick={() => onAgentColorChange?.(c.value)}
                role="button"
                tabIndex={0}
                aria-label={`Cor ${c.label}`}
                aria-pressed={isSelected}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onAgentColorChange?.(c.value);
                  }
                }}
              >
                {isSelected ? (
                  <Check
                    size={13}
                    strokeWidth={3}
                    color="#fff"
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                  />
                ) : null}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
      {agentColor ? (
        <Box className={classes.colorPreviewRow}>
          <Box className={classes.colorPreviewDot} style={{ backgroundColor: agentColor }} />
          <Typography variant="body2" style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
            {AGENT_COLOR_PALETTE.find((c) => c.value === agentColor)?.label || agentColor}
          </Typography>
          <IconButton
            className={classes.colorClearBtn}
            onClick={() => onAgentColorChange?.(null)}
            aria-label="Remover cor"
          >
            <Trash2 size={16} strokeWidth={1.75} />
          </IconButton>
        </Box>
      ) : null}
      </Box>
    </div>
  );
}

/**
 * Aba Integração no editor de agente — modelo, conexão, cor e painel do modelo (igual Conexões).
 */
export default function AgentIntegrationSection({
  model,
  responderGrupo = false,
  onModelChange,
  onResponderGrupoChange,
  provider = "auto",
  disabled = false,
  agentColor,
  onAgentColorChange,
  showColorPicker = false,
  queueId,
  queues = [],
  onQueueChange,
  temperature,
  topP,
  onTemperatureChange,
  onTopPChange,
  showModelParams = false
}) {
  const classes = useStyles();
  const history = useHistory();
  const [openAiSettings, setOpenAiSettings] = useState({
    apiKey: "",
    active: true,
    scope: "Pessoal",
    model: "gpt-5.5"
  });
  const [openAiHadKey, setOpenAiHadKey] = useState(false);
  const [claudeIntegration, setClaudeIntegration] = useState({
    enabled: false,
    scope: "Pessoal",
    defaultModel: "",
    apiKey: { hasKey: false }
  });
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [geminiIntegration, setGeminiIntegration] = useState({
    enabled: false,
    scope: "Pessoal",
    defaultModel: "",
    apiKey: { hasKey: false }
  });
  const [grokIntegration, setGrokIntegration] = useState({
    enabled: false,
    scope: "Pessoal",
    defaultModel: "",
    apiKey: { hasKey: false }
  });
  const [geminiModalOpen, setGeminiModalOpen] = useState(false);
  const [pendingGeminiModel, setPendingGeminiModel] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/settings/agent_integration");
        if (!alive) return;
        if (data?.value) {
          const v = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          setOpenAiSettings((prev) => ({
            ...prev,
            apiKey: v.apiKey || "",
            active: v.active !== false,
            scope: v.scope || "Pessoal",
            model: v.model || prev.model
          }));
          setOpenAiHadKey(Boolean(String(v.apiKey || "").trim()));
        }
      } catch {
        /* ignore */
      }
      try {
        const integration = await anthropicIntegrationService.getIntegration();
        if (!alive) return;
        setClaudeIntegration({
          enabled: Boolean(integration?.enabled),
          scope: integration?.scope || "Pessoal",
          defaultModel: integration?.defaultModel || "",
          apiKey: integration?.apiKey || { hasKey: false }
        });
      } catch {
        /* ignore */
      }
      try {
        const g = await geminiIntegrationService.getIntegration();
        if (!alive) return;
        setGeminiIntegration({
          enabled: Boolean(g?.enabled),
          scope: g?.scope || "Pessoal",
          defaultModel: g?.defaultModel || "",
          apiKey: g?.apiKey || { hasKey: false }
        });
      } catch {
        /* ignore */
      }
      try {
        const gk = await grokIntegrationService.getIntegration();
        if (!alive) return;
        setGrokIntegration({
          enabled: Boolean(gk?.enabled),
          scope: gk?.scope || "Pessoal",
          defaultModel: gk?.defaultModel || "",
          apiKey: gk?.apiKey || { hasKey: false }
        });
      } catch {
        /* ignore */
      }
      try {
        const { data } = await api.get("/whatsapp/");
        if (!alive) return;
        const ok =
          Array.isArray(data) &&
          data.some((w) => String(w.status || "").toUpperCase().includes("CONNECT"));
        setWhatsappConnected(ok);
      } catch {
        if (alive) setWhatsappConnected(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const showOpenAi = provider === "openai" || provider === "auto";
  const showClaude = provider === "anthropic" || provider === "auto";

  const openAiReady = openAiHadKey && openAiSettings.active !== false;
  const claudeHasKey = Boolean(claudeIntegration?.apiKey?.hasKey);
  const claudeReady = claudeHasKey && claudeIntegration?.enabled !== false;
  const geminiHasKey = Boolean(geminiIntegration?.apiKey?.hasKey);
  const geminiReady = geminiHasKey && geminiIntegration?.enabled !== false;
  const grokHasKey = Boolean(grokIntegration?.apiKey?.hasKey);
  const grokReady = grokHasKey && grokIntegration?.enabled !== false;

  const modelGroups = useMemo(
    () =>
      buildAgentModelSelectGroups({
        provider,
        openAiReady,
        claudeReady,
        geminiReady,
        grokReady,
        currentModelId: model
      }),
    [provider, openAiReady, claudeReady, geminiReady, grokReady, model]
  );

  const currentModel = String(model || "").trim();
  const isClaude = isClaudeModelId(currentModel);
  const isGemini = isGeminiModelId(currentModel);
  const isGrok = isGrokModelId(currentModel);
  const integrationPath = isGrok
    ? "/connections/grok/manage"
    : isGemini
      ? "/connections/gemini/manage"
      : isClaude
        ? "/connections/claude/manage"
        : "/connections/openai/manage";
  const integrationReady = isGrok
    ? grokReady
    : isGemini
      ? geminiReady
      : isClaude
        ? claudeReady
        : openAiReady;

  const handleModelChange = (next) => {
    const id = String(next || "").trim();
    if (!id) return;
    if (isGrokModelId(id) && !grokReady) {
      history.push("/connections/grok/manage");
      return;
    }
    if (isGeminiModelId(id) && !geminiReady) {
      setPendingGeminiModel(id);
      setGeminiModalOpen(true);
      return;
    }
    if (isClaudeModelId(id) && !claudeReady) {
      history.push("/connections/claude/manage");
      return;
    }
    if (
      !isClaudeModelId(id) &&
      !isGeminiModelId(id) &&
      !isGrokModelId(id) &&
      !openAiReady
    ) {
      history.push("/connections/openai/manage");
      return;
    }
    onModelChange?.(id);
  };

  const panelProvider = isGrok
    ? "grok"
    : isGemini
      ? "gemini"
      : isClaude
        ? "anthropic"
        : "openai";
  const openAiHasKey = openAiHadKey;

  return (
    <Box className={classes.root}>
      <div className={classes.grid}>
        <div className={classes.leftCol}>
          {!integrationReady ? (
            <Typography className={classes.warn} color="error">
              Configure a API em{" "}
              <Link
                component="button"
                variant="body2"
                onClick={() => history.push(integrationPath)}
                style={{ verticalAlign: "baseline", fontSize: "inherit" }}
              >
                Integrações →{" "}
                {isGrok ? "Grok" : isGemini ? "Gemini" : isClaude ? "Claude" : "Open IA"}
              </Link>
              .
            </Typography>
          ) : null}

          <div className={classes.section}>
            <Typography className={classes.fieldLabel}>Modelo</Typography>
            <Typography className={classes.fieldHint}>
              Chave da API em Integrações.
            </Typography>
            <FormControl
              fullWidth
              variant="outlined"
              size="small"
              className={classes.field}
              disabled={disabled}
            >
              <InputLabel id="agent-model-label">Modelo de IA</InputLabel>
              <Select
                labelId="agent-model-label"
                label="Modelo de IA"
                value={currentModel || ""}
                onChange={(e) => handleModelChange(e.target.value)}
                MenuProps={agentModelSelectMenuProps}
                renderValue={(v) =>
                  v ? <AgentModelOptionLabel modelId={v} variant="field" /> : ""
                }
              >
                {modelGroups.map((group) => [
                  <ListSubheader
                    key={`h-${group.label}`}
                    className={classes.providerSubheader}
                    disableSticky
                  >
                    <AiProviderGroupHeader
                      provider={group.provider}
                      label={group.label}
                      suffix={
                        group.disabled
                          ? group.provider === "grok"
                            ? " · conecte em Integrações → Grok"
                            : group.provider === "gemini"
                            ? " · conecte em Integrações → Gemini"
                            : group.provider === "anthropic"
                              ? " · conecte em Integrações → Claude"
                              : " · conecte em Integrações → Open IA"
                          : undefined
                      }
                    />
                  </ListSubheader>,
                  ...group.models.map((m) => (
                    <MenuItem
                      key={m}
                      value={m}
                      disabled={Boolean(group.disabled)}
                      className={classes.modelMenuItem}
                    >
                      <AgentModelOptionLabel modelId={m} />
                    </MenuItem>
                  ))
                ])}
              </Select>
            </FormControl>
          </div>

          <div className={classes.switchRow}>
            <Typography className={classes.switchLabel}>Responder em grupos do WhatsApp</Typography>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  color="primary"
                  checked={Boolean(responderGrupo)}
                  onChange={(e) => onResponderGrupoChange?.(e.target.checked)}
                  disabled={disabled}
                />
              }
              label=""
            />
          </div>

          {onQueueChange ? (
            <div className={classes.section}>
              <Typography className={classes.fieldLabel}>Fila padrão</Typography>
              <Typography className={classes.fieldHint}>WhatsApp deste agente.</Typography>
              <TextField
                fullWidth
                select
                label="Fila"
                value={queueId != null && queueId !== "" ? String(queueId) : QUEUE_SELECT_NONE}
                onChange={(e) => {
                  const raw = e.target.value;
                  onQueueChange(raw === QUEUE_SELECT_NONE ? null : Number(raw));
                }}
                variant="outlined"
                size="small"
                className={classes.field}
                SelectProps={{
                  renderValue: (selected) => {
                    if (selected === QUEUE_SELECT_NONE) {
                      return (
                        <span style={{ color: "inherit", opacity: 0.65 }}>Sem fila padrão</span>
                      );
                    }
                    const q = queues.find((x) => String(x.id) === String(selected));
                    return q?.name || String(selected);
                  }
                }}
              >
                <MenuItem value={QUEUE_SELECT_NONE}>
                  <em>Sem fila padrão</em>
                </MenuItem>
                {queues.map((q) => (
                  <MenuItem key={q.id} value={String(q.id)}>
                    {q.name}
                  </MenuItem>
                ))}
              </TextField>
            </div>
          ) : null}

          {showModelParams ? (
            <div>
              <Typography className={classes.fieldLabel}>Parâmetros</Typography>
              <div className={classes.paramRow}>
                <TextField
                  label="Temperature"
                  type="number"
                  fullWidth
                  size="small"
                  variant="outlined"
                  className={classes.field}
                  inputProps={{ step: 0.1, min: 0, max: 2 }}
                  value={temperature}
                  onChange={(e) => onTemperatureChange?.(Number(e.target.value))}
                />
                <TextField
                  label="Top P"
                  type="number"
                  fullWidth
                  size="small"
                  variant="outlined"
                  className={classes.field}
                  inputProps={{ step: 0.01, min: 0, max: 1 }}
                  value={topP}
                  onChange={(e) => onTopPChange?.(Number(e.target.value))}
                />
              </div>
            </div>
          ) : null}

          {showColorPicker ? (
            <AgentColorPicker
              agentColor={agentColor}
              onAgentColorChange={onAgentColorChange}
              classes={classes}
            />
          ) : null}
        </div>

        <Paper className={classes.rightCol} elevation={0}>
          <Box className={classes.modelDetailWrap}>
            {currentModel ? (
              <IntegrationModelDetailPanel
                provider={panelProvider}
                model={currentModel}
                scope={
                  isGrok
                    ? grokIntegration.scope
                    : isGemini
                    ? geminiIntegration.scope
                    : isClaude
                      ? claudeIntegration.scope
                      : openAiSettings.scope
                }
                active={openAiSettings.active !== false}
                enabled={
                  isGrok
                    ? grokIntegration.enabled
                    : isGemini
                      ? geminiIntegration.enabled
                      : claudeIntegration.enabled
                }
                responderGrupo={responderGrupo}
                hasKey={
                  isGrok
                    ? grokHasKey
                    : isGemini
                      ? geminiHasKey
                      : isClaude
                        ? claudeHasKey
                        : openAiHasKey
                }
                hadKey={
                  isGrok
                    ? grokHasKey
                    : isGemini
                      ? geminiHasKey
                      : isClaude
                        ? claudeHasKey
                        : openAiHadKey
                }
                whatsappConnected={whatsappConnected}
                openAiModel={openAiSettings.model}
                openAiHasKey={openAiHasKey}
                openAiActive={openAiSettings.active !== false}
                showAgentsHint={false}
              />
            ) : (
              <Typography variant="body2" color="textSecondary" style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
                Selecione um modelo para ver especificações, preços e status da conexão.
              </Typography>
            )}
          </Box>
        </Paper>
      </div>
      <GeminiIntegrationModal
        open={geminiModalOpen}
        onClose={() => {
          setGeminiModalOpen(false);
          setPendingGeminiModel("");
        }}
        initialModel={pendingGeminiModel || currentModel}
        onSaved={async () => {
          try {
            const g = await geminiIntegrationService.getIntegration();
            setGeminiIntegration({
              enabled: Boolean(g?.enabled),
              scope: g?.scope || "Pessoal",
              defaultModel: g?.defaultModel || "",
              apiKey: g?.apiKey || { hasKey: false }
            });
            if (pendingGeminiModel) {
              onModelChange?.(pendingGeminiModel);
            }
          } catch {
            /* ignore */
          }
          setGeminiModalOpen(false);
          setPendingGeminiModel("");
        }}
      />
    </Box>
  );
}
