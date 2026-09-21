/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const anthropicIntegrationService = {
  getIntegration: async () => {
    const { data } = await api.get("/anthropic/integration");
    return data;
  },
  saveIntegration: async (payload) => {
    const { data } = await api.put("/anthropic/integration", payload);
    return data;
  },
  testIntegration: async (payload) => {
    const { data } = await api.post("/anthropic/test", payload);
    return data;
  },
  testMultiAgent: async (payload) => {
    const { data } = await api.post("/anthropic/multi-agents/test", payload);
    return data;
  },
  listMultiAgents: async () => {
    const { data } = await api.get("/anthropic/multi-agents");
    return data;
  },
  getMultiAgent: async (id) => {
    const { data } = await api.get(`/anthropic/multi-agents/${id}`);
    return data;
  },
  createMultiAgent: async (payload) => {
    const { data } = await api.post("/anthropic/multi-agents", payload);
    return data;
  },
  updateMultiAgent: async (id, payload) => {
    const { data } = await api.patch(`/anthropic/multi-agents/${id}`, payload);
    return data;
  },
  removeMultiAgent: async (id) => {
    const { data } = await api.delete(`/anthropic/multi-agents/${id}`);
    return data;
  },
  getConnectionAgentOptions: async () => {
    const { data } = await api.get("/anthropic/connection-agent-options");
    return data;
  }
};

export default anthropicIntegrationService;
