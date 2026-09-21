/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  IconButton
} from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import { toast } from "react-toastify";
import ConnectionSetupSection, { ConnectionSetupFormShell } from "../ConnectionSetupSection";
import useAnthropicIntegration from "../../../hooks/useAnthropicIntegration";
import { CLAUDE_MODEL_IDS, claudeModelLabel } from "../../../providers/anthropic/models";
import AiProviderSetupPanel from "../AiProviderSetupPanel";
import { useIntegrationTabStyles } from "../../Prompts/integrationTabStyles";
import AnthropicIntegrationSidePanel from "../../Prompts/components/AnthropicIntegrationSidePanel";
import api from "../../../services/api";

const useSetupStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  return {
    body: {
      padding: theme.spacing(0, 2.5, 1),
      maxHeight: "calc(92vh - 160px)",
      overflowY: "auto",
      ...theme.scrollbarStyles
    },
    sectionCard: {
      borderRadius: 16,
      padding: theme.spacing(1.5, 1.75),
      marginBottom: theme.spacing(1.25),
      background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
      border: `1px solid ${border}`,
      boxShadow: isDark ? "none" : "0 4px 24px rgba(15,23,42,0.06)"
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(1)
    },
    footer: {
      display: "flex",
      justifyContent: "flex-end",
      gap: theme.spacing(1),
      padding: theme.spacing(1.5, 2.5),
      borderTop: `1px solid ${border}`,
      background: isDark ? "rgba(22,22,24,0.98)" : "#fff"
    },
    fieldStack: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(2.5)
    },
    integrationGrid: {
      alignItems: "flex-start"
    },
    rightCol: {
      position: "sticky",
      top: theme.spacing(1),
      [theme.breakpoints.down("sm")]: {
        position: "static",
        marginTop: theme.spacing(2)
      }
    }
  };
});

function FormSection({ title, children, promptsModal, pmClasses }) {
  if (promptsModal) {
    return (
      <Box className={pmClasses.sectionCard}>
        <Typography className={pmClasses.sectionTitle}>{title}</Typography>
        {children}
      </Box>
    );
  }
  return <ConnectionSetupSection title={title}>{children}</ConnectionSetupSection>;
}

const DEFAULT_STATE = {
  enabled: false,
  apiKey: "",
  defaultModel: "claude-sonnet-4-5-20250929",
  scope: "Pessoal",
  temperature: 1,
  topP: 1,
  presencePenalty: 0,
  frequencyPenalty: 0,
  stopSequences: ""
};

