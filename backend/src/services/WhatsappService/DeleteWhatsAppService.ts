/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import WhatsappQueue from "../../models/WhatsappQueue";
import AppError from "../../errors/AppError";
import cacheLayer from "../../libs/cache";
import logger from "../../utils/logger";

const DeleteWhatsAppService = async (id: string): Promise<void> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id }
  });

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  await WhatsappQueue.destroy({
    where: { whatsappId: id }
  });

  /** Persistir remoção no PG antes do Redis — delFromPattern pode travar se Redis estiver indisponível. */
  await whatsapp.destroy();

  try {
    await cacheLayer.delFromPattern(`sessions:${id}:*`);
  } catch (err) {
    logger.error({ err, id }, "DeleteWhatsAppService: falha ao limpar sessões no Redis (conexão já removida do BD)");
  }
};

export default DeleteWhatsAppService;
