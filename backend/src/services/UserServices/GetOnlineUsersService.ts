/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import User from "../../models/User";

interface Request {
  companyId: number;
}

const GetOnlineUsersService = async ({
  companyId
}: Request): Promise<User[]> => {
  return User.findAll({
    where: {
      companyId,
      online: true
    },
    order: [["lastSeen", "DESC"]]
  });
};

export default GetOnlineUsersService;
