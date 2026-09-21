/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const leadPipelinesService = {
  async list() {
    const { data } = await api.get("/lead-pipelines");
    return data;
  },
  async bulkSave(pipelines) {
    const { data } = await api.post("/lead-pipelines/bulk", { pipelines }, { timeout: 90000 });
    return data;
  }
};

export default leadPipelinesService;
