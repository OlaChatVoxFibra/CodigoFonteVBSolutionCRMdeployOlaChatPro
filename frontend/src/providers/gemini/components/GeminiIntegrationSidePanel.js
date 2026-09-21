/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo } from "react";
import { Box, Typography, useTheme } from "@material-ui/core";
import { LobeGeminiIcon } from "../../../components/LobeBrandIcon";
import { useIntegrationAsideCardStyles } from "../../../pages/Connections/integrationAsideCardStyles";
import { geminiModelInfo } from "../../../pages/Prompts/geminiIntegrationConstants";
import { geminiModelLabel, GEMINI_MODEL_SUPPORT } from "../geminiModelCatalog";

function getGeminiModelMeta(modelId) {
  const info = geminiModelInfo[modelId];
  if (info) {
    return {
      title: info.title,
      desc: info.desc,
      context: info.context,
      speed: info.speed,
      quality: info.quality,
      cost: info.cost,
      inputPrice: info.inputPrice || "~$0.10/1M",
      outputPrice: info.outputPrice || "~$0.40/1M"
    };
  }
  return {
    title: geminiModelLabel(modelId),
    desc: "Modelo Google Gemini para agentes, Brain.AI e multimodal.",
    context: "1M",
    speed: "—",
    quality: "—",
    cost: "—",
    inputPrice: "~$0.10/1M",
    outputPrice: "~$0.40/1M"
  };
}

/**
 * Painel direito da integração Gemini — mesmo layout de card do guia API Key (Claude/OpenAI).
 */
export default function GeminiIntegrationSidePanel({
  defaultModel,
  scope = "Pessoal",
  enabled = false,
  hasGeminiKey = false,
  health,
  showAgentsHint = true,
  wrapPaper = true
}) {
  const cardClasses = useIntegrationAsideCardStyles();
  const theme = useTheme();
  const meta = getGeminiModelMeta(defaultModel);
  const support = GEMINI_MODEL_SUPPORT[defaultModel] || { tier: "full", tags: ["Gemini"] };

  const steps = useMemo(
    () => [
      {
        title: "Contexto",
        body: `Janela de contexto de até ${meta.context} tokens — ideal para histórico longo e documentos.`
      },
      {
        title: "Velocidade",
        body: `Perfil ${meta.speed} — adequado para atendimento em escala e respostas em tempo quase real.`
      },
      {
        title: "Qualidade",
        body: `Nível ${meta.quality} de raciocínio e precisão para o modelo selecionado.`
      },
      {
        title: "Custo estimado",
        body: `Faixa ${meta.cost} na API Google AI Studio (varia por modelo e região).`
      },
      {
        title: "Escopo e provider",
        body: `Provider Google Gemini · escopo ${scope || "Pessoal"}${enabled ? " · integração ativa" : " · integração inativa"}.`
      },
      {
        title: "Status da API Key",
        body: hasGeminiKey
          ? enabled
            ? "API Key informada e integração ativa — agentes e Brain podem usar este modelo."
            : "API Key informada, mas a integração está desativada. Ative em Integrações para usar."
          : "Informe a API Key da organização no formulário à esquerda e salve."
      }
    ],
    [meta, scope, enabled, hasGeminiKey]
  );

  const content = (
    <Box className={cardClasses.root}>
      <div className={cardClasses.head}>
        <LobeGeminiIcon size={32} />
        <div>
          <Typography className={cardClasses.headTitle} style={{ color: theme.palette.text.primary }}>
            {meta.title}
          </Typography>
          <Typography className={cardClasses.headSub}>
            Google Gemini · {meta.desc}
            {support.tags?.length ? ` · ${support.tags.join(" · ")}` : ""}
          </Typography>
        </div>
      </div>
      <ol className={cardClasses.steps}>
        {steps.map((step, idx) => (
          <li key={step.title} className={cardClasses.step}>
            <span className={cardClasses.stepNum}>{idx + 1}</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Typography className={cardClasses.stepTitle} style={{ color: theme.palette.text.primary }}>
                {step.title}
              </Typography>
              <Typography component="div" className={cardClasses.stepBody}>
                {step.body}
              </Typography>
            </div>
          </li>
        ))}
      </ol>
      <Typography className={cardClasses.footnote}>
        Preços (referência): entrada {meta.inputPrice} · saída {meta.outputPrice}
        {health?.status
          ? ` · Health: ${health.status}${health.latencyMs != null ? ` (${health.latencyMs}ms)` : ""}`
          : ""}
        {showAgentsHint ? (
          <>
            {" "}
            · Agentes Gemini em <strong>Agente IA → Agentes</strong>.
          </>
        ) : null}
      </Typography>
    </Box>
  );

  if (!wrapPaper) {
    return content;
  }

  return <Box width="100%">{content}</Box>;
}
