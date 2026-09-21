/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Paper, Typography } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import { LobeClaudeIcon } from "../../../components/LobeBrandIcon";
import { getClaudeModelMeta } from "../anthropicIntegrationConstants";
import { formatActiveApiStatus } from "../utils/activeAiApiStatus";

/**
 * Painel direito da integração Claude — mesmo conteúdo da aba Integração em Agente IA (Prompts).
 */
export default function AnthropicIntegrationSidePanel({
  classes,
  defaultModel,
  scope = "Pessoal",
  enabled = false,
  hasAnthropicKey = false,
  openAiModel = "",
  openAiHasKey = false,
  openAiActive = true,
  showAgentsHint = true,
  wrapPaper = true
}) {
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const modelMetaColor = isDark ? theme.palette.text.secondary : "#6b7280";
  const claudeMeta = getClaudeModelMeta(defaultModel);
  const apiStatus = formatActiveApiStatus({
    openAiModel,
    openAiHasKey,
    openAiActive,
    hasAnthropicKey,
    claudeEnabled: enabled,
    claudeModelTitle: claudeMeta.title
  });

  const content = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <LobeClaudeIcon size={32} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: theme.palette.text.primary }}>
            {claudeMeta.title}
          </div>
          <div style={{ fontSize: 12, color: modelMetaColor }}>
            {claudeMeta.desc} Ideal para: atendimento, roteiro, Brain.
          </div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          fontSize: 12,
          color: theme.palette.text.primary
        }}
      >
        <div>
          Contexto: <b>{claudeMeta.context}</b>
        </div>
        <div>
          Saída Máx.: <b>{claudeMeta.output}</b>
        </div>
        <div>
          Velocidade: <b>{claudeMeta.speed}</b>
        </div>
        <div>
          Qualidade: <b>{claudeMeta.quality}</b>
        </div>
        <div>
          Custo: <b>{claudeMeta.cost}</b>
        </div>
      </div>
      <div className={classes.rightSection} style={{ fontSize: 12, color: theme.palette.text.primary }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Resumo da configuração</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            Modelo: <b>{claudeMeta.title}</b>
          </div>
          <div>
            Escopo: <b>{scope}</b>
          </div>
          <div>
            Status: <b>{enabled ? "Ativo" : "Desativado"}</b>
          </div>
          <div>
            Provider: <b>Anthropic</b>
          </div>
        </div>
      </div>
      <div className={classes.rightSection}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 8,
            color: theme.palette.text.primary
          }}
        >
          Preços (por 1M tokens)
        </div>
        <div className={classes.priceRow}>
          <span>Entrada</span>
          <span>{claudeMeta.inputPrice}</span>
        </div>
        <div className={classes.priceRow} style={{ marginTop: 4 }}>
          <span>Saída</span>
          <span>{claudeMeta.outputPrice}</span>
        </div>
      </div>
      <div className={classes.rightSection} style={{ fontSize: 12 }}>
        <div
          style={{
            fontWeight: 600,
            marginBottom: 8,
            color: theme.palette.text.primary
          }}
        >
          Conexão Claude
        </div>
        <div style={{ marginBottom: 10, color: theme.palette.text.primary }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12
            }}
          >
            <span>Status API</span>
            <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "72%" }}>
              {apiStatus.line}
            </span>
          </div>
          {apiStatus.sub ? (
            <Typography
              variant="caption"
              color="textSecondary"
              display="block"
              style={{ marginTop: 6, textAlign: "right", lineHeight: 1.45 }}
            >
              {apiStatus.sub}
            </Typography>
          ) : null}
        </div>
        <div className={classes.statusRow} style={{ marginTop: 0, marginBottom: 0, flexWrap: "wrap" }}>
          <span className={hasAnthropicKey ? classes.statusBadgeOk : classes.statusBadgeWarn}>
            API Key {hasAnthropicKey ? "configurada" : "não informada"}
          </span>
        </div>
      </div>
      {showAgentsHint ? (
        <Box className={classes.rightSection}>
          <Typography variant="caption" color="textSecondary" style={{ lineHeight: 1.5 }}>
            Agentes Claude (Regras, Roteiro, Ações, FAQ, Base) em{" "}
            <strong>Agente IA → Agentes</strong> (botão +).
          </Typography>
        </Box>
      ) : null}
    </>
  );

  if (!wrapPaper) {
    return <Box>{content}</Box>;
  }

  return (
    <Paper className={classes.rightModelCard} elevation={0}>
      {content}
    </Paper>
  );
}
