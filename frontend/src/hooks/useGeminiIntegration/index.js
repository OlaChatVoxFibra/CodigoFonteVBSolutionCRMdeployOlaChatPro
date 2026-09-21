/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback, useMemo } from "react";
import geminiIntegrationService from "../../services/geminiIntegrationService";

export default function useGeminiIntegration() {
  const getIntegration = useCallback(
    () => geminiIntegrationService.getIntegration(),
    []
  );
  const saveIntegration = useCallback(
    (payload) => geminiIntegrationService.saveIntegration(payload),
    []
  );
  const testIntegration = useCallback(
    (payload) => geminiIntegrationService.testIntegration(payload),
    []
  );
  const multimodalTest = useCallback(
    (payload) => geminiIntegrationService.multimodalTest(payload),
    []
  );

  return useMemo(
    () => ({
      getIntegration,
      saveIntegration,
      testIntegration,
      multimodalTest
    }),
    [getIntegration, saveIntegration, testIntegration, multimodalTest]
  );
}
