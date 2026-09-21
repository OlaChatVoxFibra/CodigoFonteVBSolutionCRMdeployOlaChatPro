/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Paper, Typography } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import { SiOpenai } from "react-icons/si";
import { modelInfo } from "../openAiIntegrationConstants";
import { formatActiveApiStatus } from "../utils/activeAiApiStatus";

/**
 * Painel direito da integração OpenAI — mesmo conteúdo da aba Integração em Agente IA.
 */
export default function OpenAiIntegrationSidePanel({
  classes,
  model,
  scope = "Pessoal",
  active = true,
  responderGrupo = false,
  hasOpenAiKey = false,
  wrapPaper = true
}) {
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const modelMetaColor = isDark ? theme.palette.text.secondary : "#6b7280";
  const openAiIconColor = isDark ? "#f4f4f5" : "#111827";
  const openAiMeta = modelInfo[model] || {};
  const apiStatus = formatActiveApiStatus({
    openAiModel: model,
    openAiHasKey: hasOpenAiKey,
    openAiActive: active,
    hasAnthropicKey: false,
    claudeEnabled: false,
    claudeModelTitle: ""
  });

  const inputPrice = openAiMeta.inputPrice || "$0.15";
  const outputPrice = openAiMeta.outputPrice || "$0.60";

  const content = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <SiOpenai size={24} color={openAiIconColor} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: theme.palette.text.primary }}>
            {openAiMeta.title || model}
          </div>
          <div style={{ fontSize: 12, color: modelMetaColor }}>
            {openAiMeta.desc || "Modelo selecionado da OpenAI."} Ideal para: chat, automação e agentes.
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
          Contexto: <b>{openAiMeta.context || "—"}</b>
        </div>
        <div>
          Saída Máx.: <b>{openAiMeta.output || "—"}</b>
        </div>
        <div>
          Velocidade: <b>{openAiMeta.speed || "—"}</b>
        </div>
        <div>
          Qualidade: <b>{openAiMeta.quality || "—"}</b>
        </div>
        <div>
          Custo: <b>{openAiMeta.cost || "—"}</b>
        </div>
      </div>
      <div className={classes.rightSection} style={{ fontSize: 12, color: theme.palette.text.primary }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Resumo da configuração</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            Modelo: <b>{openAiMeta.title || model}</b>
          </div>
          <div>
            Escopo: <b>{scope}</b>
          </div>
          <div>
            Status: <b>{active ? "Pronto" : "Desativado"}</b>
          </div>
          <div>
            Responder em grupos: <b>{responderGrupo ? "Sim" : "Não"}</b>
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
          <span>{inputPrice}/1M</span>
        </div>
        <div className={classes.priceRow} style={{ marginTop: 4 }}>
          <span>Saída</span>
          <span>{outputPrice}/1M</span>
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
          Conexão Open IA
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
              {hasOpenAiKey && active
                ? apiStatus.line
                : hasOpenAiKey
                  ? `OpenAI (GPT) · ${String(model || "—")} (desativada)`
                  : "Nenhuma API ativa"}
            </span>
          </div>
        </div>
        <div className={classes.statusRow} style={{ marginTop: 0, marginBottom: 0, flexWrap: "wrap" }}>
          <span className={hasOpenAiKey ? classes.statusBadgeOk : classes.statusBadgeWarn}>
            API Key {hasOpenAiKey ? "informada" : "não informada"}
          </span>
        </div>
      </div>
      <Box className={classes.rightSection}>
        <Typography variant="caption" color="textSecondary" style={{ lineHeight: 1.5 }}>
          Agentes GPT em <strong>Agente IA → Agentes</strong>. Chave em{" "}
          <strong>Integrações → Open IA</strong>.
        </Typography>
      </Box>
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
