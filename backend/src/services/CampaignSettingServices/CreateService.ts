/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import CampaignSetting from "../../models/CampaignSetting";
import { isArray, isObject } from "lodash";

interface Data {
  settings: any;
}

const CreateService = async (
  data: Data,
  companyId: number
): Promise<CampaignSetting[]> => {
  const settings = [];

  for (let settingKey of Object.keys(data.settings)) {
    const value =
      isArray(data.settings[settingKey]) || isObject(data.settings[settingKey])
        ? JSON.stringify(data.settings[settingKey])
        : data.settings[settingKey];

    const [record, created] = await CampaignSetting.findOrCreate({
      where: {
        key: settingKey,
        companyId
      },
      defaults: { key: settingKey, value, companyId }
    });

    if (!created) {
      await record.update({ value });
    }

    settings.push(record);
  }

  return settings;
};

export default CreateService;
