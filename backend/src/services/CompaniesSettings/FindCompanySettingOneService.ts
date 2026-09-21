/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** 
 * @TercioSantos-0 |
 * serviço/todas as configurações de 1 empresa |
 * @param:companyId
 */
import sequelize from "../../database";

type Params = {
  companyId: any;
  column:string
};

const FindCompanySettingOneService = async ({companyId, column}:Params): Promise<any> => {
    
    const [results, metadata] = await sequelize.query(`SELECT "${column}" FROM "CompaniesSettings" WHERE "companyId"=${companyId}`)
    return results;
};

export default FindCompanySettingOneService;