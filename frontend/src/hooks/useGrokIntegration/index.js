/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useMemo } from "react";
import grokIntegrationService from "../../services/grokIntegrationService";

export default function useGrokIntegration() {
  return useMemo(
    () => ({
      getIntegration: () => grokIntegrationService.getIntegration(),
      saveIntegration: (payload) => grokIntegrationService.saveIntegration(payload),
      testIntegration: (payload) => grokIntegrationService.testIntegration(payload)
    }),
    []
  );
}
