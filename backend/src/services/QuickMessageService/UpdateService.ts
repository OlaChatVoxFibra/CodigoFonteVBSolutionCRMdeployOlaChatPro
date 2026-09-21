/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import QuickMessage from "../../models/QuickMessage";

interface Data {
  shortcode: string;
  message: string;
  userId: number | string;
  id?: number | string;
  geral: boolean;
  mediaPath?: string | null;
  mediaName?: string | null;
  mediaType?: string | null;
  visao: boolean;
  isStarter?: boolean;
}

const UpdateService = async (data: Data): Promise<QuickMessage> => {
  const { id, shortcode, message, userId, geral, mediaPath, mediaName, mediaType, visao, isStarter } = data;

  const record = await QuickMessage.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  if (!record.geral && record.visao && record.userId !== userId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await record.update({
    shortcode,
    message,
    geral,
    mediaPath,
    mediaName,
    mediaType,
    visao,
    isStarter
  });

  return record;
};

export default UpdateService;
