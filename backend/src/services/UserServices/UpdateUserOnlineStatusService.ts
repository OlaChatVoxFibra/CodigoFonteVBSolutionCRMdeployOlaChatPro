/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import User from "../../models/User";

interface Request {
  userId: number;
  online: boolean;
}

const UpdateUserOnlineStatusService = async ({
  userId,
  online
}: Request): Promise<void> => {
  await User.update(
    {
      online,
      lastSeen: new Date()
    },
    {
      where: { id: userId }
    }
  );
};

export default UpdateUserOnlineStatusService;
