/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box } from "@material-ui/core";
import { useIntegrationTabStyles } from "../Prompts/integrationTabStyles";
import AnthropicIntegrationSidePanel from "../Prompts/components/AnthropicIntegrationSidePanel";
import OpenAiIntegrationSidePanel from "../Prompts/components/OpenAiIntegrationSidePanel";
import GeminiIntegrationSidePanel from "../../providers/gemini/components/GeminiIntegrationSidePanel";
import GrokIntegrationSidePanel from "../../providers/grok/components/GrokIntegrationSidePanel";

/** Painel detalhado do modelo (igual à antiga aba Integração em Agentes). */
export default function IntegrationModelDetailPanel({
  provider,
  model,
  scope,
  active,
  enabled,
  responderGrupo,
  hasKey,
  hadKey,
  openAiModel,
  openAiHasKey,
  openAiActive,
  showAgentsHint = true
}) {
  const classes = useIntegrationTabStyles();
  const keyOk = hasKey || hadKey;

  if (provider === "grok") {
    return (
      <GrokIntegrationSidePanel
        defaultModel={model}
        scope={scope}
        enabled={enabled}
        hasGrokKey={hasKey || hadKey}
        wrapPaper={false}
      />
    );
  }

  if (provider === "gemini") {
    return (
      <GeminiIntegrationSidePanel
        defaultModel={model}
        scope={scope}
        enabled={enabled}
        hasGeminiKey={hasKey || hadKey}
        wrapPaper={false}
      />
    );
  }

  if (provider === "anthropic") {
    return (
      <Box className={classes.rightModelCard}>
        <AnthropicIntegrationSidePanel
          classes={classes}
          defaultModel={model}
          scope={scope}
          enabled={enabled}
          hasAnthropicKey={keyOk}
          openAiModel={openAiModel}
          openAiHasKey={openAiHasKey}
          openAiActive={openAiActive}
          showAgentsHint={showAgentsHint}
          wrapPaper={false}
        />
      </Box>
    );
  }

  return (
    <Box className={classes.rightModelCard}>
      <OpenAiIntegrationSidePanel
        classes={classes}
        model={model}
        scope={scope}
        active={active}
        responderGrupo={responderGrupo}
        hasOpenAiKey={keyOk}
        wrapPaper={false}
      />
    </Box>
  );
}
