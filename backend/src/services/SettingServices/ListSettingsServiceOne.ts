/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Setting from "../../models/Setting";

interface Request {
    companyId: number;
    key?: string;
}

const ListSettingsServiceOne = async ({
    companyId,
    key
}: Request): Promise<Setting | undefined> => {
    const setting = await Setting.findOne({
        where: {
            companyId,
            ...(key && { key })
        }
    });

    return setting;
};

export default ListSettingsServiceOne;