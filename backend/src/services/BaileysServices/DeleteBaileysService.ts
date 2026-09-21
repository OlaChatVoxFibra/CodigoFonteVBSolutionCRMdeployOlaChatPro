/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Baileys from "../../models/Baileys";

const DeleteBaileysService = async (id: string | number): Promise<void> => {
  await Baileys.destroy({
    where: {
      whatsappId: id
    }
  });
};

export default DeleteBaileysService;
