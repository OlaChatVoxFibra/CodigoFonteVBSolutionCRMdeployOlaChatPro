/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import CallHistory from "../../models/CallHistory";

interface CallHistorical {
    user_id: number;
    token_wavoip: string;
    whatsapp_id: number;
    contact_id: number;
    company_id: number;
    phone_to: string;
    name: string;
    url: string;
}

const createCallHistorical = async (body: CallHistorical) => {
    try {
        return await CallHistory.create(body);
    } catch (error) {
        console.log('createCallHistorical', error);
        throw new Error(error);
    }
}


export default createCallHistorical;