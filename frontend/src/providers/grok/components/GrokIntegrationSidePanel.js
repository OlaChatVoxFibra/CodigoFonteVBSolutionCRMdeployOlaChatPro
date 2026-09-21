/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@material-ui/core";
import { LobeGrokIcon } from "../../../components/LobeBrandIcon";
import { useIntegrationAsideCardStyles } from "../../../pages/Connections/integrationAsideCardStyles";
import { grokModelInfo } from "../../../pages/Prompts/agentModelCatalog";
import { grokModelLabel } from "../models";

function getGrokModelMeta(modelId) {
  const info = grokModelInfo[modelId];
  if (info) {
    return {
      title: info.title,
      desc: info.desc,
      context: info.context,
      speed: info.speed,
      quality: info.quality,
      cost: info.cost
    };
  }
  return {
    title: grokModelLabel(modelId),
    desc: "Modelo Grok (xAI) para agentes e Brain.AI.",
    context: "—",
    speed: "—",
    quality: "—",
    cost: "—"
  };
}

export default function GrokIntegrationSidePanel({
  defaultModel,
  scope = "Pessoal",
  enabled = false,
  hasGrokKey = false,
  wrapPaper = true
}) {
  const cardClasses = useIntegrationAsideCardStyles();
  const theme = useTheme();
  const meta = getGrokModelMeta(defaultModel);

  const steps = useMemo(
    () => [
      {
        title: "Contexto",
        body: `Janela de contexto tipicamente ${meta.context} tokens no ecossistema xAI.`
      },
      {
        title: "Velocidade",
        body: `Perfil ${meta.speed} — adequados para atendimento e chat.`
      },
      {
        title: "Qualidade",
        body: `Nível ${meta.quality} para o modelo selecionado.`
      },
      {
        title: "Custo estimado",
        body: `Faixa ${meta.cost} na API xAI (varia por modelo e uso).`
      },
      {
        title: "Escopo e provider",
        body: `Provider Grok (xAI) · escopo ${scope || "Pessoal"}${
          enabled ? " · integração ativa" : " · integração inativa"
        }.`
      },
      {
        title: "Status da API Key",
        body: hasGrokKey
          ? enabled
            ? "API Key informada e integração ativa — agentes e Brain podem usar este modelo."
            : "API Key informada, mas a integração está desativada. Ative em Integrações → Grok."
          : "Informe a API Key da xAI em Integrações → Grok e salve."
      }
    ],
    [meta, scope, enabled, hasGrokKey]
  );

  const body = (
    <Box className={cardClasses.root}>
      <div className={cardClasses.head}>
        <LobeGrokIcon size={32} />
        <div>
          <Typography
            className={cardClasses.headTitle}
            style={{ color: theme.palette.text.primary }}
          >
            {meta.title}
          </Typography>
          <Typography className={cardClasses.headSub} color="textSecondary">
            {meta.desc}
          </Typography>
        </div>
      </div>
      <ol className={cardClasses.steps}>
        {steps.map((s) => (
          <li key={s.title} className={cardClasses.step}>
            <Typography className={cardClasses.stepTitle}>{s.title}</Typography>
            <Typography className={cardClasses.stepBody}>{s.body}</Typography>
          </li>
        ))}
      </ol>
    </Box>
  );

  if (!wrapPaper) return body;
  return body;
}
