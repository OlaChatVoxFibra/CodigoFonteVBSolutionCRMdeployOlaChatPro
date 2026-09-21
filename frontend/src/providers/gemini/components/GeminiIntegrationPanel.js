/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import { toast } from "react-toastify";
import useGeminiIntegration from "../../../hooks/useGeminiIntegration";
import geminiIntegrationService from "../../../services/geminiIntegrationService";
import { GEMINI_MODEL_IDS, geminiModelLabel } from "../geminiModelCatalog";
import { useIntegrationTabStyles } from "../../../pages/Prompts/integrationTabStyles";
import GeminiIntegrationSidePanel from "./GeminiIntegrationSidePanel";

const GEMINI_TABS = [
  { value: "integracao", label: "Integração" },
  { value: "ferramentas", label: "Ferramentas" },
  { value: "multimodal", label: "Multimodal" }
];

const usePanelStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)";
  const textPrimary = theme.palette.text.primary;
  const tabBrand =
    theme.pageTabsAccent != null && theme.pageTabsAccent !== ""
      ? theme.pageTabsAccent
      : theme.palette.primary.main;
  const navTabColor = isDark ? textPrimary : tabBrand;
  const tabHoverBg = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)";
  const tabActiveBg = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)";
  const strongBlue = "#1e3a8a";

  return {
    root: { display: "flex", flexDirection: "column", minHeight: 420 },
    tabBar: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing(0.5),
      padding: theme.spacing(1, 2, 1.25),
      flexShrink: 0,
      borderBottom: `1px solid ${border}`
    },
    navTab: {
      textTransform: "none",
      fontSize: "0.875rem",
      fontWeight: 400,
      color: navTabColor,
      minWidth: "auto",
      padding: theme.spacing(0.75, 1.75),
      borderRadius: 8,
      backgroundColor: "transparent",
      border: "none",
      cursor: "pointer",
      transition: "all 0.15s ease",
      "&:hover": {
        backgroundColor: tabHoverBg,
        color: isDark ? "#ffffff" : navTabColor
      }
    },
    navTabActive: {
      fontWeight: 500,
      color: isDark ? "#ffffff" : navTabColor,
      backgroundColor: isDark ? `${strongBlue}30` : tabActiveBg,
      boxShadow: isDark
        ? "0 2px 4px rgba(0, 0, 0, 0.35)"
        : "0 2px 4px rgba(15, 23, 42, 0.08)",
      "&:hover": {
        backgroundColor: isDark ? `${strongBlue}40` : tabActiveBg,
        color: isDark ? "#ffffff" : navTabColor
      }
    },
    body: {
      flex: 1,
      overflow: "auto",
      padding: theme.spacing(2, 2.5),
      ...theme.scrollbarStyles
    },
    layout: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: theme.spacing(2.5),
      alignItems: "start",
      [theme.breakpoints.up("md")]: {
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, min(42vw, 400px))",
        gap: theme.spacing(2, 3)
      },
      [theme.breakpoints.up("lg")]: {
        gridTemplateColumns: "minmax(320px, 1fr) minmax(300px, 420px)",
        gap: theme.spacing(2.5, 4)
      }
    },
    asideCol: {
      minWidth: 0,
      width: "100%"
    },
    section: {
      borderRadius: 14,
      border: `1px solid ${border}`,
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2),
      background: isDark ? "rgba(255,255,255,0.03)" : "#fff"
    },
    footer: {
      display: "flex",
      justifyContent: "flex-end",
      gap: theme.spacing(1),
      padding: theme.spacing(1.5, 2.5),
      borderTop: `1px solid ${border}`,
      flexShrink: 0
    },
    testResult: {
      marginTop: theme.spacing(1.5),
      padding: theme.spacing(1.5),
      borderRadius: 10,
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)",
      fontSize: 13,
      whiteSpace: "pre-wrap",
      wordBreak: "break-word"
    }
  };
});

