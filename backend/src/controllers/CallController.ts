/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import createCallHistorical from "../services/CallService/CreateCallService";
import getHistorical from "../services/CallService/GetCallService";
import GetWhatsappUserId from "../services/CallService/GetWhatsappUserId";
import { isDevNoDb } from "../helpers/devNoDbAuth";

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

export const createCallHistoric = async (req: Request, res: Response): Promise<Response> => {
    const body = req.body as CallHistorical;

    const callHistorical = await createCallHistorical(body);
    return res.status(200).json({ callHistorical });
};

export const getHistoric = async (req: Request, res: Response) => {
    try {
        const historical = await getHistorical({
            "user_id": parseInt(req.user.id),
            "company_id": req.user.companyId
        });

        return res.status(200).json({ historical });
    } catch (error) {
        return res.status(403).json({
            error: error.message || String(error),
            stack: error.stack 
        });
    }
}

export const getWhatsappUserId = async (req: Request, res: Response): Promise<Response> => {
    if (isDevNoDb()) {
        return res.status(200).json({ whatsapp: null });
    }
    const whatsapps = await GetWhatsappUserId(parseInt(req.user.id));
    return res.status(200).json(whatsapps);
};
