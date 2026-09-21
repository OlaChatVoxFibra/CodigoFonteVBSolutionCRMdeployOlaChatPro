/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Setting from "../../models/Setting";

interface Request {
  key: string;
  value: string;
  companyId: number;
}

const UpdateSettingService = async ({
  key,
  value,
  companyId
}: Request): Promise<Setting | undefined> => {
  const valueToSave =
    Array.isArray(value) || typeof value === "object"
      ? JSON.stringify(value)
      : value;

  const [setting] = await Setting.findOrCreate({
    where: {
      key,
      companyId
    },
    defaults: {
      key,
      value: valueToSave,
      companyId
    }
  });

  // if (setting != null && setting?.companyId !== companyId) {
  //   throw new AppError("Não é possível consultar registros de outra empresa");
  // }

  if (!setting) {
    throw new AppError("ERR_NO_SETTING_FOUND", 404);
  }

  await setting.update({ value: valueToSave });

  return setting;
};

export default UpdateSettingService;
