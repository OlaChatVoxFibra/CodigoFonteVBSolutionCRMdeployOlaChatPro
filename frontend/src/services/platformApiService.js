/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const platformApiService = {
  listCredentials: () => api.get("/platform-api-credentials"),

  getConfig: () => api.get("/platform-api-credentials/config"),

  createCredential: (data) => api.post("/platform-api-credentials", data),

  revokeCredential: (id) => api.delete(`/platform-api-credentials/${id}`),

  revealCredential: (id) => api.get(`/platform-api-credentials/${id}/reveal`)
};

export default platformApiService;
