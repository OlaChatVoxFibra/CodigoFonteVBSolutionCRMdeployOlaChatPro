/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ConvertedLead from "../../models/ConvertedLead";

const DeleteService = async (id: number | string): Promise<void> => {
  const record = await ConvertedLead.findByPk(id as any);
  if (!record) {
    throw new Error("Converted lead not found");
  }
  await record.destroy();
};

export default DeleteService;
