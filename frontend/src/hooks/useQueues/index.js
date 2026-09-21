/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useQueues = () => {
  const findAll = async () => {
    try {
      const { data } = await api.get("/queue");
      return Array.isArray(data) ? data : [];
    } catch (err) {
      toastError(err);
      return [];
    }
  };

  return { findAll };
};

export default useQueues;
