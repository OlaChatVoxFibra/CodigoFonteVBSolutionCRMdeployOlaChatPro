/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import SectionCard from "./shared/SectionCard";
import useAnthropicIntegration from "../../../hooks/useAnthropicIntegration";
import { CLAUDE_MODEL_IDS, claudeModelLabel } from "../../../providers/anthropic/models";
import { useIntegrationTabStyles } from "../integrationTabStyles";
import IntegrationBrandIcon from "../../Connections/IntegrationBrandIcon";

const useStyles = makeStyles((theme) => ({
  intro: {
    padding: theme.spacing(2),
    borderRadius: 12,
    marginBottom: theme.spacing(2),
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(217,119,87,0.25)"
        : "1px solid rgba(217,119,87,0.35)",
    background:
      theme.palette.type === "dark" ? "rgba(217,119,87,0.08)" : "rgba(217,119,87,0.06)"
  },
  tabsRoot: {
    marginBottom: theme.spacing(2),
    borderBottom:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15,23,42,0.08)",
    minHeight: 44
  },
  tab: {
    textTransform: "none",
    minHeight: 44,
    minWidth: 100,
    fontWeight: 500,
    fontSize: 13,
    color:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.55)" : theme.palette.text.secondary,
    opacity: 1,
    "&$tabSelected": {
      color: theme.palette.type === "dark" ? "#ffffff" : theme.palette.text.primary,
      fontWeight: 600
    }
  },
  tabSelected: {},
  tabIndicator: {
    backgroundColor: theme.palette.type === "dark" ? "#ffffff" : theme.palette.primary.main,
    height: 2
  },
  resultBox: {
    padding: theme.spacing(1.5),
    borderRadius: 10,
    marginTop: theme.spacing(1.5),
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15,23,42,0.08)",
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)"
  }
}));

export default function ClaudeConnectionTab() {
  const classes = useStyles();
  const intClasses = useIntegrationTabStyles();
  const anthropic = useAnthropicIntegration();
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [defaultModel, setDefaultModel] = useState("claude-sonnet-4-5-20250929");
  const [testForm, setTestForm] = useState({
    prompt: "Explique em 3 linhas como melhorar conversão em funil de vendas B2B.",
    model: "claude-sonnet-4-5-20250929",
    maxTokens: 512,
    temperature: 0.7
  });

  const load = async () => {
    setLoading(true);
    try {
      const integration = await anthropic.getIntegration();
      const m = integration?.defaultModel || "claude-sonnet-4-5-20250929";
      setDefaultModel(m);
      setTestForm((p) => ({ ...p, model: m }));
    } catch {
      toast.error("Carregue a integração Claude na aba Integração antes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const out = await anthropic.testIntegration(testForm);
      setTestResult(out);
      if (out?.ok) toast.success("Teste Claude concluído.");
      else toast.error(out?.error || "Teste retornou falha.");
    } catch {
      toast.error("Falha no teste Claude.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <div className={`${intClasses.mainPaper} ${intClasses.mainPaperTight} ${intClasses.integrationTabRoot}`}>
      <Box className={classes.intro}>
        <Box display="flex" alignItems="flex-start" gap={2}>
          <IntegrationBrandIcon brandKey="claude" variant="table" plain accentColor="#D97757" />
          <Box>
            <Typography style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
              Conexão Claude — teste da API
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph style={{ marginBottom: 8 }}>
              Na aba <strong>Integração</strong>, escolha um modelo Claude no seletor e salve a API Key Anthropic.
              Use este playground para validar a chave antes de ativar no atendimento.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Modelo padrão salvo: <strong>{claudeModelLabel(defaultModel)}</strong>. Crie e edite agentes Claude na
              aba <strong>Agentes</strong> (botão + → Anthropic Claude). Vincule em{" "}
              <strong>Integrações</strong>.
            </Typography>
          </Box>
        </Box>
      </Box>

      <SectionCard>
          <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: 12 }}>
            Playground Claude
          </Typography>
          <TextField
            label="Prompt"
            multiline
            minRows={5}
            fullWidth
            variant="outlined"
            size="small"
            className={intClasses.inputDense}
            value={testForm.prompt}
            onChange={(e) => setTestForm((p) => ({ ...p, prompt: e.target.value }))}
          />
          <Grid container spacing={1} style={{ marginTop: 12 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth variant="outlined" size="small" className={intClasses.inputDense}>
                <InputLabel>Modelo</InputLabel>
                <Select
                  value={testForm.model}
                  onChange={(e) => setTestForm((p) => ({ ...p, model: e.target.value }))}
                  label="Modelo"
                >
                  {CLAUDE_MODEL_IDS.map((m) => (
                    <MenuItem key={m} value={m}>
                      {claudeModelLabel(m)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Max tokens"
                type="number"
                fullWidth
                variant="outlined"
                size="small"
                className={intClasses.inputDense}
                value={testForm.maxTokens}
                onChange={(e) => setTestForm((p) => ({ ...p, maxTokens: Number(e.target.value) }))}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="Temperature"
                type="number"
                fullWidth
                variant="outlined"
                size="small"
                className={intClasses.inputDense}
                inputProps={{ step: 0.1, min: 0, max: 2 }}
                value={testForm.temperature}
                onChange={(e) => setTestForm((p) => ({ ...p, temperature: Number(e.target.value) }))}
              />
            </Grid>
          </Grid>
          <Box mt={2}>
            <Button
              color="primary"
              variant="contained"
              disabled={testing}
              onClick={runTest}
              style={{ textTransform: "none", boxShadow: "none" }}
            >
              {testing ? "Testando…" : "Executar teste"}
            </Button>
          </Box>
          {testResult ? (
            <Box className={classes.resultBox}>
              <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                {testResult.ok ? "Sucesso" : "Falha"} · {testResult.durationMs}ms · modelo {testResult.model}
              </Typography>
              <Typography variant="body2" style={{ whiteSpace: "pre-wrap" }}>
                {testResult.ok ? testResult.response : testResult.error || "Erro desconhecido"}
              </Typography>
            </Box>
          ) : null}
        </SectionCard>
    </div>
  );
}
