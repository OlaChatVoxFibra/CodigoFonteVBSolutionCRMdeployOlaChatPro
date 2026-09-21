/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { getWbot } from "../libs/wbot";
import { handleMessage } from "../services/WbotServices/wbotMessageListener";

export default {
    key: `${process.env.DB_NAME}-handleMessage`,

    async handle({ data }) {
        // console.log(`[DEBUG 2026] handleMessageQueue: Job iniciado para msg ID: ${data?.message?.key?.id}`);
        try {
            const { message, wbot, companyId } = data;

            if (message === undefined || wbot === undefined || companyId === undefined) {
                // console.log("message, wbot, companyId", message, wbot, companyId)
            }

            const w = await getWbot(wbot);

            if (!w) {
                console.error(`[DEBUG 2026] wbot not found for ID: ${wbot}. Abortando job.`);
                return;
            }

            try {
                await handleMessage(message, w, companyId);
                // console.log(`[DEBUG 2026] handleMessageQueue: Job finalizado com sucesso para msg ID: ${data?.message?.key?.id}`);
            } catch (error) {
                console.error(`[DEBUG 2026] Erro ao processar handleMessage para msg ID: ${data?.message?.key?.id}:`, error);
            }
        } catch (error) {
            console.log("error", error)
        }
    },
};

