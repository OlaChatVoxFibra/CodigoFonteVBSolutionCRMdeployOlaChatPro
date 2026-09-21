/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ShowService from "./ShowService";

const DeleteService = async (queueOptionId: number | string): Promise<void> => {
  const queueOption = await ShowService(queueOptionId);

  await queueOption.destroy();
};

export default DeleteService;
