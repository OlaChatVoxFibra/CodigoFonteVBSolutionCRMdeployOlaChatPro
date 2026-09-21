/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Setting from "../../models/Setting";

const AddSettingService = async () => {
    try {
        const newSetting = {
            key: "wtV",
            value: "disabled",
            createdAt: new Date(),
            updatedAt: new Date(),
            companyId: null
        }
        await Setting.create(newSetting);

    } catch (error) {
        console.log(error);
    }
};

export default AddSettingService;