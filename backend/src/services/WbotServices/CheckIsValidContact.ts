/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { WASocket } from "baileys";
import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";

const CheckIsValidContact = async (number: string, companyId: number): Promise<void> => {
  const defaultWhatsapp = await GetDefaultWhatsApp(companyId);

  const wbot = await getWbot(defaultWhatsapp.id);
  try {
    const [result] = await (wbot as WASocket).onWhatsApp(
      `${number}@s.whatsapp.net`
    );

    if (!result && !result?.exists) {
      throw new AppError("invalidNumber");
    }
  } catch (err) {
    console.log(err);
    if (err.message === "invalidNumber") {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }
    throw new AppError("ERR_WAPP_CHECK_CONTACT");
  }
};

export default CheckIsValidContact;
