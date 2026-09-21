/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import api from "../../services/api";

const useVersion = () => {

    const getVersion = async () => {
        const { data } = await api.request({
            url: '/version',
            method: 'GET',
        });
        return data;
    }

    return {
        getVersion
    }
}

export default useVersion;



