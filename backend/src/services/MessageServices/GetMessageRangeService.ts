/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import { QueryTypes } from "sequelize";
import sequelize from "../../database";

interface Request {
    companyId: number;
    startDate: string;
    lastDate: string;
}

// Usa a instância global de conexão já configurada

const GetMessageRangeService = async ({ companyId, startDate, lastDate }: Request): Promise<Message[]> => {
    let messages: any
    messages = await sequelize.query(
        `select * from "Messages" m where "companyId" = ${companyId} and "createdAt" between '${startDate} 00:00:00' and '${lastDate} 23:59:59'`,
        {
            type: QueryTypes.SELECT
        }
    );

    if (!messages) {
        throw new AppError("MESSAGES_NOT_FIND");
    }

    return messages;
};

export default GetMessageRangeService;
