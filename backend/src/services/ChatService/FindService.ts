/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Chat from "../../models/Chat";
import Company from "../../models/Company";
import User from "../../models/User";

type Params = {
  companyId: number;
  ownerId?: number;
};

const FindService = async ({ ownerId, companyId }: Params): Promise<Chat[]> => {
  const chats: Chat[] = await Chat.findAll({
    where: {
      ownerId,
      companyId
    },
    include: [
      { model: Company, as: "company", attributes: ["id", "name"] },
      { model: User, as: "owner", attributes: ["id", "name", "profileImage"] }
    ],
    order: [["createdAt", "DESC"]]
  });

  return chats;
};

export default FindService;