export default function AnthropicConnectionSetupForm({
  onCancel,
  onSaved,
  hidePageHeader = false,
  isEdit = false,
  initialModel = "",
  presentation = "connections"
}) {
  const isPromptsModal = presentation === "promptsModal";
  const pm = useSetupStyles();
  const intClasses = useIntegrationTabStyles();
  const theme = useTheme();
  const fieldClass = intClasses.inputDense;
  const selectClass = `${intClasses.inputDense} ${intClasses.selectWhite}`;
  const anthropic = useAnthropicIntegration();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [state, setState] = useState(DEFAULT_STATE);
  const [openAiModel, setOpenAiModel] = useState("gpt-5.5");
  const [openAiHasKey, setOpenAiHasKey] = useState(false);
  const [openAiActive, setOpenAiActive] = useState(true);
  const [apiHint, setApiHint] = useState({ hasKey: false, last4: "" });
  const checklist = useMemo(() => ({
    hasClaudeKey: Boolean(String(state.apiKey || "").trim()) || apiHint.hasKey,
    modelSelected: Boolean(String(state.defaultModel || "").trim())
  }), [state.apiKey, apiHint.hasKey, state.defaultModel]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const integration = await anthropic.getIntegration();
      setState((prev) => ({
        ...prev,
        enabled: Boolean(integration?.enabled),
        defaultModel: integration?.defaultModel || prev.defaultModel,
        scope: integration?.scope || prev.scope,
        temperature: Number(integration?.temperature ?? prev.temperature),
        topP: Number(integration?.topP ?? prev.topP),
        presencePenalty: Number(integration?.presencePenalty ?? prev.presencePenalty),
        frequencyPenalty: Number(integration?.frequencyPenalty ?? prev.frequencyPenalty),
        stopSequences: integration?.stopSequences || ""
      }));
      setApiHint(integration?.apiKey || { hasKey: false, last4: "" });
      try {
        const { data: sett } = await api.get("/settings/agent_integration");
        if (sett?.value) {
          const v = typeof sett.value === "string" ? JSON.parse(sett.value) : sett.value;
          setOpenAiModel(String(v.model || "gpt-5.5").replace(/^anthropic:/, "") || "gpt-5.5");
          setOpenAiHasKey(Boolean(String(v.apiKey || "").trim()));
          setOpenAiActive(v.active !== false);
        }
      } catch {
        /* ignore */
      }
    } catch {
      toast.error("Não foi possível carregar a integração Claude.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const picked = String(initialModel || "").trim();
    if (!picked) return;
    setState((prev) => ({ ...prev, defaultModel: picked }));
  }, [initialModel]);

  const saveIntegration = async () => {
    setSaving(true);
    try {
      const payload = { ...state, enabled: true };
      const data = await anthropic.saveIntegration(payload);
      if (data?.saveWarning) {
        toast.warning(data.saveWarning, { autoClose: 12000 });
      } else {
        toast.success("Integração Claude salva.");
      }
      await loadAll();
      onSaved?.();
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message;
      toast.error(msg || "Falha ao salvar integração Claude.");
    } finally {
      setSaving(false);
    }
  };

  const integrationRightPanel = (
    <Box className={pm.rightCol}>
      <AnthropicIntegrationSidePanel
        classes={intClasses}
        defaultModel={state.defaultModel}
        scope={state.scope}
        enabled={state.enabled}
        hasAnthropicKey={checklist.hasClaudeKey}
        openAiModel={openAiModel}
        openAiHasKey={openAiHasKey}
        openAiActive={openAiActive}
      />
    </Box>
  );

  const footerButtons = (
    <>
      <Button onClick={onCancel} color="default" style={{ textTransform: "none" }}>
        Voltar
      </Button>
      <Button
        color="primary"
        variant="contained"
        disabled={saving}
        onClick={saveIntegration}
        style={{ textTransform: "none", boxShadow: "none" }}
      >
        Salvar integração
      </Button>
    </>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  const formBody = (
    <>
        <Grid container spacing={2} className={pm.integrationGrid}>
          <Grid item xs={12} md={6}>
            <FormSection title="Integração Claude" promptsModal={isPromptsModal} pmClasses={pm}>
              <Box className={pm.fieldStack}>
              <Box className={intClasses.switchRow}>
                <Typography variant="body2" style={{ color: theme.palette.text.primary }}>Ativo</Typography>
                <Switch
                  checked={Boolean(state.enabled)}
                  onChange={(e) => setState((p) => ({ ...p, enabled: e.target.checked }))}
                  color="primary"
                />
              </Box>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                label="API Key"
                type={showApiKey ? "text" : "password"}
                value={state.apiKey}
                onChange={(e) => setState((p) => ({ ...p, apiKey: e.target.value }))}
                helperText={apiHint.hasKey && !state.apiKey ? `Chave salva (****${apiHint.last4 || ""}). Preencha apenas para trocar.` : ""}
                className={fieldClass}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowApiKey((s) => !s)}>
                        {showApiKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <FormControl fullWidth variant="outlined" size="small" className={selectClass}>
                <InputLabel>Modelo padrão</InputLabel>
                <Select
                  value={state.defaultModel}
                  onChange={(e) => setState((p) => ({ ...p, defaultModel: e.target.value }))}
                  label="Modelo padrão"
                >
                  {CLAUDE_MODEL_IDS.map((m) => (
                    <MenuItem key={m} value={m}>
                      {claudeModelLabel(m)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth variant="outlined" size="small" className={selectClass}>
                <InputLabel>Escopo</InputLabel>
                <Select
                  value={state.scope}
                  onChange={(e) => setState((p) => ({ ...p, scope: e.target.value }))}
                  label="Escopo"
                >
                  <MenuItem value="Pessoal">Pessoal</MenuItem>
                  <MenuItem value="Equipe">Equipe</MenuItem>
                  <MenuItem value="Global">Global</MenuItem>
                </Select>
              </FormControl>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField label="Temperature" fullWidth variant="outlined" size="small" type="number" className={fieldClass} inputProps={{ step: "0.1", min: "0", max: "2" }} value={state.temperature} onChange={(e) => setState((p) => ({ ...p, temperature: Number(e.target.value) }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Top P" fullWidth variant="outlined" size="small" type="number" className={fieldClass} inputProps={{ step: "0.01", min: "0", max: "1" }} value={state.topP} onChange={(e) => setState((p) => ({ ...p, topP: Number(e.target.value) }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Presence Penalty" fullWidth variant="outlined" size="small" type="number" className={fieldClass} value={state.presencePenalty} onChange={(e) => setState((p) => ({ ...p, presencePenalty: Number(e.target.value) }))} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Frequency Penalty" fullWidth variant="outlined" size="small" type="number" className={fieldClass} value={state.frequencyPenalty} onChange={(e) => setState((p) => ({ ...p, frequencyPenalty: Number(e.target.value) }))} />
                </Grid>
              </Grid>
              <TextField
                label="Stop Sequences"
                fullWidth
                variant="outlined"
                size="small"
                className={fieldClass}
                value={state.stopSequences}
                onChange={(e) => setState((p) => ({ ...p, stopSequences: e.target.value }))}
              />
              </Box>
            </FormSection>
          </Grid>
          <Grid item xs={12} md={6}>
            {integrationRightPanel}
          </Grid>
        </Grid>
    </>
  );

  if (isPromptsModal) {
    return (
      <>
        <Box className={pm.body}>
          {formBody}
        </Box>
        <Box className={pm.footer}>{footerButtons}</Box>
      </>
    );
  }

  return (
    <AiProviderSetupPanel
      provider="anthropic"
      loading={loading}
      saving={saving}
      state={state}
      setState={setState}
      showApiKey={showApiKey}
      setShowApiKey={setShowApiKey}
      hadKey={apiHint.hasKey}
      onSave={saveIntegration}
    />
  );
}
