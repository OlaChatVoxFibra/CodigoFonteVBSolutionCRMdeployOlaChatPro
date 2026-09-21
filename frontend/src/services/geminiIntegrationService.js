/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const geminiIntegrationService = {
  getIntegration: async () => {
    const { data } = await api.get("/gemini/integration");
    return data;
  },
  saveIntegration: async (payload) => {
    const { data } = await api.put("/gemini/integration", payload);
    return data;
  },
  testIntegration: async (payload) => {
    const { data } = await api.post("/gemini/test", payload);
    return data;
  },
  multimodalTest: async (payload) => {
    const { data } = await api.post("/gemini/multimodal-test", payload);
    return data;
  }
};

export default geminiIntegrationService;
