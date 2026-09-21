/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";

const AssociateWhatsappQueue = async (
  whatsapp: Whatsapp,
  queueIds: number[]
): Promise<void> => {
  await whatsapp.$set("queues", queueIds);

  await whatsapp.reload();
};

export default AssociateWhatsappQueue;
