/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

function backendBaseUrl() {
  const base = String(api.defaults.baseURL || "").replace(/\/$/, "");
  return base || `${window.location.protocol}//${window.location.hostname}:3000`;
}

function frontendBaseUrl() {
  return window.location.origin.replace(/\/$/, "");
}

const githubIntegrationService = {
  getIntegration: async () => {
    const { data } = await api.get("/integrations/github");
    return data;
  },
  createIntegration: async (payload) => {
    const { data } = await api.post("/integrations/github", payload);
    return data;
  },
  saveIntegration: async (payload) => {
    const { data } = await api.put("/integrations/github", payload);
    return data;
  },
  testIntegration: async (payload) => {
    const { data } = await api.post("/integrations/github/test", payload);
    return data;
  },
  clearIntegration: async () => {
    const { data } = await api.delete("/integrations/github");
    return data;
  },
  listRepos: async () => {
    const { data } = await api.get("/integrations/github/repos");
    return data?.items || [];
  },
  getOAuthMeta: async () => {
    const { data } = await api.get("/integrations/github/oauth/meta");
    return data;
  },
  getOrgAuthorizeUrl: async () => {
    const { data } = await api.get("/integrations/github/oauth/authorize", {
      params: {
        backendUrl: backendBaseUrl(),
        frontendUrl: frontendBaseUrl()
      }
    });
    return data;
  }
};

export default githubIntegrationService;
