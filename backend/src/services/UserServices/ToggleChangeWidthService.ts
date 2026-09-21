/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import Contact from "../../models/Contact";
import User from "../../models/User";

interface Request {
  userId: string;
  defaultTicketsManagerWidth: number | string;
}

const ToggleChangeWidthService = async ({
  userId,
  defaultTicketsManagerWidth
}: Request): Promise<User> => {
  const user = await User.findOne({
    where: { id: userId },
    attributes: ["id", "defaultTicketsManagerWidth"]
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }


  await user.update({
    defaultTicketsManagerWidth: Number(defaultTicketsManagerWidth)
  });

  await user.reload({
    include: ["queues", "whatsapp", "company"]
  });

  return user;
};

export default ToggleChangeWidthService;
