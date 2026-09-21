/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import LeadSale from "../../models/LeadSale";

const DeleteService = async (id: number | string): Promise<void> => {
  const record = await LeadSale.findByPk(id as any);
  if (!record) {
    throw new Error("Lead sale not found");
  }

  await record.destroy();
};

export default DeleteService;

