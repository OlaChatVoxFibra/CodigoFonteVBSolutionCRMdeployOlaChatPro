/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const grokIntegrationService = {
  getIntegration: async () => {
    const { data } = await api.get("/grok/integration");
    return data;
  },
  saveIntegration: async (payload) => {
    const { data } = await api.put("/grok/integration", payload);
    return data;
  },
  testIntegration: async (payload) => {
    const { data } = await api.post("/grok/test", payload);
    return data;
  }
};

export default grokIntegrationService;
