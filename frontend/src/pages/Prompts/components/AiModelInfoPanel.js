/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import { Box } from "@material-ui/core";
import api from "../../../services/api";
import anthropicIntegrationService from "../../../services/anthropicIntegrationService";
import { isClaudeModelId } from "../../../providers/anthropic/models";
import IntegrationModelDetailPanel from "../../Connections/IntegrationModelDetailPanel";

/**
 * Painel de informações do modelo — mesmo bloco de Integrações (Conexões).
 */
export default function AiModelInfoPanel({ modelId, providerHint, responderGrupo = false }) {
  const [openAiSettings, setOpenAiSettings] = useState({
    active: true,
    scope: "Pessoal",
    model: "gpt-5.5"
  });
  const [openAiHadKey, setOpenAiHadKey] = useState(false);
  const [claudeIntegration, setClaudeIntegration] = useState({
    enabled: false,
    scope: "Pessoal",
    apiKey: { hasKey: false }
  });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/settings/agent_integration");
        if (!alive || !data?.value) return;
        const v = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        setOpenAiSettings({
          active: v.active !== false,
          scope: v.scope || "Pessoal",
          model: v.model || "gpt-5.5"
        });
        setOpenAiHadKey(Boolean(String(v.apiKey || "").trim()));
      } catch {
        /* ignore */
      }
      try {
        const integration = await anthropicIntegrationService.getIntegration();
        if (!alive) return;
        setClaudeIntegration({
          enabled: Boolean(integration?.enabled),
          scope: integration?.scope || "Pessoal",
          apiKey: integration?.apiKey || { hasKey: false }
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const model = String(modelId || "").trim();
  if (!model) return null;

  const isClaude = isClaudeModelId(model) || providerHint === "anthropic";

  return (
    <Box>
      <IntegrationModelDetailPanel
        provider={isClaude ? "anthropic" : "openai"}
        model={model}
        scope={isClaude ? claudeIntegration.scope : openAiSettings.scope}
        active={openAiSettings.active !== false}
        enabled={claudeIntegration.enabled}
        responderGrupo={responderGrupo}
        hasKey={isClaude ? Boolean(claudeIntegration.apiKey?.hasKey) : openAiHadKey}
        hadKey={isClaude ? Boolean(claudeIntegration.apiKey?.hasKey) : openAiHadKey}
        openAiModel={openAiSettings.model}
        openAiHasKey={openAiHadKey}
        openAiActive={openAiSettings.active !== false}
        showAgentsHint={false}
      />
    </Box>
  );
}
