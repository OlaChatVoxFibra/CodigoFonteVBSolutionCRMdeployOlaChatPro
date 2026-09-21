/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Partner from "../../models/Partner";

interface Data {
  name: string;
  phone: string;
  email: string;
  document: string;
  commission: number;
  typeCommission: string;
  walletId?: string;
}

const CreateService = async (data: Data): Promise<Partner> => {
  const record = await Partner.create(data);

  return record;
};

export default CreateService;
