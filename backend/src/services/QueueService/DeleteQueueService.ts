/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ShowQueueService from "./ShowQueueService";

const DeleteQueueService = async (
  queueId: number | string,
  companyId: number
): Promise<void> => {
  const queue = await ShowQueueService(queueId, companyId);

  await queue.destroy();
};

export default DeleteQueueService;
