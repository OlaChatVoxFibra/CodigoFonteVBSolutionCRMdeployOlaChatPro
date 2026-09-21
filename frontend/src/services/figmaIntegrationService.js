/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const figmaIntegrationService = {
  getIntegration: async () => {
    const { data } = await api.get("/integrations/figma");
    return data;
  },
  createIntegration: async (payload) => {
    const { data } = await api.post("/integrations/figma", payload);
    return data;
  },
  saveIntegration: async (payload) => {
    const { data } = await api.put("/integrations/figma", payload);
    return data;
  },
  testIntegration: async (payload) => {
    const { data } = await api.post("/integrations/figma/test", payload);
    return data;
  },
};

export default figmaIntegrationService;
