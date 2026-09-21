/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Typography } from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import IntegrationBrandIcon from "../../Connections/IntegrationBrandIcon";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    borderRadius: 12,
    marginBottom: theme.spacing(2),
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(217,119,87,0.28)"
        : "1px solid rgba(217,119,87,0.35)",
    background:
      theme.palette.type === "dark" ? "rgba(217,119,87,0.07)" : "rgba(217,119,87,0.05)"
  },
  title: { fontWeight: 600, fontSize: 15, marginBottom: 6 },
  bullet: {
    fontSize: 13,
    lineHeight: 1.55,
    color: theme.palette.text.secondary,
    marginBottom: 6,
    paddingLeft: 4
  }
}));

export default function ClaudeAgentGuidePanel({ compact = false }) {
  const classes = useStyles();
  const theme = useTheme();

  return (
    <Box className={classes.root}>
      <Box display="flex" alignItems="flex-start" gap={1.5} mb={compact ? 0.5 : 1}>
        <IntegrationBrandIcon brandKey="claude" variant="table" plain accentColor="#D97757" />
        <Box flex={1}>
          <Typography className={classes.title}>
            Agente com Anthropic Claude
          </Typography>
          {!compact ? (
            <>
              <Typography className={classes.bullet}>
                • A <strong>API Key Claude</strong> deve estar salva e ativa em{" "}
                <strong>Conexões → Claude → Administrar</strong>. Sem isso o agente não responde no canal.
              </Typography>
              <Typography className={classes.bullet}>
                • Na aba <strong>Integração</strong> do editor, escolha o <strong>modelo Claude</strong> deste agente
                (Sonnet, Opus, Haiku…).
              </Typography>
              <Typography className={classes.bullet}>
                • Use as abas <strong>Regras, Roteiro, Ações, FAQ e Base</strong> como nos agentes GPT — a
                inteligência roda no modelo selecionado para este agente.
              </Typography>
              <Typography className={classes.bullet}>
                • Use a aba <strong>Teste</strong> no editor para simular uma mensagem com regras, roteiro e base
                preenchidos.
              </Typography>
              <Typography className={classes.bullet}>
                • Depois de salvar, vincule em <strong>Integrações</strong> (seletor OpenAI + Claude).
              </Typography>
              <Typography
                variant="caption"
                style={{
                  display: "block",
                  marginTop: 8,
                  color: theme.palette.text.secondary,
                  opacity: 0.85
                }}
              >
                Dúvidas: botão ? no topo da página Agentes IA.
              </Typography>
            </>
          ) : (
            <Typography variant="caption" color="textSecondary">
              Requer API Key em Conexões → Claude. Escolha o modelo na aba Integração do editor.
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
