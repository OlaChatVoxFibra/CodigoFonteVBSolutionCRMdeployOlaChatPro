/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useMemo } from "react";
import anthropicIntegrationService from "../../services/anthropicIntegrationService";

export default function useAnthropicIntegration() {
  const getIntegration = useCallback(() => anthropicIntegrationService.getIntegration(), []);
  const saveIntegration = useCallback((payload) => anthropicIntegrationService.saveIntegration(payload), []);
  const testIntegration = useCallback((payload) => anthropicIntegrationService.testIntegration(payload), []);
  const listMultiAgents = useCallback(() => anthropicIntegrationService.listMultiAgents(), []);
  const createMultiAgent = useCallback((payload) => anthropicIntegrationService.createMultiAgent(payload), []);
  const updateMultiAgent = useCallback((id, payload) => anthropicIntegrationService.updateMultiAgent(id, payload), []);
  const removeMultiAgent = useCallback((id) => anthropicIntegrationService.removeMultiAgent(id), []);
  const getMultiAgent = useCallback((id) => anthropicIntegrationService.getMultiAgent(id), []);
  const getConnectionAgentOptions = useCallback(
    () => anthropicIntegrationService.getConnectionAgentOptions(),
    []
  );

  return useMemo(
    () => ({
      getIntegration,
      saveIntegration,
      testIntegration,
      listMultiAgents,
      createMultiAgent,
      updateMultiAgent,
      removeMultiAgent,
      getMultiAgent,
      getConnectionAgentOptions
    }),
    [
      getIntegration,
      saveIntegration,
      testIntegration,
      listMultiAgents,
      createMultiAgent,
      updateMultiAgent,
      removeMultiAgent,
      getMultiAgent,
      getConnectionAgentOptions
    ]
  );
}
