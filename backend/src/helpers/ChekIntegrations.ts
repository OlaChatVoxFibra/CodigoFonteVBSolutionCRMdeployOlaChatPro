/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../errors/AppError";
import Integrations from "../models/Integrations";

const CheckIntegrations = async (key: string, companyId: number): Promise<string> => {
    const integrations = await Integrations.findOne({
        where: { name: key, companyId: companyId }
    });

    if (!integrations) {
        throw new AppError("ERR_NO_INTEGRATIONS_FOUND", 404);
    }

    return integrations.dataValues;
};

export default CheckIntegrations;