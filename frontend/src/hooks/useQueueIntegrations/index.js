/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "../../services/api";

const useQueueIntegrations = () => {
	const findAll = async () => {
        const { data } = await api.get("/queueIntegration/");
        return data;
    }

	return { findAll };
};

export default useQueueIntegrations;