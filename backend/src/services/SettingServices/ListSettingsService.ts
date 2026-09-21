/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Setting from "../../models/Setting";

interface Request {
  companyId: number;
}

const ListSettingsService = async ({
  companyId
}: Request): Promise<Setting[] | undefined> => {
  const settings = await Setting.findAll({
    where: {
      companyId
    }
  });

  return settings;
};

export default ListSettingsService;
