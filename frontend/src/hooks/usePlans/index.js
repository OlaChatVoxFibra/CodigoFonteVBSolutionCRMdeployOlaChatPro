/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback } from "react";
import api, { openApi } from "../../services/api";
import toastError from "../../errors/toastError";
import { isOfflineMode } from "../../services/offlineMode";

const emptyPlanPayload = { plan: {} };

const usePlans = () => {

    const getPlanList = useCallback(async (params) => {
        const { data } = await openApi.request({
            url: '/public/plans',
            method: 'GET',
            params
        });
        return data;
    }, []);

    const getPaidPlanList = useCallback(async (params) => {
        const { data } = await openApi.request({
            url: '/public/plans',
            method: 'GET',
            params: { ...params, paidOnly: true }
        });
        return data;
    }, []);

    const list = useCallback(async (params) => {
        const { data } = await api.request({
            url: '/plans/all',
            method: 'GET',
            params
        });
        return data;
    }, []);

    const save = useCallback(async (data) => {
        const { data: responseData } = await api.request({
            url: '/plans',
            method: 'POST',
            data
        });
        return responseData;
    }, []);

    const update = useCallback(async (data) => {
        const { data: responseData } = await api.request({
            url: `/plans/${data.id}`,
            method: 'PUT',
            data
        });
        return responseData;
    }, []);

    const remove = useCallback(async (id) => {
        const { data } = await api.request({
            url: `/plans/${id}`,
            method: 'DELETE'
        });
        return data;
    }, []);

    const getPlanCompany = useCallback(async (params, id) => {
        if (!id) {
            return emptyPlanPayload;
        }
        try {
            const { data } = await api.request({
                url: `/companies/listPlan/${id}`,
                method: 'GET',
                params
            });
            return data && typeof data === "object" ? data : emptyPlanPayload;
        } catch (err) {
            if (!isOfflineMode()) {
                toastError(err);
            }
            return emptyPlanPayload;
        }
    }, []);

    return {
        getPlanList,
        getPaidPlanList,
        list,
        save,
        update,
        remove,
        getPlanCompany
    }
}

export default usePlans;
