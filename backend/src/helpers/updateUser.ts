/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { getIO } from "../libs/socket";
import ShowUserService from "../services/UserServices/ShowUserService";

export const updateUser = async (userId, companyId) => {
  const user = await ShowUserService(userId, companyId);

  user.changed('updatedAt', true);

  let update = null;

  update = { updatedAt: new Date() };
  if (!user.online) {
    // console.log("updateUser", user.online, update)

    update = { ...update, online: true };
    await user.update(update);

    await user.reload();

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${user.companyId}-user`, {
        action: "update",
        user
      });
  } else {
    await user.update(update);
  }
}
