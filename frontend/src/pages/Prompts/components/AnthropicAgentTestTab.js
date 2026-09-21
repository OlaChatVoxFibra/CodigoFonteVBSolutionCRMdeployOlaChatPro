/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import anthropicIntegrationService from "../../../services/anthropicIntegrationService";
import { v2ToMultiAgentPayload } from "../defaultAnthropicAgentV2";
import { claudeModelLabel } from "../../../providers/anthropic/models";

const useStyles = makeStyles((theme) => ({
  panel: {
    borderRadius: 14,
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15,23,42,0.08)",
    padding: theme.spacing(2.5),
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.03)" : "#fafafa"
  },
  chips: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  resultBox: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5),
    borderRadius: 10,
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15,23,42,0.08)",
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.02)" : "#fff"
  }
}));

export default function AnthropicAgentTestTab({ v2, savedId }) {
  const classes = useStyles();
  const [userMessage, setUserMessage] = useState(
    "Olá! Quero entender como você pode me ajudar hoje."
  );
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const sections = useMemo(() => {
    const hasRules = Boolean(String(v2?.generalRules || "").trim());
    const hasScript = Boolean(String(v2?.attendance?.script || "").trim());
    const hasFaq = Boolean(Array.isArray(v2?.faq) && v2.faq.some((r) => String(r?.question || r?.answer || "").trim()));
    const hasKnow =
      Boolean(String(v2?.knowledge?.manualText || "").trim()) ||
      Boolean(Array.isArray(v2?.knowledge?.sources) && v2.knowledge.sources.length > 0);
    return { hasRules, hasScript, hasFaq, hasKnow };
  }, [v2]);

  const modelId = String(v2?.integration?.model || "claude-sonnet-4-5-20250929");

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const payload = v2ToMultiAgentPayload(v2);
      const out = await anthropicIntegrationService.testMultiAgent({
        userMessage,
        agentId: savedId || undefined,
        profileJson: payload.profileJson,
        model: modelId,
        maxTokens: Number(v2?.integration?.maxTokens) || 1024,
        temperature: Number(v2?.integration?.temperature ?? 1)
      });
      setResult(out);
      if (out?.ok) toast.success("Teste do agente concluído.");
      else toast.error(out?.error || "Teste retornou falha.");
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || "Falha no teste.";
      toast.error(msg);
      setResult({ ok: false, error: msg });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box className={classes.panel}>
      <Typography style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
        Teste do agente Claude
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Simula uma mensagem de cliente usando o que você preencheu nas abas{" "}
        <strong>Regras Gerais</strong>, <strong>Roteiro</strong>, <strong>FAQ</strong> e{" "}
        <strong>Base de Conhecimento</strong> (o mesmo compilado usado no atendimento). Salve o agente para
        persistir; o teste também funciona antes de salvar com o rascunho atual.
      </Typography>

      <Box className={classes.chips}>
        <Chip
          size="small"
          label="Regras gerais"
          color={sections.hasRules ? "primary" : "default"}
          variant={sections.hasRules ? "default" : "outlined"}
        />
        <Chip
          size="small"
          label="Roteiro"
          color={sections.hasScript ? "primary" : "default"}
          variant={sections.hasScript ? "default" : "outlined"}
        />
        <Chip
          size="small"
          label="FAQ"
          color={sections.hasFaq ? "primary" : "default"}
          variant={sections.hasFaq ? "default" : "outlined"}
        />
        <Chip
          size="small"
          label="Base"
          color={sections.hasKnow ? "primary" : "default"}
          variant={sections.hasKnow ? "default" : "outlined"}
        />
        <Chip size="small" label={`Modelo: ${claudeModelLabel(modelId)}`} variant="outlined" />
      </Box>

      {!sections.hasRules && !sections.hasScript ? (
        <Typography variant="caption" color="error" display="block" style={{ marginBottom: 12 }}>
          Preencha ao menos Regras Gerais ou Roteiro para um teste mais fiel ao atendimento real.
        </Typography>
      ) : null}

      <TextField
        label="Mensagem do cliente (simulada)"
        multiline
        minRows={4}
        fullWidth
        variant="outlined"
        size="small"
        value={userMessage}
        onChange={(e) => setUserMessage(e.target.value)}
      />

      <Grid container spacing={1} style={{ marginTop: 12 }}>
        <Grid item xs={6} sm={4}>
          <TextField
            label="Max tokens"
            type="number"
            fullWidth
            variant="outlined"
            size="small"
            value={Number(v2?.integration?.maxTokens) || 1024}
            disabled
            helperText="Ajuste no painel lateral"
          />
        </Grid>
        <Grid item xs={6} sm={4}>
          <TextField
            label="Temperature"
            type="number"
            fullWidth
            variant="outlined"
            size="small"
            value={Number(v2?.integration?.temperature ?? 1)}
            disabled
            helperText="Ajuste no painel lateral"
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
          {testing ? <CircularProgress size={22} color="inherit" /> : "Executar teste"}
        </Button>
      </Box>

      {result ? (
        <Box className={classes.resultBox}>
          <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
            {result.ok ? "Sucesso" : "Falha"}
            {result.durationMs != null ? ` · ${result.durationMs}ms` : ""}
            {result.model ? ` · ${claudeModelLabel(result.model)}` : ""}
          </Typography>
          {result.sectionsUsed ? (
            <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
              Contexto enviado:{" "}
              {[
                result.sectionsUsed.generalRules && "regras",
                result.sectionsUsed.script && "roteiro",
                result.sectionsUsed.faq && "FAQ",
                result.sectionsUsed.knowledge && "base"
              ]
                .filter(Boolean)
                .join(", ") || "mínimo"}
            </Typography>
          ) : null}
          <Typography variant="body2" style={{ whiteSpace: "pre-wrap" }}>
            {result.ok ? result.response : result.error || "Erro desconhecido"}
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}
