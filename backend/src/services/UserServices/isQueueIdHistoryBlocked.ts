/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import User from "../../models/User";
import AppError from "../../errors/AppError";

interface Request {
  userRequest?: number;
}

const isQueueIdHistoryBlocked = async ({
  userRequest
}: Request): Promise<boolean> => {
  if (!userRequest) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }
  const user = await User.findByPk(userRequest);
  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }
  return user.allHistoric === "enabled";
};

export default isQueueIdHistoryBlocked;