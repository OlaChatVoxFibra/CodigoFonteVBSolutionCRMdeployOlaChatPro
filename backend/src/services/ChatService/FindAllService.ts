/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Chat from "../../models/Chat";

const FindAllService = async (): Promise<Chat[]> => {
  const records: Chat[] = await Chat.findAll({
    order: [["createdAt", "DESC"]]
  });
  return records;
};

export default FindAllService;