const DEFAULT_CAPABILITIES = {
  functionCalling: true,
  grounding: false,
  search: false,
  vision: true,
  audioUnderstanding: true,
  videoUnderstanding: true,
  fileProcessing: true,
  structuredOutput: true,
  jsonMode: true
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const base64 = raw.includes(",") ? raw.split(",")[1] : raw;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function GeminiIntegrationPanel({
  onCancel,
  onSaved,
  initialModel = "",
  hideFooter = false
}) {
  const classes = usePanelStyles();
  const intClasses = useIntegrationTabStyles();
  const theme = useTheme();
  const gemini = useGeminiIntegration();
  const [tab, setTab] = useState("integracao");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [apiHint, setApiHint] = useState({ hasKey: false, last4: "" });
  const [state, setState] = useState({
    enabled: false,
    apiKey: "",
    defaultModel: initialModel || "gemini-2.5-flash",
    scope: "Pessoal",
    temperature: 1,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
    multimodalEnabled: true,
    toolsEnabled: true,
    groundingEnabled: false,
    capabilities: { ...DEFAULT_CAPABILITIES }
  });
  const [testPrompt, setTestPrompt] = useState("Olá! Responda em uma frase que a conexão Gemini está funcionando.");
  const [testResult, setTestResult] = useState(null);
  const [mmFiles, setMmFiles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await geminiIntegrationService.getIntegration();
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          enabled: Boolean(data?.enabled),
          defaultModel: initialModel || data?.defaultModel || prev.defaultModel,
          scope: data?.scope || prev.scope,
          temperature: Number(data?.temperature ?? prev.temperature),
          topP: Number(data?.topP ?? prev.topP),
          topK: Number(data?.topK ?? prev.topK),
          maxOutputTokens: Number(data?.maxOutputTokens ?? prev.maxOutputTokens),
          multimodalEnabled: data?.multimodalEnabled !== false,
          toolsEnabled: data?.toolsEnabled !== false,
          groundingEnabled: Boolean(data?.groundingEnabled),
          capabilities: { ...DEFAULT_CAPABILITIES, ...(data?.capabilities || {}) }
        }));
        setApiHint(data?.apiKey || { hasKey: false, last4: "" });
      } catch {
        if (!cancelled) {
          toast.error("Não foi possível carregar integração Gemini.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialModel]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: state.enabled,
        defaultModel: state.defaultModel,
        scope: state.scope,
        temperature: state.temperature,
        topP: state.topP,
        topK: state.topK,
        maxOutputTokens: state.maxOutputTokens,
        multimodalEnabled: state.multimodalEnabled,
        toolsEnabled: state.toolsEnabled,
        groundingEnabled: state.groundingEnabled,
        capabilities: {
          ...state.capabilities,
          grounding: state.groundingEnabled || state.capabilities.grounding
        }
      };
      if (String(state.apiKey || "").trim()) {
        payload.apiKey = String(state.apiKey).trim();
      }
      const saved = await gemini.saveIntegration(payload);
      setApiHint(saved?.apiKey || apiHint);
      setState((p) => ({ ...p, apiKey: "" }));
      if (saved?.saveWarning) toast.warn(saved.saveWarning);
      else toast.success("Integração Gemini salva.");
      onSaved?.(saved);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erro ao salvar Gemini.");
    }
    setSaving(false);
  };

  const runTest = async (multimodal = false) => {
    setTesting(true);
    setTestResult(null);
    try {
      const parts = [];
      const files = multimodal ? mmFiles : [];
      for (const f of files) {
        if (!f) continue;
        parts.push({
          mimeType: f.type || "application/octet-stream",
          data: await fileToBase64(f)
        });
      }
      const fn = multimodal && parts.length ? gemini.multimodalTest : gemini.testIntegration;
      const result = await fn({
        prompt: testPrompt,
        model: state.defaultModel,
        maxTokens: state.maxOutputTokens,
        temperature: state.temperature,
        apiKey: String(state.apiKey || "").trim() || undefined,
        parts: parts.length ? parts : undefined
      });
      setTestResult(result);
      if (result?.ok) toast.success(`Gemini OK · ${result.latencyMs}ms`);
      else toast.error(result?.error || "Teste falhou");
    } catch (e) {
      setTestResult({ ok: false, error: e?.message || "Erro no teste" });
      toast.error("Erro ao testar Gemini.");
    }
    setTesting(false);
  };

  const capToggles = useMemo(
    () => [
      ["functionCalling", "Function Calling"],
      ["grounding", "Grounding"],
      ["search", "Search"],
      ["vision", "Vision"],
      ["audioUnderstanding", "Áudio"],
      ["videoUnderstanding", "Vídeo"],
      ["fileProcessing", "Arquivos / PDF"],
      ["structuredOutput", "Structured Output"],
      ["jsonMode", "JSON Mode"]
    ],
    []
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={320}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box className={classes.root}>
      <Box className={classes.tabBar} role="tablist" aria-label="Seções Gemini">
        {GEMINI_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            className={`${classes.navTab} ${tab === t.value ? classes.navTabActive : ""}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </Box>

      <Box className={classes.body}>
        <Box className={classes.layout}>
          <Box>
            {tab === "integracao" && (
              <Box className={classes.section}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.enabled}
                      onChange={(e) => setState((p) => ({ ...p, enabled: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label="Ativo"
                />
                <TextField
                  fullWidth
                  margin="dense"
                  className={intClasses.inputDense}
                  label="API Key (Google AI Studio)"
                  type={showKey ? "text" : "password"}
                  value={state.apiKey}
                  placeholder={apiHint.hasKey ? `••••••••${apiHint.last4}` : ""}
                  onChange={(e) => setState((p) => ({ ...p, apiKey: e.target.value }))}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowKey((s) => !s)}>
                          {showKey ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
                <Grid container spacing={2} style={{ marginTop: 8 }}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="dense" variant="outlined" className={intClasses.inputDense}>
                      <InputLabel>Modelo padrão</InputLabel>
                      <Select
                        value={state.defaultModel}
                        onChange={(e) => setState((p) => ({ ...p, defaultModel: e.target.value }))}
                        label="Modelo padrão"
                      >
                        {GEMINI_MODEL_IDS.map((m) => (
                          <MenuItem key={m} value={m}>
                            {geminiModelLabel(m)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth margin="dense" variant="outlined" className={intClasses.inputDense}>
                      <InputLabel>Escopo</InputLabel>
                      <Select
                        value={state.scope}
                        onChange={(e) => setState((p) => ({ ...p, scope: e.target.value }))}
                        label="Escopo"
                      >
                        <MenuItem value="Pessoal">Pessoal</MenuItem>
                        <MenuItem value="Empresa">Empresa</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      margin="dense"
                      type="number"
                      label="Temperature"
                      className={intClasses.inputDense}
                      value={state.temperature}
                      onChange={(e) => setState((p) => ({ ...p, temperature: Number(e.target.value) }))}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      margin="dense"
                      type="number"
                      label="Top P"
                      className={intClasses.inputDense}
                      value={state.topP}
                      onChange={(e) => setState((p) => ({ ...p, topP: Number(e.target.value) }))}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      margin="dense"
                      type="number"
                      label="Top K"
                      className={intClasses.inputDense}
                      value={state.topK}
                      onChange={(e) => setState((p) => ({ ...p, topK: Number(e.target.value) }))}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      fullWidth
                      margin="dense"
                      type="number"
                      label="Max tokens"
                      className={intClasses.inputDense}
                      value={state.maxOutputTokens}
                      onChange={(e) =>
                        setState((p) => ({ ...p, maxOutputTokens: Number(e.target.value) }))
                      }
                    />
                  </Grid>
                </Grid>
                <Box mt={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={state.groundingEnabled}
                        onChange={(e) =>
                          setState((p) => ({ ...p, groundingEnabled: e.target.checked }))
                        }
                        color="primary"
                      />
                    }
                    label="Grounding"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={state.toolsEnabled}
                        onChange={(e) => setState((p) => ({ ...p, toolsEnabled: e.target.checked }))}
                        color="primary"
                      />
                    }
                    label="Tools"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={state.multimodalEnabled}
                        onChange={(e) =>
                          setState((p) => ({ ...p, multimodalEnabled: e.target.checked }))
                        }
                        color="primary"
                      />
                    }
                    label="Multimodal"
                  />
                </Box>
                <Box mt={2} pt={1} borderTop={`1px solid ${theme.palette.divider}`}>
                  <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
                    Valida a API Key da organização com o modelo padrão selecionado.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={testing}
                    onClick={() => runTest(false)}
                    style={{ textTransform: "none", borderRadius: 8, color: theme.palette.text.primary }}
                  >
                    {testing ? <CircularProgress size={20} /> : "Testar conexão"}
                  </Button>
                  {testResult && tab === "integracao" ? (
                    <Box className={classes.testResult}>
                      <Typography variant="caption" color="textSecondary">
                        HTTP {testResult.httpStatus} · {testResult.latencyMs}ms · {testResult.model}
                      </Typography>
                      {testResult.ok ? (
                        <Typography variant="body2" style={{ marginTop: 8, color: theme.palette.text.primary }}>
                          {testResult.response}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="error" style={{ marginTop: 8 }}>
                          {testResult.error}
                        </Typography>
                      )}
                    </Box>
                  ) : null}
                </Box>
              </Box>
            )}

            {tab === "ferramentas" && (
              <Box className={classes.section}>
                <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
                  Capabilities do Gemini — salvas isoladamente nesta integração.
                </Typography>
                {capToggles.map(([key, label]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Switch
                        checked={Boolean(state.capabilities[key])}
                        onChange={(e) =>
                          setState((p) => ({
                            ...p,
                            capabilities: { ...p.capabilities, [key]: e.target.checked }
                          }))
                        }
                        color="primary"
                      />
                    }
                    label={label}
                  />
                ))}
              </Box>
            )}

            {tab === "multimodal" && (
              <Box className={classes.section}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Envie imagens, vídeos, PDFs ou áudio para testar multimodal.
                </Typography>
                <Button variant="outlined" component="label" size="small">
                  Adicionar arquivos
                  <input
                    hidden
                    multiple
                    type="file"
                    accept="image/*,video/*,audio/*,application/pdf"
                    onChange={(e) => setMmFiles(Array.from(e.target.files || []))}
                  />
                </Button>
                {mmFiles.length ? (
                  <Typography variant="caption" display="block" style={{ marginTop: 8 }}>
                    {mmFiles.map((f) => f.name).join(", ")}
                  </Typography>
                ) : null}
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  margin="dense"
                  className={intClasses.inputDense}
                  label="Instrução"
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  style={{ marginTop: 12 }}
                />
                <Box mt={2}>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={testing || !mmFiles.length}
                    onClick={() => runTest(true)}
                    style={{ textTransform: "none", borderRadius: 8, color: theme.palette.text.primary }}
                  >
                    {testing ? <CircularProgress size={20} /> : "Testar multimodal"}
                  </Button>
                </Box>
                {testResult && tab === "multimodal" ? (
                  <Box className={classes.testResult}>
                    <Typography variant="body2" style={{ color: theme.palette.text.primary }}>
                      {testResult.ok ? testResult.response : testResult.error}
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            )}
          </Box>

          <Box className={classes.asideCol}>
            <GeminiIntegrationSidePanel
              defaultModel={state.defaultModel}
              scope={state.scope}
              enabled={state.enabled}
              hasGeminiKey={apiHint.hasKey || Boolean(String(state.apiKey || "").trim())}
              showAgentsHint={false}
              wrapPaper={false}
            />
          </Box>
        </Box>
      </Box>

      {!hideFooter ? (
        <Box className={classes.footer}>
          {onCancel ? (
            <Button onClick={onCancel} disabled={saving}>
              Cancelar
            </Button>
          ) : null}
          <Button color="primary" variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={22} /> : "Salvar integração"}
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}
