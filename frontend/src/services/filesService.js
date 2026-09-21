/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "./api";

const filesService = {
  list: async (params) => {
    // MOCK DATA
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                files: [
                    { id: 1, name: "Contrato.pdf", type: "pdf", size: "2MB" },
                    { id: 2, name: "Logo.png", type: "image", size: "500KB" },
                    { id: 3, name: "Planilha.xlsx", type: "excel", size: "1MB" },
                ],
                hasMore: false,
                count: 3
            });
        }, 500);
    });
  },
  create: async (data) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ id: Math.random(), ...data });
        }, 500);
    });
  },
  delete: async (id) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ message: "Deleted" });
        }, 500);
    });
  },
};

export default filesService;
