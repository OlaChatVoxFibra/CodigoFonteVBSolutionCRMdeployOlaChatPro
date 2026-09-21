/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import QueueOption from "../../models/QueueOption";

interface QueueOptionData {
  queueId: string;
  title: string;
  option: string;
  message?: string;
  parentId?: string;
}

const CreateService = async (queueOptionData: QueueOptionData): Promise<QueueOption> => {
  const queueOption = await QueueOption.create(queueOptionData);
  return queueOption;
};

export default CreateService;
